"use client";

import Image from "next/image";
import { useEffect, useReducer, useState, type FormEvent } from "react";
import backdrop from "../../UI/Welcome/bg.png";
import { CreamMascot } from "./cream-mascot";
import { Icon } from "./icon";
import { ModeNavigation } from "./mode-navigation";
import { COUNTDOWN_STORAGE_KEY, countdownReducer, formatCountdown, initialCountdown, remainingCountdown, restoreCountdown } from "@/lib/countdown";

const PRESETS = [5, 10, 15, 20, 30];

export function CountdownMode() {
  const [timer, dispatch] = useReducer(countdownReducer, undefined, initialCountdown);
  const [now, setNow] = useState(0);
  const [ready, setReady] = useState(false);
  const [minutes, setMinutes] = useState("10");
  const [seconds, setSeconds] = useState("0");
  const [error, setError] = useState("");
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const running = timer.status === "running";
  const finished = timer.status === "finished";
  const remaining = remainingCountdown(timer, now);
  const time = formatCountdown(remaining);
  const status = finished ? "หมดเวลาแล้ว" : running ? "กำลังนับถอยหลัง" : timer.status === "paused" ? "พักเวลาอยู่" : "พร้อมสร้างสรรค์ผลงาน";

  useEffect(() => {
    const current = Date.now();
    setNow(current);
    try {
      const saved = localStorage.getItem(COUNTDOWN_STORAGE_KEY);
      const restored = saved ? restoreCountdown(JSON.parse(saved), current) : null;
      if (restored) {
        dispatch({ type: "restore", state: restored });
        setMinutes(String(Math.floor(restored.durationMs / 60_000)));
        setSeconds(String(restored.durationMs / 1000 % 60));
      }
    } catch { setStorageAvailable(false); }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(COUNTDOWN_STORAGE_KEY, JSON.stringify(timer)); }
    catch { setStorageAvailable(false); }
  }, [timer, ready]);

  useEffect(() => {
    if (!running) return;
    const update = () => {
      const current = Date.now();
      setNow(current);
      if (remainingCountdown(timer, current) === 0) dispatch({ type: "finish", now: current });
    };
    update();
    const interval = setInterval(update, 200);
    document.addEventListener("visibilitychange", update);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", update); };
  }, [running, timer]);

  useEffect(() => {
    const update = () => setFullscreen(Boolean(document.fullscreenElement));
    update();
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  function chooseDuration(durationMs: number) {
    if (running || !ready) return;
    dispatch({ type: "set-duration", durationMs });
    setMinutes(String(Math.floor(durationMs / 60_000)));
    setSeconds(String(durationMs / 1000 % 60));
    setError("");
  }

  function setCustomTime(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const m = Number(minutes);
    const s = Number(seconds);
    if (!minutes.trim() || !seconds.trim() || !Number.isInteger(m) || !Number.isInteger(s) || m < 0 || m > 99 || s < 0 || s > 59 || m + s === 0) {
      setError("ตั้งเวลาได้ตั้งแต่ 00:01 ถึง 99:59 นาที");
      return;
    }
    chooseDuration((m * 60 + s) * 1000);
  }

  function toggleTimer() {
    const current = Date.now();
    setNow(current);
    dispatch({ type: running ? "pause" : "start", now: current });
    setError("");
  }

  async function toggleFullscreen() {
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen().catch(() => {});
  }

  return <main className={`game-shell timer-shell${finished ? " timer-finished" : ""}`}>
    <div className="scene-background" aria-hidden="true"><Image src={backdrop} alt="" fill preload sizes="100vw"/><div className="scene-tint"/></div>
    <header className="topbar">
      <div className="brand-modes"><h1>วงล้อ<span>ศิลป์ถิ่นเรา</span></h1><ModeNavigation current="timer"/></div>
      <div className="header-actions"><button className="glass-button" title={fullscreen ? "ออกจากเต็มจอ" : "เต็มจอ TV"} aria-label={fullscreen ? "ออกจากเต็มจอ" : "เต็มจอ TV"} aria-pressed={fullscreen} onClick={toggleFullscreen}><Icon name={fullscreen ? "close" : "expand"}/></button></div>
    </header>

    <div className="timer-workspace">
      <aside className="timer-mascot" aria-label="ครูครีมเป็นกำลังใจให้">
        <div className="timer-cheer">{finished ? "เก่งมากค่ะ!" : "ค่อย ๆ ระบาย ตั้งใจทำให้งามนะคะ"}</div>
        <CreamMascot pose={finished ? "celebrate" : timer.status === "paused" ? "thinking" : running ? "encourage" : "guide"} placement="timer"/>
      </aside>

      <section className="countdown-card" aria-labelledby="countdown-title">
        <div className="countdown-heading"><h2 id="countdown-title"><Icon name="timer" size={24}/>นาฬิกาถอยหลัง</h2><span className={`timer-status status-${timer.status}`} role="status">{status}</span></div>
        <div className={`timer-clock${running && remaining <= 60_000 ? " is-ending" : ""}`}>
          <div className="timer-digits" role="timer" aria-live="off" aria-label={`เหลือเวลา ${Math.floor(Math.ceil(remaining / 1000) / 60)} นาที ${Math.ceil(remaining / 1000) % 60} วินาที`}>{time}</div>
          <span className="timer-units">นาที : วินาที</span>
        </div>
        <div className="timer-progress" aria-hidden="true"><div style={{ transform: `scaleX(${remaining / timer.durationMs})` }}/></div>
        <div className="timer-controls">
          <button className="spin-button timer-start" onClick={toggleTimer} disabled={!ready}><Icon name={running ? "pause" : "play"} size={24}/>{running ? "พักเวลา" : timer.status === "paused" ? "นับต่อ" : finished ? "เริ่มอีกครั้ง" : "เริ่มจับเวลา"}</button>
          <button className="glass-button timer-reset" disabled={!ready} onClick={() => { dispatch({ type: "reset" }); setError(""); }}><Icon name="history"/>รีเซ็ต</button>
        </div>
        <div className="timer-settings">
          <div className="timer-presets" role="group" aria-label="เลือกเวลาสำเร็จรูป">{PRESETS.map(value => <button key={value} disabled={!ready || running} aria-pressed={timer.durationMs === value * 60_000} onClick={() => chooseDuration(value * 60_000)}>{value} นาที</button>)}</div>
          <form className="timer-custom" onSubmit={setCustomTime} aria-label="กำหนดเวลาเอง">
            <label>นาที<input type="number" inputMode="numeric" min="0" max="99" step="1" required value={minutes} disabled={!ready || running} onChange={event => { setMinutes(event.target.value); setError(""); }}/></label>
            <span aria-hidden="true">:</span>
            <label>วินาที<input type="number" inputMode="numeric" min="0" max="59" step="1" required value={seconds} disabled={!ready || running} onChange={event => { setSeconds(event.target.value); setError(""); }}/></label>
            <button className="glass-button" disabled={!ready || running} type="submit">ตั้งเวลา</button>
          </form>
        </div>
        {error && <p className="timer-error" role="alert">{error}</p>}
      </section>

      <section className="coloring-instruction" aria-label="คำสั่งกิจกรรมระบายสี">
        <span className="instruction-marker" aria-hidden="true"><Icon name="palette" size={36}/></span>
        <p><span>ให้นักเรียนระบายสีภาพที่สุ่มได้</span>{" "}<strong>โดยใช้โทนสีที่สุ่มได้</strong></p>
      </section>
    </div>
    {!storageAvailable && <p className="timer-storage-notice" role="status">กรุณาเปิดหน้านี้ไว้ระหว่างจับเวลา อุปกรณ์นี้บันทึกเวลาไม่ได้</p>}
  </main>;
}
