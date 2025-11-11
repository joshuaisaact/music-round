import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useEffect, useState } from "react";
import { getSessionId } from "../../lib/session";
import { PixelButton, PixelInput, PlayerStandings } from "@/components";

export const Route = createFileRoute("/game/$code")({
  component: Game,
});

function Game() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const sessionId = getSessionId();

  const [artistGuess, setArtistGuess] = useState("");
  const [titleGuess, setTitleGuess] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  const game = useQuery(api.games.getByCode, { code });
  const currentPlayer = useQuery(
    api.players.getBySession,
    game ? { gameId: game._id, sessionId } : "skip",
  );
  const players = useQuery(
    api.players.list,
    game ? { gameId: game._id } : "skip",
  );
  const rounds = useQuery(
    api.rounds.list,
    game ? { gameId: game._id } : "skip",
  );
  const currentRound = useQuery(
    api.rounds.getCurrent,
    game ? { gameId: game._id, roundNumber: game.currentRound } : "skip",
  );
  const roundAnswers = useQuery(
    api.answers.listForRound,
    currentRound ? { roundId: currentRound._id } : "skip",
  );

  const submitAnswer = useMutation(api.answers.submit);
  const nextRound = useMutation(api.games.nextRound);
  const leaveGame = useMutation(api.players.leave);

  useEffect(() => {
    setArtistGuess("");
    setTitleGuess("");
    setHasSubmitted(false);
    setError("");
  }, [currentRound?._id]);

  useEffect(() => {
    if (currentPlayer && roundAnswers) {
      const myAnswer = roundAnswers.find(
        (a) => a.playerId === currentPlayer._id,
      );
      if (myAnswer) {
        setHasSubmitted(true);
        setArtistGuess(myAnswer.artist);
        setTitleGuess(myAnswer.title);
      }
    }
  }, [roundAnswers, currentPlayer]);

  useEffect(() => {
    if (game && game.status === "finished") {
      navigate({ to: "/summary/$code", params: { code } });
    }
  }, [game?.status, navigate, code]);

  // Timer countdown logic
  useEffect(() => {
    if (!currentRound?.startedAt || !game?.settings.secondsPerRound) {
      setTimeRemaining(null);
      return;
    }

    let hasAutoAdvanced = false;

    const updateTimer = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - currentRound.startedAt!) / 1000);
      const remaining = Math.max(0, game.settings.secondsPerRound - elapsed);
      setTimeRemaining(remaining);

      // Auto-advance when time expires (host only, once per round)
      if (remaining === 0 && currentPlayer?.isHost && !hasAutoAdvanced && game) {
        hasAutoAdvanced = true;
        nextRound({ gameId: game._id }).catch(() => {
          // Ignore errors, will be retried next round
        });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [
    currentRound?.startedAt,
    game?.settings.secondsPerRound,
    currentPlayer?.isHost,
    game?._id,
    nextRound,
  ]);

  const handleSubmit = async () => {
    if (!currentRound || !currentPlayer) return;

    if (!artistGuess.trim() && !titleGuess.trim()) {
      setError("Enter at least one guess!");
      return;
    }

    try {
      setError("");
      await submitAnswer({
        roundId: currentRound._id,
        playerId: currentPlayer._id,
        artist: artistGuess.trim(),
        title: titleGuess.trim(),
      });
      setHasSubmitted(true);
    } catch {
      setError("Failed to submit answer!");
    }
  };

  const handleNextRound = async () => {
    if (!game) return;
    try {
      await nextRound({ gameId: game._id });
    } catch {
      setError("Failed to advance round!");
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

  // Loading
  if (game === undefined || !currentPlayer) {
    return (
      <div className="min-h-screen bg-sky-400 flex items-center justify-center">
        <p className="pixel-text text-white text-xl">LOADING...</p>
      </div>
    );
  }

  // Game not found or wrong status
  if (game === null || game.status !== "playing") {
    return (
      <div className="min-h-screen bg-sky-400 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="pixel-text text-white text-xl mb-8">GAME NOT ACTIVE</p>
          <PixelButton onClick={() => navigate({ to: "/" })}>
            BACK TO HOME
          </PixelButton>
        </div>
      </div>
    );
  }

  if (!currentRound) {
    return (
      <div className="min-h-screen bg-sky-400 flex items-center justify-center">
        <p className="pixel-text text-white text-xl">LOADING ROUND...</p>
      </div>
    );
  }

  const isHost = currentPlayer.isHost === true;
  const totalRounds = rounds?.length || 0;
  const currentRoundNumber = currentRound.roundNumber + 1; // Display as 1-indexed
  const allPlayersSubmitted =
    (roundAnswers?.length || 0) === (players?.length || 0);

  return (
    <div className="min-h-screen bg-sky-400 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="pixel-text text-white text-xs opacity-75">{code}</p>
            <h1 className="pixel-text text-white text-2xl md:text-4xl">
              ROUND {currentRoundNumber} / {totalRounds}
            </h1>
            <p className="pixel-text text-white text-xs opacity-75">
              SCORE: {currentPlayer.score}
            </p>
          </div>

          {/* Timer */}
          {timeRemaining !== null && (
            <div className="flex justify-center">
              <div
                className={`
                  px-6 py-3 border-4
                  ${
                    timeRemaining <= 10
                      ? "bg-red-500 border-red-800 animate-pulse"
                      : timeRemaining <= 30
                        ? "bg-yellow-300 border-yellow-600"
                        : "bg-green-300 border-green-600"
                  }
                `}
              >
                <p className="pixel-text text-2xl md:text-3xl">
                  ⏱️ {Math.floor(timeRemaining / 60)}:
                  {(timeRemaining % 60).toString().padStart(2, "0")}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Game Area - Left/Top */}
          <div className="lg:col-span-2 space-y-6">
            {/* Audio Player */}
            <div className="bg-white border-4 border-sky-900 p-6">
              <h2 className="pixel-text text-sky-900 text-lg mb-4 flex items-center gap-2">
                🎵 LISTEN TO THE SONG
              </h2>

              {currentRound.songData.albumArt && (
                <div className="mb-4">
                  <img
                    src={currentRound.songData.albumArt}
                    alt="Album art"
                    className="w-32 h-32 mx-auto border-4 border-sky-900"
                  />
                </div>
              )}

              {currentRound.songData.previewURL ? (
                <audio
                  key={currentRound._id}
                  controls
                  autoPlay
                  className="w-full"
                  src={currentRound.songData.previewURL}
                >
                  Your browser does not support audio.
                </audio>
              ) : (
                <p className="pixel-text text-sky-600 text-sm">
                  NO PREVIEW AVAILABLE
                </p>
              )}
            </div>

            {/* Answer Form */}
            <div className="bg-white border-4 border-sky-900 p-6">
              {hasSubmitted ? (
                <div className="space-y-4">
                  <div className="bg-green-100 border-2 border-green-600 p-4">
                    <p className="pixel-text text-green-800 text-sm mb-2">
                      ✅ ANSWER SUBMITTED!
                    </p>
                    <p className="pixel-text text-green-700 text-xs">
                      Artist: {artistGuess || "(blank)"}
                    </p>
                    <p className="pixel-text text-green-700 text-xs">
                      Title: {titleGuess || "(blank)"}
                    </p>
                  </div>

                  {/* Show correct answer */}
                  {currentRound && roundAnswers && currentPlayer && (
                    (() => {
                      const myAnswer = roundAnswers.find(
                        (a) => a.playerId === currentPlayer._id,
                      );
                      if (!myAnswer) return null;

                      const { artistCorrect, titleCorrect, points } = myAnswer;
                      const { correctArtist, correctTitle } =
                        currentRound.songData;

                      return (
                        <div className="bg-sky-100 border-2 border-sky-600 p-4">
                          <p className="pixel-text text-sky-900 text-sm mb-3 font-bold">
                            CORRECT ANSWER:
                          </p>

                          <div className="space-y-2">
                            <div className="flex items-start gap-2">
                              <span className="pixel-text text-xs">
                                {artistCorrect ? "✅" : "❌"}
                              </span>
                              <div className="flex-1">
                                <p className="pixel-text text-sky-600 text-xs">
                                  Artist:
                                </p>
                                <p className="pixel-text text-sky-900 text-sm">
                                  {correctArtist}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-start gap-2">
                              <span className="pixel-text text-xs">
                                {titleCorrect ? "✅" : "❌"}
                              </span>
                              <div className="flex-1">
                                <p className="pixel-text text-sky-600 text-xs">
                                  Title:
                                </p>
                                <p className="pixel-text text-sky-900 text-sm">
                                  {correctTitle}
                                </p>
                              </div>
                            </div>

                            <div className="pt-2 border-t-2 border-sky-300">
                              <p className="pixel-text text-sky-900 text-sm">
                                Points Earned: {points}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  )}

                  <p className="pixel-text text-sky-600 text-xs text-center">
                    {allPlayersSubmitted
                      ? "ALL PLAYERS SUBMITTED!"
                      : `WAITING FOR OTHER PLAYERS... (${roundAnswers?.length}/${players?.length})`}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <PixelInput
                    type="text"
                    label="ARTIST NAME"
                    placeholder="WHO IS THE ARTIST?"
                    value={artistGuess}
                    onChange={(e) => setArtistGuess(e.target.value)}
                    className="w-full"
                  />

                  <PixelInput
                    type="text"
                    label="SONG TITLE"
                    placeholder="WHAT IS THE SONG?"
                    value={titleGuess}
                    onChange={(e) => setTitleGuess(e.target.value)}
                    onEnterPress={handleSubmit}
                    className="w-full"
                  />

                  <PixelButton onClick={handleSubmit} className="w-full">
                    SUBMIT ANSWER
                  </PixelButton>

                  {error && (
                    <div className="pixel-text pixel-error">⚠️ {error}</div>
                  )}
                </div>
              )}
            </div>

            {/* Host Controls */}
            {isHost && (
              <div className="bg-yellow-100 border-4 border-yellow-600 p-6">
                <PixelButton
                  onClick={handleNextRound}
                  variant="warning"
                  className="w-full"
                >
                  {currentRoundNumber === totalRounds
                    ? "FINISH GAME"
                    : "NEXT ROUND"}
                </PixelButton>
                {!allPlayersSubmitted && (
                  <p className="pixel-text text-yellow-800 text-xs mt-3 text-center">
                    {roundAnswers?.length}/{players?.length} PLAYERS SUBMITTED
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Leaderboard - Right/Bottom */}
          <div className="lg:col-span-1">
            <div className="bg-white border-4 border-sky-900 p-6 sticky top-4">
              <h2 className="pixel-text text-sky-900 text-lg mb-4 flex items-center gap-2">
                🏆 LEADERBOARD
              </h2>

              <PlayerStandings
                players={players || []}
                currentPlayerId={currentPlayer._id}
                variant="compact"
              />
            </div>
          </div>
        </div>

        {/* Leave button */}
        <div className="text-center mt-8">
          <PixelButton
            onClick={() => setShowLeaveModal(true)}
            variant="danger"
            size="small"
          >
            LEAVE GAME
          </PixelButton>
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
              ARE YOU SURE YOU WANT TO LEAVE? YOUR PROGRESS WILL BE LOST.
            </p>
            <div className="flex gap-4">
              <PixelButton
                onClick={() => setShowLeaveModal(false)}
                className="flex-1 bg-sky-100 text-sky-900"
              >
                CANCEL
              </PixelButton>
              <PixelButton
                onClick={handleLeave}
                variant="danger"
                className="flex-1"
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
