import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PixelButton, PixelInput } from "@/components";

export const Route = createFileRoute("/")({ component: App });

function App() {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");

  const handleCreateGame = () => {
    navigate({ to: "/create" });
  };

  const handleJoinGame = () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length === 0) {
      setError("Please enter a game code!");
      return;
    }
    setError("");
    navigate({ to: `/lobby/${code}` });
  };

  return (
    <div className="min-h-screen bg-sky-400 flex items-center justify-center p-4">
      {/* Pixel art clouds background effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="pixel-cloud cloud-1"></div>
        <div className="pixel-cloud cloud-2"></div>
        <div className="pixel-cloud cloud-3"></div>
      </div>

      <div className="relative z-10 text-center">
        {/* Title */}
        <h1 className="text-white mb-16 max-w-[600px] mx-auto text-[3rem] sm:text-[7rem] leading-[1.3]" style={{ fontFamily: '"VCR OSD Mono", monospace' }}>
          MUSIC ROUND
        </h1>

        {/* Musical notes decoration */}
        <div className="flex justify-center gap-8 mb-12 text-4xl">
          <span
            className="inline-block animate-bounce-slow"
            style={{ animationDelay: "0ms" }}
          >
            🎵
          </span>
          <span
            className="inline-block animate-bounce-slow"
            style={{ animationDelay: "200ms" }}
          >
            🎸
          </span>
          <span
            className="inline-block animate-bounce-slow"
            style={{ animationDelay: "400ms" }}
          >
            🎤
          </span>
        </div>

        <div className="space-y-6 max-w-sm mx-auto">
          <div className="space-y-3">
            <PixelInput
              type="text"
              placeholder="ENTER CODE"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onEnterPress={handleJoinGame}
              maxLength={8}
              className="w-full bg-white text-center outline-none"
            />
            <PixelButton
              onClick={handleJoinGame}
              className="w-full"
            >
              JOIN GAME
            </PixelButton>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 h-1 bg-white"></div>
            <span className="text-white pixel-text text-xl">OR</span>
            <div className="flex-1 h-1 bg-white"></div>
          </div>

          <PixelButton
            onClick={handleCreateGame}
            className="w-full"
          >
            CREATE GAME
          </PixelButton>

          {/* Error Message */}
          {error && (
            <div className="pixel-error bg-red-200 text-xl p-3 leading-relaxed">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
