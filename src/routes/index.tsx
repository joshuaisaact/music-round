import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { PixelButton, PixelInput, PixelError, SoundToggle, BouncingMusicIcons, OrDivider, OnboardingModal, PageLayout, PixelTitle } from "@/components";
import { playSound } from "@/lib/audio";
import { getSessionId } from "@/lib/session";

export const Route = createFileRoute("/")({ component: App });

function App() {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState("");
  const [codeToCheck, setCodeToCheck] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionId = getSessionId();

  // Check if player has completed today's daily challenge
  const playerDailyScore = useQuery(api.daily.getPlayerDailyScore, {
    playerId: sessionId,
  });

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

  const handleDailyChallenge = () => {
    playSound("/sounds/confirmation.ogg");
    navigate({ to: "/daily" });
  };

  const handleBattleRoyale = () => {
    playSound("/sounds/confirmation.ogg");
    navigate({ to: "/battle-royale" });
  };

  return (
    <PageLayout>
      <PixelTitle>MUSIC</PixelTitle>

      <BouncingMusicIcons size="large" />

      <PixelTitle className="mb-16">ROUND</PixelTitle>

        <div className="space-y-6 max-w-sm mx-auto">
          {/* Daily Challenge Section */}
          <div className="space-y-3">
            {playerDailyScore && (
              <div className="text-white pixel-text text-sm bg-sky-700 border-4 border-sky-900 p-2">
                COMPLETED - SCORE: {playerDailyScore.score.toLocaleString()}
              </div>
            )}
            <PixelButton
              onClick={handleDailyChallenge}
              className="w-full bg-yellow-400 hover:bg-yellow-300 border-yellow-600"
              aria-label="Play today's daily challenge"
            >
              DAILY CHALLENGE
            </PixelButton>
          </div>

          <PixelButton
            onClick={handleBattleRoyale}
            className="w-full bg-red-500 hover:bg-red-400 border-red-700"
            aria-label="Play battle royale mode"
          >
            BATTLE ROYALE
          </PixelButton>

          <OrDivider />

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
            />
            <PixelButton
              onClick={handleJoinGame}
              className="w-full"
              aria-label="Join game with entered code"
            >
              JOIN GAME
            </PixelButton>
          </div>

          <OrDivider />

          <PixelButton
            onClick={handleCreateGame}
            className="w-full"
            aria-label="Create a new game"
          >
            CREATE GAME
          </PixelButton>

          {/* How to Play Button */}
          <PixelButton
            onClick={() => setShowOnboarding(true)}
            className="w-full"
            size="small"
            aria-label="Learn how to play"
          >
            HOW TO PLAY
          </PixelButton>

          {/* Error Message */}
          {error && <PixelError id="join-error">{error}</PixelError>}
        </div>

      <SoundToggle />

      {/* Onboarding Modal */}
      {showOnboarding && (
        <OnboardingModal
          onClose={() => setShowOnboarding(false)}
          isDailyMode={false}
          secondsPerRound={30}
        />
      )}
    </PageLayout>
  );
}
