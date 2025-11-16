import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { PixelButton, PixelInput, PixelError, SoundToggle, BouncingMusicIcons, PlaylistCard } from "@/components";
import { playSound } from "@/lib/audio";
import { getSessionId } from "@/lib/session";

export const Route = createFileRoute("/battle-royale")({
  component: BattleRoyale,
});

function BattleRoyale() {
  const navigate = useNavigate();
  const sessionId = getSessionId();
  const [playerName, setPlayerName] = useState("");
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [playingPreviewTag, setPlayingPreviewTag] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const availablePlaylists = useQuery(api.songs.getAvailablePlaylists);
  const searchTrack = useAction(api.spotify.searchTrack);
  const createGame = useMutation(api.games.create);
  const joinGame = useMutation(api.players.join);
  const startGame = useAction(api.games.start);

  const handlePreviewToggle = async (tag: string) => {
    const playlist = availablePlaylists?.find((p) => p.tag === tag);
    if (!playlist?.previewSong) return;

    // If clicking the currently playing tag, stop it
    if (playingPreviewTag === tag && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlayingPreviewTag(null);
      return;
    }

    // Stop any existing preview
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Fetch preview URL from Spotify
    try {
      const track = await searchTrack({
        artist: playlist.previewSong.artist,
        title: playlist.previewSong.title,
      });

      if (track?.previewURL) {
        const audio = new Audio(track.previewURL);
        audio.volume = 0.5;

        audio.onended = () => {
          setPlayingPreviewTag(null);
          audioRef.current = null;
        };

        await audio.play();
        audioRef.current = audio;
        setPlayingPreviewTag(tag);
      }
    } catch (error) {
      console.error("Failed to fetch preview:", error);
    }
  };

  // Auto-play preview when playlist is selected
  useEffect(() => {
    if (selectedPlaylist && availablePlaylists) {
      if (playingPreviewTag !== selectedPlaylist) {
        handlePreviewToggle(selectedPlaylist);
      }
    }
  }, [selectedPlaylist, availablePlaylists]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleStartBattleRoyale = async () => {
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

    playSound("/sounds/confirmation.ogg");
    setIsCreating(true);
    setError("");

    try {
      const { gameId, code } = await createGame({
        hostId: sessionId,
        settings: {
          roundCount: 50,
          secondsPerRound: 30,
          playlistTag: selectedPlaylist,
          isSinglePlayer: true,
          hintsPerPlayer: 3,
          gameMode: "battle_royale",
        },
      });

      // Join the game as a player
      await joinGame({
        code,
        sessionId,
        name: name,
      });

      // Start the game immediately
      await startGame({ gameId });

      // Navigate directly to game
      navigate({ to: `/game/${code}` });
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
          className="text-white max-w-[800px] mx-auto text-[3rem] sm:text-[6rem] leading-[1.3] mb-8"
          style={{
            fontFamily: '"VCR OSD Mono", monospace',
            WebkitTextStroke: '3px #0c4a6e',
            textShadow: `
              3px 3px 0 #0c4a6e,
              6px 6px 0 #075985,
              9px 9px 0 #0369a1,
              12px 12px 0 #0284c7
            `
          }}
        >
          BATTLE ROYALE
        </h1>

        {/* Musical notes decoration */}
        <BouncingMusicIcons size="medium" />

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
            <div className="space-y-6">
              {/* Default Playlists */}
              {groupedPlaylists?.default && groupedPlaylists.default.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {groupedPlaylists.default.map((playlist) => (
                    <PlaylistCard
                      key={playlist.tag}
                      tag={playlist.tag}
                      name={playlist.name}
                      subtitle={playlist.subtitle}
                      songCount={playlist.songCount}
                      isSelected={selectedPlaylist === playlist.tag}
                      isPlaying={playingPreviewTag === playlist.tag}
                      onSelect={setSelectedPlaylist}
                      onPreviewToggle={handlePreviewToggle}
                    />
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
                        <PlaylistCard
                          key={playlist.tag}
                          tag={playlist.tag}
                          name={playlist.name}
                          subtitle={playlist.subtitle}
                          songCount={playlist.songCount}
                          isSelected={selectedPlaylist === playlist.tag}
                          isPlaying={playingPreviewTag === playlist.tag}
                          onSelect={setSelectedPlaylist}
                          onPreviewToggle={handlePreviewToggle}
                        />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Error Message */}
          {error && <PixelError id="name-error">{error}</PixelError>}

          {/* Start Button */}
          <div className="max-w-sm mx-auto space-y-4">
            <PixelButton
              onClick={handleStartBattleRoyale}
              className="w-full bg-yellow-400 hover:bg-yellow-300 border-yellow-600"
              aria-label="Start battle royale"
              disabled={isCreating || !selectedPlaylist}
            >
              {isCreating ? "STARTING..." : "START BATTLE ROYALE"}
            </PixelButton>

            {/* Back Button */}
            <PixelButton
              onClick={() => navigate({ to: "/" })}
              className="w-full"
              variant="danger"
              size="small"
              disabled={isCreating}
            >
              BACK TO HOME
            </PixelButton>
          </div>
        </div>
      </main>
      <SoundToggle />
    </div>
  );
}
