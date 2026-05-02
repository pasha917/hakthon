import React from "react";
import { motion } from "framer-motion";

/**
 * Animated headline that "pops" each word in with a soft spring + glow.
 * Usage: <RevealText text="Hello World" className="text-5xl font-display" />
 */
export default function RevealText({ text = "", className = "", as: Tag = "h1", delay = 0, gold = false }) {
  const words = text.split(" ");
  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07, delayChildren: delay } },
  };
  const item = {
    hidden: { opacity: 0, y: 24, filter: "blur(10px)" },
    show: {
      opacity: 1, y: 0, filter: "blur(0px)",
      transition: { type: "spring", stiffness: 240, damping: 22 },
    },
  };
  return (
    <motion.div className={className} variants={container} initial="hidden" animate="show" style={{ display: "block" }}>
      <Tag style={{ display: "inline" }}>
        {words.map((w, i) => (
          <motion.span
            key={i}
            variants={item}
            className={`inline-block mr-[0.28em] ${gold ? "aurora-text glow-text" : ""}`}
            style={{ willChange: "transform, opacity, filter" }}
          >
            {w}
          </motion.span>
        ))}
      </Tag>
    </motion.div>
  );
}
