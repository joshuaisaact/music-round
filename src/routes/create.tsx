import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getSessionId } from "@/lib/session";
import { PixelButton, PixelSlider, PixelInput, PixelError, SoundToggle } from "@/components";
import { playSound } from "@/lib/audio";

export const Route = createFileRoute("/create")({ component: CreateGame });

function CreateGame() {
  const navigate = useNavigate();
  const createGame = useMutation(api.games.create);
  const joinGame = useMutation(api.players.join);
  const songCount = useQuery(api.songs.count);
  const [playerName, setPlayerName] = useState("");
  const [roundCount, setRoundCount] = useState(6);
  const [secondsPerRound, setSecondsPerRound] = useState(30);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  const handleCreateGame = async () => {
    try {
      setIsCreating(true);
      setError("");

      if (!playerName.trim()) {
        playSound("/sounds/error.ogg");
        setError("Please enter your name!");
        setIsCreating(false);
        nameInputRef.current?.focus();
        return;
      }

      if (songCount === 0) {
        playSound("/sounds/error.ogg");
        setError(
          "No songs in database! Run: npx convex run internal.songs.seedFromPlaylist"
        );
        setIsCreating(false);
        return;
      }

      playSound("/sounds/confirmation.ogg");

      const game = await createGame({
        hostId: getSessionId(),
        settings: { roundCount, secondsPerRound },
      });

      await joinGame({
        code: game.code,
        sessionId: getSessionId(),
        name: playerName.trim(),
      });

      navigate({ to: `/lobby/${game.code}` });
    } catch {
      setError("Failed to create game. Try again!");
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-sky-400 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="pixel-cloud cloud-1"></div>
        <div className="pixel-cloud cloud-2"></div>
        <div className="pixel-cloud cloud-3"></div>
      </div>

      <main className="relative z-10 w-full max-w-md">
        <h1
          className="text-white text-center mb-8 text-4xl"
          style={{ fontFamily: '"VCR OSD Mono", monospace' }}
        >
          GAME SETTINGS
        </h1>

        <div className="bg-sky-500 border-4 border-sky-900 p-6 space-y-6 shadow-lg">
          <PixelSlider
            label="ROUNDS"
            value={roundCount}
            min={1}
            max={11}
            onChange={setRoundCount}
            aria-label="Number of rounds in the game"
          />

          <PixelSlider
            label="SECONDS"
            value={secondsPerRound}
            min={10}
            max={50}
            step={5}
            onChange={setSecondsPerRound}
            aria-label="Seconds per round"
          />

          <div>
            <label htmlFor="player-name" className="pixel-text text-white text-xl block mb-2">
              YOUR NAME
            </label>
            <PixelInput
              ref={nameInputRef}
              id="player-name"
              type="text"
              placeholder="ENTER YOUR NAME"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onEnterPress={handleCreateGame}
              maxLength={20}
              className="w-full bg-white text-center outline-none"
              aria-label="Your name"
              aria-describedby={error ? "create-error" : undefined}
              autoFocus
            />
          </div>

          <div className="space-y-3 pt-4">
            <PixelButton
              onClick={handleCreateGame}
              disabled={isCreating}
              className="w-full"
              aria-label={isCreating ? "Creating game..." : "Start game with current settings"}
            >
              {isCreating ? "CREATING..." : "START GAME"}
            </PixelButton>

            <PixelButton
              onClick={handleCancel}
              disabled={isCreating}
              variant="danger"
              size="medium"
              className="w-full"
              aria-label="Cancel and return to home"
            >
              CANCEL
            </PixelButton>
          </div>

          {error && <PixelError id="create-error">{error}</PixelError>}
        </div>
      </main>
      <SoundToggle />
    </div>
  );
}
