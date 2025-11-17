import { useState, useRef, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { PixelButton, PixelInput, PixelError, BouncingMusicIcons, PlaylistCard, OnboardingModal, PageLayout, PixelTitle } from "@/components";
import { playSound } from "@/lib/audio";
import { getSessionId } from "@/lib/session";
import { groupPlaylistsBySection } from "@/lib/playlistUtils";
import { GameMode } from "@/types/gameMode";
import { useAudioPreview } from "@/hooks/useAudioPreview";

interface BattleRoyaleSetupProps {
  mode: "solo" | "multiplayer";
  initialPlaylist?: string;
}

export function BattleRoyaleSetup({ mode, initialPlaylist }: BattleRoyaleSetupProps) {
  const navigate = useNavigate();
  const sessionId = getSessionId();
  const [playerName, setPlayerName] = useState("");
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(initialPlaylist || null);
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const availablePlaylists = useQuery(api.songs.getAvailablePlaylists);
  const searchTrack = useAction(api.spotify.searchTrack);
  const createGame = useMutation(api.games.create);
  const joinGame = useMutation(api.players.join);
  const startGame = useAction(api.games.start);

  const isSolo = mode === "solo";

  const { playingPreviewTag, handlePreviewToggle } = useAudioPreview({
    searchTrack,
    playlists: availablePlaylists,
    autoPlayTag: selectedPlaylist,
    shouldAutoPlay: isSolo,
    useGlobalRef: false,
  });

  const scrollToSelected = (element: HTMLDivElement | null) => {
    if (element && initialPlaylist) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  };

  const startBattleRoyaleGame = async () => {
    setIsCreating(true);

    try {
      const { gameId, code } = await createGame({
        hostId: sessionId,
        settings: {
          roundCount: 50,
          secondsPerRound: 30,
          playlistTag: selectedPlaylist!,
          isSinglePlayer: isSolo,
          hintsPerPlayer: 3,
          gameMode: GameMode.BATTLE_ROYALE,
        },
      });

      await joinGame({
        code,
        sessionId,
        name: playerName.trim(),
      });

      if (isSolo) {
        await startGame({ gameId });
        navigate({ to: `/game/${code}` });
      } else {
        navigate({ to: `/lobby/${code}` });
      }
    } catch {
      playSound("/sounds/error.ogg");
      setError("Failed to create battle royale game. Please try again.");
      setIsCreating(false);
    }
  };

  const handleStart = () => {
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
    setError("");

    const hideOnboarding = localStorage.getItem('hideBattleRoyaleOnboarding');
    if (!hideOnboarding) {
      setShowOnboarding(true);
    } else {
      startBattleRoyaleGame();
    }
  };

  const handleOnboardingClose = () => {
    setShowOnboarding(false);
    startBattleRoyaleGame();
  };

  const groupedPlaylists = groupPlaylistsBySection(availablePlaylists);

  return (
    <PageLayout>
      <div className="max-w-4xl w-full">
        <PixelTitle size={isSolo ? "medium" : "small"} className="mb-8">
          {isSolo ? 'BATTLE ROYALE' : 'BATTLE ROYALE: MULTIPLAYER'}
        </PixelTitle>

        <BouncingMusicIcons size={isSolo ? "medium" : "small"} />

        <div className="space-y-8 max-w-4xl mx-auto mt-8">
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

          <div className="bg-white border-4 border-sky-900 p-6">
            <h2 className="pixel-text text-sky-900 text-2xl mb-4">SELECT PLAYLIST</h2>

            {!availablePlaylists ? (
              <div className="min-h-[400px] md:min-h-[500px] flex items-center justify-center">
                <p className="pixel-text text-sky-700 text-lg">LOADING PLAYLISTS...</p>
              </div>
            ) : (
              <div className="max-h-[400px] md:max-h-[500px] overflow-y-auto pr-2 space-y-6">
                {groupedPlaylists?.default && groupedPlaylists.default.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groupedPlaylists.default.map((playlist) => (
                      <div
                        key={playlist.tag}
                        ref={playlist.tag === initialPlaylist ? scrollToSelected : null}
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

                {Object.entries(groupedPlaylists || {})
                  .filter(([section]) => section !== "default")
                  .map(([section, playlists]) => (
                    <div key={section}>
                      <h3 className="pixel-text text-sky-700 text-xl mb-3 text-left uppercase">{section}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {playlists.map((playlist) => (
                          <div
                            key={playlist.tag}
                            ref={playlist.tag === initialPlaylist ? scrollToSelected : null}
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

          {error && <PixelError id="name-error">{error}</PixelError>}

          <div className="max-w-sm mx-auto space-y-4">
            <PixelButton
              onClick={handleStart}
              className="w-full bg-yellow-400 hover:bg-yellow-300 border-yellow-600"
              aria-label={isSolo ? "Start battle royale" : "Create battle royale lobby"}
              disabled={isCreating || !selectedPlaylist}
            >
              {isCreating ? (isSolo ? "STARTING..." : "CREATING...") : (isSolo ? "START BATTLE ROYALE" : "CREATE LOBBY")}
            </PixelButton>

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
      </div>

      {showOnboarding && (
        <OnboardingModal
          onClose={handleOnboardingClose}
          isBattleRoyale={true}
          secondsPerRound={30}
        />
      )}
    </PageLayout>
  );
}
