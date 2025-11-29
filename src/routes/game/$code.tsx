import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useEffect, useState, useRef } from "react";
import { getSessionId } from "../../lib/session";
import { PixelButton, PixelAudioPlayer, PlayerStandings, SoundToggle, LoadingState, ErrorState, GameHeader, AnswerForm, HostControls, PreparingPhaseOverlay, LeaveGameModal } from "@/components";
import { playSound } from "@/lib/audio";
import { useGameTimer } from "@/hooks/useGameTimer";
import { getAvailablePoints } from "@/lib/pointsCalculator";
import { GameMode } from "@/types/gameMode";

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

  // Timer hook
  const { now, phase, timeRemaining } = useGameTimer({ currentRound, game });

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

  if (game === undefined || !currentPlayer) {
    return <LoadingState />;
  }

  // Game not found
  if (game === null) {
    return (
      <ErrorState
        title="GAME NOT FOUND"
        onButtonClick={() => navigate({ to: "/" })}
      />
    );
  }

  // Game finished - redirect to summary
  if (game.status === "finished") {
    return <Navigate to="/summary/$code" params={{ code }} />;
  }

  // Game in lobby (not yet started)
  if (game.status !== "playing") {
    return (
      <ErrorState
        title="GAME NOT ACTIVE"
        onButtonClick={() => navigate({ to: "/" })}
      />
    );
  }

  if (!currentRound) {
    return <LoadingState message="LOADING ROUND..." />;
  }

  const isHost = currentPlayer.isHost === true;
  const totalRounds = rounds?.length || 0;
  const currentRoundNumber = currentRound.roundNumber + 1; // Display as 1-indexed

  const availablePoints = getAvailablePoints({
    phase,
    currentRound,
    game,
    now,
    isFullyLocked,
    artistLocked,
    titleLocked,
    roundAnswers,
    currentPlayerId: currentPlayer._id,
  });

  const isDailyMode = game.settings.gameMode === GameMode.DAILY;
  const isBattleRoyale = game.settings.gameMode === GameMode.BATTLE_ROYALE;
  const isEliminated = currentPlayer.eliminated === true;

  return (
    <div className="min-h-screen bg-sky-400 p-4 md:p-8">
      <main className="max-w-6xl mx-auto">
        <GameHeader
          game={game}
          currentPlayer={currentPlayer}
          currentRoundNumber={currentRoundNumber}
          totalRounds={totalRounds}
          timeRemaining={timeRemaining}
          phase={phase}
          availablePoints={availablePoints}
          isDailyMode={isDailyMode}
          isBattleRoyale={isBattleRoyale}
          isEliminated={isEliminated}
        />

        <PreparingPhaseOverlay
          isActive={phase === "preparing"}
          currentRoundNumber={currentRoundNumber}
          previousRound={previousRound}
          timeRemaining={timeRemaining}
        />

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

            <AnswerForm
              currentRound={currentRound}
              currentPlayer={currentPlayer}
              roundAnswers={roundAnswers}
              phase={phase}
              artistAnswer={{
                value: artistGuess,
                setValue: setArtistGuess,
                locked: artistLocked,
                shake: shakeArtist,
                revealedLetters: revealedArtistLetters,
                inputRef: artistInputRef,
              }}
              titleAnswer={{
                value: titleGuess,
                setValue: setTitleGuess,
                locked: titleLocked,
                shake: shakeTitle,
                revealedLetters: revealedTitleLetters,
                inputRef: titleInputRef,
              }}
              isFullyLocked={isFullyLocked}
              hintsRemaining={hintsRemaining}
              error={error}
              onSubmit={handleSubmit}
              onUseHint={handleUseHint}
            />

            <HostControls
              isHost={isHost}
              game={game}
              currentPlayer={currentPlayer}
              roundAnswers={roundAnswers}
              players={players}
              currentRoundNumber={currentRoundNumber}
              totalRounds={totalRounds}
              isAdvancing={isAdvancing}
              isBattleRoyale={isBattleRoyale}
              onNextRound={handleNextRound}
            />
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
                showLives={game.settings.gameMode === GameMode.BATTLE_ROYALE && !game.settings.isSinglePlayer}
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

      <LeaveGameModal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        onLeave={handleLeave}
        cancelButtonRef={cancelButtonRef}
      />
      <SoundToggle />
    </div>
  );
}
