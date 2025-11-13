import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { getSessionId } from "../../lib/session";
import { useState, useEffect, useRef } from "react";
import { PixelButton, PixelInput } from "@/components";

export const Route = createFileRoute("/lobby/$code")({
  component: Lobby,
});

function Lobby() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const sessionId = getSessionId();

  const [playerName, setPlayerName] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  const game = useQuery(api.games.getByCode, { code });
  const players = useQuery(
    api.players.list,
    game ? { gameId: game._id } : "skip",
  );
  const currentPlayer = useQuery(
    api.players.getBySession,
    game ? { gameId: game._id, sessionId } : "skip",
  );

  const joinGame = useMutation(api.players.join);
  const startGame = useAction(api.games.start);
  const leaveGame = useMutation(api.players.leave);

  const handleJoin = async () => {
    if (!playerName.trim()) {
      setError("Please enter your name!");
      return;
    }

    try {
      setError("");
      await joinGame({
        code,
        sessionId,
        name: playerName.trim(),
      });
      setHasJoined(true);
    } catch {
      setError("Failed to join game. Check the code!");
    }
  };

  const handleStartGame = async () => {
    if (!game || isStarting) return;
    try {
      setIsStarting(true);
      setError("");
      await startGame({ gameId: game._id });
    } catch {
      setError("Failed to start game!");
      setIsStarting(false);
    }
  };

  // Navigate existing players when game status changes
  useEffect(() => {
    if (!game || !currentPlayer) return;

    if (game.status === "playing") {
      navigate({ to: "/game/$code", params: { code } });
    } else if (game.status === "finished") {
      navigate({ to: "/summary/$code", params: { code } });
    }
  }, [game?.status, currentPlayer, code, navigate]);

  // Handle Escape key for modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showLeaveModal) {
        setShowLeaveModal(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showLeaveModal]);

  // Focus cancel button when modal opens
  useEffect(() => {
    if (showLeaveModal) {
      cancelButtonRef.current?.focus();
    }
  }, [showLeaveModal]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Failed to copy code!");
    }
  };

  const handleLeave = async () => {
    if (game) {
      try {
        await leaveGame({ gameId: game._id, sessionId });
      } catch {
        // Silently fail - still navigate away even if deletion fails
      }
    }
    navigate({ to: "/" });
  };

  if (game === undefined) {
    return (
      <div className="min-h-screen bg-sky-400 flex items-center justify-center">
        <p className="pixel-text text-white text-xl">LOADING...</p>
      </div>
    );
  }

  if (game === null) {
    return (
      <div className="min-h-screen bg-sky-400 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="pixel-text text-white text-xl mb-8">GAME NOT FOUND</p>
          <PixelButton
            onClick={() => navigate({ to: "/" })}
          >
            BACK TO HOME
          </PixelButton>
        </div>
      </div>
    );
  }

  // Block new players from joining in-progress or finished games
  if ((game.status === "playing" || game.status === "finished") && !currentPlayer) {
    return (
      <div className="min-h-screen bg-sky-400 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="pixel-text text-white text-xl mb-8">
            GAME {game.status === "playing" ? "IN PROGRESS" : "FINISHED"}
          </p>
          <p className="pixel-text text-white text-sm mb-8 opacity-75">
            This game has already started
          </p>
          <PixelButton
            onClick={() => navigate({ to: "/" })}
          >
            BACK TO HOME
          </PixelButton>
        </div>
      </div>
    );
  }

  if (!currentPlayer && !hasJoined) {
    return (
      <div className="min-h-screen bg-sky-400 flex items-center justify-center p-4">
        <main className="relative z-10 text-center max-w-md w-full">
          <h1 className="text-white mb-8 text-[3rem] sm:text-[7rem] leading-[1.3]" style={{ fontFamily: '"VCR OSD Mono", monospace' }}>JOIN GAME</h1>

          <div className="bg-white border-4 border-sky-900 p-8 mb-6">
            <p className="pixel-text text-sky-600 text-sm mb-2">GAME CODE</p>
            <p className="pixel-text text-sky-900 text-3xl mb-6">{code}</p>
          </div>

          <div className="space-y-4">
            <PixelInput
              type="text"
              placeholder="YOUR NAME"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onEnterPress={handleJoin}
              maxLength={20}
              className="w-full bg-white text-center"
              aria-label="Your name"
              aria-describedby={error ? "join-error" : undefined}
              autoFocus
            />

            <PixelButton
              onClick={handleJoin}
              className="w-full"
              aria-label="Join the game with entered name"
            >
              JOIN GAME
            </PixelButton>

            {error && (
              <div id="join-error" role="alert" className="pixel-error">
                {error}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  const isHost = currentPlayer?.isHost === true;
  const playersList = players || [];

  return (
    <div className="min-h-screen bg-sky-400 p-4 md:p-8">
      <main className="max-w-4xl mx-auto">
        {/* Header with Game Code */}
        <div className="text-center mb-8">
          <div className="bg-white border-4 border-sky-900 p-6 inline-block">
            <p className="pixel-text text-sky-600 text-sm md:text-base mb-2">
              GAME CODE
            </p>
            <p className="pixel-text text-sky-900 text-4xl md:text-6xl tracking-wider" aria-label={`Game code ${code.split('').join(' ')}`}>
              {code}
            </p>
            <button
              onClick={handleCopyCode}
              className="pixel-text text-sky-600 text-sm md:text-base mt-3 hover:text-sky-800 transition-colors cursor-pointer focus-visible:outline focus-visible:outline-4 focus-visible:outline-yellow-400 focus-visible:outline-offset-4"
              aria-label={copied ? "Code copied to clipboard" : "Copy game code to clipboard"}
            >
              {copied ? "COPIED! ✓" : "SHARE THIS CODE"}
            </button>
          </div>
        </div>

        {/* Players List */}
        <section className="bg-white border-4 border-sky-900 p-6 mb-6" aria-labelledby="players-heading">
          <h2 id="players-heading" className="pixel-text text-sky-900 text-2xl mb-4">
            PLAYERS ({playersList.length})
          </h2>

          <ul className="space-y-3" role="list">
            {playersList.length === 0 ? (
              <li>
                <p className="pixel-text text-sky-600 text-sm">
                  WAITING FOR PLAYERS...
                </p>
              </li>
            ) : (
              playersList.map((player) => (
                <li
                  key={player._id}
                  className="bg-sky-100 border-2 border-sky-900 p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl" aria-hidden="true">
                      {player.isHost ? "👑" : "🎮"}
                    </span>
                    <span className="pixel-text text-sky-900 text-lg">
                      {player.name.toUpperCase()}
                      {player.isHost && <span className="sr-only"> (Host)</span>}
                      {player._id === currentPlayer?._id && <span className="sr-only"> (You)</span>}
                    </span>
                  </div>

                  <div className="flex gap-2" aria-hidden="true">
                    {player.isHost && (
                      <span className="pixel-text text-sky-600 text-base">
                        (HOST)
                      </span>
                    )}
                    {player._id === currentPlayer?._id && (
                      <span className="pixel-text text-sky-600 text-base">
                        (YOU)
                      </span>
                    )}
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>

        {/* Action Buttons */}
        <div className="text-center space-y-4">
          {isHost ? (
            <PixelButton
              onClick={handleStartGame}
              disabled={playersList.length < 1 || isStarting}
              className="w-full max-w-md"
              aria-label={isStarting ? "Starting game..." : "Start game"}
            >
              {isStarting ? "STARTING..." : "START GAME"}
            </PixelButton>
          ) : (
            <p className="pixel-text text-white text-sm" role="status" aria-live="polite">
              WAITING FOR HOST TO START...
            </p>
          )}

          {error && (
            <div className="pixel-error max-w-md mx-auto" role="alert">⚠️ {error}</div>
          )}
        </div>

        {/* Fun waiting animation */}
        <div className="text-center mt-8" aria-hidden="true">
          <div className="inline-flex gap-2">
            <span
              className="inline-block animate-bounce text-2xl"
              style={{ animationDelay: "0ms" }}
            >
              🎵
            </span>
            <span
              className="inline-block animate-bounce text-2xl"
              style={{ animationDelay: "150ms" }}
            >
              🎸
            </span>
            <span
              className="inline-block animate-bounce text-2xl"
              style={{ animationDelay: "300ms" }}
            >
              🎤
            </span>
          </div>
        </div>

        {/* Leave button */}
        <div className="text-center mt-8">
          <PixelButton
            onClick={() => setShowLeaveModal(true)}
            variant="danger"
            size="small"
            aria-label="Leave game"
          >
            LEAVE GAME
          </PixelButton>
        </div>
      </main>

      {/* Leave confirmation modal */}
      {showLeaveModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          aria-describedby="modal-description"
        >
          <div className="bg-white border-4 border-sky-900 p-8 max-w-md w-full">
            <h3 id="modal-title" className="pixel-text text-sky-900 text-xl mb-4 text-center">
              LEAVE GAME?
            </h3>
            <p id="modal-description" className="pixel-text text-sky-700 text-sm mb-6 text-center">
              ARE YOU SURE YOU WANT TO LEAVE THE LOBBY?
            </p>
            <div className="flex gap-4">
              <PixelButton
                ref={cancelButtonRef}
                onClick={() => setShowLeaveModal(false)}
                size="medium"
                className="flex-1 bg-sky-100 text-sky-900 hover:bg-sky-200"
                aria-label="Cancel and stay in lobby"
              >
                CANCEL
              </PixelButton>
              <PixelButton
                onClick={handleLeave}
                variant="danger"
                size="medium"
                className="flex-1"
                aria-label="Confirm and leave game"
              >
                LEAVE
              </PixelButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
