"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MediaItem } from "@/data/media";
import { ReelCard } from "./ReelCard";
import { useViewer } from "./ViewerContext";
import { useMediaQuery, useReducedMotionPref } from "@/lib/hooks";

/** How many muted previews may run at once. */
const MAX_PREVIEWS_DESKTOP = 3;
const MAX_PREVIEWS_MOBILE = 1;

/** Re-evaluate which cards are centre-stage. The rail moves continuously, so
 *  this samples positions rather than waiting on IntersectionObserver steps. */
const SAMPLE_MS = 350;

/**
 * Infinite right-to-left rail of vertical reels.
 * - seamless loop (items rendered twice, wrapped on half-width)
 * - pointer drag / touch swipe, motion pauses while dragging
 * - hovering pauses the *travel* only; previews keep playing
 * - the most central visible cards run muted previews, capped for performance
 * - keyboard: cards are buttons; focusing one pulls it into view
 * - reduced motion: becomes a plain scrollable rail, nothing auto-moves
 */
export function ReelRail({ items, speed = 26 }: { items: MediaItem[]; speed?: number }) {
  const { open } = useViewer();
  const wrap = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const offset = useRef(0);
  const paused = useRef(false);
  const dragging = useRef(false);
  const moved = useRef(0);
  /* px still to travel from an arrow press, eased out in the loop */
  const nudge = useRef(0);
  const reduced = useReducedMotionPref();
  const wide = useMediaQuery("(min-width: 1024px)");

  /* indices (into the rendered list) whose previews should be running */
  const [active, setActive] = useState<number[]>([]);

  const wrapOffset = useCallback(() => {
    const half = (track.current?.scrollWidth ?? 0) / 2;
    if (!half) return;
    while (offset.current <= -half) offset.current += half;
    while (offset.current > 0) offset.current -= half;
  }, []);

  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(64, now - last) / 1000;
      last = now;
      if (nudge.current && !dragging.current) {
        const step =
          Math.abs(nudge.current) < 0.5 ? nudge.current : nudge.current * Math.min(1, dt * 9);
        offset.current += step;
        nudge.current -= step;
        wrapOffset();
      } else if (!paused.current && !dragging.current) {
        offset.current -= speed * dt;
        wrapOffset();
      }
      if (track.current) {
        track.current.style.transform = `translate3d(${offset.current}px,0,0)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduced, speed, wrapOffset]);

  /* ---- which cards are close enough to the centre to play ---- */
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;

    const cap = wide ? MAX_PREVIEWS_DESKTOP : MAX_PREVIEWS_MOBILE;
    let railVisible = false;

    const io = new IntersectionObserver(
      ([entry]) => {
        railVisible = entry.isIntersecting;
        if (!railVisible) setActive([]);
      },
      { threshold: 0.15 },
    );
    io.observe(el);

    const sample = () => {
      if (!railVisible || document.hidden) {
        setActive((prev) => (prev.length ? [] : prev));
        return;
      }
      const cards = el.querySelectorAll<HTMLElement>("[data-reel]");
      const centre = window.innerWidth / 2;
      const scored: { index: number; id: string; score: number }[] = [];

      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        if (rect.width === 0) return;
        const shown =
          Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0);
        // a card must be at least 35% on screen to earn a preview
        if (shown / rect.width < 0.35) return;
        const index = Number(card.dataset.index);
        const id = card.dataset.mediaId ?? "";
        if (!card.dataset.playable) return;
        scored.push({
          index,
          id,
          score: Math.abs(rect.left + rect.width / 2 - centre),
        });
      });

      scored.sort((a, b) => a.score - b.score);

      /* one preview per media item — a looping clone must never double up */
      const seen = new Set<string>();
      const next: number[] = [];
      for (const c of scored) {
        if (seen.has(c.id)) continue;
        seen.add(c.id);
        next.push(c.index);
        if (next.length >= cap) break;
      }

      setActive((prev) =>
        prev.length === next.length && prev.every((v, i) => v === next[i])
          ? prev
          : next,
      );
    };

    sample();
    const timer = setInterval(sample, SAMPLE_MS);
    document.addEventListener("visibilitychange", sample);
    return () => {
      clearInterval(timer);
      io.disconnect();
      document.removeEventListener("visibilitychange", sample);
    };
  }, [wide, reduced]);

  /* drag */
  const startX = useRef(0);
  const startOffset = useRef(0);

  const onPointerDown = (e: React.PointerEvent) => {
    if (reduced || (e.pointerType === "mouse" && e.button !== 0)) return;
    dragging.current = true;
    moved.current = 0;
    startX.current = e.clientX;
    startOffset.current = offset.current;
    /* capture is deferred until the pointer actually drags — capturing on
       pointerdown retargets the click to the track, so a tap never reaches
       the card and the viewer never opens */
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - startX.current;
    moved.current = Math.max(moved.current, Math.abs(dx));
    const el = e.currentTarget as HTMLElement;
    if (moved.current > 6 && !el.hasPointerCapture(e.pointerId)) {
      el.setPointerCapture(e.pointerId);
    }
    offset.current = startOffset.current + dx;
    wrapOffset();
  };
  const endDrag = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    const el = e.currentTarget as HTMLElement;
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
  };

  /* arrows: move one card per press */
  const step = (dir: 1 | -1) => {
    const card = wrap.current?.querySelector<HTMLElement>("[data-reel]");
    const width = (card?.offsetWidth ?? 300) + 20; // card + gap-5
    if (reduced) {
      wrap.current?.scrollBy({ left: dir * width, behavior: "smooth" });
      return;
    }
    nudge.current -= dir * width;
  };

  /* pull a keyboard-focused card into view */
  const onFocusCapture = (e: React.FocusEvent) => {
    if (reduced) return;
    const card = (e.target as HTMLElement).closest<HTMLElement>("[data-reel]");
    if (!card || !wrap.current) return;
    paused.current = true;
    offset.current = -(card.offsetLeft - 40);
    wrapOffset();
  };

  const list = reduced ? items : [...items, ...items];
  const activeSet = new Set(active);

  return (
    <div className="relative">
      <div
        ref={wrap}
        className={
          reduced
            ? "no-bar flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 sm:px-8"
            : "relative overflow-hidden px-5 sm:px-8"
        }
        /* hovering slows the travel only — previews keep running */
        onPointerEnter={() => (paused.current = true)}
        onPointerLeave={() => (paused.current = false)}
        onFocusCapture={onFocusCapture}
        onBlurCapture={() => (paused.current = false)}
        data-cursor={reduced ? undefined : "DRAG"}
        role="region"
        aria-label="Top viewed reels — drag or use arrow keys"
      >
        <div
          ref={track}
          className={reduced ? "contents" : "flex w-max cursor-grab gap-5 active:cursor-grabbing"}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {list.map((item, i) => (
            <div
              key={`${item.id}-${i}`}
              data-reel
              data-index={i}
              data-media-id={item.id}
              data-playable={item.localVideo || item.youtubeId ? "1" : undefined}
              className="w-[70vw] shrink-0 snap-start sm:w-[46vw] md:w-[34vw] lg:w-[27vw] xl:w-[calc(23.8vw-15px)]"
            >
              <ReelCard
                item={item}
                ratio="9:16"
                priority={i < 3}
                eager
                duplicate={!reduced && i >= items.length}
                preview={!reduced && activeSet.has(i)}
                sizes="(max-width: 640px) 70vw, (max-width: 768px) 46vw, (max-width: 1024px) 34vw, (max-width: 1280px) 27vw, 24vw"
                onOpen={() => {
                  if (moved.current > 6) return; // it was a drag, not a click
                  open(items, i % items.length);
                }}
              />
            </div>
          ))}
        </div>

        {!reduced && (
          <>
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-obsidian to-transparent sm:w-28" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-obsidian to-transparent sm:w-28" />
          </>
        )}
      </div>

      {(["prev", "next"] as const).map((side) => (
        <button
          key={side}
          type="button"
          onClick={() => step(side === "prev" ? -1 : 1)}
          data-cursor={side === "prev" ? "PREV" : "NEXT"}
          aria-label={side === "prev" ? "Previous reels" : "Next reels"}
          className={`absolute top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-gold/40 bg-obsidian/70 text-ivory backdrop-blur transition-colors hover:border-gold hover:text-gold sm:h-14 sm:w-14 ${
            side === "prev" ? "left-3 sm:left-6" : "right-3 sm:right-6"
          }`}
        >
          <span aria-hidden className="text-lg sm:text-xl">
            {side === "prev" ? "←" : "→"}
          </span>
        </button>
      ))}
    </div>
  );
}
