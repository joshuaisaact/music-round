import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { getSessionId } from "../../lib/session";
import { useState, useEffect } from "react";

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
  const startGame = useMutation(api.games.start);
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
    if (!game) return;
    try {
      await startGame({ gameId: game._id });
      navigate({ to: "/game/$code", params: { code } });
    } catch {
      setError("Failed to start game!");
    }
  };

  // Navigate all players when game status changes to "playing"
  useEffect(() => {
    if (game?.status === "playing") {
      navigate({ to: "/game/$code", params: { code } });
    }
  }, [game?.status, code, navigate]);

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
          <button
            onClick={() => navigate({ to: "/" })}
            className="pixel-button bg-white text-xl py-5 px-8"
          >
            BACK TO HOME
          </button>
        </div>
      </div>
    );
  }

  if (!currentPlayer && !hasJoined) {
    return (
      <div className="min-h-screen bg-sky-400 flex items-center justify-center p-4">
        <div className="relative z-10 text-center max-w-md w-full">
          <h1 className="pixel-title text-white mb-8">JOIN GAME</h1>

          <div className="bg-white border-4 border-sky-900 p-8 mb-6">
            <p className="pixel-text text-sky-600 text-sm mb-2">GAME CODE</p>
            <p className="pixel-text text-sky-900 text-3xl mb-6">{code}</p>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="YOUR NAME"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              maxLength={20}
              className="pixel-input w-full bg-white text-xl p-4 text-center outline-none"
              autoFocus
            />

            <button
              onClick={handleJoin}
              className="pixel-button w-full bg-white text-xl py-5 px-8"
            >
              JOIN GAME
            </button>

            {error && <div className="pixel-error">{error}</div>}
          </div>
        </div>
      </div>
    );
  }

  const isHost = currentPlayer?.isHost === true;
  const playersList = players || [];

  return (
    <div className="min-h-screen bg-sky-400 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header with Game Code */}
        <div className="text-center mb-8">
          <div className="bg-white border-4 border-sky-900 p-6 inline-block">
            <p className="pixel-text text-sky-600 text-sm md:text-base mb-2">
              GAME CODE
            </p>
            <p className="pixel-text text-sky-900 text-4xl md:text-6xl tracking-wider">
              {code}
            </p>
            <button
              onClick={handleCopyCode}
              className="pixel-text text-sky-600 text-sm md:text-base mt-3 hover:text-sky-800 transition-colors cursor-pointer"
            >
              {copied ? "COPIED! ✓" : "SHARE THIS CODE"}
            </button>
          </div>
        </div>

        {/* Players List */}
        <div className="bg-white border-4 border-sky-900 p-6 mb-6">
          <h2 className="pixel-text text-sky-900 text-2xl mb-4">
            PLAYERS ({playersList.length})
          </h2>

          <div className="space-y-3">
            {playersList.length === 0 ? (
              <p className="pixel-text text-sky-600 text-sm">
                WAITING FOR PLAYERS...
              </p>
            ) : (
              playersList.map((player) => (
                <div
                  key={player._id}
                  className="bg-sky-100 border-2 border-sky-900 p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {player.isHost ? "👑" : "🎮"}
                    </span>
                    <span className="pixel-text text-sky-900 text-lg">
                      {player.name}
                    </span>
                  </div>

                  <div className="flex gap-2">
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
                </div>
              ))
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="text-center space-y-4">
          {isHost ? (
            <button
              onClick={handleStartGame}
              disabled={playersList.length < 1}
              className="pixel-button w-full max-w-md bg-white text-xl py-5 px-8"
            >
              START GAME
            </button>
          ) : (
            <p className="pixel-text text-white text-sm">
              WAITING FOR HOST TO START...
            </p>
          )}

          {error && (
            <div className="pixel-error max-w-md mx-auto">⚠️ {error}</div>
          )}
        </div>

        {/* Fun waiting animation */}
        <div className="text-center mt-8">
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
          <button
            onClick={() => setShowLeaveModal(true)}
            className="pixel-button bg-red-500 hover:bg-red-600 !text-white text-sm py-3 px-6"
          >
            LEAVE GAME
          </button>
        </div>
      </div>

      {/* Leave confirmation modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border-4 border-sky-900 p-8 max-w-md w-full">
            <h3 className="pixel-text text-sky-900 text-xl mb-4 text-center">
              LEAVE GAME?
            </h3>
            <p className="pixel-text text-sky-700 text-sm mb-6 text-center">
              ARE YOU SURE YOU WANT TO LEAVE THE LOBBY?
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowLeaveModal(false)}
                className="pixel-button flex-1 bg-sky-100 text-sky-900 text-base py-3 px-4 hover:bg-sky-200"
              >
                CANCEL
              </button>
              <button
                onClick={handleLeave}
                className="pixel-button flex-1 bg-red-500 !text-white text-base py-3 px-4 hover:bg-red-600"
              >
                LEAVE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
