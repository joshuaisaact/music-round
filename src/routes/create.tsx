import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getSessionId } from "@/lib/session";
import { GameSettingsForm, SoundToggle } from "@/components";
import { playSound } from "@/lib/audio";

export const Route = createFileRoute("/create")({ component: CreateGame });

function CreateGame() {
  const navigate = useNavigate();
  const createGame = useMutation(api.games.create);
  const joinGame = useMutation(api.players.join);
  const songCount = useQuery(api.songs.count);

  const [isCreating, setIsCreating] = useState(false);

  const handleCreateGame = async (settings: {
    playlistTag: string;
    roundCount: number;
    secondsPerRound: number;
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
        },
      });

      await joinGame({
        code: game.code,
        sessionId: getSessionId(),
        name: settings.playerName!,
      });

      navigate({ to: `/lobby/${game.code}` });
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
        <h1
          className="text-white text-center mb-8 text-4xl"
          style={{ fontFamily: '"VCR OSD Mono", monospace' }}
        >
          CREATE GAME
        </h1>

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
