/**
 * A divider with "OR" text in the center, used between button options.
 * Matches the text size of large PixelButtons (text-2xl).
 */
export function OrDivider() {
  return (
    <div className="flex items-center gap-4" aria-hidden="true">
      <div className="flex-1 h-1 bg-white"></div>
      <span className="text-white pixel-text text-2xl">OR</span>
      <div className="flex-1 h-1 bg-white"></div>
    </div>
  );
}
