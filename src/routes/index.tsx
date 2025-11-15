import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { PixelButton, PixelInput, PixelError, SoundToggle, BouncingMusicIcons } from "@/components";
import { playSound } from "@/lib/audio";

export const Route = createFileRoute("/")({ component: App });

function App() {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState("");
  const [codeToCheck, setCodeToCheck] = useState<string | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Only query when we have a code to check
  const gameCheck = useQuery(
    api.games.getByCode,
    codeToCheck ? { code: codeToCheck } : "skip"
  );

  // Handle game check result
  useEffect(() => {
    if (codeToCheck && gameCheck !== undefined) {
      if (gameCheck === null) {
        // Game not found
        playSound("/sounds/error.ogg");
        setError("Game not found!");
        setCodeToCheck(null);
        inputRef.current?.focus();
      } else {
        // Game found - navigate to lobby
        playSound("/sounds/confirmation.ogg");
        navigate({ to: `/lobby/${codeToCheck}` });
      }
    }
  }, [gameCheck, codeToCheck, navigate]);

  const handleCreateGame = () => {
    playSound("/sounds/confirmation.ogg");
    navigate({ to: "/create" });
  };

  const handleJoinGame = () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length === 0) {
      playSound("/sounds/error.ogg");
      setError("Please enter a game code!");
      inputRef.current?.focus();
      return;
    }
    setError("");
    setCodeToCheck(code);
  };

  return (
    <div className="min-h-screen bg-sky-400 flex items-center justify-center p-4">
      {/* Skip to main content link for screen readers */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-yellow-400 focus:text-sky-900 focus:px-4 focus:py-2 focus:border-4 focus:border-sky-900 pixel-text"
      >
        Skip to main content
      </a>

      {/* Pixel art clouds background effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="pixel-cloud cloud-1"></div>
        <div className="pixel-cloud cloud-2"></div>
        <div className="pixel-cloud cloud-3"></div>
      </div>

      <main id="main-content" className="relative z-10 text-center">
        {/* Title */}
        <h1
          className="text-white max-w-[800px] mx-auto text-[4rem] sm:text-[9rem] leading-[1.3]"
          style={{
            fontFamily: '"VCR OSD Mono", monospace',
            WebkitTextStroke: '3px #0c4a6e',
            textShadow: `
              3px 3px 0 #0c4a6e,
              6px 6px 0 #075985,
              9px 9px 0 #0369a1,
              12px 12px 0 #0284c7,
              15px 15px 0 #0ea5e9
            `
          }}
        >
          MUSIC
        </h1>

        {/* Musical notes decoration */}
        <BouncingMusicIcons size="large" />

        <h1
          className="text-white mb-16 max-w-[800px] mx-auto text-[4rem] sm:text-[9rem] leading-[1.3]"
          style={{
            fontFamily: '"VCR OSD Mono", monospace',
            WebkitTextStroke: '3px #0c4a6e',
            textShadow: `
              3px 3px 0 #0c4a6e,
              6px 6px 0 #075985,
              9px 9px 0 #0369a1,
              12px 12px 0 #0284c7,
              15px 15px 0 #0ea5e9
            `
          }}
        >
          ROUND
        </h1>

        <div className="space-y-6 max-w-sm mx-auto">
          <div className="space-y-3">
            <PixelInput
              ref={inputRef}
              type="text"
              placeholder="ENTER CODE"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onEnterPress={handleJoinGame}
              maxLength={8}
              className="w-full bg-white text-center"
              aria-label="Game code"
              aria-describedby={error ? "join-error" : undefined}
              autoFocus
            />
            <PixelButton
              onClick={handleJoinGame}
              className="w-full"
              aria-label="Join game with entered code"
            >
              JOIN GAME
            </PixelButton>
          </div>

          <div className="flex items-center gap-4" aria-hidden="true">
            <div className="flex-1 h-1 bg-white"></div>
            <span className="text-white pixel-text text-xl">OR</span>
            <div className="flex-1 h-1 bg-white"></div>
          </div>

          <PixelButton
            onClick={handleCreateGame}
            className="w-full"
            aria-label="Create a new game"
          >
            CREATE GAME
          </PixelButton>

          {/* Error Message */}
          {error && <PixelError id="join-error">{error}</PixelError>}
        </div>
      </main>
      <SoundToggle />
    </div>
  );
}
