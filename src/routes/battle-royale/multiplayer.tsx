import { createFileRoute } from "@tanstack/react-router";
import { BattleRoyaleSetup, SoundToggle } from "@/components";

export const Route = createFileRoute("/battle-royale/multiplayer")({
  component: BattleRoyaleMultiplayer,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      playlist: typeof search.playlist === 'string' ? search.playlist : undefined,
    };
  },
});

function BattleRoyaleMultiplayer() {
  const search = Route.useSearch();

  return (
    <>
      <BattleRoyaleSetup mode="multiplayer" initialPlaylist={search.playlist} />
      <SoundToggle />
    </>
  );
}
