/**
 * AudioEngine - Modern Web Audio API wrapper
 * Replaces the legacy tsw library with native Web Audio API
 */

export type WaveformType = 'sine' | 'square' | 'sawtooth' | 'triangle';

export interface EnvelopeSettings {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  startLevel?: number;
  maxLevel?: number;
}

export class AudioEngine {
  private static instance: AudioEngine | null = null;
  public readonly context: AudioContext;
  public readonly speakers: AudioDestinationNode;

  private constructor() {
    this.context = new AudioContext();
    this.speakers = this.context.destination;
  }

  static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  get currentTime(): number {
    return this.context.currentTime;
  }

  createGain(initialGain: number = 1): GainNode {
    const gain = this.context.createGain();
    gain.gain.value = initialGain;
    return gain;
  }

  createOscillator(
    frequency: number = 440,
    type: WaveformType = 'sine'
  ): OscillatorNode {
    const osc = this.context.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency;
    return osc;
  }

  createFilter(
    type: BiquadFilterType = 'lowpass',
    frequency: number = 1000,
    Q: number = 1
  ): BiquadFilterNode {
    const filter = this.context.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = Q;
    return filter;
  }

  createCompressor(settings?: {
    threshold?: number;
    knee?: number;
    ratio?: number;
    attack?: number;
    release?: number;
  }): DynamicsCompressorNode {
    const compressor = this.context.createDynamicsCompressor();
    if (settings) {
      if (settings.threshold !== undefined)
        compressor.threshold.value = settings.threshold;
      if (settings.knee !== undefined) compressor.knee.value = settings.knee;
      if (settings.ratio !== undefined) compressor.ratio.value = settings.ratio;
      if (settings.attack !== undefined)
        compressor.attack.value = settings.attack;
      if (settings.release !== undefined)
        compressor.release.value = settings.release;
    }
    return compressor;
  }

  createNoise(): AudioBufferSourceNode {
    const bufferSize = 2 * this.context.sampleRate;
    const noiseBuffer = this.context.createBuffer(
      1,
      bufferSize,
      this.context.sampleRate
    );
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = this.context.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    return noise;
  }

  /**
   * Connect multiple audio nodes in series
   */
  connect(...nodes: AudioNode[]): void {
    for (let i = 0; i < nodes.length - 1; i++) {
      nodes[i].connect(nodes[i + 1]);
    }
  }

  /**
   * Convert note name to frequency
   */
  noteToFrequency(note: string): number {
    const notes: Record<string, number> = {
      C: 0,
      'C#': 1,
      Db: 1,
      D: 2,
      'D#': 3,
      Eb: 3,
      E: 4,
      F: 5,
      'F#': 6,
      Gb: 6,
      G: 7,
      'G#': 8,
      Ab: 8,
      A: 9,
      'A#': 10,
      Bb: 10,
      B: 11,
    };

    const match = note.match(/^([A-Ga-g][#b]?)(\d+)$/);
    if (!match) {
      console.warn(`Invalid note format: ${note}`);
      return 440;
    }

    const noteName = match[1].charAt(0).toUpperCase() + match[1].slice(1);
    const octave = parseInt(match[2], 10);
    const semitone = notes[noteName];

    if (semitone === undefined) {
      console.warn(`Unknown note: ${noteName}`);
      return 440;
    }

    // A4 = 440Hz, A4 is the 49th key (counting from A0)
    const semitonesFromA4 = semitone - 9 + (octave - 4) * 12;
    return 440 * Math.pow(2, semitonesFromA4 / 12);
  }

  /**
   * Convert MIDI note number to frequency
   */
  midiToFrequency(midiNote: number): number {
    return 440 * Math.pow(2, (midiNote - 69) / 12);
  }

  /**
   * Convert MIDI note number to note name
   */
  midiToNote(midiNote: number): string {
    const noteNames = [
      'C',
      'C#',
      'D',
      'D#',
      'E',
      'F',
      'F#',
      'G',
      'G#',
      'A',
      'A#',
      'B',
    ];
    const octave = Math.floor(midiNote / 12) - 1;
    const noteName = noteNames[midiNote % 12];
    return `${noteName}${octave}`;
  }

  /**
   * Request MIDI access
   */
  async getMidi(): Promise<MIDIAccess | null> {
    if (!navigator.requestMIDIAccess) {
      console.warn('Web MIDI API not supported');
      return null;
    }
    try {
      return await navigator.requestMIDIAccess();
    } catch (error) {
      console.error('MIDI access denied:', error);
      return null;
    }
  }

  /**
   * Resume audio context (required after user interaction)
   */
  async resume(): Promise<void> {
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }
}

// Lazy-loaded singleton for client-side only
let _audioEngine: AudioEngine | null = null;

export const getAudioEngine = (): AudioEngine => {
  if (typeof window === 'undefined') {
    throw new Error('AudioEngine can only be used in the browser');
  }
  if (!_audioEngine) {
    _audioEngine = AudioEngine.getInstance();
  }
  return _audioEngine;
};

// For backwards compatibility - use getAudioEngine() for safe access
export const audioEngine = typeof window !== 'undefined'
  ? AudioEngine.getInstance()
  : (null as unknown as AudioEngine);
