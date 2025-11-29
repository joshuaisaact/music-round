import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AnswerForm } from "./AnswerForm";
import type { Doc, Id } from "../../../convex/_generated/dataModel";

// Mock audio to avoid errors in tests
vi.mock("@/lib/audio", () => ({
  playSound: vi.fn(),
  playTypingSound: vi.fn(),
}));

afterEach(cleanup);

function createMockRound(overrides = {}): Doc<"rounds"> {
  return {
    _id: "round123" as Id<"rounds">,
    _creationTime: Date.now(),
    gameId: "game123" as Id<"games">,
    roundNumber: 1,
    phase: "active",
    songData: {
      correctArtist: "The Beatles",
      correctTitle: "Hey Jude",
      spotifyId: "spotify123",
      previewURL: "https://example.com/preview.mp3",
      albumArt: "https://example.com/album.jpg",
    },
    ...overrides,
  } as Doc<"rounds">;
}

function createMockPlayer(overrides = {}): Doc<"players"> {
  return {
    _id: "player123" as Id<"players">,
    _creationTime: Date.now(),
    gameId: "game123" as Id<"games">,
    sessionId: "session123",
    name: "TestPlayer",
    score: 0,
    isHost: false,
    joinedAt: Date.now(),
    ...overrides,
  } as Doc<"players">;
}

function createAnswerInput(overrides = {}) {
  return {
    value: "",
    setValue: vi.fn(),
    locked: false,
    shake: false,
    revealedLetters: [],
    inputRef: { current: null },
    ...overrides,
  };
}

describe("AnswerForm", () => {
  it("disables artist input when locked (correct answer)", () => {
    render(
      <AnswerForm
        currentRound={createMockRound()}
        currentPlayer={createMockPlayer()}
        roundAnswers={[]}
        phase="active"
        artistAnswer={createAnswerInput({ locked: true, value: "The Beatles" })}
        titleAnswer={createAnswerInput()}
        isFullyLocked={false}
        hintsRemaining={3}
        error=""
        onSubmit={vi.fn()}
        onUseHint={vi.fn()}
      />
    );

    const artistInput = screen.getByLabelText("Artist name");
    expect(artistInput).toBeDisabled();
  });

  it("shows CORRECT! when artist is locked", () => {
    render(
      <AnswerForm
        currentRound={createMockRound()}
        currentPlayer={createMockPlayer()}
        roundAnswers={[]}
        phase="active"
        artistAnswer={createAnswerInput({ locked: true })}
        titleAnswer={createAnswerInput()}
        isFullyLocked={false}
        hintsRemaining={3}
        error=""
        onSubmit={vi.fn()}
        onUseHint={vi.fn()}
      />
    );

    expect(screen.getByText("CORRECT!")).toBeInTheDocument();
  });

  it("shows TRY AGAIN button when one answer is correct", () => {
    render(
      <AnswerForm
        currentRound={createMockRound()}
        currentPlayer={createMockPlayer()}
        roundAnswers={[]}
        phase="active"
        artistAnswer={createAnswerInput({ locked: true })}
        titleAnswer={createAnswerInput()}
        isFullyLocked={false}
        hintsRemaining={3}
        error=""
        onSubmit={vi.fn()}
        onUseHint={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("hides submit/hint buttons when fully locked", () => {
    render(
      <AnswerForm
        currentRound={createMockRound()}
        currentPlayer={createMockPlayer()}
        roundAnswers={[]}
        phase="active"
        artistAnswer={createAnswerInput({ locked: true })}
        titleAnswer={createAnswerInput({ locked: true })}
        isFullyLocked={true}
        hintsRemaining={3}
        error=""
        onSubmit={vi.fn()}
        onUseHint={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: /submit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /hint/i })).not.toBeInTheDocument();
  });

  it("shows points when fully locked with answer", () => {
    const playerId = "player123" as Id<"players">;
    const mockAnswer = {
      _id: "answer123" as Id<"answers">,
      _creationTime: Date.now(),
      roundId: "round123" as Id<"rounds">,
      playerId,
      artistCorrect: true,
      titleCorrect: true,
      points: 850,
    } as Doc<"answers">;

    render(
      <AnswerForm
        currentRound={createMockRound()}
        currentPlayer={createMockPlayer({ _id: playerId })}
        roundAnswers={[mockAnswer]}
        phase="active"
        artistAnswer={createAnswerInput({ locked: true })}
        titleAnswer={createAnswerInput({ locked: true })}
        isFullyLocked={true}
        hintsRemaining={3}
        error=""
        onSubmit={vi.fn()}
        onUseHint={vi.fn()}
      />
    );

    expect(screen.getByText("850")).toBeInTheDocument();
    expect(screen.getByText("GREAT!")).toBeInTheDocument();
  });

  it("displays error messages", () => {
    render(
      <AnswerForm
        currentRound={createMockRound()}
        currentPlayer={createMockPlayer()}
        roundAnswers={[]}
        phase="active"
        artistAnswer={createAnswerInput()}
        titleAnswer={createAnswerInput()}
        isFullyLocked={false}
        hintsRemaining={3}
        error="Wrong answer, try again!"
        onSubmit={vi.fn()}
        onUseHint={vi.fn()}
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Wrong answer, try again!");
  });

  it("disables hint button when no hints remaining", () => {
    render(
      <AnswerForm
        currentRound={createMockRound()}
        currentPlayer={createMockPlayer()}
        roundAnswers={[]}
        phase="active"
        artistAnswer={createAnswerInput()}
        titleAnswer={createAnswerInput()}
        isFullyLocked={false}
        hintsRemaining={0}
        error=""
        onSubmit={vi.fn()}
        onUseHint={vi.fn()}
      />
    );

    const hintButton = screen.getByRole("button", { name: /hint/i });
    expect(hintButton).toBeDisabled();
    expect(hintButton).toHaveTextContent("OUT OF HINTS!");
  });

  it("calls onSubmit when submit button clicked", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <AnswerForm
        currentRound={createMockRound()}
        currentPlayer={createMockPlayer()}
        roundAnswers={[]}
        phase="active"
        artistAnswer={createAnswerInput()}
        titleAnswer={createAnswerInput()}
        isFullyLocked={false}
        hintsRemaining={3}
        error=""
        onSubmit={onSubmit}
        onUseHint={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /submit your answer/i }));
    expect(onSubmit).toHaveBeenCalled();
  });
});
