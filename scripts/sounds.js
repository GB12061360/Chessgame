class Soundscape {
  constructor() {
    this.enabled = true;
    this.context = null;
    this.master = null;
    this.initialized = false;
    this.createContext();
    document.addEventListener('click', () => this.unlock(), { once: true });
  }

  createContext() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      this.enabled = false;
      return;
    }
    this.context = new AudioCtx();
    this.master = this.context.createGain();
    this.master.gain.value = 0.18;
    this.master.connect(this.context.destination);
  }

  unlock() {
    if (!this.enabled || !this.context) return;
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
  }

  playTone(frequency, duration = 0.2, options = {}) {
    if (!this.enabled || !this.context) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = options.type || 'sine';
    oscillator.frequency.setValueAtTime(frequency, this.context.currentTime);

    const now = this.context.currentTime;
    gain.gain.setValueAtTime(options.attack || 0.001, now);
    gain.gain.exponentialRampToValueAtTime(options.peak || 0.25, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(options.sustain || 0.001, now + duration);

    oscillator.connect(gain);
    gain.connect(this.master);

    oscillator.start(now);
    oscillator.stop(now + duration + 0.05);
  }

  playSweep(frequencies, duration = 0.4) {
    if (!this.enabled || !this.context) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = 'triangle';
    const now = this.context.currentTime;
    const startFrequency = frequencies[0] || 440;
    oscillator.frequency.setValueAtTime(startFrequency, now);
    frequencies.forEach((freq, index) => {
      oscillator.frequency.linearRampToValueAtTime(freq, now + (duration / Math.max(1, frequencies.length - 1)) * index);
    });
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.4, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.1);
  }

  playMove() {
    this.playTone(680, 0.14, { type: 'triangle', peak: 0.3, sustain: 0.001 });
  }

  playCapture() {
    this.playSweep([220, 160, 440], 0.45);
  }

  playCheck() {
    this.playTone(1040, 0.4, { type: 'sawtooth', peak: 0.35, sustain: 0.002 });
  }

  playWin() {
    this.playSweep([440, 660, 880, 1320], 1.2);
  }
}

window.Soundscape = Soundscape;
