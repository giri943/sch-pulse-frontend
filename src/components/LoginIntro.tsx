"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

// Premium easing (the "Stripe/Apple" feel) used for the scanner + reveals.
const EASE = [0.22, 1, 0.36, 1] as const;
const SUBTITLE = "Always Watching. Always Ready.";

// One continuous multi-beat ECG path; revealed by a moving clip (not stroke-dashoffset).
const ECG =
  "M0 60 H170 l22 0 l11 -32 l15 66 l13 -46 l11 12 H430 l22 0 l11 -34 l16 70 l14 -50 l12 14 H700 l22 0 l11 -32 l15 66 l13 -46 l11 12 H960 l22 0 l11 -34 l16 70 l14 -50 l12 14 H1200";

export function LoginIntro() {
  const [show, setShow] = useState(true);
  const [leaving, setLeaving] = useState(false);

  // Single shared timeline value 0→1 drives the scanner head + the line reveal.
  const progress = useMotionValue(0);
  const clipPath = useTransform(progress, (v) => `inset(-45% ${(1 - v) * 100}% -45% -1%)`);
  const headX = useTransform(progress, (v) => `${v * 100}%`);
  const headOpacity = useTransform(progress, [0, 0.04, 0.92, 1], [0, 1, 1, 0]);
  // The line dims as the logo takes over — the trail "disappears".
  const lineOpacity = useTransform(progress, [0, 0.85, 1], [0.9, 0.9, 0.35]);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShow(false);
      return;
    }
    const controls = animate(progress, 1, { duration: 1.5, ease: EASE, delay: 0.2 });
    // Subtitle finishes ~2.7s; hold ~0.6s so it's readable, then fade out.
    const leaveT = setTimeout(() => setLeaving(true), 3300);
    const doneT = setTimeout(() => setShow(false), 3850);
    return () => {
      controls.stop();
      clearTimeout(leaveT);
      clearTimeout(doneT);
    };
  }, [progress]);

  if (!show) return null;

  return (
    <motion.div
      onClick={() => setLeaving(true)}
      initial={{ opacity: 1 }}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="fixed inset-0 z-[60] grid place-items-center overflow-hidden bg-bg cursor-pointer"
      aria-hidden
    >
      {/* booting grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.45 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgb(var(--border) / 0.6) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--border) / 0.6) 1px, transparent 1px)",
          backgroundSize: "46px 46px",
          WebkitMaskImage: "radial-gradient(circle at center, black, transparent 68%)",
          maskImage: "radial-gradient(circle at center, black, transparent 68%)",
        }}
      />

      {/* ambient glow breathing in */}
      <motion.div
        initial={{ opacity: 0.15, scale: 0.92 }}
        animate={{ opacity: [0.2, 0.5, 0.32], scale: [0.95, 1.12, 1.02] }}
        transition={{ duration: 2.6, ease: "easeInOut" }}
        className="pointer-events-none absolute left-1/2 top-1/2 h-[44rem] w-[44rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-up/20 blur-[130px]"
      />

      {/* ECG band with a live scanner head */}
      <div className="pointer-events-none absolute left-0 top-1/2 w-full -translate-y-1/2" style={{ height: "34vh" }}>
        <motion.svg
          style={{ clipPath, opacity: lineOpacity }}
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d={ECG}
            stroke="#22c55e"
            strokeWidth="2.5"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: "drop-shadow(0 0 8px rgba(34,197,94,0.5))" }}
          />
        </motion.svg>

        {/* scanner head: full-width track translated across; head sits at its left edge */}
        <motion.div style={{ x: headX, opacity: headOpacity }} className="absolute inset-y-0 left-0 w-full">
          {/* fading trail */}
          <div className="absolute inset-y-0 left-0 w-32 -translate-x-full bg-gradient-to-l from-up/25 to-transparent" />
          {/* bright head column */}
          <div className="absolute inset-y-0 left-0 w-px -translate-x-1/2 bg-up shadow-[0_0_28px_10px_rgba(34,197,94,0.6)]" />
          {/* head core */}
          <div className="absolute top-1/2 left-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_18px_6px_rgba(34,197,94,0.9)]" />
        </motion.div>
      </div>

      {/* logo + subtitle */}
      <div className="relative z-10 text-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, filter: "blur(12px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ delay: 1.3, duration: 0.85, ease: EASE }}
          className="relative inline-block overflow-hidden px-1 pb-[0.18em] leading-[1.2] text-5xl sm:text-6xl font-extrabold tracking-tight"
        >
          Schbang{" "}
          <span className="text-up" style={{ textShadow: "0 0 26px rgba(34,197,94,0.55)" }}>
            Pulse
          </span>
          {/* soft light sweep through the logo */}
          <motion.span
            initial={{ x: "-160%" }}
            animate={{ x: "160%" }}
            transition={{ delay: 2.15, duration: 0.95, ease: "easeInOut" }}
            className="pointer-events-none absolute inset-y-0 left-0 w-2/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent"
          />
        </motion.div>

        {/* subtitle, character by character */}
        <motion.div
          className="mt-4 text-[11px] sm:text-xs font-medium uppercase tracking-[0.42em] text-muted"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.028, delayChildren: 1.55 } } }}
          initial="hidden"
          animate="show"
        >
          {SUBTITLE.split("").map((ch, i) => (
            <motion.span
              key={i}
              variants={{
                hidden: { opacity: 0, y: 6, filter: "blur(4px)" },
                show: { opacity: 1, y: 0, filter: "blur(0px)" },
              }}
              transition={{ duration: 0.32, ease: EASE }}
              style={{ display: "inline-block" }}
            >
              {ch === " " ? " " : ch}
            </motion.span>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
