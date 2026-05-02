import React from "react";

export default function BubbleBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      data-testid="bubble-background"
    >
      {/* Deep base */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(1200px 800px at 50% -10%, rgba(139,92,246,0.10), transparent 60%), #07070D" }} />
      {/* Luxury orbs */}
      <div className="orb" style={{ width: 620, height: 620, top: -160, left: -180, background: "radial-gradient(circle, #2B1F4A 0%, transparent 70%)" }} />
      <div className="orb" style={{ width: 540, height: 540, top: 80, right: -160, background: "radial-gradient(circle, #4B2A12 0%, transparent 70%)", animationDelay: "-7s" }} />
      <div className="orb" style={{ width: 520, height: 520, bottom: -180, left: "18%", background: "radial-gradient(circle, #0F3D38 0%, transparent 70%)", animationDelay: "-14s" }} />
      <div className="orb" style={{ width: 380, height: 380, bottom: 40, right: "8%", background: "radial-gradient(circle, #2A1338 0%, transparent 70%)", animationDelay: "-10s" }} />
      {/* Subtle grid */}
      <div className="absolute inset-0 opacity-[0.05]" style={{
        backgroundImage:
          "linear-gradient(rgba(230,200,112,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(230,200,112,.5) 1px, transparent 1px)",
        backgroundSize: "80px 80px",
        maskImage: "radial-gradient(ellipse at center, #000 30%, transparent 70%)",
        WebkitMaskImage: "radial-gradient(ellipse at center, #000 30%, transparent 70%)",
      }} />
    </div>
  );
}
