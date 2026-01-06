import { anthropic } from '@ai-sdk/anthropic';
import { streamText, tool } from 'ai';
import { z } from 'zod';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: `You are an expert synthesizer sound designer. When users describe sounds they want to create, you analyze their description and adjust the synthesizer parameters to achieve that sound.

The synthesizer has:
- 3 oscillators (osc1, osc2, osc3) each with:
  - Waveform: sine, triangle, sawtooth, or square
  - Range: 2, 4, 8, 16, or 32 (octave multiplier, lower = higher pitch)
  - Detune: -50 to 50 cents
  - Volume: 0 to 1

- LFO (Low Frequency Oscillator) - Moog-style, modulates both pitch and filter:
  - Waveform: sine, triangle, sawtooth, or square
  - Frequency: 0 to 30 Hz (modulation rate)
  - Depth: 0 to 100 (modulation amount - affects pitch in cents, filter in Hz)

- Filter envelope (ADSR for the lowpass filter):
  - Attack: 0 to 5 seconds
  - Decay: 0 to 2.5 seconds
  - Sustain: 0 to 10000 Hz
  - Release: 0 to 5 seconds
  - Cutoff: 20 to 20000 Hz (max frequency the envelope reaches)
  - Start Frequency: 20 to 5000 Hz (where the envelope starts)
  - Emphasis (Q/resonance): 0 to 10
  - Contour: 0 to 1 (envelope intensity/amount)

- Volume envelope (ADSR):
  - Attack: 0 to 5 seconds
  - Decay: 0.1 to 5 seconds
  - Sustain: 0.1 to 1
  - Release: 0 to 10 seconds

- Noise generator:
  - Level: 0 to 1
  - Filter frequency: 100 to 8000 Hz (bandpass filter center)
  - Filter Q: 0.1 to 10 (bandpass resonance)

- Master volume: 0 to 1

Sound design tips:
- For warm pads: use triangle/sine waves, slow attack, high sustain, low cutoff, range 8-16
- For punchy bass: use square/sawtooth, fast attack, short decay, range 32 (lowest octave)
- For sub bass: use sine wave, range 32, low cutoff, minimal resonance
- For bright leads: use sawtooth, range 4-8 (higher octave), high cutoff, some resonance
- For ambient textures: combine detuned oscillators, slow envelopes, add noise
- For aggressive sounds: use square waves, high resonance, fast attack
- For vibrato: use LFO with triangle wave, 5-7 Hz frequency, depth 10-30
- For wobble bass: use LFO with square/triangle wave, 1-4 Hz, high filter depth, range 32
- For movement: use slow LFO (0.1-1 Hz) with subtle depth for evolving textures

Important guidelines:
- Range controls octave: 32 is the LOWEST (bass), 2 is the HIGHEST (lead). Always set range for bass sounds to 32 or 16.
- Keep release time at 0.2-0.5 seconds minimum to avoid abrupt cutoffs, unless the user specifically wants staccato sounds.
- Fast attack (0.01-0.05) with reasonable release (0.3+) creates punchy but smooth bass sounds.

Always use the adjustSynthSettings tool to apply your sound design choices. Explain briefly what settings you're changing and why.`,
    messages,
    tools: {
      adjustSynthSettings: tool({
        description: 'Adjust the synthesizer settings to create the desired sound',
        parameters: z.object({
          osc1Waveform: z.enum(['sine', 'triangle', 'sawtooth', 'square']).optional().describe('Oscillator 1 waveform'),
          osc1Range: z.union([z.literal(2), z.literal(4), z.literal(8), z.literal(16), z.literal(32)]).optional().describe('Oscillator 1 range (octave: 32=lowest, 2=highest)'),
          osc1Detune: z.number().min(-50).max(50).optional().describe('Oscillator 1 detune in cents'),
          osc1Volume: z.number().min(0).max(1).optional().describe('Oscillator 1 volume'),
          osc2Waveform: z.enum(['sine', 'triangle', 'sawtooth', 'square']).optional().describe('Oscillator 2 waveform'),
          osc2Range: z.union([z.literal(2), z.literal(4), z.literal(8), z.literal(16), z.literal(32)]).optional().describe('Oscillator 2 range (octave: 32=lowest, 2=highest)'),
          osc2Detune: z.number().min(-50).max(50).optional().describe('Oscillator 2 detune in cents'),
          osc2Volume: z.number().min(0).max(1).optional().describe('Oscillator 2 volume'),
          osc3Waveform: z.enum(['sine', 'triangle', 'sawtooth', 'square']).optional().describe('Oscillator 3 waveform'),
          osc3Range: z.union([z.literal(2), z.literal(4), z.literal(8), z.literal(16), z.literal(32)]).optional().describe('Oscillator 3 range (octave: 32=lowest, 2=highest)'),
          osc3Detune: z.number().min(-50).max(50).optional().describe('Oscillator 3 detune in cents'),
          osc3Volume: z.number().min(0).max(1).optional().describe('Oscillator 3 volume'),
          filterAttack: z.number().min(0).max(5).optional().describe('Filter envelope attack time in seconds'),
          filterDecay: z.number().min(0).max(2.5).optional().describe('Filter envelope decay time in seconds'),
          filterSustain: z.number().min(0).max(10000).optional().describe('Filter envelope sustain level in Hz'),
          filterRelease: z.number().min(0).max(5).optional().describe('Filter envelope release time in seconds'),
          filterCutoff: z.number().min(20).max(20000).optional().describe('Filter cutoff frequency in Hz (envelope max)'),
          filterStartLevel: z.number().min(20).max(5000).optional().describe('Filter envelope start frequency in Hz'),
          filterEmphasis: z.number().min(0).max(10).optional().describe('Filter resonance/emphasis'),
          filterContour: z.number().min(0).max(1).optional().describe('Filter envelope intensity (0=no sweep, 1=full sweep)'),
          volumeAttack: z.number().min(0).max(5).optional().describe('Volume envelope attack time in seconds'),
          volumeDecay: z.number().min(0.1).max(5).optional().describe('Volume envelope decay time in seconds'),
          volumeSustain: z.number().min(0.1).max(1).optional().describe('Volume envelope sustain level'),
          volumeRelease: z.number().min(0).max(10).optional().describe('Volume envelope release time in seconds'),
          masterVolume: z.number().min(0).max(1).optional().describe('Master volume level'),
          noiseLevel: z.number().min(0).max(1).optional().describe('Noise generator level'),
          noiseFilterFreq: z.number().min(100).max(8000).optional().describe('Noise bandpass filter center frequency in Hz'),
          noiseFilterQ: z.number().min(0.1).max(10).optional().describe('Noise bandpass filter resonance'),
          lfoWaveform: z.enum(['sine', 'triangle', 'sawtooth', 'square']).optional().describe('LFO waveform'),
          lfoFrequency: z.number().min(0).max(30).optional().describe('LFO frequency in Hz (modulation rate)'),
          lfoDepth: z.number().min(0).max(100).optional().describe('LFO depth (modulation amount)'),
        }),
      }),
    },
  });

  return result.toDataStreamResponse();
}
