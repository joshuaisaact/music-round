import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { PixelButton, PixelInput, PixelError, SoundToggle, BouncingMusicIcons, OnboardingModal } from "@/components";
import { playSound } from "@/lib/audio";
import { getSessionId } from "@/lib/session";

export const Route = createFileRoute("/daily")({
  component: DailyChallenge,
});

function DailyChallenge() {
  const navigate = useNavigate();
  const sessionId = getSessionId();
  const [playerName, setPlayerName] = useState("");
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if we should show onboarding on mount
  useEffect(() => {
    const hideOnboarding = localStorage.getItem('hideOnboarding');
    if (!hideOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  // Check if player has completed today's daily challenge
  const playerDailyScore = useQuery(api.daily.getPlayerDailyScore, {
    playerId: sessionId,
  });

  const playerStats = useQuery(api.daily.getPlayerStats, {
    playerId: sessionId,
  });

  const createGame = useMutation(api.games.create);
  const joinGame = useMutation(api.players.join);
  const startGame = useAction(api.games.start);

  const formatDate = () => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };
    return now.toLocaleDateString(undefined, options);
  };

  const handleStartChallenge = async () => {
    const name = playerName.trim();
    if (name.length === 0) {
      playSound("/sounds/error.ogg");
      setError("Please enter your name!");
      inputRef.current?.focus();
      return;
    }

    if (isCreating) return;

    playSound("/sounds/confirmation.ogg");
    setIsCreating(true);
    setError("");

    try {
      const { gameId, code } = await createGame({
        hostId: sessionId,
        settings: {
          roundCount: 5,
          secondsPerRound: 30,
          playlistTag: "daily-songs",
          isSinglePlayer: true,
          hintsPerPlayer: 3,
          gameMode: "daily",
        },
      });

      // Join the game as a player
      await joinGame({
        code,
        sessionId,
        name: name,
      });

      // Start the game immediately
      await startGame({ gameId });

      // Navigate directly to game
      navigate({ to: `/game/${code}` });
    } catch (err) {
      playSound("/sounds/error.ogg");
      setError("Failed to create daily challenge. Please try again.");
      setIsCreating(false);
    }
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
          className="text-white max-w-[800px] mx-auto text-[3rem] sm:text-[6rem] leading-[1.3] mb-4"
          style={{
            fontFamily: '"VCR OSD Mono", monospace',
            WebkitTextStroke: '3px #0c4a6e',
            textShadow: `
              3px 3px 0 #0c4a6e,
              6px 6px 0 #075985,
              9px 9px 0 #0369a1,
              12px 12px 0 #0284c7
            `
          }}
        >
          DAILY
        </h1>

        {/* Musical notes decoration */}
        <BouncingMusicIcons size="medium" />

        <h1
          className="text-white mb-8 max-w-[800px] mx-auto text-[3rem] sm:text-[6rem] leading-[1.3]"
          style={{
            fontFamily: '"VCR OSD Mono", monospace',
            WebkitTextStroke: '3px #0c4a6e',
            textShadow: `
              3px 3px 0 #0c4a6e,
              6px 6px 0 #075985,
              9px 9px 0 #0369a1,
              12px 12px 0 #0284c7
            `
          }}
        >
          CHALLENGE
        </h1>

        {/* Date Display */}
        <div className="bg-yellow-400 border-4 border-yellow-600 px-6 py-3 mb-8 inline-block">
          <p className="pixel-text text-sky-900 text-xl flex items-center justify-center gap-2">
            <img src="/calendar.svg" alt="" width="24" height="24" aria-hidden="true" />
            {formatDate()}
          </p>
        </div>

        <div className="space-y-6 max-w-sm mx-auto">
          {/* Already Completed Banner */}
          {playerDailyScore && (
            <div className="bg-green-100 border-4 border-green-600 p-4 mb-4">
              <p className="pixel-text text-green-900 text-lg mb-2">
                ALREADY COMPLETED TODAY!
              </p>
              <p className="pixel-text text-green-800 text-base">
                YOUR SCORE: {playerDailyScore.score.toLocaleString()}
              </p>
              <p className="pixel-text text-green-700 text-sm mt-2 flex items-center justify-center gap-1">
                {playerStats ? (
                  <>
                    STREAK: {playerStats.currentStreak}
                    <img src="/fire.svg" alt="" width="14" height="14" aria-hidden="true" />
                  </>
                ) : (
                  <span className="opacity-0">STREAK: 0</span>
                )}
              </p>
            </div>
          )}

          {/* Name Input */}
          <div className="space-y-3">
            <PixelInput
              ref={inputRef}
              type="text"
              placeholder="ENTER NAME"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onEnterPress={handleStartChallenge}
              maxLength={20}
              className="w-full bg-white text-center"
              aria-label="Your name"
              aria-describedby={error ? "name-error" : undefined}
              autoFocus
              disabled={isCreating}
            />
            <PixelButton
              onClick={handleStartChallenge}
              className="w-full bg-yellow-400 hover:bg-yellow-300 border-yellow-600"
              aria-label="Start today's daily challenge"
              disabled={isCreating}
            >
              {isCreating ? "STARTING..." : "START CHALLENGE"}
            </PixelButton>
          </div>

          {/* Error Message */}
          {error && <PixelError id="name-error">{error}</PixelError>}

          {/* Leaderboard Link */}
          <PixelButton
            onClick={() => navigate({ to: "/daily-leaderboard" })}
            className="w-full"
            size="small"
            disabled={isCreating}
          >
            VIEW TODAY'S LEADERBOARD
          </PixelButton>

          {/* Back Button */}
          <PixelButton
            onClick={() => navigate({ to: "/" })}
            className="w-full"
            variant="danger"
            size="small"
            disabled={isCreating}
          >
            BACK TO HOME
          </PixelButton>
        </div>
      </main>
      <SoundToggle />

      {/* Onboarding Modal */}
      {showOnboarding && (
        <OnboardingModal
          onClose={() => setShowOnboarding(false)}
          isDailyMode={true}
          secondsPerRound={30}
        />
      )}
    </div>
  );
}
