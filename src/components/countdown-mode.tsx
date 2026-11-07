"use client";

import Image from "next/image";
import { useEffect, useReducer, useRef, useState, type FormEvent } from "react";
import backdrop from "../../UI/Welcome/bg.png";
import countdownFrame from "../../UI/Leafy wooden countdown display frame.png";
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsDialog = useRef<HTMLDialogElement>(null);
  const running = timer.status === "running";
  const finished = timer.status === "finished";
  const remaining = remainingCountdown(timer, now);
  const time = formatCountdown(remaining);
  const status = finished ? "หมดเวลาแล้ว" : running ? "เวลาระบายสี" : timer.status === "paused" ? "พักเวลาอยู่" : "พร้อมจับเวลา";

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

  useEffect(() => {
    const dialog = settingsDialog.current;
    if (settingsOpen && dialog && !dialog.open) dialog.showModal();
    if (!settingsOpen && dialog?.open) dialog.close();
  }, [settingsOpen]);

  function openSettings() {
    setMinutes(String(Math.floor(timer.durationMs / 60_000)));
    setSeconds(String(timer.durationMs / 1000 % 60));
    setError("");
    setSettingsOpen(true);
  }

  function setCustomTime(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const m = Number(minutes);
    const s = Number(seconds);
    if (!minutes.trim() || !seconds.trim() || !Number.isInteger(m) || !Number.isInteger(s) || m < 0 || m > 99 || s < 0 || s > 59 || m + s === 0) {
      setError("ตั้งเวลาได้ตั้งแต่ 1 วินาที ถึง 99 นาที 59 วินาที");
      return;
    }
    // Draft settings do not change an active countdown until the teacher saves.
    const current = Date.now();
    setNow(current);
    dispatch({ type: "pause", now: current });
    dispatch({ type: "set-duration", durationMs: (m * 60 + s) * 1000 });
    setError("");
    setSettingsOpen(false);
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
      <div className="header-actions"><button className="glass-button timer-settings-trigger" title="ตั้งเวลานับถอยหลัง" aria-label="ตั้งเวลานับถอยหลัง" aria-haspopup="dialog" aria-expanded={settingsOpen} aria-controls="timer-settings-dialog" disabled={!ready} onClick={openSettings}><Icon name="settings" size={26}/></button></div>
    </header>

    <div className="timer-workspace">
      <aside className="timer-mascot" aria-label="ครูครีมเป็นกำลังใจให้">
        <CreamMascot pose={finished ? "celebrate" : timer.status === "paused" ? "thinking" : running ? "encourage" : "guide"} placement="timer"/>
      </aside>

      <section className="countdown-stage" aria-labelledby="countdown-title">
        <h2 id="countdown-title" className="sr-only">นาฬิกาถอยหลัง</h2>
        <div className="countdown-frame">
          <Image className="countdown-frame-art" src={countdownFrame} alt="" preload sizes="(max-width: 700px) 96vw, (max-width: 1700px) 76vw, 1280px" draggable={false}/>
          <div className={`timer-clock${running && remaining <= 60_000 ? " is-ending" : ""}`}>
            <span className="timer-status" role="status">{status}</span>
            <div className="timer-digits" role="timer" aria-live="off" aria-label={`เหลือเวลา ${Math.floor(Math.ceil(remaining / 1000) / 60)} นาที ${Math.ceil(remaining / 1000) % 60} วินาที`}>{time}</div>
            <span className="timer-units">นาที : วินาที</span>
          </div>
        </div>
        <button className="spin-button timer-start" onClick={toggleTimer} disabled={!ready}><Icon name={running ? "pause" : "play"} size={24}/>{running ? "พักเวลา" : timer.status === "paused" ? "นับต่อ" : finished ? "เริ่มอีกครั้ง" : "เริ่มจับเวลา"}</button>
      </section>

      <section className="coloring-instruction" aria-label="คำสั่งกิจกรรมระบายสี">
        <p><span>ให้นักเรียนระบายสีภาพที่สุ่มได้</span>{" "}<strong>โดยใช้โทนสีที่สุ่มได้</strong></p>
      </section>
    </div>
    <dialog id="timer-settings-dialog" ref={settingsDialog} className="timer-settings-dialog" aria-labelledby="timer-settings-title" onCancel={() => setSettingsOpen(false)}>
      <div className="timer-settings-heading"><h2 id="timer-settings-title"><Icon name="settings" size={24}/>ตั้งเวลานับถอยหลัง</h2><button autoFocus className="glass-button" aria-label="ปิดการตั้งค่า" onClick={() => setSettingsOpen(false)}><Icon name="close"/></button></div>
      <p className="timer-settings-hint">เลือกเวลาแล้วกดบันทึก จากนั้นกดเริ่มจับเวลาบนหน้าหลัก</p>
      <form onSubmit={setCustomTime} aria-label="กำหนดเวลาเอง">
        <div className="timer-presets" role="group" aria-label="เลือกเวลาสำเร็จรูป">{PRESETS.map(value => <button key={value} type="button" aria-pressed={Number(minutes) === value && Number(seconds) === 0} onClick={() => { setMinutes(String(value)); setSeconds("0"); setError(""); }}>{value} นาที</button>)}</div>
        <div className="timer-custom">
          <label htmlFor="timer-minutes">นาที<input id="timer-minutes" type="number" inputMode="numeric" min="0" max="99" step="1" required value={minutes} onChange={event => { setMinutes(event.target.value); setError(""); }}/></label>
          <span aria-hidden="true">:</span>
          <label htmlFor="timer-seconds">วินาที<input id="timer-seconds" type="number" inputMode="numeric" min="0" max="59" step="1" required value={seconds} onChange={event => { setSeconds(event.target.value); setError(""); }}/></label>
        </div>
        {error && <p className="timer-error" role="alert">{error}</p>}
        <div className="timer-dialog-actions"><button type="button" className="glass-button" onClick={() => setSettingsOpen(false)}>ยกเลิก</button><button className="spin-button" type="submit"><Icon name="check"/>บันทึกเวลา</button></div>
      </form>
      <div className="timer-dialog-tools">
        <button type="button" className="glass-button" onClick={() => { dispatch({ type: "reset" }); setError(""); setSettingsOpen(false); }}><Icon name="history"/>รีเซ็ตเวลาเดิม</button>
        <button type="button" className="glass-button" aria-pressed={fullscreen} onClick={toggleFullscreen}><Icon name={fullscreen ? "close" : "expand"}/>{fullscreen ? "ออกจากเต็มจอ" : "เต็มจอ TV"}</button>
      </div>
    </dialog>
    {!storageAvailable && <p className="timer-storage-notice" role="status">กรุณาเปิดหน้านี้ไว้ระหว่างจับเวลา อุปกรณ์นี้บันทึกเวลาไม่ได้</p>}
  </main>;
}
