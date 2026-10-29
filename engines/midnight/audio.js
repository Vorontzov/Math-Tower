export function createSound() {
  let ctx,
    master,
    rotorGain,
    rotorDepth,
    enabled = true,
    voice = false,
    room = "roof";
  function start() {
    if (ctx) {
      ctx.resume();
      return;
    }
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    ctx = new Audio();
    master = ctx.createGain();
    master.gain.value = enabled ? 0.22 : 0;
    master.connect(ctx.destination);
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate),
      data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++)
      data[i] = (Math.random() * 2 - 1) * 0.14;
    const wind = ctx.createBufferSource();
    wind.buffer = buffer;
    wind.loop = true;
    const low = ctx.createBiquadFilter();
    low.type = "lowpass";
    low.frequency.value = 270;
    wind.connect(low).connect(master);
    wind.start();
    for (const f of [55, 82.41, 116.54]) {
      const o = ctx.createOscillator(),
        g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      g.gain.value = 0.022;
      o.connect(g).connect(master);
      o.start();
    }
    const rotor = ctx.createOscillator(),
      mod = ctx.createOscillator(),
      depth = ctx.createGain();
    rotorDepth = depth;
    rotor.type = "triangle";
    rotor.frequency.value = 52;
    mod.frequency.value = 17;
    depth.gain.value = room === "roof" ? 0.025 : 0;
    rotorGain = ctx.createGain();
    rotorGain.gain.value = room === "roof" ? 0.06 : 0;
    mod.connect(depth).connect(rotorGain.gain);
    rotor.connect(rotorGain).connect(master);
    rotor.start();
    mod.start();
  }
  function tone(type) {
    if (!ctx || !enabled) return;
    const seq =
      type === "solve"
        ? [220, 330]
        : ["pulse", "stun"].includes(type)
          ? [170, 550]
          : type === "shove"
            ? [95, 65]
            : type === "jump"
              ? [260, 390]
              : type === "shard"
                ? [420, 310]
                : type === "hurt"
                  ? [160, 100]
                  : [330];
    seq.forEach((f, i) => {
      const o = ctx.createOscillator(),
        g = ctx.createGain(),
        t = ctx.currentTime + i * 0.09;
      o.type = ["pulse", "stun"].includes(type) ? "triangle" : "sine";
      o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.22, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      o.connect(g).connect(master);
      o.start(t);
      o.stop(t + 0.4);
    });
  }
  return {
    start,
    tone,
    setRoom(next) {
      room = next;
      if (rotorGain) {
        rotorGain.gain.setTargetAtTime(
          next === "roof" ? 0.06 : 0,
          ctx.currentTime,
          0.5,
        );
        rotorDepth.gain.setTargetAtTime(
          next === "roof" ? 0.025 : 0,
          ctx.currentTime,
          0.5,
        );
      }
    },
    toggle() {
      enabled = !enabled;
      if (master) master.gain.value = enabled ? 0.22 : 0;
      if (!enabled) window.speechSynthesis?.cancel();
      return enabled;
    },
    toggleVoice() {
      voice = !voice;
      if (!voice) window.speechSynthesis?.cancel();
      return voice;
    },
    say(text, speaker = "") {
      if (!text || !voice || !enabled || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const s = new SpeechSynthesisUtterance(text);
      // Device voices are optional. Prefer a female voice for Mara when the
      // operating system supplies one; subtitles and casting do not depend on it.
      if (speaker === "MARA VOSS") {
        const female = window.speechSynthesis
          .getVoices()
          .find((v) =>
            /Samantha|Victoria|Zira|Hazel|Susan|Serena|Moira|Tessa|Karen|Aria|Jenny|English Female/i.test(
              v.name,
            ),
          );
        if (female) s.voice = female;
      }
      s.rate = 0.92;
      s.pitch = 1;
      s.volume = 0.8;
      window.speechSynthesis.speak(s);
    },
    silence() {
      window.speechSynthesis?.cancel();
    },
    suspend() {
      ctx?.suspend();
      window.speechSynthesis?.cancel();
    },
    resume() {
      ctx?.resume();
    },
  };
}
