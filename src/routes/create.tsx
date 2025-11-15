import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getSessionId } from "@/lib/session";
import { GameSettingsForm, SoundToggle } from "@/components";
import { playSound } from "@/lib/audio";

export const Route = createFileRoute("/create")({ component: CreateGame });

function CreateGame() {
  const navigate = useNavigate();
  const createGame = useMutation(api.games.create);
  const joinGame = useMutation(api.players.join);
  const startGame = useAction(api.games.start);
  const songCount = useQuery(api.songs.count);

  const [isCreating, setIsCreating] = useState(false);

  const handleCreateGame = async (settings: {
    playlistTag: string;
    roundCount: number;
    secondsPerRound: number;
    isSinglePlayer: boolean;
    playerName?: string;
  }) => {
    try {
      setIsCreating(true);

      if (songCount === 0) {
        playSound("/sounds/error.ogg");
        alert("No songs in database! Run: npx convex run internal.songs.seedFromPlaylist");
        setIsCreating(false);
        return;
      }

      const game = await createGame({
        hostId: getSessionId(),
        settings: {
          roundCount: settings.roundCount,
          secondsPerRound: settings.secondsPerRound,
          playlistTag: settings.playlistTag,
          isSinglePlayer: settings.isSinglePlayer,
        },
      });

      await joinGame({
        code: game.code,
        sessionId: getSessionId(),
        name: settings.playerName!,
      });

      // If single player mode, start the game immediately and skip lobby
      if (settings.isSinglePlayer) {
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
          onCancel={handleCancel}
          isSubmitting={isCreating}
        />
      </main>
      <SoundToggle />
    </div>
  );
}
