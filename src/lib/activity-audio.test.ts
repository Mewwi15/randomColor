import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { ActivityAudio } from "./activity-audio.ts";

function setup(t: TestContext, webAudio = true) {
  class Media {
    src: string;
    loop = false;
    preload = "";
    volume = 1;
    muted = false;
    paused = true;
    currentTime = 0;
    plays = 0;
    rejectPlayback = false;
    constructor(src: string) { this.src = src; media.push(this); }
    play() {
      this.plays++;
      if (this.rejectPlayback) return Promise.reject(new Error("Autoplay unavailable"));
      this.paused = false;
      return Promise.resolve();
    }
    pause() { this.paused = true; }
    removeAttribute() { this.src = ""; }
    load() {}
  }
  class Parameter {
    value = 1;
    setValueAtTime(value: number) { this.value = value; }
    setTargetAtTime(value: number) { this.value = value; }
    cancelScheduledValues() {}
  }
  class Context {
    currentTime = 0;
    state = "suspended";
    destination = {};
    gains: { gain: Parameter; connect: () => void }[] = [];
    constructor() { contexts.push(this); }
    createGain() {
      const gain = { gain: new Parameter(), connect() {} };
      this.gains.push(gain);
      return gain;
    }
    createMediaElementSource() { return { connect() {} }; }
    resume() { this.state = "running"; return Promise.resolve(); }
    close() { this.state = "closed"; return Promise.resolve(); }
  }
  const media: Media[] = [];
  const contexts: Context[] = [];
  const previousAudio = Object.getOwnPropertyDescriptor(globalThis, "Audio");
  const previousContext = Object.getOwnPropertyDescriptor(globalThis, "AudioContext");
  Object.defineProperty(globalThis, "Audio", { configurable: true, value: Media });
  Object.defineProperty(globalThis, "AudioContext", { configurable: true, value: webAudio ? Context : undefined });
  const audio = new ActivityAudio();
  t.after(() => {
    audio.dispose();
    if (previousAudio) Object.defineProperty(globalThis, "Audio", previousAudio);
    else Reflect.deleteProperty(globalThis, "Audio");
    if (previousContext) Object.defineProperty(globalThis, "AudioContext", previousContext);
    else Reflect.deleteProperty(globalThis, "AudioContext");
  });
  return { audio, music: media[0], correct: media[1], contexts };
}

test("music waits for interaction, loops, and becomes quieter for questions without replaying the answer sound", t => {
  const { audio, music, correct, contexts } = setup(t);
  audio.configure({ enabled: true, quiet: true });
  assert.equal(music.plays, 0);
  assert.equal(correct.plays, 0);
  audio.activate();
  assert.equal(music.paused, false);
  assert.equal(music.loop, true);
  assert.equal(contexts[0].gains[1].gain.value, 0.07);
  audio.configure({ quiet: false });
  assert.equal(contexts[0].gains[1].gain.value, 0.3);
  assert.equal(correct.plays, 0);
  audio.playCorrect();
  assert.equal(correct.plays, 1);
  assert.equal(correct.loop, false);
});

test("mute stops music and the correct-answer cue, and unmute continues the same music position", t => {
  const { audio, music, correct, contexts } = setup(t);
  audio.activate();
  music.currentTime = 42;
  audio.playCorrect();
  audio.configure({ enabled: false });
  assert.equal(music.paused, true);
  assert.equal(correct.paused, true);
  assert.equal(contexts[0].gains[0].gain.value, 0);
  audio.playCorrect();
  assert.equal(correct.plays, 1);
  audio.configure({ enabled: true });
  audio.activate();
  assert.equal(music.paused, false);
  assert.equal(music.currentTime, 42);
  assert.equal(correct.plays, 1);
});

test("hiding the page pauses sound; completion stops music until a new game begins", t => {
  const { audio, music, correct } = setup(t);
  audio.activate();
  music.currentTime = 25;
  audio.configure({ visible: false });
  audio.playCorrect();
  assert.equal(music.paused, true);
  assert.equal(correct.plays, 0);
  audio.configure({ visible: true });
  assert.equal(music.currentTime, 25);
  assert.equal(music.paused, false);
  audio.configure({ complete: true });
  audio.activate();
  assert.equal(music.paused, true);
  assert.equal(music.currentTime, 0);
  audio.configure({ complete: false });
  assert.equal(music.paused, false);
});

test("saved mute preference never starts sound; disposing prevents playback after leaving the page", t => {
  const { audio, music, correct } = setup(t);
  audio.configure({ enabled: false });
  audio.activate();
  audio.playCorrect();
  assert.equal(music.plays, 0);
  assert.equal(correct.plays, 0);
  audio.dispose();
  audio.configure({ enabled: true });
  audio.activate();
  audio.playCorrect();
  assert.equal(music.plays, 0);
  assert.equal(correct.plays, 0);
});

test("HTML audio fallback works without Web Audio and rejected playback does not throw", async t => {
  const { audio, music, correct } = setup(t, false);
  audio.activate();
  assert.equal(music.paused, false);
  assert.equal(music.volume, 0.3);
  audio.configure({ quiet: true });
  assert.equal(music.volume, 0.07);
  music.rejectPlayback = true;
  correct.rejectPlayback = true;
  assert.doesNotThrow(() => audio.playCorrect());
  await new Promise(resolve => setImmediate(resolve));
});

for (const webAudio of [true, false]) {
  test(`countdown music pauses without rewinding and only restarts from the beginning after completion (${webAudio ? "Web Audio" : "HTML audio"})`, t => {
    const { audio, music, correct } = setup(t, webAudio);
    audio.configure({ paused: true });
    audio.activate();
    assert.equal(music.plays, 0, "settings interactions before starting must stay silent");

    audio.configure({ paused: false });
    audio.activate();
    assert.equal(music.paused, false);
    music.currentTime = 42;
    audio.configure({ paused: true });
    audio.configure({ enabled: false });
    audio.configure({ enabled: true, quiet: true });
    audio.activate();
    assert.equal(music.paused, true, "unmuting in settings must not resume a paused timer's music");
    assert.equal(music.currentTime, 42);

    audio.configure({ paused: false, quiet: false });
    audio.activate();
    assert.equal(music.paused, false);
    assert.equal(music.currentTime, 42);
    audio.configure({ paused: true, complete: true });
    assert.equal(music.paused, true);
    assert.equal(music.currentTime, 0);
    audio.configure({ paused: false, complete: false });
    audio.activate();
    assert.equal(music.paused, false);
    assert.equal(music.currentTime, 0);
    assert.equal(correct.plays, 0, "countdown controls must not trigger the correct-answer cue");
  });
}

test("leaving a mode stops active music and later events cannot restart that instance", t => {
  const { audio, music, contexts } = setup(t);
  audio.activate();
  assert.equal(music.paused, false);
  audio.dispose();
  const plays = music.plays;
  audio.configure({ visible: true, enabled: true, paused: false });
  audio.activate();
  assert.equal(music.paused, true);
  assert.equal(music.plays, plays);
  assert.equal(music.src, "");
  assert.equal(contexts[0].state, "closed");
});
