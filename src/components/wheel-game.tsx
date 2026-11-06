"use client";

import Image from "next/image";
import { useCallback, useEffect, useReducer, useRef, useState, type CSSProperties } from "react";
import backdrop from "../../UI/Welcome/bg.png";
import { Icon } from "./icon";
import { LuckyWheel } from "./lucky-wheel";
import { PicturePlaceholder } from "./picture-placeholder";
import { CreamMascot, type CreamPose } from "./cream-mascot";
import { DEFAULT_ENTRIES, PALETTE, colorAnswerTone, randomIndex } from "@/lib/wheel";
import { ActivityAudio } from "@/lib/activity-audio";
import { ACTIVITY_STORAGE_KEY, COLOR_LIMIT, PICTURE_ENTRIES, TOTAL_ROUNDS, activityReducer, availableColors, availablePictures, canSpin, colorUses, initialActivity, isShowingResult, isSpinning, restoreActivity, type WheelKind } from "@/lib/activity";

export function WheelGame() {
  const [state, dispatch] = useReducer(activityReducer, undefined, initialActivity);
  const [ready, setReady] = useState(false);
  const [sound, setSound] = useState(true);
  const [tvMode, setTvMode] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [resetOpen, setResetOpen] = useState(false);
  const soundRef = useRef(true);
  const spinningRef = useRef(false);
  const audioRef = useRef<ActivityAudio | null>(null);
  const revealingRef = useRef(false);
  const resultDialog = useRef<HTMLDialogElement>(null);
  const resetDialog = useRef<HTMLDialogElement>(null);

  const spinning = isSpinning(state);
  const showingResult = isShowingResult(state);
  const complete = state.phase === "complete";
  const colors = availableColors(state);
  const pictures = availablePictures(state);
  const roundNumber = Math.min(state.rounds.length + 1, TOTAL_ROUNDS);
  const resultColor = DEFAULT_ENTRIES.find(entry => entry.id === state.pendingColorId);
  const answerTone = resultColor ? colorAnswerTone(resultColor.color) : null;
  const resultImage = PICTURE_ENTRIES.find(entry => entry.id === state.pendingImageId);
  const revealed = state.phase === "color-answer";
  const colorResult = state.phase === "color-question" || revealed;
  const canSelect = ready && !spinning && !showingResult && !complete;
  const creamPose: CreamPose = complete || state.phase === "image-result" ? "celebrate"
    : spinning ? "suspense"
    : state.phase === "color-question" ? "thinking"
    : revealed ? "encourage"
    : state.phase === "image-ready" ? "guide" : "welcome";

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ACTIVITY_STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        const restored = restoreActivity(data.game);
        if (restored) dispatch({ type: "restore", state: restored });
        if (typeof data.sound === "boolean") { setSound(data.sound); soundRef.current = data.sound; }
      }
    } catch { setStorageAvailable(false); }
    setReady(true);
  }, []);

  useEffect(() => {
    const audio = new ActivityAudio();
    audioRef.current = audio;
    audio.configure({ enabled: soundRef.current, visible: !document.hidden });
    const activate = (event: Event) => {
      if (event.target instanceof Element && event.target.closest("[data-sound-toggle]")) return;
      if (event instanceof KeyboardEvent && (event.repeat || !["Enter", " "].includes(event.key))) return;
      audio.activate();
    };
    const onVisibility = () => audio.configure({ visible: !document.hidden });
    document.addEventListener("click", activate, true);
    document.addEventListener("keydown", activate, true);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("click", activate, true);
      document.removeEventListener("keydown", activate, true);
      document.removeEventListener("visibilitychange", onVisibility);
      audio.dispose();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    audioRef.current?.configure({ enabled: sound, quiet: showingResult || resetOpen, complete });
  }, [sound, showingResult, resetOpen, complete]);

  useEffect(() => { revealingRef.current = false; }, [state.phase]);

  useEffect(() => {
    if (!ready || spinning) return;
    try { localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify({ game: state, sound })); }
    catch { setStorageAvailable(false); }
  }, [state, sound, ready, spinning]);

  useEffect(() => {
    const dialog = resultDialog.current;
    if (showingResult && dialog && !dialog.open) dialog.showModal();
    if (!showingResult && dialog?.open) {
      dialog.close();
      document.getElementById(state.phase === "complete" ? "complete-restart" : `spin-${state.activeWheel}`)?.focus({ preventScroll: true });
    }
  }, [showingResult, state.activeWheel, state.phase]);

  useEffect(() => {
    if (resetOpen && resetDialog.current && !resetDialog.current.open) resetDialog.current.showModal();
    if (!resetOpen && resetDialog.current?.open) resetDialog.current.close();
  }, [resetOpen]);

  useEffect(() => {
    const onFullscreen = () => { if (!document.fullscreenElement) setTvMode(false); };
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, []);

  const tone = useCallback((frequency: number, length = 0.07, delay = 0) => {
    audioRef.current?.tone(frequency, length, delay);
  }, []);

  useEffect(() => {
    spinningRef.current = spinning;
    if (!spinning) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (state.duration > 120) {
      for (let i = 0; i < 29; i++) timers.push(setTimeout(() => tone(650 + i * 12), Math.pow(i / 29, 1.65) * state.duration));
    }
    timers.push(setTimeout(() => {
      dispatch({ type: "land" });
      [523.25, 659.25, 783.99, 1046.5].forEach((note, i) => tone(note, 0.28, i * 0.12));
    }, state.duration + 80));
    return () => timers.forEach(clearTimeout);
  }, [spinning, state.duration, tone]);

  const spin = useCallback((wheel: WheelKind) => {
    if (!ready || resetOpen || spinningRef.current || !canSpin(state, wheel)) return;
    spinningRef.current = true;
    const entries = wheel === "color" ? availableColors(state) : availablePictures(state);
    const entry = entries[randomIndex(entries.length)];
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 120 : 5400;
    audioRef.current?.activate();
    dispatch({ type: "spin", wheel, entryId: entry.id, duration });
  }, [ready, resetOpen, state]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === "Escape" && !document.fullscreenElement) setTvMode(false);
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || showingResult || resetOpen) return;
      if ((event.target as HTMLElement).closest("button, input, textarea, select, [contenteditable], dialog")) return;
      if (event.code === "Space") { event.preventDefault(); spin(state.activeWheel); }
      if (event.code === "Digit1") dispatch({ type: "select", wheel: "color" });
      if (event.code === "Digit2") dispatch({ type: "select", wheel: "image" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [resetOpen, showingResult, spin, state.activeWheel]);

  async function toggleTvMode() {
    if (tvMode) {
      setTvMode(false);
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    } else {
      setTvMode(true);
      if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen().catch(() => {});
    }
  }

  function restart() {
    dispatch({ type: "reset" });
    setResetOpen(false);
    requestAnimationFrame(() => document.getElementById("spin-color")?.focus({ preventScroll: true }));
  }

  function toggleSound() {
    const enabled = !soundRef.current;
    soundRef.current = enabled;
    audioRef.current?.configure({ enabled });
    if (enabled) audioRef.current?.activate();
    setSound(enabled);
  }

  function revealAnswer() {
    if (state.phase !== "color-question" || revealingRef.current) return;
    revealingRef.current = true;
    audioRef.current?.playCorrect();
    dispatch({ type: "reveal" });
  }

  return <main className={`game-shell${tvMode ? " tv-mode" : ""}${spinning ? " wheel-is-spinning" : ""}`}>
    <div className="scene-background" aria-hidden="true"><Image src={backdrop} alt="" fill preload sizes="100vw" /><div className="scene-tint" /></div>
    <header className="topbar">
      <h1 id="game-title">วงล้อ<span>ศิลป์ถิ่นเรา</span></h1>
      <div className="header-actions">
        <button className="glass-button" title="เริ่มใหม่" aria-label="เริ่มใหม่" onClick={() => setResetOpen(true)} disabled={!ready || spinning || showingResult}><Icon name="history" /></button>
        <button className="glass-button" data-sound-toggle title={sound ? "ปิดเสียง" : "เปิดเสียง"} aria-label={sound ? "ปิดเสียง" : "เปิดเสียง"} aria-pressed={sound} onClick={toggleSound}><Icon name={sound ? "sound" : "muted"} /></button>
        <button className="glass-button" title={tvMode ? "ออกจากโหมด TV" : "โหมด TV"} aria-label={tvMode ? "ออกจากโหมด TV" : "โหมด TV"} onClick={toggleTvMode} aria-pressed={tvMode}><Icon name={tvMode ? "close" : "expand"} /></button>
      </div>
    </header>

    <section className="wheel-stage" aria-labelledby="game-title">
      <CreamMascot pose={creamPose} />
      {(["color", "image"] as const).map(wheel => {
        const active = state.activeWheel === wheel;
        const entries = wheel === "color" ? colors : pictures;
        const waitingForOtherWheel = active && !spinning && !complete && !canSpin(state, wheel);
        return <section key={wheel} id={`wheel-${wheel}`} className={`wheel-card ${active ? "is-active" : "is-inactive"}`} aria-label={`วงล้อ${wheel === "color" ? "สี" : "ภาพ"}`}>
          <h2 className="wheel-label">วงล้อ{wheel === "color" ? "สี" : "ภาพ"}</h2>
          <div className="wheel-visual">
            <div className="wheel-render"><LuckyWheel entries={entries} variant={wheel} rotation={wheel === "color" ? state.colorRotation : state.imageRotation} spinning={spinning && active} duration={spinning && active ? state.duration : 0} onSpin={() => spin(wheel)} disabled={!ready || !canSpin(state, wheel)} /></div>
            {!active && <button className="select-wheel-overlay" aria-label={`เลือกวงล้อ${wheel === "color" ? "สี" : "ภาพ"}`} disabled={!canSelect} onClick={() => dispatch({ type: "select", wheel })}><span>วงล้อ{wheel === "color" ? "สี" : "ภาพ"}</span></button>}
          </div>
          {active && (complete
            ? <button id="complete-restart" className="spin-button stage-spin-button" onClick={restart}>ครบ 10 รอบ · เริ่มใหม่ <Icon name="history" /></button>
            : <button id={`spin-${wheel}`} className="spin-button stage-spin-button" disabled={!ready || !canSpin(state, wheel)} onClick={() => spin(wheel)}><Icon name="sparkles" size={26}/><span>{spinning ? "กำลังหมุน…" : waitingForOtherWheel ? wheel === "image" ? "สุ่มสีและเฉลยก่อน" : "ไปสุ่มภาพต่อ" : `หมุนวงล้อ${wheel === "color" ? "สี" : "ภาพ"}`}</span></button>)}
        </section>;
      })}
    </section>
    {!storageAvailable && <p className="storage-notice" role="status">กรุณาเปิดหน้านี้ไว้จนจบกิจกรรม เบราว์เซอร์นี้บันทึกความคืบหน้าไม่ได้</p>}

    <dialog ref={resultDialog} className="result-dialog" onCancel={event => event.preventDefault()} aria-labelledby="result-title" aria-describedby="result-instruction">
      {showingResult && <div className={`result-content ${colorResult ? "color-result" : "image-result"}`}>
        <div className="result-guide">{!colorResult && <CreamMascot pose={creamPose} placement="result" />}<span className="result-round">รอบที่ {roundNumber} / {TOTAL_ROUNDS} · {colorResult ? "สีที่สุ่มได้" : "ภาพที่สุ่มได้"}</span><button className="glass-button" data-sound-toggle title={sound ? "ปิดเสียง" : "เปิดเสียง"} aria-label={sound ? "ปิดเสียง" : "เปิดเสียง"} aria-pressed={sound} onClick={toggleSound}><Icon name={sound ? "sound" : "muted"} size={18} /></button></div>
        {colorResult && resultColor ? <>
          <div className="color-result-body">
            <CreamMascot pose={creamPose} placement="result" />
            <div className="color-choice"><div className="result-color-swatch" style={{ background: resultColor.color }} aria-hidden="true" /><h2 id="result-title" className="result-title">{resultColor.label}</h2></div>
            <div className="color-prompt">{!revealed ? <>
              <p id="result-instruction" className="question-text">สีนี้เป็นโทนร้อน หรือโทนเย็น?</p><p className="teacher-hint">ให้นักเรียนตอบคุณครูก่อน แล้วค่อยเปิดเฉลย</p>
            </> : <>
              <div className={`tone-answer ${answerTone}`} role="status"><span>{answerTone === "both" ? "เป็นได้ทั้งสองโทน" : "เฉลยคำตอบ"}</span><strong>{answerTone === "both" ? <><span>สีโทนร้อน</span><span className="tone-join">และ</span><span>สีโทนเย็น</span></> : answerTone === "warm" ? "สีโทนร้อน" : "สีโทนเย็น"}</strong></div>
              <p id="result-instruction" className="retirement-note">{colorUses(state, resultColor.id) + 1 >= COLOR_LIMIT ? `${resultColor.label}ออกครบ 2 ครั้งแล้ว จะตัดออกจากวงล้อ` : `${resultColor.label}ออกครั้งที่ 1 จาก 2 ครั้ง`}</p>
            </>}</div>
          </div>
          {!revealed
            ? <button autoFocus className="teacher-button" onClick={revealAnswer}><Icon name="sparkles" size={28}/> ครู: เฉลยคำตอบ</button>
            : <button autoFocus className="spin-button" onClick={() => dispatch({ type: "continue-color" })}>ไปสุ่มภาพต่อ <Icon name="arrow" size={28}/></button>}
        </> : resultImage && <>
          <div className="result-artwork">{resultImage.imageSrc ? <Image src={resultImage.imageSrc} alt={resultImage.label} fill sizes="(max-width: 700px) 92vw, 760px" /> : <PicturePlaceholder number={PICTURE_ENTRIES.indexOf(resultImage) + 1} size={280} />}</div>
          <h2 id="result-title" className={`result-title image-title${(resultImage.wheelLabelLines?.length ?? 1) > 2 ? " is-long" : ""}`}>{resultImage.label}</h2>
          <p id="result-instruction" className="picture-pair">คู่กับ <span className="color-dot" style={{ background: resultColor?.color }}/><strong>{resultColor?.label}</strong></p>
          <button autoFocus className="spin-button" onClick={() => dispatch({ type: "next-round" })}>{roundNumber === TOTAL_ROUNDS ? "จบกิจกรรม" : "จบรอบนี้ · เล่นรอบถัดไป"}<Icon name="arrow" size={26}/></button>
        </>}
        {revealed && <div className="confetti" aria-hidden="true">{Array.from({ length: 20 }, (_, i) => <i key={i} style={{ "--x": `${i * 37 % 100}%`, "--delay": `${i % 7 * -0.3}s`, "--color": PALETTE[i % PALETTE.length], "--tilt": `${i * 47}deg` } as CSSProperties}/>)}</div>}
      </div>}
    </dialog>

    <dialog ref={resetDialog} className="reset-dialog" onCancel={() => setResetOpen(false)} aria-labelledby="reset-title">
      <h2 id="reset-title">เริ่มกิจกรรมใหม่?</h2><p>เริ่มนับ 10 รอบใหม่ และนำสีทั้ง 8 สีกลับเข้าวงล้อ</p><div><button className="glass-button" autoFocus onClick={() => setResetOpen(false)}>เล่นต่อจากเดิม</button><button className="teacher-button" onClick={restart}>เริ่มใหม่</button></div>
    </dialog>
    <div className="sr-only" aria-live="polite">{spinning ? `กำลังหมุนวงล้อ${state.activeWheel === "color" ? "สี" : "ภาพ"}` : complete ? "จบกิจกรรม ครบ 10 รอบแล้ว" : `รอบที่ ${roundNumber} เสร็จแล้ว ${state.rounds.length} รอบ`}</div>
  </main>;
}
