type AudioSettings = { enabled: boolean; quiet: boolean; complete: boolean; visible: boolean; paused: boolean };

/** Created only in a client effect. Playback is unlocked by a user gesture. */
export class ActivityAudio {
  private music = new Audio("/audio/classroom-music.mp3");
  private correct = new Audio("/audio/correct-answer.mp3");
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private voices = new Set<OscillatorNode>();
  private started = false;
  private disposed = false;
  private settings: AudioSettings = { enabled: true, quiet: false, complete: false, visible: true, paused: false };

  constructor() {
    this.music.loop = true;
    this.music.preload = "none";
    this.correct.preload = "auto";
    this.correct.volume = 0.85;
  }

  configure(settings: Partial<AudioSettings>) {
    this.settings = { ...this.settings, ...settings };
    this.sync();
  }

  activate() {
    if (this.disposed || !this.settings.enabled || !this.settings.visible || this.settings.paused) return;
    this.started = true;
    if (!this.context) {
      try {
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.master.connect(this.context.destination);
        this.musicGain = this.context.createGain();
        this.musicGain.gain.value = this.settings.quiet ? 0.07 : 0.3;
        // A gain node also controls music volume on mobile browsers that ignore
        // HTMLMediaElement.volume, so the teacher's question stays audible.
        this.context.createMediaElementSource(this.music).connect(this.musicGain);
        this.musicGain.connect(this.master);
        this.context.createMediaElementSource(this.correct).connect(this.master);
      } catch { /* HTML audio remains available on browsers without Web Audio. */ }
    }
    if (this.context?.state !== "closed") void this.context?.resume().catch(() => {});
    this.sync();
  }

  private play(audio: HTMLAudioElement) {
    try { void audio.play().catch(() => {}); }
    catch { /* Missing audio or autoplay restrictions must not stop the game. */ }
  }

  private stopEffects() {
    this.correct.pause();
    this.correct.currentTime = 0;
    for (const oscillator of this.voices) {
      try { oscillator.stop(); } catch { /* It may already have ended. */ }
    }
    this.voices.clear();
  }

  private sync() {
    if (this.disposed) return;
    const audible = this.settings.enabled && this.settings.visible;
    const volume = this.settings.quiet ? 0.07 : 0.3;
    this.music.muted = !audible;
    this.correct.muted = !audible;
    if (this.context && this.master) {
      this.master.gain.setValueAtTime(audible ? 1 : 0, this.context.currentTime);
    }
    if (this.context && this.musicGain) {
      this.music.volume = 1;
      this.musicGain.gain.cancelScheduledValues(this.context.currentTime);
      this.musicGain.gain.setTargetAtTime(volume, this.context.currentTime, 0.12);
    } else {
      this.music.volume = volume;
    }
    if (audible && this.started && !this.settings.complete && !this.settings.paused) {
      if (this.context && this.context.state !== "running" && this.context.state !== "closed") void this.context.resume().catch(() => {});
      this.play(this.music);
    } else this.music.pause();
    if (!audible || this.settings.complete || this.settings.paused) this.stopEffects();
    if (this.settings.complete) this.music.currentTime = 0;
  }

  playCorrect() {
    this.activate();
    if (this.disposed || !this.settings.enabled || !this.settings.visible || this.settings.complete || this.settings.paused) return;
    this.correct.pause();
    this.correct.currentTime = 0;
    this.play(this.correct);
  }

  tone(frequency: number, length = 0.07, delay = 0) {
    const context = this.context;
    if (this.disposed || !this.settings.enabled || !this.settings.visible || this.settings.paused || context?.state !== "running") return;
    try {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime + delay;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.1, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, start + length);
      oscillator.connect(gain);
      gain.connect(this.master ?? context.destination);
      this.voices.add(oscillator);
      oscillator.onended = () => { this.voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(start);
      oscillator.stop(start + length);
    } catch { /* Spin effects are optional on TV browsers. */ }
  }

  dispose() {
    this.disposed = true;
    this.music.pause();
    this.stopEffects();
    for (const audio of [this.music, this.correct]) {
      audio.removeAttribute("src");
      audio.load();
    }
    if (this.context) void this.context.close().catch(() => {});
  }
}
