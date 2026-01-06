'use client';

import { useEffect, useCallback, useState } from 'react';
import { Synth } from '@/lib/audio/synth';
import { getAudioEngine } from '@/lib/audio/audio-engine';
import type { WaveformType } from '@/lib/audio/audio-engine';
import { ResponsiveKeyboard } from './responsive-keyboard';

interface SynthPanelProps {
  synthRef: React.MutableRefObject<Synth | null>;
}

export function SynthPanel({ synthRef }: SynthPanelProps) {
  // Default to collapsed on mobile (< 768px), expanded on larger screens
  const [showControls, setShowControls] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return false;
  });

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const synth = synthRef.current;
      if (!synth) return;

      const osc = e.target.dataset.oscillator;
      const param = e.target.dataset.param;
      const value = e.target.value;
      const name = e.target.name;

      switch (param) {
        case 'range':
          if (osc) synth.updateOscillator(osc, 'range', parseInt(value, 10));
          break;
        case 'waveform':
          if (osc) synth.updateOscillator(osc, 'waveform', value as WaveformType);
          break;
        case 'detune':
          if (osc) synth.updateOscillator(osc, 'detune', parseInt(value, 10));
          break;
        case 'mixer':
          if (osc) synth.updateMixer(osc, parseFloat(value));
          break;
        case 'filter':
          handleFilterChange(synth, name, parseFloat(value));
          break;
        case 'volume-filter':
          handleVolumeFilterChange(synth, name, parseFloat(value));
          break;
        case 'volume':
          synth.setVolume(parseFloat(value));
          break;
        case 'noise':
          handleNoiseChange(synth, name, parseFloat(value));
          break;
        case 'lfo':
          handleLFOChange(synth, name, value);
          break;
      }
    },
    [synthRef]
  );

  const handleFilterChange = (synth: Synth, name: string, value: number) => {
    switch (name) {
      case 'filter-attack':
        synth.filterEnvelopeSettings.attack = value / 100;
        break;
      case 'filter-decay':
        synth.filterEnvelopeSettings.decay = value / 10;
        break;
      case 'filter-sustain':
        synth.filterEnvelopeSettings.sustain = value * 1000;
        break;
      case 'filter-release':
        synth.filterEnvelopeSettings.release = value;
        break;
      case 'cutoffFrequency':
        synth.filterEnvelopeSettings.cutoffFrequency = value;
        synth.filterEnvelopeSettings.maxLevel = value;
        break;
      case 'emphasis':
        synth.filterEnvelopeSettings.Q = value;
        break;
      case 'contour':
        synth.filterEnvelopeSettings.contour = value / 10; // 0-10 UI → 0-1 internal
        break;
      case 'filter-start':
        synth.filterEnvelopeSettings.startLevel = value;
        break;
    }
  };

  const handleLFOChange = (synth: Synth, name: string, value: string) => {
    switch (name) {
      case 'lfo-waveform':
        synth.updateLFO('waveform', value as WaveformType);
        break;
      case 'lfo-frequency':
        synth.updateLFO('frequency', parseFloat(value));
        break;
      case 'lfo-depth':
        synth.updateLFO('depth', parseFloat(value));
        break;
    }
  };

  const handleNoiseChange = (synth: Synth, name: string, value: number) => {
    switch (name) {
      case 'level':
        synth.setNoiseLevel(value);
        break;
      case 'noise-freq':
        synth.setNoiseFilterFrequency(value);
        break;
      case 'noise-q':
        synth.setNoiseFilterQ(value);
        break;
    }
  };

  const handleVolumeFilterChange = (synth: Synth, name: string, value: number) => {
    switch (name) {
      case 'attack':
        synth.volumeEnvelopeSettings.attack = value;
        break;
      case 'decay':
        synth.volumeEnvelopeSettings.decay = value;
        break;
      case 'sustain':
        synth.volumeEnvelopeSettings.sustain = value;
        break;
      case 'release':
        synth.volumeEnvelopeSettings.release = value;
        break;
    }
  };

  useEffect(() => {
    synthRef.current = new Synth({ speakersOn: true, volume: 0.5 });

    return () => {
      synthRef.current?.stopAll();
    };
  }, [synthRef]);

  const handleNoteOn = useCallback((note: string) => {
    getAudioEngine().resume();
    synthRef.current?.playNote(note);
  }, [synthRef]);

  const handleNoteOff = useCallback((note: string) => {
    synthRef.current?.stopNote(note);
  }, [synthRef]);

  return (
    <div className="w-full max-w-[916px] mx-auto">
      {/* Header */}
      <h1 className="bg-black text-white text-[19px] font-bold px-2.5 py-1.5 m-0 leading-relaxed flex items-center justify-between">
        <span>Sympathetic Synthesizer System Mk II</span>
        {/* Mobile toggle button - visible below 768px */}
        <button
          onClick={() => setShowControls(!showControls)}
          className="md:hidden text-sm font-normal bg-[#333] hover:bg-[#444] px-3 py-1 rounded"
        >
          {showControls ? 'Hide Controls' : 'Show Controls'}
        </button>
      </h1>

      {/* Main Controls Grid - hidden below 768px unless toggled */}
      <div className={`${showControls ? 'block' : 'hidden'} md:block`}>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_150px] border-4 border-t-0 border-[#0c0c0c]">
        {/* Left Column - Oscillators */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-0 bg-[#ffe976] p-3 md:border-r-4 border-[#0c0c0c]">
          {/* Oscillator 1 */}
          <div>
            <h2 className="module-title text-[#fdefa7]">Oscillator 1</h2>
            <div className="grid grid-cols-2 gap-x-2">
              <div>
                <label className="control-label">Waveform</label>
                <select
                  data-oscillator="osc1"
                  data-param="waveform"
                  defaultValue="square"
                  onChange={handleChange}
                  className="synth-select"
                >
                  <option value="sine">Sine</option>
                  <option value="triangle">Triangle</option>
                  <option value="sawtooth">Sawtooth</option>
                  <option value="square">Square</option>
                </select>
              </div>
              <div>
                <label className="control-label">Range</label>
                <select
                  data-oscillator="osc1"
                  data-param="range"
                  defaultValue="8"
                  onChange={handleChange}
                  className="synth-select"
                >
                  <option value="32">32</option>
                  <option value="16">16</option>
                  <option value="8">8</option>
                  <option value="4">4</option>
                  <option value="2">2</option>
                </select>
              </div>
            </div>
            <label className="control-label">Tuning</label>
            <input
              data-oscillator="osc1"
              data-param="detune"
              type="range"
              min="-50"
              max="50"
              defaultValue="-6"
              onChange={handleChange}
              className="synth-slider bg-[#fbefb3]"
            />
            <label className="control-label">Volume</label>
            <input
              data-oscillator="osc1"
              data-param="mixer"
              type="range"
              min="0"
              max="1"
              step="0.05"
              defaultValue="0.5"
              onChange={handleChange}
              className="synth-slider bg-[#fbefb3]"
            />
          </div>

          {/* Oscillator 2 */}
          <div>
            <h2 className="module-title text-[#fdefa7]">Oscillator 2</h2>
            <div className="grid grid-cols-2 gap-x-2">
              <div>
                <label className="control-label">Waveform</label>
                <select
                  data-oscillator="osc2"
                  data-param="waveform"
                  defaultValue="sawtooth"
                  onChange={handleChange}
                  className="synth-select"
                >
                  <option value="sine">Sine</option>
                  <option value="triangle">Triangle</option>
                  <option value="sawtooth">Sawtooth</option>
                  <option value="square">Square</option>
                </select>
              </div>
              <div>
                <label className="control-label">Range</label>
                <select
                  data-oscillator="osc2"
                  data-param="range"
                  defaultValue="4"
                  onChange={handleChange}
                  className="synth-select"
                >
                  <option value="32">32</option>
                  <option value="16">16</option>
                  <option value="8">8</option>
                  <option value="4">4</option>
                  <option value="2">2</option>
                </select>
              </div>
            </div>
            <label className="control-label">Tuning</label>
            <input
              data-oscillator="osc2"
              data-param="detune"
              type="range"
              min="-50"
              max="50"
              defaultValue="-10"
              onChange={handleChange}
              className="synth-slider bg-[#fbefb3]"
            />
            <label className="control-label">Volume</label>
            <input
              data-oscillator="osc2"
              data-param="mixer"
              type="range"
              min="0"
              max="1"
              step="0.1"
              defaultValue="0.5"
              onChange={handleChange}
              className="synth-slider bg-[#fbefb3]"
            />
          </div>

          {/* Oscillator 3 */}
          <div>
            <h2 className="module-title text-[#fdefa7]">Oscillator 3</h2>
            <div className="grid grid-cols-2 gap-x-2">
              <div>
                <label className="control-label">Waveform</label>
                <select
                  data-oscillator="osc3"
                  data-param="waveform"
                  defaultValue="square"
                  onChange={handleChange}
                  className="synth-select"
                >
                  <option value="sine">Sine</option>
                  <option value="triangle">Triangle</option>
                  <option value="sawtooth">Sawtooth</option>
                  <option value="square">Square</option>
                </select>
              </div>
              <div>
                <label className="control-label">Range</label>
                <select
                  data-oscillator="osc3"
                  data-param="range"
                  defaultValue="16"
                  onChange={handleChange}
                  className="synth-select"
                >
                  <option value="32">32</option>
                  <option value="16">16</option>
                  <option value="8">8</option>
                  <option value="4">4</option>
                  <option value="2">2</option>
                </select>
              </div>
            </div>
            <label className="control-label">Tuning</label>
            <input
              data-oscillator="osc3"
              data-param="detune"
              type="range"
              min="-50"
              max="50"
              defaultValue="10"
              onChange={handleChange}
              className="synth-slider bg-[#fbefb3]"
            />
            <label className="control-label">Volume</label>
            <input
              data-oscillator="osc3"
              data-param="mixer"
              type="range"
              min="0"
              max="1"
              step="0.1"
              defaultValue="0.5"
              onChange={handleChange}
              className="synth-slider bg-[#fbefb3]"
            />
          </div>
        </div>

        {/* Right Column - LFO */}
        <div className="bg-[#89bd79] p-3">
          <h2 className="module-title text-[#a1e4a1]">LFO</h2>
          <label className="control-label">Waveform</label>
          <select data-param="lfo" name="lfo-waveform" defaultValue="triangle" onChange={handleChange} className="synth-select">
            <option value="sine">Sine</option>
            <option value="triangle">Triangle</option>
            <option value="sawtooth">Sawtooth</option>
            <option value="square">Square</option>
          </select>
          <label className="control-label">Frequency</label>
          <input
            data-param="lfo"
            name="lfo-frequency"
            type="range"
            min="0"
            max="30"
            defaultValue="0"
            onChange={handleChange}
            className="synth-slider bg-[lightgreen] w-full max-w-[120px]"
          />
          <label className="control-label">Depth</label>
          <input
            data-param="lfo"
            name="lfo-depth"
            type="range"
            min="1"
            max="10"
            defaultValue="1"
            onChange={handleChange}
            className="synth-slider bg-[lightgreen] w-full max-w-[120px]"
          />
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_229px_150px] border-4 border-t-0 border-[#0c0c0c]">
        {/* Filter */}
        <div className="bg-[#db9ab7] p-3 md:border-r-4 border-[#0c0c0c]">
          <h2 className="module-title text-pink-200">Filter</h2>
          <div className="grid grid-cols-2 gap-x-4">
            <div>
              <label className="control-label">Attack</label>
              <input
                name="filter-attack"
                data-param="filter"
                type="range"
                min="0"
                max="500"
                defaultValue="10"
                onChange={handleChange}
                className="synth-slider bg-[#ecc5d6]"
              />
              <label className="control-label">Decay</label>
              <input
                name="filter-decay"
                data-param="filter"
                type="range"
                min="0"
                max="25"
                defaultValue="5"
                onChange={handleChange}
                className="synth-slider bg-[#ecc5d6]"
              />
              <label className="control-label">Sustain</label>
              <input
                name="filter-sustain"
                data-param="filter"
                type="range"
                min="0"
                max="10"
                defaultValue="5"
                onChange={handleChange}
                className="synth-slider bg-[#ecc5d6]"
              />
              <label className="control-label">Release</label>
              <input
                name="filter-release"
                data-param="filter"
                type="range"
                min="0"
                max="5"
                defaultValue="2"
                onChange={handleChange}
                className="synth-slider bg-[#ecc5d6]"
              />
            </div>
            <div>
              <label className="control-label">Cutoff frequency</label>
              <input
                name="cutoffFrequency"
                data-param="filter"
                type="range"
                min="20"
                max="20000"
                step="200"
                defaultValue="10000"
                onChange={handleChange}
                className="synth-slider bg-[#ecc5d6]"
              />
              <label className="control-label">Emphasis</label>
              <input
                name="emphasis"
                data-param="filter"
                type="range"
                min="0"
                max="10"
                defaultValue="5"
                onChange={handleChange}
                className="synth-slider bg-[#ecc5d6]"
              />
              <label className="control-label">Contour</label>
              <input
                name="contour"
                data-param="filter"
                type="range"
                min="0"
                max="10"
                defaultValue="10"
                onChange={handleChange}
                className="synth-slider bg-[#ecc5d6]"
              />
              <label className="control-label">Start Freq</label>
              <input
                name="filter-start"
                data-param="filter"
                type="range"
                min="20"
                max="5000"
                step="50"
                defaultValue="200"
                onChange={handleChange}
                className="synth-slider bg-[#ecc5d6]"
              />
            </div>
          </div>
        </div>

        {/* Volume Filter */}
        <div className="bg-[#e25d34] p-3 md:border-r-4 border-[#0c0c0c]">
          <h2 className="module-title text-[#ff7c7c]">Volume Filter</h2>
          <label className="control-label">Attack</label>
          <input
            name="attack"
            data-param="volume-filter"
            type="range"
            min="0"
            max="5"
            step="0.1"
            defaultValue="0"
            onChange={handleChange}
            className="synth-slider bg-[#fe8864]"
          />
          <label className="control-label">Decay</label>
          <input
            name="decay"
            data-param="volume-filter"
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            defaultValue="1"
            onChange={handleChange}
            className="synth-slider bg-[#fe8864]"
          />
          <label className="control-label">Sustain</label>
          <input
            name="sustain"
            data-param="volume-filter"
            type="range"
            min="0.1"
            max="1"
            step="0.01"
            defaultValue="0.5"
            onChange={handleChange}
            className="synth-slider bg-[#fe8864]"
          />
          <label className="control-label">Release</label>
          <input
            name="release"
            data-param="volume-filter"
            type="range"
            min="0"
            max="10"
            step="0.1"
            defaultValue="0.3"
            onChange={handleChange}
            className="synth-slider bg-[#fe8864]"
          />
        </div>

        {/* Noise & Output stacked */}
        <div className="flex flex-col">
          <div className="bg-[#a25ca5] p-3 flex-1">
            <h2 className="module-title text-[#a981c0]">Noise</h2>
            <label className="control-label">Level</label>
            <input
              name="level"
              data-param="noise"
              type="range"
              min="0"
              max="1"
              step="0.1"
              defaultValue="0"
              onChange={handleChange}
              className="synth-slider bg-[#a981c0] w-full max-w-[120px]"
            />
            <label className="control-label">Filter Freq</label>
            <input
              name="noise-freq"
              data-param="noise"
              type="range"
              min="100"
              max="8000"
              step="100"
              defaultValue="1000"
              onChange={handleChange}
              className="synth-slider bg-[#a981c0] w-full max-w-[120px]"
            />
            <label className="control-label">Filter Q</label>
            <input
              name="noise-q"
              data-param="noise"
              type="range"
              min="0.1"
              max="10"
              step="0.1"
              defaultValue="1"
              onChange={handleChange}
              className="synth-slider bg-[#a981c0] w-full max-w-[120px]"
            />
          </div>
          <div className="bg-[#0099cc] p-3 flex-1">
            <h2 className="module-title text-[#a5a5da]">Output</h2>
            <label className="control-label">Volume</label>
            <input
              name="volume"
              data-param="volume"
              type="range"
              min="0"
              max="1"
              step="0.01"
              defaultValue="0.5"
              onChange={handleChange}
              className="synth-slider bg-[#49bce2] w-full max-w-[120px]"
            />
          </div>
        </div>
      </div>
      </div>

      {/* Keyboard */}
      <ResponsiveKeyboard
        onNoteOn={handleNoteOn}
        onNoteOff={handleNoteOff}
        activeColor="#FFE976"
      />
    </div>
  );
}
