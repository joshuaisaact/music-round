import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useEffect, useState, useRef } from "react";
import { getSessionId } from "../../lib/session";
import { PixelButton, PixelInput, PixelAudioPlayer, PlayerStandings, SoundToggle, HintDisplay } from "@/components";
import { playSound } from "@/lib/audio";

export const Route = createFileRoute("/game/$code")({
  component: Game,
});

function Game() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const sessionId = getSessionId();

  const [artistGuess, setArtistGuess] = useState("");
  const [titleGuess, setTitleGuess] = useState("");
  const [artistLocked, setArtistLocked] = useState(false);
  const [titleLocked, setTitleLocked] = useState(false);
  const [shakeArtist, setShakeArtist] = useState(false);
  const [shakeTitle, setShakeTitle] = useState(false);
  const [isFullyLocked, setIsFullyLocked] = useState(false);
  const [error, setError] = useState("");
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [revealedArtistLetters, setRevealedArtistLetters] = useState<{ index: number; letter: string }[]>([]);
  const [revealedTitleLetters, setRevealedTitleLetters] = useState<{ index: number; letter: string }[]>([]);
  const [hintsRemaining, setHintsRemaining] = useState<number | null>(null);
  const artistInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

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
  const previousRound = useQuery(
    api.rounds.getCurrent,
    game && game.currentRound > 0
      ? { gameId: game._id, roundNumber: game.currentRound - 1 }
      : "skip",
  );
  const roundAnswers = useQuery(
    api.answers.listForRound,
    currentRound ? { roundId: currentRound._id } : "skip",
  );

  const submitAnswer = useMutation(api.answers.submit);
  const nextRound = useMutation(api.games.nextRound);
  const leaveGame = useMutation(api.players.leave);
  const useHintMutation = useMutation(api.answers.useHint);

  useEffect(() => {
    if (currentPlayer && roundAnswers && game) {
      const myAnswer = roundAnswers.find(
        (a) => a.playerId === currentPlayer._id,
      );
      if (myAnswer) {
        // Only update inputs if there's been a submission (attempts > 0)
        // This prevents hints from clearing typed text
        if (myAnswer.attempts && myAnswer.attempts > 0) {
          setArtistGuess(myAnswer.artist);
          setTitleGuess(myAnswer.title);
        }
        setArtistLocked(myAnswer.artistCorrect);
        setTitleLocked(myAnswer.titleCorrect);
        setIsFullyLocked(myAnswer.lockedAt !== undefined);

        // Load hint data from answer for this round
        if (myAnswer.revealedArtistLetters) {
          setRevealedArtistLetters(myAnswer.revealedArtistLetters);
        }
        if (myAnswer.revealedTitleLetters) {
          setRevealedTitleLetters(myAnswer.revealedTitleLetters);
        }
      }

      // Calculate hints remaining based on player's total hints used across entire game
      const hintsPerPlayer = game.settings.hintsPerPlayer ?? 3;
      const totalHintsUsed = currentPlayer.hintsUsed ?? 0;
      setHintsRemaining(hintsPerPlayer - totalHintsUsed);
    }
  }, [roundAnswers, currentPlayer, game]);

  useEffect(() => {
    if (game && game.status === "finished") {
      navigate({ to: "/summary/$code", params: { code } });
    }
  }, [game?.status, navigate, code]);

  // Update clock every second for timer display
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Reset form when round changes
  useEffect(() => {
    setArtistGuess("");
    setTitleGuess("");
    setArtistLocked(false);
    setTitleLocked(false);
    setIsFullyLocked(false);
    setShakeArtist(false);
    setShakeTitle(false);
    setError("");
    setIsAdvancing(false);
    setRevealedArtistLetters([]);
    setRevealedTitleLetters([]);
    // Don't reset hints remaining - it's tracked per game, not per round
  }, [currentRound?._id]);

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

  const handleSubmit = async () => {
    if (!currentRound || !currentPlayer) return;

    // Don't allow submission if fully locked
    if (isFullyLocked) return;

    // Check which parts we're submitting (not already locked)
    const submittingArtist = !artistLocked && artistGuess.trim();
    const submittingTitle = !titleLocked && titleGuess.trim();

    if (!submittingArtist && !submittingTitle) {
      setError("Enter at least one guess!");
      return;
    }

    try {
      setError("");
      const result = await submitAnswer({
        roundId: currentRound._id,
        playerId: currentPlayer._id,
        artist: artistGuess.trim(),
        title: titleGuess.trim(),
      });

      // Update locked states
      setArtistLocked(result.artistCorrect);
      setTitleLocked(result.titleCorrect);
      setIsFullyLocked(result.isLocked);

      // Check if any answer was correct or wrong
      const anyCorrect = (submittingArtist && result.artistCorrect) || (submittingTitle && result.titleCorrect);
      const anyWrong = (submittingArtist && !result.artistCorrect) || (submittingTitle && !result.titleCorrect);

      // Play sounds based on results
      if (anyCorrect) {
        playSound("/sounds/confirmation.ogg");
      } else if (anyWrong) {
        playSound("/sounds/error.ogg");
      }

      // Trigger shake animation for wrong answers
      if (submittingArtist && !result.artistCorrect) {
        setShakeArtist(true);
        setTimeout(() => setShakeArtist(false), 500);
      }
      if (submittingTitle && !result.titleCorrect) {
        setShakeTitle(true);
        setTimeout(() => setShakeTitle(false), 500);
      }

      // Show encouraging message if not fully correct yet
      if (!result.isLocked) {
        if (result.artistCorrect && !result.titleCorrect) {
          setError("Artist correct! Keep trying for the title...");
        } else if (!result.artistCorrect && result.titleCorrect) {
          setError("Title correct! Keep trying for the artist...");
        } else {
          setError("Not quite! Try again...");
        }
      } else {
        setError("");
      }
    } catch (err) {
      setError("Failed to submit answer!");
      console.error(err);
    }
  };

  const handleUseHint = async () => {
    if (!currentRound || !currentPlayer) return;

    // Don't allow hints if fully locked
    if (isFullyLocked) return;

    // Check if hints remaining
    if (hintsRemaining === null || hintsRemaining <= 0) {
      setError("No hints remaining!");
      return;
    }

    try {
      setError("");
      playSound("/sounds/hint.ogg");
      const result = await useHintMutation({
        roundId: currentRound._id,
        playerId: currentPlayer._id,
      });

      setRevealedArtistLetters(result.revealedArtistLetters);
      setRevealedTitleLetters(result.revealedTitleLetters);
      setHintsRemaining(result.hintsRemaining);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to use hint!";
      setError(errorMessage);
      console.error(err);
    }
  };

  const handleNextRound = async () => {
    if (!game || isAdvancing) return;
    try {
      setIsAdvancing(true);
      setError("");
      await nextRound({ gameId: game._id });
    } catch {
      setError("Failed to advance round!");
      setIsAdvancing(false);
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

  const getNextRoundButtonText = () => {
    if (isAdvancing) return "ADVANCING...";
    // For battle royale, never show "FINISH GAME" - game ends automatically on elimination
    if (isBattleRoyale) return "NEXT ROUND";
    if (currentRoundNumber === totalRounds) return "FINISH GAME";
    return "NEXT ROUND";
  };

  // Calculate time remaining based on server timestamps
  const phase = currentRound.phase || "preparing";
  let timeRemaining: number | null = null;

  if (phase === "preparing" && currentRound.startedAt) {
    const elapsed = Math.floor((now - currentRound.startedAt) / 1000);
    timeRemaining = Math.max(0, 3 - elapsed);
  } else if (phase === "active" && currentRound.activeAt && game) {
    const elapsed = Math.floor((now - currentRound.activeAt) / 1000);
    timeRemaining = Math.max(0, game.settings.secondsPerRound - elapsed);
  }

  const calculateComponentPoints = (secondsElapsed: number, totalSeconds: number): number => {
    const maxPoints = 500;
    const minPoints = 250;
    const gracePercent = 0.1;

    const graceTime = totalSeconds * gracePercent;

    if (secondsElapsed <= graceTime) {
      return maxPoints;
    }

    const adjustedElapsed = secondsElapsed - graceTime;
    const adjustedTotal = totalSeconds * (1 - gracePercent);
    const pointsAvailable = maxPoints - ((maxPoints - minPoints) / adjustedTotal) * adjustedElapsed;

    return Math.ceil(pointsAvailable);
  };

  const getAvailablePoints = () => {
    if (phase !== "active" || !currentRound.activeAt || !game) {
      return { artistPoints: 500, titlePoints: 500, total: 1000, isLocked: false };
    }

    const elapsed = Math.floor((now - currentRound.activeAt) / 1000);
    const totalSeconds = game.settings.secondsPerRound;

    // If fully locked, show the locked points
    if (isFullyLocked) {
      const myAnswer = roundAnswers?.find((a) => a.playerId === currentPlayer?._id);
      return {
        artistPoints: 0,
        titlePoints: 0,
        total: myAnswer?.points || 0,
        isLocked: true,
      };
    }

    // Calculate points for each component
    const artistPoints = artistLocked ? 0 : calculateComponentPoints(elapsed, totalSeconds);
    const titlePoints = titleLocked ? 0 : calculateComponentPoints(elapsed, totalSeconds);

    // Get locked points from existing answer
    let lockedArtistPoints = 0;
    let lockedTitlePoints = 0;

    if (artistLocked || titleLocked) {
      const myAnswer = roundAnswers?.find((a) => a.playerId === currentPlayer?._id);
      if (myAnswer) {
        if (artistLocked && myAnswer.artistLockedAt && currentRound.activeAt) {
          const artistSecondsElapsed = Math.floor((myAnswer.artistLockedAt - currentRound.activeAt) / 1000);
          lockedArtistPoints = calculateComponentPoints(artistSecondsElapsed, totalSeconds);
        }
        if (titleLocked && myAnswer.titleLockedAt && currentRound.activeAt) {
          const titleSecondsElapsed = Math.floor((myAnswer.titleLockedAt - currentRound.activeAt) / 1000);
          lockedTitlePoints = calculateComponentPoints(titleSecondsElapsed, totalSeconds);
        }
      }
    }

    const total = lockedArtistPoints + lockedTitlePoints + artistPoints + titlePoints;

    return {
      artistPoints: artistLocked ? lockedArtistPoints : artistPoints,
      titlePoints: titleLocked ? lockedTitlePoints : titlePoints,
      lockedArtistPoints: artistLocked ? lockedArtistPoints : 0,
      lockedTitlePoints: titleLocked ? lockedTitlePoints : 0,
      total,
      isLocked: false,
    };
  };

  const availablePoints = getAvailablePoints();

  const isDailyMode = game.settings.gameMode === "daily";
  const isBattleRoyale = game.settings.gameMode === "battle_royale";

  // Format today's date for display
  const formatDate = () => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };
    return now.toLocaleDateString('en-US', options);
  };

  return (
    <div className="min-h-screen bg-sky-400 p-4 md:p-8">
      <main className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-6 space-y-4">
          {/* Daily Challenge Banner */}
          {isDailyMode && (
            <div className="px-6 py-4 border-4 bg-yellow-400 border-yellow-600 text-center">
              <p className="pixel-text text-sky-900 text-xl md:text-2xl">
                🎵 DAILY CHALLENGE - {formatDate()}
              </p>
            </div>
          )}

          {/* Timer and Points */}
          {timeRemaining !== null && phase === "active" && (
            <div className="flex justify-between items-center gap-4 flex-wrap">
              {/* Song Counter and Lives */}
              <div className="flex items-center gap-4">
                <div className="px-6 py-3 border-4 bg-white border-sky-900">
                  <p className="pixel-text text-sky-900 text-2xl md:text-3xl">
                    {isBattleRoyale ? `SONG ${currentRoundNumber}` : `SONG ${currentRoundNumber}/${totalRounds}`}
                  </p>
                </div>

                {/* Battle Royale Lives Display */}
                {isBattleRoyale && (
                  <div className="px-6 py-3 border-4 bg-white border-sky-900">
                    <div className="pixel-text text-sky-900 text-2xl md:text-3xl flex items-center gap-2">
                      <span className="hidden sm:inline">LIVES:</span>
                      <div className="flex gap-1">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <img
                            key={i}
                            src="/heart.svg"
                            alt=""
                            width="24"
                            height="24"
                            aria-hidden="true"
                            className={`${i >= (currentPlayer?.lives ?? 3) ? "opacity-20" : ""}`}
                          />
                        ))}
                      </div>
                      <span className="ml-1">{currentPlayer?.lives ?? 3}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Timer */}
              <div
                className={`
                  px-6 py-3 border-4
                  ${
                    timeRemaining <= game.settings.secondsPerRound * 0.17
                      ? "bg-red-500 border-red-800 animate-pulse"
                      : timeRemaining <= game.settings.secondsPerRound * 0.5
                        ? "bg-yellow-300 border-yellow-600"
                        : "bg-green-300 border-green-600"
                  }
                `}
                role="timer"
                aria-live="polite"
                aria-atomic="true"
              >
                <p className="pixel-text text-2xl md:text-3xl flex items-center gap-2" aria-label={`${timeRemaining} seconds remaining`}>
                  <img src="/clock.svg" alt="" width="28" height="28" aria-hidden="true" />
                  {Math.floor(timeRemaining / 60)}:
                  {(timeRemaining % 60).toString().padStart(2, "0")}
                </p>
              </div>

              {/* Points Display */}
              <div
                className={`
                  px-6 py-3 border-4
                  ${
                    availablePoints.isLocked
                      ? "bg-green-300 border-green-600"
                      : timeRemaining <= game.settings.secondsPerRound * 0.17
                        ? "bg-red-500 border-red-800 animate-pulse"
                        : timeRemaining <= game.settings.secondsPerRound * 0.5
                          ? "bg-yellow-300 border-yellow-600"
                          : "bg-green-300 border-green-600"
                  }
                `}
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                <p className="pixel-text text-2xl md:text-3xl" aria-label={`${availablePoints.total} points available`}>
                  {availablePoints.isLocked ? (
                    <>{availablePoints.total}PTS</>
                  ) : artistLocked && titleLocked ? (
                    <>{availablePoints.total}PTS</>
                  ) : artistLocked ? (
                    <>
                      <span className="opacity-75">{availablePoints.lockedArtistPoints}</span>
                      {" + "}
                      {availablePoints.titlePoints}PTS
                    </>
                  ) : titleLocked ? (
                    <>
                      {availablePoints.artistPoints}
                      {" + "}
                      <span className="opacity-75">{availablePoints.lockedTitlePoints}</span>PTS
                    </>
                  ) : (
                    <>{availablePoints.total}PTS</>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Show song counter when timer is not active */}
          {(timeRemaining === null || phase !== "active") && (
            <div className="flex justify-center gap-4">
              <div className="px-6 py-3 border-4 bg-white border-sky-900">
                <p className="pixel-text text-sky-900 text-2xl md:text-3xl">
                  {isBattleRoyale ? `SONG ${currentRoundNumber}` : `SONG ${currentRoundNumber}/${totalRounds}`}
                </p>
              </div>

              {/* Battle Royale Lives Display */}
              {isBattleRoyale && (
                <div className="px-6 py-3 border-4 bg-white border-sky-900">
                  <div className="pixel-text text-sky-900 text-2xl md:text-3xl flex items-center gap-2">
                    <span className="hidden sm:inline">LIVES:</span>
                    <div className="flex gap-1">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <img
                          key={i}
                          src="/heart.svg"
                          alt=""
                          width="24"
                          height="24"
                          aria-hidden="true"
                          className={`${i >= (currentPlayer?.lives ?? 3) ? "opacity-20" : ""}`}
                        />
                      ))}
                    </div>
                    <span className="ml-1">{currentPlayer?.lives ?? 3}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </header>

        {/* Preparing Phase Overlay */}
        {phase === "preparing" && (
          <div className="fixed inset-0 bg-sky-400 z-40">
            {/* Previous round info at top */}
            {previousRound && (
              <div className="flex justify-center pt-8 px-4">
                <div className="bg-white border-4 border-sky-900 p-4 max-w-2xl w-full">
                  <article className="flex gap-4">
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="pixel-text text-sky-900 text-sm font-bold mb-2">
                          SONG {currentRoundNumber - 1}
                        </h3>
                        <div className="space-y-2">
                          <p className="pixel-text text-sky-900 text-xl md:text-2xl font-bold">
                            {previousRound.songData.correctTitle.toUpperCase()}
                          </p>
                          <p className="pixel-text text-sky-700 text-lg md:text-xl">
                            {previousRound.songData.correctArtist.toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {previousRound.songData.albumArt && (
                      <div className="flex flex-col items-end gap-2">
                        <img
                          src={previousRound.songData.albumArt}
                          alt={`Album art for ${previousRound.songData.correctTitle} by ${previousRound.songData.correctArtist}`}
                          className="w-24 h-24 border-4 border-sky-900"
                        />
                      </div>
                    )}
                  </article>
                </div>
              </div>
            )}

            {/* Countdown centered */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="pixel-text text-white text-2xl md:text-3xl">
                  ROUND {currentRoundNumber}
                </p>
                {timeRemaining !== null && (
                  <p className="pixel-text text-white text-6xl md:text-8xl mt-12">
                    {timeRemaining}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Game Area - Left/Top */}
          <div className="lg:col-span-2 space-y-6">
            {/* Audio Player */}
            <div className="bg-white border-4 border-sky-900 p-6">
              <h2 className="pixel-text text-sky-900 text-lg mb-4 flex items-center gap-2">
                🎵 LISTEN TO THE SONG
              </h2>

              {phase === "active" && currentRound.songData.previewURL ? (
                <PixelAudioPlayer
                  key={`${currentRound._id}-${phase}`}
                  src={currentRound.songData.previewURL}
                  autoPlay
                />
              ) : phase !== "active" ? (
                <p className="pixel-text text-sky-600 text-sm text-center">
                  AUDIO WILL START SOON...
                </p>
              ) : (
                <p className="pixel-text text-sky-600 text-sm">
                  NO PREVIEW AVAILABLE
                </p>
              )}
            </div>

            {/* Answer Form */}
            <div
              key={currentRound._id}
              className="bg-white border-4 border-sky-900 p-6"
            >
              <style>
                {`
                  @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-10px); }
                    75% { transform: translateX(10px); }
                  }
                  .shake {
                    animation: shake 0.3s ease-in-out;
                  }
                `}
              </style>

              <div className="space-y-6">
                <div className={shakeArtist ? "shake" : ""}>
                  {currentRound && revealedArtistLetters.length > 0 && !artistLocked && (
                    <div className="mb-2 bg-yellow-50 border-2 border-yellow-600 p-2">
                      <HintDisplay
                        text={currentRound.songData.correctArtist}
                        revealedLetters={revealedArtistLetters}
                      />
                    </div>
                  )}
                  <PixelInput
                    ref={artistInputRef}
                    type="text"
                    label="ARTIST NAME"
                    placeholder="WHO IS THE ARTIST?"
                    value={artistGuess}
                    onChange={(e) => !artistLocked && setArtistGuess(e.target.value)}
                    onEnterPress={!isFullyLocked ? handleSubmit : undefined}
                    className={`w-full ${
                      artistLocked
                        ? "!border-green-600 !border-4"
                        : shakeArtist
                          ? "!border-red-600 !border-4"
                          : ""
                    }`}
                    disabled={artistLocked}
                    aria-label="Artist name"
                    aria-describedby={artistLocked ? "artist-correct" : undefined}
                    autoFocus
                  />
                  {artistLocked && (
                    <p id="artist-correct" className="pixel-text text-green-700 text-xs mt-1 font-bold" role="status">
                      CORRECT!
                    </p>
                  )}
                </div>

                <div className={shakeTitle ? "shake" : ""}>
                  {currentRound && revealedTitleLetters.length > 0 && !titleLocked && (
                    <div className="mb-2 bg-yellow-50 border-2 border-yellow-600 p-2">
                      <HintDisplay
                        text={currentRound.songData.correctTitle}
                        revealedLetters={revealedTitleLetters}
                      />
                    </div>
                  )}
                  <PixelInput
                    ref={titleInputRef}
                    type="text"
                    label="SONG TITLE"
                    placeholder="WHAT IS THE SONG?"
                    value={titleGuess}
                    onChange={(e) => !titleLocked && setTitleGuess(e.target.value)}
                    onEnterPress={!isFullyLocked ? handleSubmit : undefined}
                    className={`w-full ${
                      titleLocked
                        ? "!border-green-600 !border-4"
                        : shakeTitle
                          ? "!border-red-600 !border-4"
                          : ""
                    }`}
                    disabled={titleLocked}
                    aria-label="Song title"
                    aria-describedby={titleLocked ? "title-correct" : error ? "answer-error" : undefined}
                  />
                  {titleLocked && (
                    <p id="title-correct" className="pixel-text text-green-700 text-xs mt-1 font-bold" role="status">
                      CORRECT!
                    </p>
                  )}
                </div>

                {!isFullyLocked && (
                  <>
                    <PixelButton
                      onClick={handleSubmit}
                      className="w-full"
                      disabled={phase !== "active"}
                      aria-label={artistLocked || titleLocked ? "Try again with another guess" : "Submit your answer"}
                    >
                      {artistLocked || titleLocked ? "TRY AGAIN" : "SUBMIT ANSWER"}
                    </PixelButton>
                    <PixelButton
                      onClick={handleUseHint}
                      className="w-full"
                      disabled={phase !== "active" || hintsRemaining === 0}
                      aria-label={`Use hint (${hintsRemaining} remaining)`}
                    >
                      <span className="flex items-center justify-center gap-2">
                        <img src="/light-bulb.svg" alt="" width="20" height="20" aria-hidden="true" />
                        {hintsRemaining === 0 ? "OUT OF HINTS!" : `HINT (${hintsRemaining})`}
                      </span>
                    </PixelButton>
                  </>
                )}

                {error && (
                  <div
                    id="answer-error"
                    role="alert"
                    className={`pixel-text text-sm p-3 border-2 ${
                      error.includes("correct")
                        ? "bg-blue-50 border-blue-600 text-blue-900"
                        : "bg-red-50 border-red-600 text-red-900"
                    }`}
                  >
                    {error}
                  </div>
                )}

                {/* Show stats when fully locked */}
                {isFullyLocked && currentRound && roundAnswers && (
                  <div className="bg-green-100 border-4 border-green-600 p-6 text-center">
                    {(() => {
                      const myAnswer = roundAnswers.find((a) => a.playerId === currentPlayer._id);
                      const points = myAnswer?.points || 0;
                      const message = points >= 900 ? "INCREDIBLE!" : points >= 700 ? "GREAT!" : points >= 500 ? "NICE!" : "GOT IT!";

                      return (
                        <div className="space-y-3">
                          <p className="pixel-text text-green-600 text-sm font-bold">
                            {message}
                          </p>
                          <p className="pixel-text text-green-900 text-4xl md:text-5xl font-bold">
                            {points}
                          </p>
                          <p className="pixel-text text-green-700 text-xs">
                            POINTS EARNED
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Host Controls */}
            {isHost && (() => {
              // For single player mode, only show next round button if both artist and title are correct
              if (game.settings.isSinglePlayer) {
                const myAnswer = roundAnswers?.find((a) => a.playerId === currentPlayer._id);
                const canAdvance = myAnswer?.artistCorrect && myAnswer?.titleCorrect;

                if (!canAdvance) {
                  return null;
                }
              }

              return (
                <section className="bg-yellow-100 border-4 border-yellow-600 p-6" aria-labelledby="host-controls">
                  <h2 id="host-controls" className="sr-only">Host Controls</h2>
                  <PixelButton
                    onClick={handleNextRound}
                    variant="warning"
                    className="w-full"
                    disabled={isAdvancing}
                    aria-label={isAdvancing ? "Advancing to next round..." : currentRoundNumber === totalRounds ? "Finish game" : "Advance to next round"}
                  >
                    {getNextRoundButtonText()}
                  </PixelButton>
                  {!allPlayersSubmitted && !game.settings.isSinglePlayer && (
                    <p className="pixel-text text-yellow-800 text-xs mt-3 text-center" role="status" aria-live="polite">
                      {roundAnswers?.length}/{players?.length} PLAYERS SUBMITTED
                    </p>
                  )}
                </section>
              );
            })()}
          </div>

          {/* Leaderboard/Score - Right/Bottom */}
          <aside className="lg:col-span-1" aria-labelledby="leaderboard-heading">
            <div className="bg-white border-4 border-sky-900 p-6 sticky top-4">
              <h2 id="leaderboard-heading" className="pixel-text text-sky-900 text-lg mb-4 flex items-center gap-2">
                {!game.settings.isSinglePlayer && (
                  <img src="/trophy.svg" alt="" width="24" height="24" aria-hidden="true" />
                )}
                {game.settings.isSinglePlayer ? "YOUR SCORE" : "LEADERBOARD"}
              </h2>

              <PlayerStandings
                players={players || []}
                currentPlayerId={currentPlayer._id}
                variant="compact"
                roundAnswers={roundAnswers || []}
                showRankMedals={!game.settings.isSinglePlayer}
              />
            </div>
          </aside>
        </div>

        {/* Leave button */}
        <div className="text-center mt-8">
          <PixelButton
            onClick={() => setShowLeaveModal(true)}
            variant="danger"
            size="small"
            aria-label="Leave game and return to home"
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
          aria-labelledby="leave-modal-title"
          aria-describedby="leave-modal-description"
        >
          <div className="bg-white border-4 border-sky-900 p-8 max-w-md w-full">
            <h3 id="leave-modal-title" className="pixel-text text-sky-900 text-xl mb-4 text-center">
              LEAVE GAME?
            </h3>
            <p id="leave-modal-description" className="pixel-text text-sky-700 text-sm mb-6 text-center">
              ARE YOU SURE YOU WANT TO LEAVE? YOUR PROGRESS WILL BE LOST.
            </p>
            <div className="flex gap-4">
              <PixelButton
                ref={cancelButtonRef}
                onClick={() => setShowLeaveModal(false)}
                className="flex-1 bg-sky-100 text-sky-900"
                aria-label="Cancel and stay in game"
              >
                CANCEL
              </PixelButton>
              <PixelButton
                onClick={handleLeave}
                variant="danger"
                className="flex-1"
                aria-label="Confirm and leave game"
              >
                LEAVE
              </PixelButton>
            </div>
          </div>
        </div>
      )}
      <SoundToggle />
    </div>
  );
}
