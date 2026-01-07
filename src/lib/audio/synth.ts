/**
 * Sympathetic Synthesizer System Mk1
 * TypeScript implementation
 * Original Copyright 2013 Stuart Memo
 */

import { getAudioEngine, WaveformType } from './audio-engine';
import type { AudioEngine } from './audio-engine';
import { Envelope, EnvelopeOptions } from './envelope';

export interface OscillatorSettings {
  range: number;
  waveform: WaveformType;
  detune: number;
}

export interface MixerChannel {
  node: GainNode;
  volume: number;
  active: boolean;
}

export type FilterType = 'lowpass' | 'highpass' | 'bandpass';

export interface FilterEnvelopeSettings extends EnvelopeOptions {
  Q: number;
  cutoffFrequency: number;
  contour: number; // 0-1, envelope intensity multiplier
  filterType: FilterType;
}

export interface LFOSettings {
  waveform: WaveformType;
  frequency: number; // 0-30 Hz
  depth: number; // 0-100 (modulation amount)
}

export interface SynthSettings {
  speakersOn?: boolean;
  volume?: number;
}

interface ActiveVoice {
  note: string;
  oscillators: OscillatorNode[];
  gainNodes: GainNode[];
  filters: BiquadFilterNode[];
  volumeEnvelope: Envelope;
  filterEnvelope: Envelope;
  releaseTime: number; // Store the release time when note started
}

export class Synth {
  public readonly version = '1.0.0';

  // Oscillator settings
  public oscillators: Record<string, OscillatorSettings> = {
    osc1: { range: 8, waveform: 'square', detune: 0 },
    osc2: { range: 4, waveform: 'sawtooth', detune: 0 },
    osc3: { range: 16, waveform: 'square', detune: 0 },
  };

  // Mixer settings
  public mixer: Record<string, MixerChannel>;

  // Envelope settings
  public volumeEnvelopeSettings: EnvelopeOptions = {
    attack: 0.01,
    decay: 0.5,
    sustain: 0.4,
    release: 0.3,
    startLevel: 0,
    maxLevel: 1,
  };

  public filterEnvelopeSettings: FilterEnvelopeSettings = {
    attack: 0.1,
    decay: 0.5,
    sustain: 2000,
    release: 1,
    startLevel: 200,
    maxLevel: 10000,
    Q: 5,
    cutoffFrequency: 10000,
    contour: 1, // Full envelope intensity by default
    filterType: 'lowpass',
  };

  // LFO settings (Moog-style: modulates both pitch and filter)
  public lfoSettings: LFOSettings = {
    waveform: 'triangle',
    frequency: 0,
    depth: 0,
  };
  private lfo: OscillatorNode | null = null;
  private lfoPitchGain: GainNode | null = null; // Controls pitch modulation depth
  private lfoFilterGain: GainNode | null = null; // Controls filter modulation depth

  // Noise settings
  public noiseLevel: GainNode;
  public noiseGate: GainNode;
  private noiseSource: AudioBufferSourceNode | null = null;
  private noiseStarted: boolean = false;
  private noiseFilter: BiquadFilterNode;

  // Output
  public masterVolume: GainNode;
  private output: GainNode;
  private speakersOn: boolean;
  private audioEngine: AudioEngine;

  // Active voices
  private activeVoices: Map<string, ActiveVoice> = new Map();

  constructor(settings: SynthSettings = {}) {
    this.audioEngine = getAudioEngine();
    this.speakersOn = settings.speakersOn ?? true;

    // Create mixer channels (lower defaults to prevent clipping when combined)
    this.mixer = {
      osc1: {
        node: this.audioEngine.createGain(0.25),
        volume: 0.25,
        active: true,
      },
      osc2: {
        node: this.audioEngine.createGain(0.25),
        volume: 0.25,
        active: true,
      },
      osc3: {
        node: this.audioEngine.createGain(0.25),
        volume: 0.25,
        active: true,
      },
    };

    // Create master output chain
    this.masterVolume = this.audioEngine.createGain(settings.volume ?? 0.5);
    this.output = this.audioEngine.createGain(1);

    // Create limiter
    const limiter = this.audioEngine.createCompressor({
      threshold: -3,
      knee: 6,
      ratio: 12,
      attack: 0.003,
      release: 0.1,
    });

    // Create noise section
    this.noiseGate = this.audioEngine.createGain(0);
    this.noiseLevel = this.audioEngine.createGain(0);
    this.noiseFilter = this.audioEngine.createFilter('bandpass', 1000, 1);

    // Connect mixer channels to limiter
    for (const key of Object.keys(this.mixer)) {
      this.mixer[key].node.connect(limiter);
    }

    // Connect limiter to master volume
    limiter.connect(this.masterVolume);

    // Connect to speakers or output
    if (this.speakersOn) {
      this.masterVolume.connect(this.audioEngine.speakers);
    } else {
      this.masterVolume.connect(this.output);
    }

    // Initialize noise (but don't start it)
    this.initNoise();

    // Initialize LFO
    this.initLFO();
  }

  private initNoise(): AudioBufferSourceNode {
    const noiseSource = this.audioEngine.createNoise();
    this.noiseSource = noiseSource;
    this.audioEngine.connect(
      noiseSource,
      this.noiseFilter,
      this.noiseLevel,
      this.noiseGate,
      this.masterVolume
    );
    return noiseSource;
  }

  /**
   * Initialize the LFO (Low Frequency Oscillator)
   * Moog-style: single LFO modulates both pitch and filter
   */
  private initLFO(): void {
    // Create LFO oscillator at sub-audio frequency
    const context = this.audioEngine.context;
    this.lfo = context.createOscillator();
    this.lfo.type = this.lfoSettings.waveform;
    this.lfo.frequency.value = this.lfoSettings.frequency;

    // Create gain nodes to control modulation depth
    // Pitch modulation: depth in cents (detune)
    this.lfoPitchGain = context.createGain();
    this.lfoPitchGain.gain.value = this.lfoSettings.depth; // cents

    // Filter modulation: depth in Hz
    this.lfoFilterGain = context.createGain();
    this.lfoFilterGain.gain.value = this.lfoSettings.depth * 100; // Hz (scaled up)

    // Connect LFO to gain nodes
    this.lfo.connect(this.lfoPitchGain);
    this.lfo.connect(this.lfoFilterGain);

    // Start the LFO
    this.lfo.start();
  }

  /**
   * Update LFO settings
   */
  updateLFO(param: keyof LFOSettings, value: number | WaveformType): void {
    if (param === 'waveform') {
      this.lfoSettings.waveform = value as WaveformType;
      if (this.lfo) {
        this.lfo.type = value as OscillatorType;
      }
    } else if (param === 'frequency') {
      this.lfoSettings.frequency = value as number;
      if (this.lfo) {
        this.lfo.frequency.value = value as number;
      }
    } else if (param === 'depth') {
      this.lfoSettings.depth = value as number;
      if (this.lfoPitchGain) {
        this.lfoPitchGain.gain.value = value as number; // cents for pitch
      }
      if (this.lfoFilterGain) {
        this.lfoFilterGain.gain.value = (value as number) * 100; // Hz for filter
      }
    }
  }

  /**
   * Connect LFO to a voice's oscillators and filters
   */
  private connectLFOToVoice(oscillators: OscillatorNode[], filters: BiquadFilterNode[]): void {
    if (!this.lfoPitchGain || !this.lfoFilterGain) return;

    // Connect LFO pitch modulation to each oscillator's detune
    oscillators.forEach((osc) => {
      this.lfoPitchGain!.connect(osc.detune);
    });

    // Connect LFO filter modulation to each filter's frequency
    filters.forEach((filter) => {
      this.lfoFilterGain!.connect(filter.frequency);
    });
  }

  private rangeToFrequency(baseFrequency: number, range: number): number {
    switch (range) {
      case 2:
        return baseFrequency * 4;
      case 4:
        return baseFrequency * 2;
      case 16:
        return baseFrequency / 2;
      case 32:
        return baseFrequency / 4;
      case 64:
        return baseFrequency / 8;
      default:
        return baseFrequency;
    }
  }

  private createOscillators(frequency: number): OscillatorNode[] {
    const oscillators: OscillatorNode[] = [];

    for (let i = 1; i <= 3; i++) {
      const oscKey = `osc${i}`;
      const settings = this.oscillators[oscKey];

      const osc = this.audioEngine.createOscillator(
        this.rangeToFrequency(frequency, settings.range),
        settings.waveform
      );
      osc.detune.value = settings.detune;
      oscillators.push(osc);
    }

    return oscillators;
  }

  /**
   * Play a note on the synth
   */
  playNote(note: string | { note: string; startTime?: number }): void {
    let noteName: string;
    let startTime: number;

    if (typeof note === 'object') {
      noteName = note.note;
      startTime = note.startTime ?? this.audioEngine.currentTime;
    } else {
      noteName = note;
      startTime = this.audioEngine.currentTime;
    }

    // Resume audio context if needed
    this.audioEngine.resume();

    // Stop existing note if playing
    if (this.activeVoices.has(noteName)) {
      this.stopNote(noteName);
    }

    const frequency = this.audioEngine.noteToFrequency(noteName);
    const oscillators = this.createOscillators(frequency);
    const gainNodes: GainNode[] = [];
    const filters: BiquadFilterNode[] = [];

    // Create volume envelope
    const volumeEnvelope = new Envelope({
      ...this.volumeEnvelopeSettings,
    });

    // Calculate contour-scaled envelope values
    const startLevel = this.filterEnvelopeSettings.startLevel ?? 200;
    const maxLevel = this.filterEnvelopeSettings.maxLevel ?? 10000;
    const envDepth = maxLevel - startLevel;
    const scaledMaxLevel = startLevel + (envDepth * this.filterEnvelopeSettings.contour);

    // Create filter envelope (with contour applied)
    const filterEnvelope = new Envelope({
      attack: this.filterEnvelopeSettings.attack,
      decay: this.filterEnvelopeSettings.decay,
      sustain: this.filterEnvelopeSettings.sustain,
      release: this.filterEnvelopeSettings.release,
      startLevel: startLevel,
      maxLevel: scaledMaxLevel,
    });

    // Connect each oscillator through its own gain and filter to the mixer
    oscillators.forEach((osc, index) => {
      const gainNode = this.audioEngine.createGain(0);
      const filter = this.audioEngine.createFilter(
        this.filterEnvelopeSettings.filterType,
        this.filterEnvelopeSettings.cutoffFrequency,
        this.filterEnvelopeSettings.Q
      );

      const mixerKey = `osc${index + 1}`;

      // Connect: osc -> gain -> filter -> mixer channel
      osc.connect(gainNode);
      gainNode.connect(filter);
      filter.connect(this.mixer[mixerKey].node);

      gainNodes.push(gainNode);
      filters.push(filter);

      // Connect envelopes to the first oscillator's nodes
      if (index === 0) {
        volumeEnvelope.connect(gainNode.gain);
        filterEnvelope.connect(filter.frequency);
      } else {
        // For other oscillators, create separate envelope instances
        const volEnv = new Envelope({ ...this.volumeEnvelopeSettings });
        const filtEnv = new Envelope({
          attack: this.filterEnvelopeSettings.attack,
          decay: this.filterEnvelopeSettings.decay,
          sustain: this.filterEnvelopeSettings.sustain,
          release: this.filterEnvelopeSettings.release,
          startLevel: startLevel,
          maxLevel: scaledMaxLevel, // Apply contour to all oscillators
        });
        volEnv.connect(gainNode.gain);
        filtEnv.connect(filter.frequency);
        volEnv.trigger(startTime);
        filtEnv.trigger(startTime);
      }

      osc.start(startTime);
    });

    // Connect LFO to this voice's oscillators and filters
    this.connectLFOToVoice(oscillators, filters);

    // Trigger envelopes for the main voice
    volumeEnvelope.trigger(startTime);
    filterEnvelope.trigger(startTime);

    // Update noise filter frequency
    this.noiseFilter.frequency.value = frequency;
    this.noiseGate.gain.value = 1;

    // Store active voice with the release time captured at note start
    this.activeVoices.set(noteName, {
      note: noteName,
      oscillators,
      gainNodes,
      filters,
      volumeEnvelope,
      filterEnvelope,
      releaseTime: this.volumeEnvelopeSettings.release,
    });
  }

  /**
   * Stop a playing note
   */
  stopNote(note: string | { note: string; stopTime?: number }): void {
    let noteName: string;
    let stopTime: number;

    if (typeof note === 'object') {
      noteName = note.note;
      stopTime = note.stopTime ?? this.audioEngine.currentTime;
    } else {
      noteName = note;
      stopTime = this.audioEngine.currentTime;
    }

    const voice = this.activeVoices.get(noteName);
    if (!voice) return;

    // Use the release time stored when the note started (not current settings)
    const releaseTime = voice.releaseTime;

    // Trigger release on envelopes
    voice.volumeEnvelope.triggerRelease(stopTime);
    voice.filterEnvelope.triggerRelease(stopTime);

    // Also trigger release on individual oscillator gain nodes
    voice.gainNodes.forEach((gainNode) => {
      gainNode.gain.cancelScheduledValues(stopTime);
      gainNode.gain.setValueAtTime(gainNode.gain.value, stopTime);
      gainNode.gain.linearRampToValueAtTime(0, stopTime + releaseTime);
    });

    // Schedule oscillator stop after release
    const releaseEnd = stopTime + releaseTime + 0.1;
    voice.oscillators.forEach((osc) => {
      try {
        osc.stop(releaseEnd);
      } catch {
        // Oscillator may have already stopped
      }
    });

    // Remove from active voices first
    this.activeVoices.delete(noteName);

    // Only turn off noise gate if no other notes are playing
    if (this.activeVoices.size === 0) {
      this.noiseGate.gain.value = 0;
    }
  }

  /**
   * Stop all playing notes
   */
  stopAll(): void {
    for (const noteName of this.activeVoices.keys()) {
      this.stopNote(noteName);
    }
  }

  /**
   * Set master volume
   */
  setVolume(value: number): void {
    this.masterVolume.gain.value = Math.max(0, Math.min(1, value));
  }

  /**
   * Set noise level
   */
  setNoiseLevel(value: number): void {
    this.noiseLevel.gain.value = Math.max(0, Math.min(1, value));

    // Start the noise source if it hasn't been started yet
    if (value > 0 && !this.noiseStarted && this.noiseSource) {
      this.noiseSource.start();
      this.noiseStarted = true;
    }
    // Noise gate is controlled by note on/off, not by level
  }

  /**
   * Set noise filter frequency
   */
  setNoiseFilterFrequency(value: number): void {
    this.noiseFilter.frequency.value = Math.max(20, Math.min(20000, value));
  }

  /**
   * Set noise filter Q (resonance)
   */
  setNoiseFilterQ(value: number): void {
    this.noiseFilter.Q.value = Math.max(0.1, Math.min(20, value));
  }

  /**
   * Set filter type
   */
  setFilterType(type: FilterType): void {
    this.filterEnvelopeSettings.filterType = type;
    // Note: This will affect new notes; active notes keep their current filter type
  }

  /**
   * Update oscillator settings
   */
  updateOscillator(
    oscKey: string,
    param: keyof OscillatorSettings,
    value: number | WaveformType
  ): void {
    const osc = this.oscillators[oscKey];
    if (osc) {
      if (param === 'range') {
        osc.range = value as number;
      } else if (param === 'waveform') {
        osc.waveform = value as WaveformType;
      } else if (param === 'detune') {
        osc.detune = value as number;
      }

      // Update active oscillators' detune in real-time
      if (param === 'detune') {
        this.activeVoices.forEach((voice) => {
          const oscIndex = parseInt(oscKey.replace('osc', '')) - 1;
          if (voice.oscillators[oscIndex]) {
            voice.oscillators[oscIndex].detune.value = value as number;
          }
        });
      }
    }
  }

  /**
   * Update mixer channel volume
   */
  updateMixer(oscKey: string, volume: number): void {
    if (this.mixer[oscKey]) {
      this.mixer[oscKey].volume = volume;
      this.mixer[oscKey].node.gain.value = volume;
    }
  }

  /**
   * Get the output node (for connecting to analyzers, etc.)
   */
  getOutput(): GainNode {
    return this.output;
  }
}
