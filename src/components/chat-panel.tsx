'use client';

import { useChat } from '@ai-sdk/react';
import { useEffect, useRef } from 'react';
import type { Synth } from '@/lib/audio/synth';
import type { WaveformType } from '@/lib/audio/audio-engine';

interface ChatPanelProps {
  synthRef: React.MutableRefObject<Synth | null>;
}

export function ChatPanel({ synthRef }: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    onToolCall: async ({ toolCall }) => {
      if (toolCall.toolName === 'adjustSynthSettings') {
        const synth = synthRef.current;
        if (!synth) return 'Synth not initialized';

        const args = toolCall.args as {
          osc1Waveform?: WaveformType;
          osc1Range?: number;
          osc1Detune?: number;
          osc1Volume?: number;
          osc2Waveform?: WaveformType;
          osc2Range?: number;
          osc2Detune?: number;
          osc2Volume?: number;
          osc3Waveform?: WaveformType;
          osc3Range?: number;
          osc3Detune?: number;
          osc3Volume?: number;
          filterAttack?: number;
          filterDecay?: number;
          filterSustain?: number;
          filterRelease?: number;
          filterCutoff?: number;
          filterStartLevel?: number;
          filterEmphasis?: number;
          filterContour?: number;
          volumeAttack?: number;
          volumeDecay?: number;
          volumeSustain?: number;
          volumeRelease?: number;
          masterVolume?: number;
          noiseLevel?: number;
          noiseFilterFreq?: number;
          noiseFilterQ?: number;
          lfoWaveform?: WaveformType;
          lfoFrequency?: number;
          lfoDepth?: number;
        };

        // Apply oscillator settings
        if (args.osc1Waveform) synth.updateOscillator('osc1', 'waveform', args.osc1Waveform);
        if (args.osc1Range) synth.updateOscillator('osc1', 'range', args.osc1Range);
        if (args.osc1Detune !== undefined) synth.updateOscillator('osc1', 'detune', args.osc1Detune);
        if (args.osc1Volume !== undefined) synth.updateMixer('osc1', args.osc1Volume);

        if (args.osc2Waveform) synth.updateOscillator('osc2', 'waveform', args.osc2Waveform);
        if (args.osc2Range) synth.updateOscillator('osc2', 'range', args.osc2Range);
        if (args.osc2Detune !== undefined) synth.updateOscillator('osc2', 'detune', args.osc2Detune);
        if (args.osc2Volume !== undefined) synth.updateMixer('osc2', args.osc2Volume);

        if (args.osc3Waveform) synth.updateOscillator('osc3', 'waveform', args.osc3Waveform);
        if (args.osc3Range) synth.updateOscillator('osc3', 'range', args.osc3Range);
        if (args.osc3Detune !== undefined) synth.updateOscillator('osc3', 'detune', args.osc3Detune);
        if (args.osc3Volume !== undefined) synth.updateMixer('osc3', args.osc3Volume);

        // Apply filter envelope settings
        if (args.filterAttack !== undefined) synth.filterEnvelopeSettings.attack = args.filterAttack;
        if (args.filterDecay !== undefined) synth.filterEnvelopeSettings.decay = args.filterDecay;
        if (args.filterSustain !== undefined) synth.filterEnvelopeSettings.sustain = args.filterSustain;
        if (args.filterRelease !== undefined) synth.filterEnvelopeSettings.release = args.filterRelease;
        if (args.filterCutoff !== undefined) {
          synth.filterEnvelopeSettings.cutoffFrequency = args.filterCutoff;
          synth.filterEnvelopeSettings.maxLevel = args.filterCutoff;
        }
        if (args.filterEmphasis !== undefined) synth.filterEnvelopeSettings.Q = args.filterEmphasis;
        if (args.filterStartLevel !== undefined) synth.filterEnvelopeSettings.startLevel = args.filterStartLevel;
        if (args.filterContour !== undefined) synth.filterEnvelopeSettings.contour = args.filterContour;

        // Apply volume envelope settings
        if (args.volumeAttack !== undefined) synth.volumeEnvelopeSettings.attack = args.volumeAttack;
        if (args.volumeDecay !== undefined) synth.volumeEnvelopeSettings.decay = args.volumeDecay;
        if (args.volumeSustain !== undefined) synth.volumeEnvelopeSettings.sustain = args.volumeSustain;
        if (args.volumeRelease !== undefined) synth.volumeEnvelopeSettings.release = args.volumeRelease;

        // Apply master settings
        if (args.masterVolume !== undefined) synth.setVolume(args.masterVolume);
        if (args.noiseLevel !== undefined) synth.setNoiseLevel(args.noiseLevel);
        if (args.noiseFilterFreq !== undefined) synth.setNoiseFilterFrequency(args.noiseFilterFreq);
        if (args.noiseFilterQ !== undefined) synth.setNoiseFilterQ(args.noiseFilterQ);

        // Apply LFO settings
        if (args.lfoWaveform !== undefined) synth.updateLFO('waveform', args.lfoWaveform);
        if (args.lfoFrequency !== undefined) synth.updateLFO('frequency', args.lfoFrequency);
        if (args.lfoDepth !== undefined) synth.updateLFO('depth', args.lfoDepth);

        // Update UI sliders to reflect changes
        updateUIFromSettings(args);

        return 'Settings applied successfully';
      }
    },
  });

  const updateUIFromSettings = (args: Record<string, unknown>) => {
    // Update UI inputs to reflect the new settings
    // Note: Some UI values use different scales than the synth values
    const mappings: Record<string, { selector: string; value: unknown }> = {
      osc1Waveform: { selector: '[data-oscillator="osc1"][data-param="waveform"]', value: args.osc1Waveform },
      osc1Range: { selector: '[data-oscillator="osc1"][data-param="range"]', value: args.osc1Range },
      osc1Detune: { selector: '[data-oscillator="osc1"][data-param="detune"]', value: args.osc1Detune },
      osc1Volume: { selector: '[data-oscillator="osc1"][data-param="mixer"]', value: args.osc1Volume },
      osc2Waveform: { selector: '[data-oscillator="osc2"][data-param="waveform"]', value: args.osc2Waveform },
      osc2Range: { selector: '[data-oscillator="osc2"][data-param="range"]', value: args.osc2Range },
      osc2Detune: { selector: '[data-oscillator="osc2"][data-param="detune"]', value: args.osc2Detune },
      osc2Volume: { selector: '[data-oscillator="osc2"][data-param="mixer"]', value: args.osc2Volume },
      osc3Waveform: { selector: '[data-oscillator="osc3"][data-param="waveform"]', value: args.osc3Waveform },
      osc3Range: { selector: '[data-oscillator="osc3"][data-param="range"]', value: args.osc3Range },
      osc3Detune: { selector: '[data-oscillator="osc3"][data-param="detune"]', value: args.osc3Detune },
      osc3Volume: { selector: '[data-oscillator="osc3"][data-param="mixer"]', value: args.osc3Volume },
      filterCutoff: { selector: '[name="cutoffFrequency"]', value: args.filterCutoff },
      filterEmphasis: { selector: '[name="emphasis"]', value: args.filterEmphasis },
      // Filter envelope - UI uses transformed values
      filterAttack: { selector: '[name="filter-attack"]', value: args.filterAttack !== undefined ? (args.filterAttack as number) * 100 : undefined },
      filterDecay: { selector: '[name="filter-decay"]', value: args.filterDecay !== undefined ? (args.filterDecay as number) * 10 : undefined },
      filterSustain: { selector: '[name="filter-sustain"]', value: args.filterSustain !== undefined ? (args.filterSustain as number) / 1000 : undefined },
      filterRelease: { selector: '[name="filter-release"]', value: args.filterRelease },
      // Volume envelope
      volumeAttack: { selector: '[name="attack"]', value: args.volumeAttack },
      volumeDecay: { selector: '[name="decay"]', value: args.volumeDecay },
      volumeSustain: { selector: '[name="sustain"]', value: args.volumeSustain },
      volumeRelease: { selector: '[name="release"]', value: args.volumeRelease },
      masterVolume: { selector: '[data-param="volume"]', value: args.masterVolume },
      noiseLevel: { selector: '[name="level"]', value: args.noiseLevel },
      noiseFilterFreq: { selector: '[name="noise-freq"]', value: args.noiseFilterFreq },
      noiseFilterQ: { selector: '[name="noise-q"]', value: args.noiseFilterQ },
      // Filter additional parameters
      filterStartLevel: { selector: '[name="filter-start"]', value: args.filterStartLevel },
      filterContour: { selector: '[name="contour"]', value: args.filterContour !== undefined ? (args.filterContour as number) * 10 : undefined },
      // LFO parameters
      lfoWaveform: { selector: '[name="lfo-waveform"]', value: args.lfoWaveform },
      lfoFrequency: { selector: '[name="lfo-frequency"]', value: args.lfoFrequency },
      lfoDepth: { selector: '[name="lfo-depth"]', value: args.lfoDepth },
    };

    Object.entries(mappings).forEach(([key, { selector, value }]) => {
      if (value !== undefined && args[key] !== undefined) {
        const element = document.querySelector(selector) as HTMLInputElement | HTMLSelectElement;
        if (element) {
          element.value = String(value);
        }
      }
    });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="chat-panel">
      <div className="chat-header">AI Sound Designer</div>
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-message assistant">
            Describe the sound you want to create! For example: &quot;warm pad with slow attack&quot; or &quot;punchy bass with lots of resonance&quot;
          </div>
        )}
        {messages.map((message) => (
          <div key={message.id} className={`chat-message ${message.role}`}>
            {message.content}
            {message.toolInvocations?.map((toolInvocation) => (
              <div key={toolInvocation.toolCallId} className="tool-status">
                {toolInvocation.state === 'result' && (
                  <span className="tool-applied">✓ Done</span>
                )}
              </div>
            ))}
          </div>
        ))}
        {isLoading && (
          <div className="chat-message assistant">Adjusting synth settings...</div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="chat-input-container">
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={(e) => e.stopPropagation()}
          onKeyUp={(e) => e.stopPropagation()}
          placeholder="Describe the sound you want..."
          className="chat-input"
          disabled={isLoading}
        />
      </form>
    </div>
  );
}
