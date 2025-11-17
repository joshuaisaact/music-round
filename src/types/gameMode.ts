export const GameMode = {
  STANDARD: "standard",
  DAILY: "daily",
  BATTLE_ROYALE: "battle_royale",
} as const;

export type GameModeType = (typeof GameMode)[keyof typeof GameMode];
