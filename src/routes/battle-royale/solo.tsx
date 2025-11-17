import { createFileRoute } from "@tanstack/react-router";
import { BattleRoyaleSetup, SoundToggle } from "@/components";

export const Route = createFileRoute("/battle-royale/solo")({
  component: BattleRoyaleSolo,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      playlist: typeof search.playlist === 'string' ? search.playlist : undefined,
    };
  },
});

function BattleRoyaleSolo() {
  const search = Route.useSearch();

  return (
    <>
      <BattleRoyaleSetup mode="solo" initialPlaylist={search.playlist} />
      <SoundToggle />
    </>
  );
}
