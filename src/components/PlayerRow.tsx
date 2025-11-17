import type { Id } from "../../convex/_generated/dataModel";

interface Player {
  _id: Id<"players">;
  name: string;
  score: number;
  lives?: number;
  eliminated?: boolean;
}

interface PlayerRowProps {
  player: Player;
  rank: number;
  currentPlayerId: Id<"players">;
  variant: "compact" | "detailed";
  isShaking: boolean;
  checkmarks: number;
  hintsUsed: number;
  showRankMedals: boolean;
  showLives: boolean;
}

function RankDisplay({ rank, showMedals, variant }: { rank: number; showMedals: boolean; variant: "compact" | "detailed" }) {
  const iconSize = variant === "compact" ? 24 : 36;

  if (!showMedals) return null;

  if (rank === 0) {
    return <img src="/medal-1.svg" alt="" width={iconSize} height={iconSize} aria-hidden="true" className={variant === "compact" ? "mr-1" : "mr-2"} />;
  }
  if (rank === 1) {
    return <img src="/medal-2.svg" alt="" width={iconSize} height={iconSize} aria-hidden="true" className={variant === "compact" ? "mr-1" : "mr-2"} />;
  }
  if (rank === 2) {
    return <img src="/medal-3.svg" alt="" width={iconSize} height={iconSize} aria-hidden="true" className={variant === "compact" ? "mr-1" : "mr-2"} />;
  }

  if (variant === "compact") {
    return <span className="pixel-text text-lg mr-1">{rank + 1}.</span>;
  }
  return <span className="pixel-text text-2xl md:text-3xl w-12">{rank + 1}.</span>;
}

function CheckmarksDisplay({ checkmarks }: { checkmarks: number }) {
  if (checkmarks === 0) return null;

  return (
    <span className="text-green-600 text-base md:text-lg font-bold">
      {checkmarks === 2 ? "✓✓" : "✓"}
    </span>
  );
}

function HintsDisplay({ hintsUsed, variant }: { hintsUsed: number; variant: "compact" | "detailed" }) {
  if (hintsUsed === 0) return null;

  const iconSize = variant === "compact" ? 12 : 14;

  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: hintsUsed }).map((_, i) => (
        <img key={`hint-${i}`} src="/light-bulb.svg" alt="" width={iconSize} height={iconSize} aria-hidden="true" />
      ))}
    </span>
  );
}

function LivesDisplay({ lives, variant }: { lives: number; variant: "compact" | "detailed" }) {
  const iconSize = variant === "compact" ? 16 : 20;

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 3 }).map((_, i) => (
        <img
          key={`heart-${i}`}
          src="/heart.svg"
          alt=""
          width={iconSize}
          height={iconSize}
          aria-hidden="true"
          className={`${i >= lives ? "opacity-20" : ""}`}
        />
      ))}
    </div>
  );
}

export function PlayerRow({
  player,
  rank,
  currentPlayerId,
  variant,
  isShaking,
  checkmarks,
  hintsUsed,
  showRankMedals,
  showLives,
}: PlayerRowProps) {
  const isCompact = variant === "compact";

  // Determine background and border colors
  const getColors = () => {
    if (isCompact) {
      return "bg-sky-100 border-sky-600";
    }

    if (!showRankMedals) {
      return "bg-sky-50 border-sky-300";
    }

    switch (rank) {
      case 0:
        return "bg-yellow-100 border-yellow-600";
      case 1:
        return "bg-gray-100 border-gray-400";
      case 2:
        return "bg-orange-100 border-orange-600";
      default:
        return "bg-sky-50 border-sky-300";
    }
  };

  const baseClasses = isCompact
    ? "border-2 p-3 flex text-lg items-center justify-between transition-colors"
    : "border-4 p-4 flex items-center justify-between transition-colors";

  const shakeClasses = isShaking ? "shake bg-red-100 !border-red-600" : "";
  const greenBorderClasses = checkmarks === 2
    ? (isCompact ? "!border-4 !border-green-600" : "!border-[6px] !border-green-600")
    : "";

  const playerNameClasses = isCompact
    ? "pixel-text text-base font-bold truncate max-w-[150px]"
    : "pixel-text text-lg md:text-xl font-bold";

  const scoreClasses = isCompact
    ? "pixel-text text-lg font-bold"
    : "pixel-text text-2xl md:text-3xl font-bold";

  return (
    <div className={`${baseClasses} ${getColors()} ${shakeClasses} ${greenBorderClasses}`}>
      <div className="flex items-center gap-1">
        <RankDisplay rank={rank} showMedals={showRankMedals} variant={variant} />
        <div className={isCompact ? "" : ""}>
          <p className={`${playerNameClasses} flex items-center gap-2`}>
            <span>
              {player.name.toUpperCase()}
              {player._id === currentPlayerId && " (YOU)"}
            </span>
            <CheckmarksDisplay checkmarks={checkmarks} />
            <HintsDisplay hintsUsed={hintsUsed} variant={variant} />
          </p>
        </div>
      </div>
      <div className={`flex items-center ${isCompact ? "gap-2" : "gap-3"}`}>
        {showLives && <LivesDisplay lives={player.lives ?? 3} variant={variant} />}
        <span className={scoreClasses}>{player.score}</span>
      </div>
    </div>
  );
}
