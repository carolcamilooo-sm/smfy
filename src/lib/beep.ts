let audioContext: AudioContext | null = null;

export function playBeep() {
  if (typeof window === "undefined") return;
  try {
    audioContext ??= new AudioContext();
    const ctx = audioContext;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.35);
  } catch {
    // Audio isn't critical to the feature — ignore playback failures
    // (e.g. autoplay restrictions before the first user interaction).
  }
}
