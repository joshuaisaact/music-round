import { playSound } from "@/lib/audio";

interface PixelToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
  leftLabel?: string;
  rightLabel?: string;
}

export function PixelToggle({
  value,
  onChange,
  leftLabel = "OFF",
  rightLabel = "ON",
}: PixelToggleProps) {
  const handleLeftClick = () => {
    if (value) {
      playSound("/sounds/click1.ogg");
      onChange(false);
    }
  };

  const handleRightClick = () => {
    if (!value) {
      playSound("/sounds/click1.ogg");
      onChange(true);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleLeftClick}
        className={`flex-1 pixel-text text-lg sm:text-xl md:text-2xl py-3 px-2 sm:px-4 border-4 border-sky-900 cursor-pointer transition-colors ${
          !value
            ? "bg-white text-sky-900"
            : "bg-sky-900 text-white hover:border-sky-700"
        }`}
        aria-label={leftLabel}
        aria-pressed={!value}
      >
        {leftLabel}
      </button>
      <button
        onClick={handleRightClick}
        className={`flex-1 pixel-text text-lg sm:text-xl md:text-2xl py-3 px-2 sm:px-4 border-4 border-sky-900 cursor-pointer transition-colors ${
          value
            ? "bg-white text-sky-900"
            : "bg-sky-900 text-white hover:border-sky-700"
        }`}
        aria-label={rightLabel}
        aria-pressed={value}
      >
        {rightLabel}
      </button>
    </div>
  );
}
