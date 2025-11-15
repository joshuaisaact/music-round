import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getSessionId } from "@/lib/session";
import { GameSettingsForm, SoundToggle, PixelButton, OrDivider } from "@/components";
import { playSound } from "@/lib/audio";

export const Route = createFileRoute("/create")({ component: CreateGame });

function CreateGame() {
  const navigate = useNavigate();
  const createGame = useMutation(api.games.create);
  const joinGame = useMutation(api.players.join);
  const startGame = useAction(api.games.start);
  const songCount = useQuery(api.songs.count);

  const [isCreating, setIsCreating] = useState(false);
  const [selectedMode, setSelectedMode] = useState<"solo" | "multiplayer" | null>(null);

  const handleCreateGame = async (settings: {
    playlistTag: string;
    roundCount: number;
    secondsPerRound: number;
    playerName?: string;
  }) => {
    if (!selectedMode) return;
    try {
      setIsCreating(true);

      if (songCount === 0) {
        playSound("/sounds/error.ogg");
        alert("No songs in database! Run: npx convex run internal.songs.seedFromPlaylist");
        setIsCreating(false);
        return;
      }

      const isSinglePlayer = selectedMode === "solo";

      const game = await createGame({
        hostId: getSessionId(),
        settings: {
          roundCount: settings.roundCount,
          secondsPerRound: settings.secondsPerRound,
          playlistTag: settings.playlistTag,
          isSinglePlayer,
        },
      });

      await joinGame({
        code: game.code,
        sessionId: getSessionId(),
        name: settings.playerName!,
      });

      // If single player mode, start the game immediately and skip lobby
      if (isSinglePlayer) {
        await startGame({ gameId: game.gameId });
        navigate({ to: `/game/${game.code}` });
      } else {
        navigate({ to: `/lobby/${game.code}` });
      }
    } catch {
      alert("Failed to create game. Try again!");
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    navigate({ to: "/" });
  };

  // Show mode selection first
  if (!selectedMode) {
    return (
      <div className="min-h-screen bg-sky-400 flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="pixel-cloud cloud-1"></div>
          <div className="pixel-cloud cloud-2"></div>
          <div className="pixel-cloud cloud-3"></div>
        </div>

        <main className="relative z-10 text-center max-w-sm mx-auto">
          <h1
            className="text-white mb-16 text-[3rem] sm:text-[7rem] leading-[1.3]"
            style={{ fontFamily: '"VCR OSD Mono", monospace' }}
          >
            CREATE GAME
          </h1>

          <div className="space-y-6">
            <PixelButton
              onClick={() => {
                playSound("/sounds/confirmation.ogg");
                setSelectedMode("solo");
              }}
              className="w-full"
              aria-label="Create solo game"
            >
              SOLO
            </PixelButton>

            <OrDivider />

            <PixelButton
              onClick={() => {
                playSound("/sounds/confirmation.ogg");
                setSelectedMode("multiplayer");
              }}
              className="w-full"
              aria-label="Create multiplayer game"
            >
              MULTIPLAYER
            </PixelButton>

            <PixelButton
              onClick={handleCancel}
              variant="danger"
              size="small"
              className="w-full mt-4"
              aria-label="Go back to home"
            >
              BACK
            </PixelButton>
          </div>
        </main>
        <SoundToggle />
      </div>
    );
  }

  // Show settings form after mode selection
  return (
    <div className="min-h-screen bg-sky-400 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="pixel-cloud cloud-1"></div>
        <div className="pixel-cloud cloud-2"></div>
        <div className="pixel-cloud cloud-3"></div>
      </div>

      <main className="relative z-10 w-full max-w-md">
        <GameSettingsForm
          mode="create"
          onComplete={handleCreateGame}
          onCancel={() => setSelectedMode(null)}
          isSubmitting={isCreating}
        />
      </main>
      <SoundToggle />
    </div>
  );
}
