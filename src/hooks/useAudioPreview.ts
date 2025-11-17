import { useState, useRef, useEffect } from "react";

interface Playlist {
  tag: string;
  previewSong: { artist: string; title: string };
}

interface UseAudioPreviewOptions {
  searchTrack: (args: { artist: string; title: string }) => Promise<{ previewURL?: string }>;
  playlists: Playlist[] | undefined;
  autoPlayTag?: string | null;
  shouldAutoPlay?: boolean;
  useGlobalRef?: boolean;
}

let globalAudioRef: HTMLAudioElement | null = null;

export function useAudioPreview({
  searchTrack,
  playlists,
  autoPlayTag,
  shouldAutoPlay = true,
  useGlobalRef = false,
}: UseAudioPreviewOptions) {
  const [playingPreviewTag, setPlayingPreviewTag] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (useGlobalRef && globalAudioRef) {
      globalAudioRef.pause();
      globalAudioRef = null;
    }
    setPlayingPreviewTag(null);
  };

  const handlePreviewToggle = async (tag: string) => {
    const playlist = playlists?.find((p) => p.tag === tag);
    if (!playlist?.previewSong) return;

    // If clicking the currently playing tag, stop it
    if (playingPreviewTag === tag && audioRef.current) {
      stopAudio();
      return;
    }

    // Stop any currently playing audio
    if (useGlobalRef && globalAudioRef) {
      globalAudioRef.pause();
      globalAudioRef = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    try {
      const result = await searchTrack({
        artist: playlist.previewSong.artist,
        title: playlist.previewSong.title,
      });

      if (result?.previewURL) {
        const audio = new Audio(result.previewURL);
        audio.volume = 0.5;

        audio.onended = () => {
          setPlayingPreviewTag(null);
          audioRef.current = null;
          if (useGlobalRef && globalAudioRef === audio) {
            globalAudioRef = null;
          }
        };

        await audio.play();
        audioRef.current = audio;
        if (useGlobalRef) {
          globalAudioRef = audio;
        }
        setPlayingPreviewTag(tag);
      }
    } catch (error) {
      console.error("Failed to play preview:", error);
    }
  };

  // Auto-play effect
  useEffect(() => {
    if (shouldAutoPlay && autoPlayTag && playlists) {
      if (playingPreviewTag !== autoPlayTag) {
        handlePreviewToggle(autoPlayTag);
      }
    }
  }, [autoPlayTag, playlists, shouldAutoPlay]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (useGlobalRef && globalAudioRef === audioRef.current) {
        globalAudioRef = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingPreviewTag(null);
    };
  }, [useGlobalRef]);

  return {
    playingPreviewTag,
    handlePreviewToggle,
    stopAudio,
  };
}
