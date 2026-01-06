/**
 * ADSR Envelope Generator
 */

import { getAudioEngine } from './audio-engine';

export interface EnvelopeOptions {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  startLevel?: number;
  maxLevel?: number;
}

export class Envelope {
  private attack: number;
  private decay: number;
  private sustain: number;
  private release: number;
  private startLevel: number;
  private maxLevel: number;
  private param: AudioParam | null = null;
  private releaseStartTime: number = 0;

  constructor(options: EnvelopeOptions) {
    this.attack = options.attack;
    this.decay = options.decay;
    this.sustain = options.sustain;
    this.release = options.release;
    this.startLevel = options.startLevel ?? 0;
    this.maxLevel = options.maxLevel ?? 1;
  }

  /**
   * Connect envelope to an AudioParam
   */
  connect(param: AudioParam): this {
    this.param = param;
    return this;
  }

  /**
   * Trigger the attack/decay/sustain phase
   */
  trigger(startTime?: number): void {
    if (!this.param) return;

    const audioEngine = getAudioEngine();
    // Ensure we're scheduling in the future
    const now = Math.max(startTime ?? audioEngine.currentTime, audioEngine.currentTime);

    // Minimum times to avoid zero-duration ramps
    const attackTime = Math.max(this.attack, 0.001);
    const decayTime = Math.max(this.decay, 0.001);

    // Cancel any scheduled values from this point forward
    this.param.cancelScheduledValues(now);

    // For exponentialRamp, we can't start from 0, so use a small value
    const safeStartLevel = Math.max(this.startLevel, 0.0001);
    const safeMaxLevel = Math.max(this.maxLevel, 0.0001);
    const safeSustain = Math.max(this.sustain, 0.0001);

    // Set initial value
    this.param.setValueAtTime(safeStartLevel, now);

    // Attack phase - exponential ramp sounds more natural and "immediate"
    // The ear perceives exponential changes as more even
    this.param.exponentialRampToValueAtTime(safeMaxLevel, now + attackTime);

    // Decay phase - ramp to sustain level
    this.param.exponentialRampToValueAtTime(safeSustain, now + attackTime + decayTime);
  }

  /**
   * Trigger the release phase
   */
  triggerRelease(releaseTime?: number): void {
    if (!this.param) return;

    const audioEngine = getAudioEngine();
    const now = Math.max(releaseTime ?? audioEngine.currentTime, audioEngine.currentTime);
    this.releaseStartTime = now;

    const releaseTime_ = Math.max(this.release, 0.001);

    // For exponentialRamp, we can't end at 0, so use a small value
    const safeStartLevel = Math.max(this.startLevel, 0.0001);

    // Cancel future scheduled values and hold current value
    this.param.cancelScheduledValues(now);

    // Get current value, ensuring it's valid for exponential ramp
    const currentValue = Math.max(this.param.value, 0.0001);
    this.param.setValueAtTime(currentValue, now);

    // Release phase - exponential ramp to near-zero
    this.param.exponentialRampToValueAtTime(safeStartLevel, now + releaseTime_);
  }

  /**
   * Get the time when the envelope will finish (after release)
   */
  getEndTime(releaseTime?: number): number {
    const releaseStart = releaseTime ?? this.releaseStartTime;
    return releaseStart + this.release;
  }

  /**
   * Update envelope parameters
   */
  update(options: Partial<EnvelopeOptions>): void {
    if (options.attack !== undefined) this.attack = options.attack;
    if (options.decay !== undefined) this.decay = options.decay;
    if (options.sustain !== undefined) this.sustain = options.sustain;
    if (options.release !== undefined) this.release = options.release;
    if (options.startLevel !== undefined) this.startLevel = options.startLevel;
    if (options.maxLevel !== undefined) this.maxLevel = options.maxLevel;
  }

  getRelease(): number {
    return this.release;
  }
}
