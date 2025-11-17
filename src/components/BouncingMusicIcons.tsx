import { RasterIcon } from "./RasterIcons";

interface BouncingMusicIconsProps {
  size?: "small" | "medium" | "large";
}

export function BouncingMusicIcons({ size = "small" }: BouncingMusicIconsProps) {
  const iconSize = size === "large" ? 48 : size === "medium" ? 36 : 24;
  const containerClass = size === "large"
    ? "flex justify-center gap-8 my-8"
    : size === "medium"
    ? "flex justify-center gap-6 my-6"
    : "inline-flex gap-2";
  const shadowStyle = size === "large" || size === "medium"
    ? `
        drop-shadow(3px 3px 0 #0c4a6e)
        drop-shadow(6px 6px 0 #075985)
      `
    : "";

  return (
    <div className={containerClass}>
      <span
        className="inline-block animate-bounce-slow"
        style={{
          animationDelay: "0ms",
          filter: shadowStyle || undefined
        }}
      >
        <RasterIcon icon="music2" size={iconSize} color="#ffffff" />
      </span>
      <span
        className="inline-block animate-bounce-slow"
        style={{
          animationDelay: "200ms",
          filter: shadowStyle || undefined
        }}
      >
        <RasterIcon icon="music4" size={iconSize} color="#ffffff" />
      </span>
      <span
        className="inline-block animate-bounce-slow"
        style={{
          animationDelay: "400ms",
          filter: shadowStyle || undefined
        }}
      >
        <RasterIcon icon="music" size={iconSize} color="#ffffff" />
      </span>
    </div>
  );
}
