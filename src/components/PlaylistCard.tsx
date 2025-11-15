import { playSound } from "@/lib/audio";
import { ClientOnly } from "./ClientOnly";

const RasterIcons = () => {
  const { Volume2Icon, VolumeXIcon } = require("raster-react");
  return { Volume2Icon, VolumeXIcon };
};

interface PlaylistCardProps {
  tag: string;
  name: string;
  subtitle?: string;
  songCount: number;
  isSelected: boolean;
  isPlaying?: boolean;
  onSelect: (tag: string) => void;
  onPreviewToggle?: (tag: string) => void;
}

export function PlaylistCard({
  tag,
  name,
  subtitle,
  songCount,
  isSelected,
  isPlaying = false,
  onSelect,
  onPreviewToggle,
}: PlaylistCardProps) {
  return (
    <div
      className={`w-full p-4 border-4 transition-all flex items-start gap-3 ${
        isSelected
          ? "border-yellow-400 bg-yellow-50"
          : "border-sky-900 bg-white hover:border-sky-700"
      }`}
    >
      <button
        onClick={() => {
          playSound("/sounds/click1.ogg");
          onSelect(tag);
        }}
        className="flex-1 text-left cursor-pointer"
      >
        <div className="pixel-text text-sky-900 text-lg font-bold">
          {name}
        </div>
        {subtitle && (
          <div className="pixel-text text-sky-700 text-xs mt-1">
            {subtitle}
          </div>
        )}
        <div className="pixel-text text-sky-700 text-sm mt-1 uppercase">
          {songCount} songs
        </div>
      </button>

      {onPreviewToggle && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPreviewToggle(tag);
          }}
          className="p-2 hover:opacity-80 transition-opacity cursor-pointer flex-shrink-0"
          aria-label={isPlaying ? "Pause preview" : "Play preview"}
        >
          <ClientOnly>
            {(() => {
              const { Volume2Icon, VolumeXIcon } = RasterIcons();
              return isPlaying ? (
                <Volume2Icon size={24} color="#0c4a6e" />
              ) : (
                <VolumeXIcon size={24} color="#0c4a6e" />
              );
            })()}
          </ClientOnly>
        </button>
      )}
    </div>
  );
}
