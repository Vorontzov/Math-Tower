export function createAudio() {
  let context, enabled = false;
  return {
    toggle() { enabled = !enabled; if (enabled) { context ||= new AudioContext(); context.resume(); } return enabled; },
    play(kind) {
      if (!enabled || !context) return;
      const oscillator = context.createOscillator(), gain = context.createGain();
      oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(kind === 'solve' ? 660 : 330, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(kind === 'solve' ? 990 : 110, context.currentTime + .15);
      gain.gain.setValueAtTime(.045, context.currentTime); gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .2);
      oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + .21);
    },
  };
}
