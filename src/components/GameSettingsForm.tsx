import { useState, useRef, useEffect } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { PixelButton, PixelSlider, PixelInput, PixelError, PlaylistCard } from "@/components";
import { playSound } from "@/lib/audio";

let globalAudioRef: HTMLAudioElement | null = null;

interface GameSettingsFormProps {
  mode: "create" | "edit";
  initialPlaylist?: string;
  initialRoundCount?: number;
  initialSecondsPerRound?: number;
  initialPlayerName?: string;
  initialIsSinglePlayer?: boolean;
  onComplete: (settings: {
    playlistTag: string;
    roundCount: number;
    secondsPerRound: number;
    isSinglePlayer?: boolean;
    playerName?: string;
  }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

type Tab = "playlist" | "settings" | "confirm";

interface Playlist {
  tag: string;
  name: string;
  subtitle?: string;
  section?: string;
  songCount: number;
  previewSong: { artist: string; title: string };
}

export function GameSettingsForm({
  mode,
  initialPlaylist,
  initialRoundCount = 6,
  initialSecondsPerRound = 30,
  initialPlayerName = "",
  initialIsSinglePlayer = false,
  onComplete,
  onCancel,
  isSubmitting = false,
}: GameSettingsFormProps) {
  const searchTrack = useAction(api.spotify.searchTrack);
  const availablePlaylists = useQuery(api.songs.getAvailablePlaylists);

  const [currentTab, setCurrentTab] = useState<Tab>("playlist");
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(initialPlaylist || null);
  const [playerName, setPlayerName] = useState(initialPlayerName);
  const [roundCount, setRoundCount] = useState(initialRoundCount);
  const [secondsPerRound, setSecondsPerRound] = useState(initialSecondsPerRound);
  const [error, setError] = useState("");
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [playingPreviewTag, setPlayingPreviewTag] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePreviewToggle = async (tag: string) => {
    const playlist = availablePlaylists?.find((p) => p.tag === tag);
    if (!playlist?.previewSong) return;

    if (playingPreviewTag === tag && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      if (globalAudioRef) {
        globalAudioRef.pause();
        globalAudioRef = null;
      }
      setPlayingPreviewTag(null);
      return;
    }

    if (globalAudioRef) {
      globalAudioRef.pause();
      globalAudioRef = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setIsLoadingPreview(true);

    try {
      const result = await searchTrack({
        artist: playlist.previewSong.artist,
        title: playlist.previewSong.title,
      });

      if (result.previewURL) {
        const audio = new Audio(result.previewURL);
        audio.volume = 0.5;

        audio.onended = () => {
          setPlayingPreviewTag(null);
          audioRef.current = null;
          if (globalAudioRef === audio) {
            globalAudioRef = null;
          }
        };

        await audio.play();
        audioRef.current = audio;
        globalAudioRef = audio;
        setPlayingPreviewTag(tag);
      }
    } catch (error) {
      console.error("Failed to play preview:", error);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  useEffect(() => {
    if (availablePlaylists && availablePlaylists.length > 0 && !selectedPlaylist) {
      const firstTag = availablePlaylists[0].tag;
      setSelectedPlaylist(firstTag);
    }
  }, [availablePlaylists, selectedPlaylist]);

  useEffect(() => {
    if (selectedPlaylist && availablePlaylists) {
      if (playingPreviewTag !== selectedPlaylist) {
        handlePreviewToggle(selectedPlaylist);
      }
    }
  }, [selectedPlaylist, availablePlaylists]);

  useEffect(() => {
    return () => {
      if (globalAudioRef === audioRef.current) {
        globalAudioRef = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingPreviewTag(null);
    };
  }, []);

  const handleTabChange = (tab: Tab) => {
    if (tab !== "playlist") {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (globalAudioRef) {
        globalAudioRef.pause();
        globalAudioRef = null;
      }
      setPlayingPreviewTag(null);
    }
    setCurrentTab(tab);
    setError("");
  };

  const handleContinue = () => {
    if (currentTab === "playlist") {
      if (!selectedPlaylist) {
        playSound("/sounds/error.ogg");
        setError("Please select a playlist!");
        return;
      }
      playSound("/sounds/click1.ogg");

      if (mode === "edit") {
        setCurrentTab("settings");
      } else {
        setCurrentTab("settings");
      }
    } else if (currentTab === "settings") {
      playSound("/sounds/click1.ogg");

      if (mode === "edit") {
        handleComplete();
      } else {
        setCurrentTab("confirm");
      }
    }
  };

  const handleCancel = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (globalAudioRef) {
      globalAudioRef.pause();
      globalAudioRef = null;
    }
    setPlayingPreviewTag(null);
    onCancel();
  };

  const handleComplete = () => {
    if (mode === "create") {
      if (!playerName.trim()) {
        playSound("/sounds/error.ogg");
        setError("Please enter your name!");
        nameInputRef.current?.focus();
        return;
      }
    }

    if (!selectedPlaylist) {
      playSound("/sounds/error.ogg");
      setError("Please select a playlist!");
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (globalAudioRef) {
      globalAudioRef.pause();
      globalAudioRef = null;
    }
    setPlayingPreviewTag(null);

    playSound("/sounds/confirmation.ogg");

    onComplete({
      playlistTag: selectedPlaylist,
      roundCount,
      secondsPerRound,
      ...(mode === "edit" && { isSinglePlayer: initialIsSinglePlayer }),
      ...(mode === "create" && { playerName: playerName.trim() }),
    });
  };

  const groupedPlaylists = availablePlaylists?.reduce((acc, playlist) => {
    const section = playlist.section || "default";
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(playlist);
    return acc;
  }, {} as Record<string, Playlist[]>);

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex gap-2">
        <button
          onClick={() => handleTabChange("playlist")}
          className={`flex-1 pixel-text py-2 px-4 border-4 transition-colors cursor-pointer ${
            currentTab === "playlist"
              ? "bg-white border-yellow-400 text-sky-900"
              : "bg-white border-sky-900 text-sky-900 hover:border-sky-700"
          }`}
        >
          PLAYLIST
        </button>
        <button
          onClick={() => handleTabChange("settings")}
          className={`flex-1 pixel-text py-2 px-4 border-4 transition-colors cursor-pointer ${
            currentTab === "settings"
              ? "bg-white border-yellow-400 text-sky-900"
              : "bg-white border-sky-900 text-sky-900 hover:border-sky-700"
          }`}
        >
          SETTINGS
        </button>
        {mode === "create" && (
          <button
            onClick={() => handleTabChange("confirm")}
            className={`flex-1 pixel-text py-2 px-4 border-4 transition-colors cursor-pointer ${
              currentTab === "confirm"
                ? "bg-white border-yellow-400 text-sky-900"
                : "bg-white border-sky-900 text-sky-900 hover:border-sky-700"
            }`}
          >
            CONFIRM
          </button>
        )}
      </div>

      <div className="bg-sky-500 border-4 border-sky-900 p-6 shadow-lg h-[600px] flex flex-col">
        {/* Tab 1: Playlist Selection */}
        {currentTab === "playlist" && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {/* Default playlist (no section) */}
              {groupedPlaylists?.default?.map((playlist) => (
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

              {/* Sections */}
              {Object.entries(groupedPlaylists || {}).map(([section, playlists]) => {
                if (section === "default") return null;
                return (
                  <div key={section}>
                    <h2 className="pixel-text text-white text-sm uppercase tracking-wider mb-2 mt-4">
                      {section}
                    </h2>
                    <div className="space-y-2">
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
                );
              })}
            </div>

            <PixelButton
              onClick={handleContinue}
              disabled={!selectedPlaylist}
              className="w-full mt-4"
            >
              CONTINUE →
            </PixelButton>
          </div>
        )}

        {/* Tab 2: Settings */}
        {currentTab === "settings" && (
          <div className="flex flex-col h-full">
            <div className="flex-1 space-y-6">
              <PixelSlider
                label="ROUNDS"
                value={roundCount}
                min={1}
                max={11}
                onChange={setRoundCount}
                aria-label="Number of rounds in the game"
              />

              <PixelSlider
                label="SECONDS"
                value={secondsPerRound}
                min={10}
                max={50}
                step={5}
                onChange={setSecondsPerRound}
                aria-label="Seconds per round"
              />
            </div>

            <PixelButton
              onClick={handleContinue}
              className="w-full mt-4"
            >
              {mode === "edit" ? "SAVE" : "CONTINUE →"}
            </PixelButton>
          </div>
        )}

        {/* Tab 3: Confirm (create mode only) */}
        {currentTab === "confirm" && mode === "create" && (
          <div className="flex flex-col h-full">
            <div className="flex-1">
              <div>
                <label htmlFor="player-name" className="pixel-text text-white text-xl block mb-2">
                  YOUR NAME
                </label>
                <PixelInput
                  ref={nameInputRef}
                  id="player-name"
                  type="text"
                  placeholder="ENTER YOUR NAME"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  onEnterPress={handleComplete}
                  maxLength={20}
                  className="w-full bg-white text-center outline-none"
                  aria-label="Your name"
                  aria-describedby={error ? "settings-error" : undefined}
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-3">
              <PixelButton
                onClick={handleCancel}
                disabled={isSubmitting}
                variant="danger"
                size="medium"
                className="w-full"
                aria-label="Cancel and return to home"
              >
                CANCEL
              </PixelButton>

              <PixelButton
                onClick={handleComplete}
                disabled={isSubmitting}
                className="w-full"
                aria-label={isSubmitting ? "Creating game..." : "Start game with current settings"}
              >
                {isSubmitting ? "CREATING..." : "START GAME"}
              </PixelButton>
            </div>
          </div>
        )}

        {error && <PixelError id="settings-error">{error}</PixelError>}
      </div>
    </div>
  );
}
