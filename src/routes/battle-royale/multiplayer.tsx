import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { PixelButton, PixelInput, PixelError, SoundToggle, BouncingMusicIcons, PlaylistCard } from "@/components";
import { playSound } from "@/lib/audio";
import { getSessionId } from "@/lib/session";

export const Route = createFileRoute("/battle-royale/multiplayer")({
  component: BattleRoyaleMultiplayer,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      playlist: typeof search.playlist === 'string' ? search.playlist : undefined,
    };
  },
});

function BattleRoyaleMultiplayer() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const sessionId = getSessionId();
  const [playerName, setPlayerName] = useState("");
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(search.playlist || null);
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [playingPreviewTag, setPlayingPreviewTag] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const availablePlaylists = useQuery(api.songs.getAvailablePlaylists);
  const createGame = useMutation(api.games.create);
  const joinGame = useMutation(api.players.join);

  // Callback ref to scroll to selected playlist when it mounts
  const scrollToSelected = (element: HTMLDivElement | null) => {
    if (element && search.playlist) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  };

  const handlePreviewToggle = async (tag: string) => {
    // Same preview logic as solo - omitted for brevity but should be copied
    // from solo.tsx if needed
  };

  const handleCreateGame = async () => {
    const name = playerName.trim();
    if (name.length === 0) {
      playSound("/sounds/error.ogg");
      setError("Please enter your name!");
      inputRef.current?.focus();
      return;
    }

    if (!selectedPlaylist) {
      playSound("/sounds/error.ogg");
      setError("Please select a playlist!");
      return;
    }

    if (isCreating) return;

    try {
      playSound("/sounds/confirmation.ogg");
      setError("");
      setIsCreating(true);

      // Create multiplayer battle royale game
      const { gameId, code } = await createGame({
        hostId: sessionId,
        settings: {
          roundCount: 50,
          secondsPerRound: 30,
          playlistTag: selectedPlaylist,
          isSinglePlayer: false, // Multiplayer!
          hintsPerPlayer: 3,
          gameMode: "battle_royale",
        },
      });

      // Join the game as host
      await joinGame({
        code,
        sessionId,
        name: playerName.trim(),
      });

      // Navigate to lobby (don't start immediately like solo)
      navigate({ to: `/lobby/${code}` });
    } catch (err) {
      playSound("/sounds/error.ogg");
      setError("Failed to create battle royale game. Please try again.");
      setIsCreating(false);
    }
  };

  const groupedPlaylists = availablePlaylists?.reduce((acc, playlist) => {
    const section = playlist.section || "default";
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(playlist);
    return acc;
  }, {} as Record<string, typeof availablePlaylists>);

  return (
    <div className="min-h-screen bg-sky-400 flex items-center justify-center p-4">
      {/* Skip to main content link for screen readers */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-yellow-400 focus:text-sky-900 focus:px-4 focus:py-2 focus:border-4 focus:border-sky-900 pixel-text"
      >
        Skip to main content
      </a>

      {/* Pixel art clouds background effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="pixel-cloud cloud-1"></div>
        <div className="pixel-cloud cloud-2"></div>
        <div className="pixel-cloud cloud-3"></div>
      </div>

      <main id="main-content" className="relative z-10 text-center max-w-4xl w-full">
        {/* Title */}
        <h1
          className="text-white max-w-[800px] mx-auto text-[2rem] sm:text-[4rem] leading-[1.3] mb-8"
          style={{
            fontFamily: '"VCR OSD Mono", monospace',
            WebkitTextStroke: '2px #0c4a6e',
            textShadow: `
              2px 2px 0 #0c4a6e,
              4px 4px 0 #075985,
              6px 6px 0 #0369a1
            `
          }}
        >
          BATTLE ROYALE: MULTIPLAYER
        </h1>

        {/* Musical notes decoration */}
        <BouncingMusicIcons size="small" />

        <div className="space-y-8 max-w-4xl mx-auto mt-8">
          {/* Name Input */}
          <div className="space-y-3 max-w-sm mx-auto">
            <PixelInput
              ref={inputRef}
              type="text"
              placeholder="ENTER NAME"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={20}
              className="w-full bg-white text-center"
              aria-label="Your name"
              aria-describedby={error ? "name-error" : undefined}
              autoFocus
              disabled={isCreating}
            />
          </div>

          {/* Playlist Selection */}
          <div className="bg-white border-4 border-sky-900 p-6">
            <h2 className="pixel-text text-sky-900 text-2xl mb-4">SELECT PLAYLIST</h2>

            {/* Loading state */}
            {!availablePlaylists ? (
              <div className="min-h-[400px] md:min-h-[500px] flex items-center justify-center">
                <p className="pixel-text text-sky-700 text-lg">LOADING PLAYLISTS...</p>
              </div>
            ) : (
              <div className="max-h-[400px] md:max-h-[500px] overflow-y-auto pr-2 space-y-6">
                {/* Default Playlists */}
                {groupedPlaylists?.default && groupedPlaylists.default.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groupedPlaylists.default.map((playlist) => (
                      <div
                        key={playlist.tag}
                        ref={playlist.tag === search.playlist ? scrollToSelected : null}
                      >
                        <PlaylistCard
                          tag={playlist.tag}
                          name={playlist.name}
                          subtitle={playlist.subtitle}
                          songCount={playlist.songCount}
                          isSelected={selectedPlaylist === playlist.tag}
                          isPlaying={playingPreviewTag === playlist.tag}
                          onSelect={setSelectedPlaylist}
                          onPreviewToggle={handlePreviewToggle}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Grouped Playlists by Section */}
                {Object.entries(groupedPlaylists || {})
                  .filter(([section]) => section !== "default")
                  .map(([section, playlists]) => (
                    <div key={section}>
                      <h3 className="pixel-text text-sky-700 text-xl mb-3 text-left uppercase">{section}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {playlists.map((playlist) => (
                          <div
                            key={playlist.tag}
                            ref={playlist.tag === search.playlist ? scrollToSelected : null}
                          >
                            <PlaylistCard
                              tag={playlist.tag}
                              name={playlist.name}
                              subtitle={playlist.subtitle}
                              songCount={playlist.songCount}
                              isSelected={selectedPlaylist === playlist.tag}
                              isPlaying={playingPreviewTag === playlist.tag}
                              onSelect={setSelectedPlaylist}
                              onPreviewToggle={handlePreviewToggle}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && <PixelError id="name-error">{error}</PixelError>}

          {/* Create Game Button */}
          <div className="max-w-sm mx-auto space-y-4">
            <PixelButton
              onClick={handleCreateGame}
              className="w-full bg-yellow-400 hover:bg-yellow-300 border-yellow-600"
              aria-label="Create battle royale lobby"
              disabled={isCreating || !selectedPlaylist}
            >
              {isCreating ? "CREATING..." : "CREATE LOBBY"}
            </PixelButton>

            {/* Back Button */}
            <PixelButton
              onClick={() => navigate({ to: "/battle-royale" })}
              className="w-full"
              variant="danger"
              size="small"
              disabled={isCreating}
            >
              BACK
            </PixelButton>
          </div>
        </div>
      </main>

      <SoundToggle />
    </div>
  );
}
