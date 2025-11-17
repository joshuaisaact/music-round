import { createFileRoute } from "@tanstack/react-router";
import { BattleRoyaleSetup, SoundToggle } from "@/components";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;

export const Route = createFileRoute("/battle-royale/solo")({
  component: BattleRoyaleSolo,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      playlist: typeof search.playlist === 'string' ? search.playlist : undefined,
    };
  },
  loader: async () => {
    // SSR available playlists for instant display
    const convex = new ConvexHttpClient(CONVEX_URL);
    const availablePlaylists = await convex.query(api.songs.getAvailablePlaylists);

    return { availablePlaylists };
  },
});

function BattleRoyaleSolo() {
  const search = Route.useSearch();
  const loaderData = Route.useLoaderData();

  return (
    <>
      <BattleRoyaleSetup
        mode="solo"
        initialPlaylist={search.playlist}
        availablePlaylists={loaderData.availablePlaylists}
      />
      <SoundToggle />
    </>
  );
}
