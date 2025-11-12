import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getSessionId } from "@/lib/session";
import { PixelButton, PixelSlider } from "@/components";

export const Route = createFileRoute("/create")({ component: CreateGame });

function CreateGame() {
  const navigate = useNavigate();
  const createGame = useMutation(api.games.create);
  const songCount = useQuery(api.songs.count);
  const [roundCount, setRoundCount] = useState(5);
  const [secondsPerRound, setSecondsPerRound] = useState(30);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const handleCreateGame = async () => {
    try {
      setIsCreating(true);
      setError("");

      if (songCount === 0) {
        setError(
          "No songs in database! Run: npx convex run internal.songs.seedFromPlaylist"
        );
        setIsCreating(false);
        return;
      }

      const game = await createGame({
        hostId: getSessionId(),
        settings: { roundCount, secondsPerRound },
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
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="pixel-cloud cloud-1"></div>
        <div className="pixel-cloud cloud-2"></div>
        <div className="pixel-cloud cloud-3"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
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
            max={10}
            onChange={setRoundCount}
          />

          <PixelSlider
            label="SECONDS"
            value={secondsPerRound}
            min={10}
            max={60}
            step={5}
            onChange={setSecondsPerRound}
          />

          <div className="space-y-3 pt-4">
            <PixelButton
              onClick={handleCreateGame}
              disabled={isCreating}
              className="w-full"
            >
              {isCreating ? "CREATING..." : "START GAME"}
            </PixelButton>

            <PixelButton
              onClick={handleCancel}
              disabled={isCreating}
              variant="warning"
              size="medium"
              className="w-full"
            >
              CANCEL
            </PixelButton>
          </div>

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
