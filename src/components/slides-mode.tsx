"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import backdrop from "../../UI/Welcome/bg.png";
import { SLIDES, SLIDE_STORAGE_KEY } from "@/lib/slides";
import { Icon } from "./icon";
import { ModeNavigation } from "./mode-navigation";
import { SlideArtwork } from "./slide-artwork";

export function SlidesMode() {
  const [page, setPage] = useState(0);
  const [ready, setReady] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const shell = useRef<HTMLElement>(null);
  const filmstrip = useRef<HTMLDivElement>(null);
  const presentButton = useRef<HTMLButtonElement>(null);
  const ownsFullscreen = useRef(false);
  const wasPresenting = useRef(false);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null);
  const swiped = useRef(false);

  const revealControls = useCallback(() => {
    setControlsVisible(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => setControlsVisible(false), 3000);
  }, []);

  const movePage = useCallback((change: number) => {
    setPage(current => Math.max(0, Math.min(SLIDES.length - 1, current + change)));
  }, []);

  const leavePresentation = useCallback(() => {
    setPresenting(false);
    if (document.fullscreenElement === shell.current) void document.exitFullscreen().catch(() => {});
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SLIDE_STORAGE_KEY);
      const index = saved === null ? 0 : Number(saved);
      if (Number.isInteger(index) && index >= 0 && index < SLIDES.length) setPage(index);
    } catch { /* Slides remain usable without browser storage. */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(SLIDE_STORAGE_KEY, String(page)); }
    catch { /* Remembering the page is optional. */ }
  }, [page, ready]);

  useEffect(() => {
    const selected = filmstrip.current?.querySelector<HTMLButtonElement>('[aria-current="page"]');
    selected?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" });
    if (filmstrip.current?.contains(document.activeElement)) selected?.focus({ preventScroll: true });
  }, [page, presenting]);

  useEffect(() => {
    const update = () => {
      if (document.fullscreenElement === shell.current) ownsFullscreen.current = true;
      else if (ownsFullscreen.current) {
        ownsFullscreen.current = false;
        setPresenting(false);
      }
    };
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  useEffect(() => {
    if (presenting) {
      revealControls();
      shell.current?.focus({ preventScroll: true });
    } else if (wasPresenting.current) presentButton.current?.focus({ preventScroll: true });
    wasPresenting.current = presenting;
    return () => { if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current); };
  }, [presenting, revealControls]);

  useEffect(() => {
    const navigate = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (event.altKey || event.ctrlKey || event.metaKey || target?.closest("input, textarea, select, [contenteditable]")) return;
      if (event.key === " " && target?.closest("button, a")) return;
      if (["ArrowRight", "PageDown", " "].includes(event.key)) { event.preventDefault(); movePage(1); }
      else if (["ArrowLeft", "PageUp"].includes(event.key)) { event.preventDefault(); movePage(-1); }
      else if (event.key === "Home") { event.preventDefault(); setPage(0); }
      else if (event.key === "End") { event.preventDefault(); setPage(SLIDES.length - 1); }
      else if (event.key === "Escape" && presenting) { event.preventDefault(); leavePresentation(); }
    };
    document.addEventListener("keydown", navigate);
    return () => document.removeEventListener("keydown", navigate);
  }, [presenting, movePage, leavePresentation]);

  async function startPresentation() {
    setPresenting(true);
    // The same presentation layout also works where fullscreen is unavailable.
    if (!document.fullscreenElement && shell.current?.requestFullscreen) {
      await shell.current.requestFullscreen().catch(() => {});
    }
  }

  function endSwipe(event: PointerEvent<HTMLDivElement>) {
    const start = swipe.current;
    swipe.current = null;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      swiped.current = true;
      movePage(dx < 0 ? 1 : -1);
    }
  }

  return <main ref={shell} tabIndex={-1} className={`game-shell slides-shell${presenting ? " is-presenting" : ""}`} onPointerMove={presenting ? revealControls : undefined}>
    <div className="scene-background" aria-hidden="true"><Image src={backdrop} alt="" fill preload sizes="100vw"/><div className="scene-tint"/></div>
    <header className="topbar">
      <div className="brand-modes"><h1>วงล้อ<span>ศิลป์ถิ่นเรา</span></h1><ModeNavigation current="slides"/></div>
      <div className="header-actions"><button ref={presentButton} className="glass-button slides-present-button" aria-label="นำเสนอสไลด์เต็มจอ" title="นำเสนอสไลด์เต็มจอ" onClick={startPresentation}><Icon name="play" size={19}/><span>นำเสนอ</span></button></div>
    </header>

    <section className="slides-stage" aria-label="สไลด์การสอน">
      <div className="slide-canvas"
        onPointerDown={event => { swipe.current = { x: event.clientX, y: event.clientY, id: event.pointerId }; swiped.current = false; event.currentTarget.setPointerCapture(event.pointerId); if (presenting) revealControls(); }}
        onPointerUp={endSwipe}
        onPointerCancel={() => { swipe.current = null; }}
        onClick={event => { if (presenting && !swiped.current) movePage(event.shiftKey ? -1 : 1); }}>
        <SlideArtwork page={page}/>
      </div>
    </section>

    <div className="slides-toolbar">
      <p className="slides-caption"><Icon name="slides" size={19}/>สไลด์การสอน</p>
      <div className="slide-pager" aria-label="เปลี่ยนหน้าสไลด์">
        <button className="glass-button" aria-label="สไลด์ก่อนหน้า" disabled={page === 0} onClick={() => movePage(-1)}><Icon name="chevron-left"/></button>
        <span className="slide-page-count" role="status" aria-live="polite">{page + 1}<span> / {SLIDES.length}</span></span>
        <button className="glass-button" aria-label="สไลด์ถัดไป" disabled={page === SLIDES.length - 1} onClick={() => movePage(1)}><Icon name="chevron-right"/></button>
      </div>
      <p className="slides-key-hint">ใช้ปุ่ม ← → หรือปัดเพื่อเปลี่ยนหน้า</p>
    </div>

    <div ref={filmstrip} className="slides-filmstrip" role="navigation" aria-label="เลือกสไลด์">
      {SLIDES.map((image, index) => <button key={image.src} className="slide-thumbnail" aria-label={`ไปสไลด์หน้า ${index + 1}`} aria-current={index === page ? "page" : undefined} onClick={() => setPage(index)}>
        <span className="slide-thumbnail-art"><Image src={image} alt="" fill sizes="(max-width: 700px) 112px, 152px" draggable={false}/></span>
        <span className="slide-thumbnail-number">{index + 1}</span>
      </button>)}
    </div>

    {presenting && <div className={`presentation-controls${controlsVisible ? "" : " is-hidden"}`} role="group" aria-label="ควบคุมการนำเสนอ" onFocus={revealControls}>
      <button aria-label="สไลด์ก่อนหน้า" disabled={page === 0} onClick={() => { movePage(-1); revealControls(); }}><Icon name="chevron-left"/></button>
      <span role="status" aria-live="polite">{page + 1} / {SLIDES.length}</span>
      <button aria-label="สไลด์ถัดไป" disabled={page === SLIDES.length - 1} onClick={() => { movePage(1); revealControls(); }}><Icon name="chevron-right"/></button>
      <span className="presentation-divider" aria-hidden="true"/>
      <button aria-label="ออกจากการนำเสนอ" title="ออกจากการนำเสนอ (Esc)" onClick={leavePresentation}><Icon name="close"/></button>
    </div>}
  </main>;
}
