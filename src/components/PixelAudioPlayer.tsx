import { useEffect, useRef, useState } from "react";
import { PixelButton } from "./PixelButton";
import { formatTime } from "@/lib/dateUtils";

interface PixelAudioPlayerProps {
  src: string;
  autoPlay?: boolean;
  className?: string;
}

export const PixelAudioPlayer = ({
  src,
  autoPlay = false,
  className = "",
}: PixelAudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);

  // Update current time
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      if (!isSeeking) {
        setCurrentTime(audio.currentTime);
      }
    };

    const updateDuration = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handleWaiting = () => {
      setIsLoading(true);
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("waiting", handleWaiting);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("waiting", handleWaiting);
    };
  }, [isSeeking]);

  // Handle play/pause
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  // Handle seeking
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = Number(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleSeekStart = () => {
    setIsSeeking(true);
  };

  const handleSeekEnd = () => {
    setIsSeeking(false);
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const audio = audioRef.current;
      if (!audio) return;

      // Space bar to play/pause
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        togglePlay();
      }

      // Arrow keys to seek (5 seconds)
      if (e.code === "ArrowLeft") {
        audio.currentTime = Math.max(0, audio.currentTime - 5);
      }
      if (e.code === "ArrowRight") {
        audio.currentTime = Math.min(duration, audio.currentTime + 5);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [duration]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Hidden audio element */}
      <audio ref={audioRef} src={src} autoPlay={autoPlay} />

      {/* Play/Pause Button */}
      <div className="flex justify-center">
        <PixelButton
          onClick={togglePlay}
          size="large"
          disabled={isLoading}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="min-w-[160px]"
        >
          {isLoading ? "LOADING..." : isPlaying ? "⏸️ PAUSE" : "▶️ PLAY"}
        </PixelButton>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="relative w-full h-6 bg-sky-200 border-4 border-sky-900">
          {/* Progress fill */}
          <div
            className="absolute top-0 left-0 h-full bg-sky-600 transition-all"
            style={{ width: `${progress}%` }}
            aria-hidden="true"
          />

          {/* Seek slider (invisible but interactive) */}
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            onMouseDown={handleSeekStart}
            onMouseUp={handleSeekEnd}
            onTouchStart={handleSeekStart}
            onTouchEnd={handleSeekEnd}
            className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
            aria-label="Seek audio"
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={currentTime}
            aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
          />
        </div>

        {/* Time display */}
        <div className="flex justify-between items-center">
          <span className="pixel-text text-sky-900 text-sm" aria-live="off">
            {formatTime(currentTime)}
          </span>
          <span className="pixel-text text-sky-600 text-xs">
            30-SECOND PREVIEW
          </span>
          <span className="pixel-text text-sky-900 text-sm" aria-live="off">
            {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
};
