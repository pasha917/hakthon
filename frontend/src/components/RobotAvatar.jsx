import React from "react";
import { motion } from "framer-motion";

/**
 * Beautiful animated AI robot/orb avatar for the hero.
 * Pure CSS/SVG — no images. State-driven colour shift:
 *  - idle   : amber-gold breathing
 *  - listen : emerald with active waveform
 *  - think  : violet shimmer
 *  - speak  : amber-rose pulsing
 */
export default function RobotAvatar({ state = "idle", size = 220, onClick, label }) {
  const ringColor = {
    idle: "from-amber-300 via-amber-400 to-amber-600",
    listen: "from-emerald-300 via-emerald-400 to-teal-500",
    think: "from-violet-400 via-fuchsia-500 to-rose-400",
    speak: "from-amber-300 via-amber-400 to-rose-400",
    error: "from-rose-400 via-rose-500 to-rose-700",
  }[state];

  const eyeColor = state === "listen" ? "#34D399" : state === "think" ? "#A78BFA" : state === "error" ? "#FB7185" : "#1a1208";

  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label || "AI assistant"}
      className="relative flex flex-col items-center"
      animate={{ y: state === "speak" ? [0, -3, 0] : [0, -6, 0] }}
      transition={{ repeat: Infinity, duration: state === "speak" ? 0.8 : 4, ease: "easeInOut" }}
      data-testid="robot-avatar"
    >
      <div className="relative" style={{ width: size, height: size }}>
        {/* Aura ripples */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className={`absolute inset-0 rounded-full bg-gradient-to-br ${ringColor} opacity-25`}
            animate={{ scale: [1, 1.4, 1.7], opacity: [0.35, 0.05, 0] }}
            transition={{ repeat: Infinity, duration: 2.4, delay: i * 0.65, ease: "easeOut" }}
          />
        ))}

        {/* Outer halo ring */}
        <motion.div
          className={`absolute inset-2 rounded-full bg-gradient-to-br ${ringColor}`}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 18, ease: "linear" }}
          style={{ filter: "blur(2px)", opacity: 0.85 }}
        />
        <div className="absolute inset-3 rounded-full bg-[#0b0b14]" />

        {/* Inner glass body */}
        <div
          className="absolute inset-5 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.25), rgba(255,255,255,0.04) 40%, rgba(0,0,0,0.45) 90%)",
            boxShadow:
              "inset 0 6px 24px rgba(255,255,255,0.18), inset 0 -10px 30px rgba(0,0,0,0.55), 0 30px 60px rgba(230,200,112,0.25)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        />

        {/* Robot face */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="visor" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFE5A4" stopOpacity="0.95" />
              <stop offset="60%" stopColor="#E6C870" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#1a1208" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* Visor */}
          <ellipse cx="50" cy="48" rx="22" ry="14" fill="url(#visor)" />
          {/* Eyes */}
          <motion.g
            animate={state === "listen" ? { opacity: [1, 0.4, 1] } : { opacity: 1 }}
            transition={{ repeat: Infinity, duration: 1.2 }}
          >
            <circle cx="42" cy="48" r="3.2" fill={eyeColor} />
            <circle cx="58" cy="48" r="3.2" fill={eyeColor} />
            <circle cx="42" cy="47" r="0.9" fill="#fff" opacity={0.85} />
            <circle cx="58" cy="47" r="0.9" fill="#fff" opacity={0.85} />
          </motion.g>
          {/* Mouth waveform */}
          {state === "speak" ? (
            <motion.g>
              {[42, 46, 50, 54, 58].map((x, i) => (
                <motion.rect
                  key={i}
                  x={x - 1}
                  y={56}
                  width={2}
                  height={4}
                  rx={1}
                  fill="#FFE5A4"
                  animate={{ height: [3, 7, 3], y: [56, 53, 56] }}
                  transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.07 }}
                />
              ))}
            </motion.g>
          ) : state === "listen" ? (
            <motion.path
              d="M40 58 Q50 62 60 58"
              stroke="#34D399"
              strokeWidth="1.6"
              strokeLinecap="round"
              fill="none"
              animate={{ pathLength: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
            />
          ) : (
            <path d="M44 58 Q50 60 56 58" stroke="#FFE5A4" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity={0.85} />
          )}
          {/* Antenna */}
          <line x1="50" y1="22" x2="50" y2="14" stroke="#E6C870" strokeWidth="1.2" />
          <motion.circle
            cx="50" cy="13" r="2.5" fill="#FFE5A4"
            animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1.4 }}
          />
        </svg>
      </div>
    </motion.button>
  );
}
