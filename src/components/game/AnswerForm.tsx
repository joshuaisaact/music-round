import { PixelButton, PixelInput, HintDisplay } from "@/components";
import type { Doc } from "../../../convex/_generated/dataModel";

export interface AnswerInput {
  value: string;
  setValue: (value: string) => void;
  locked: boolean;
  shake: boolean;
  revealedLetters: { index: number; letter: string }[];
  inputRef: React.RefObject<HTMLInputElement>;
}

interface AnswerFormProps {
  currentRound: Doc<"rounds">;
  currentPlayer: Doc<"players">;
  roundAnswers: Doc<"answers">[] | undefined;
  phase: string;
  artistAnswer: AnswerInput;
  titleAnswer: AnswerInput;
  isFullyLocked: boolean;
  hintsRemaining: number | null;
  error: string;
  onSubmit: () => void;
  onUseHint: () => void;
}

export function AnswerForm({
  currentRound,
  currentPlayer,
  roundAnswers,
  phase,
  artistAnswer,
  titleAnswer,
  isFullyLocked,
  hintsRemaining,
  error,
  onSubmit,
  onUseHint,
}: AnswerFormProps) {
  return (
    <div key={currentRound._id} className="bg-white border-4 border-sky-900 p-6">
      <style>
        {`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            75% { transform: translateX(10px); }
          }
          .shake {
            animation: shake 0.3s ease-in-out;
          }
        `}
      </style>

      <div className="space-y-6">
        <div className={artistAnswer.shake ? "shake" : ""}>
          {artistAnswer.revealedLetters.length > 0 && !artistAnswer.locked && (
            <div className="mb-2 bg-yellow-50 border-2 border-yellow-600 p-2">
              <HintDisplay
                text={currentRound.songData.correctArtist}
                revealedLetters={artistAnswer.revealedLetters}
              />
            </div>
          )}
          <PixelInput
            ref={artistAnswer.inputRef}
            type="text"
            label="ARTIST NAME"
            placeholder="WHO IS THE ARTIST?"
            value={artistAnswer.value}
            onChange={(e) => !artistAnswer.locked && artistAnswer.setValue(e.target.value)}
            onEnterPress={!isFullyLocked ? onSubmit : undefined}
            className={`w-full ${
              artistAnswer.locked
                ? "!border-green-600 !border-4"
                : artistAnswer.shake
                  ? "!border-red-600 !border-4"
                  : ""
            }`}
            disabled={artistAnswer.locked}
            aria-label="Artist name"
            aria-describedby={artistAnswer.locked ? "artist-correct" : undefined}
            autoFocus
          />
          {artistAnswer.locked && (
            <p id="artist-correct" className="pixel-text text-green-700 text-xs mt-1 font-bold" role="status">
              CORRECT!
            </p>
          )}
        </div>

        <div className={titleAnswer.shake ? "shake" : ""}>
          {titleAnswer.revealedLetters.length > 0 && !titleAnswer.locked && (
            <div className="mb-2 bg-yellow-50 border-2 border-yellow-600 p-2">
              <HintDisplay
                text={currentRound.songData.correctTitle}
                revealedLetters={titleAnswer.revealedLetters}
              />
            </div>
          )}
          <PixelInput
            ref={titleAnswer.inputRef}
            type="text"
            label="SONG TITLE"
            placeholder="WHAT IS THE SONG?"
            value={titleAnswer.value}
            onChange={(e) => !titleAnswer.locked && titleAnswer.setValue(e.target.value)}
            onEnterPress={!isFullyLocked ? onSubmit : undefined}
            className={`w-full ${
              titleAnswer.locked
                ? "!border-green-600 !border-4"
                : titleAnswer.shake
                  ? "!border-red-600 !border-4"
                  : ""
            }`}
            disabled={titleAnswer.locked}
            aria-label="Song title"
            aria-describedby={titleAnswer.locked ? "title-correct" : error ? "answer-error" : undefined}
          />
          {titleAnswer.locked && (
            <p id="title-correct" className="pixel-text text-green-700 text-xs mt-1 font-bold" role="status">
              CORRECT!
            </p>
          )}
        </div>

        {!isFullyLocked && (
          <>
            <PixelButton
              onClick={onSubmit}
              className="w-full"
              disabled={phase !== "active"}
              aria-label={artistAnswer.locked || titleAnswer.locked ? "Try again with another guess" : "Submit your answer"}
            >
              {artistAnswer.locked || titleAnswer.locked ? "TRY AGAIN" : "SUBMIT ANSWER"}
            </PixelButton>
            <PixelButton
              onClick={onUseHint}
              className="w-full"
              disabled={phase !== "active" || hintsRemaining === 0}
              aria-label={`Use hint (${hintsRemaining} remaining)`}
            >
              <span className="flex items-center justify-center gap-2">
                <img src="/light-bulb.svg" alt="" width="20" height="20" aria-hidden="true" />
                {hintsRemaining === 0 ? "OUT OF HINTS!" : `HINT (${hintsRemaining})`}
              </span>
            </PixelButton>
          </>
        )}

        {error && (
          <div
            id="answer-error"
            role="alert"
            className={`pixel-text text-sm p-3 border-2 ${
              error.includes("correct")
                ? "bg-blue-50 border-blue-600 text-blue-900"
                : "bg-red-50 border-red-600 text-red-900"
            }`}
          >
            {error}
          </div>
        )}

        {/* Show stats when fully locked */}
        {isFullyLocked && roundAnswers && (
          <div className="bg-green-100 border-4 border-green-600 p-6 text-center">
            {(() => {
              const myAnswer = roundAnswers.find((a) => a.playerId === currentPlayer._id);
              const points = myAnswer?.points || 0;
              const message = points >= 900 ? "INCREDIBLE!" : points >= 700 ? "GREAT!" : points >= 500 ? "NICE!" : "GOT IT!";

              return (
                <div className="space-y-3">
                  <p className="pixel-text text-green-600 text-sm font-bold">
                    {message}
                  </p>
                  <p className="pixel-text text-green-900 text-4xl md:text-5xl font-bold">
                    {points}
                  </p>
                  <p className="pixel-text text-green-700 text-xs">
                    POINTS EARNED
                  </p>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
