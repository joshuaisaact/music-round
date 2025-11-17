import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getSessionId } from "@/lib/session";
import { GameSettingsForm, SoundToggle, PixelButton, OrDivider, PageLayout, PixelTitle } from "@/components";
import { playSound } from "@/lib/audio";
import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;

export const Route = createFileRoute("/create")({
  component: CreateGame,
  loader: async () => {
    // SSR available playlists for instant display
    const convex = new ConvexHttpClient(CONVEX_URL);
    const availablePlaylists = await convex.query(api.songs.getAvailablePlaylists);

    return { availablePlaylists };
  },
});

function CreateGame() {
  const navigate = useNavigate();
  const loaderData = Route.useLoaderData();
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
    hintsPerPlayer?: number;
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
          hintsPerPlayer: settings.hintsPerPlayer,
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
      <PageLayout>
        <div className="max-w-sm mx-auto">
          <PixelTitle size="medium" className="mb-16">CREATE GAME</PixelTitle>

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
        </div>

        <SoundToggle />
      </PageLayout>
    );
  }

  // Show settings form after mode selection
  return (
    <PageLayout>
      <div className="w-full max-w-md">
        <GameSettingsForm
          mode="create"
          onComplete={handleCreateGame}
          onCancel={() => setSelectedMode(null)}
          isSubmitting={isCreating}
          availablePlaylists={loaderData.availablePlaylists}
        />
      </div>

      <SoundToggle />
    </PageLayout>
  );
}
