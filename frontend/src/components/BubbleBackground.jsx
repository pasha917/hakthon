import React from "react";

export default function BubbleBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      data-testid="bubble-background"
    >
      <div className="bubble-blob" style={{ width: 520, height: 520, top: -120, left: -120, background: "#E0E7FF" }} />
      <div className="bubble-blob" style={{ width: 480, height: 480, top: 100, right: -140, background: "#FFE4E6", animationDelay: "-6s" }} />
      <div className="bubble-blob" style={{ width: 460, height: 460, bottom: -140, left: "20%", background: "#D1FAE5", animationDelay: "-12s" }} />
      <div className="bubble-blob" style={{ width: 380, height: 380, bottom: 40, right: "10%", background: "#DBEAFE", animationDelay: "-9s" }} />
    </div>
  );
}
