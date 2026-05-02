import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "@/App.css";
import BubbleBackground from "@/components/BubbleBackground";
import VoiceOrb from "@/components/VoiceOrb";
import Wizard from "@/pages/Wizard";
import { AuthProvider } from "@/context/AuthContext";
import AuthModal from "@/components/AuthModal";

export default function App() {
  return (
    <div className="App" data-testid="app-root">
      <BubbleBackground />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Wizard />} />
            <Route path="*" element={<Wizard />} />
          </Routes>
        </BrowserRouter>
        <AuthModal />
        <VoiceOrb />
      </AuthProvider>
    </div>
  );
}
