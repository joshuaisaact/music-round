import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { PlayerRow } from "./PlayerRow";
import type { Id } from "../../convex/_generated/dataModel";

const mockPlayerId = "player123" as Id<"players">;
const otherPlayerId = "player456" as Id<"players">;

afterEach(cleanup);

function createPlayer(overrides = {}) {
  return {
    _id: mockPlayerId,
    name: "Alice",
    score: 1500,
    lives: 3,
    ...overrides,
  };
}

describe("PlayerRow", () => {
  it("shows (YOU) for current player", () => {
    render(
      <PlayerRow
        player={createPlayer()}
        rank={0}
        currentPlayerId={mockPlayerId}
        variant="detailed"
        isShaking={false}
        checkmarks={0}
        hintsUsed={0}
        showRankMedals={true}
        showLives={false}
      />
    );

    expect(screen.getByText(/\(you\)/i)).toBeInTheDocument();
  });

  it("does not show (YOU) for other players", () => {
    render(
      <PlayerRow
        player={createPlayer()}
        rank={0}
        currentPlayerId={otherPlayerId}
        variant="detailed"
        isShaking={false}
        checkmarks={0}
        hintsUsed={0}
        showRankMedals={true}
        showLives={false}
      />
    );

    expect(screen.queryByText(/\(you\)/i)).not.toBeInTheDocument();
  });

  it("displays player score", () => {
    render(
      <PlayerRow
        player={createPlayer({ score: 2500 })}
        rank={0}
        currentPlayerId={otherPlayerId}
        variant="detailed"
        isShaking={false}
        checkmarks={0}
        hintsUsed={0}
        showRankMedals={true}
        showLives={false}
      />
    );

    expect(screen.getByText("2500")).toBeInTheDocument();
  });

  it("shows gold medal for 1st place", () => {
    const { container } = render(
      <PlayerRow
        player={createPlayer()}
        rank={0}
        currentPlayerId={otherPlayerId}
        variant="detailed"
        isShaking={false}
        checkmarks={0}
        hintsUsed={0}
        showRankMedals={true}
        showLives={false}
      />
    );

    const medal = container.querySelector('img[src="/medal-1.svg"]');
    expect(medal).toBeInTheDocument();
  });

  it("shows silver medal for 2nd place", () => {
    const { container } = render(
      <PlayerRow
        player={createPlayer()}
        rank={1}
        currentPlayerId={otherPlayerId}
        variant="detailed"
        isShaking={false}
        checkmarks={0}
        hintsUsed={0}
        showRankMedals={true}
        showLives={false}
      />
    );

    const medal = container.querySelector('img[src="/medal-2.svg"]');
    expect(medal).toBeInTheDocument();
  });

  it("shows numeric rank for 4th place and beyond", () => {
    render(
      <PlayerRow
        player={createPlayer()}
        rank={3}
        currentPlayerId={otherPlayerId}
        variant="detailed"
        isShaking={false}
        checkmarks={0}
        hintsUsed={0}
        showRankMedals={true}
        showLives={false}
      />
    );

    expect(screen.getByText("4.")).toBeInTheDocument();
  });

  it("shows checkmarks for correct answers", () => {
    render(
      <PlayerRow
        player={createPlayer()}
        rank={0}
        currentPlayerId={otherPlayerId}
        variant="detailed"
        isShaking={false}
        checkmarks={2}
        hintsUsed={0}
        showRankMedals={true}
        showLives={false}
      />
    );

    expect(screen.getByText("✓✓")).toBeInTheDocument();
  });

  it("shows lives when enabled", () => {
    const { container } = render(
      <PlayerRow
        player={createPlayer({ lives: 2 })}
        rank={0}
        currentPlayerId={otherPlayerId}
        variant="detailed"
        isShaking={false}
        checkmarks={0}
        hintsUsed={0}
        showRankMedals={false}
        showLives={true}
      />
    );

    const hearts = container.querySelectorAll('img[src="/heart.svg"]');
    expect(hearts).toHaveLength(3);
  });

  it("applies shake class when isShaking is true", () => {
    const { container } = render(
      <PlayerRow
        player={createPlayer()}
        rank={0}
        currentPlayerId={otherPlayerId}
        variant="detailed"
        isShaking={true}
        checkmarks={0}
        hintsUsed={0}
        showRankMedals={true}
        showLives={false}
      />
    );

    expect(container.firstChild).toHaveClass("shake");
  });
});
