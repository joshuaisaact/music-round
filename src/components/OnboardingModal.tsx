import { useState } from "react";
import { PixelButton } from "./PixelButton";

interface OnboardingModalProps {
  onClose: () => void;
  isDailyMode?: boolean;
  secondsPerRound?: number;
}

export function OnboardingModal({ onClose, isDailyMode = false, secondsPerRound = 30 }: OnboardingModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('hideOnboarding', 'true');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border-4 border-sky-900 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-sky-600 border-b-4 border-sky-900 p-6 text-center">
          <h2 className="pixel-text text-white text-3xl">HOW TO PLAY</h2>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Objective */}
          <div className="flex gap-4 items-start">
            <img src="/trophy.svg" alt="" width="32" height="32" aria-hidden="true" className="flex-shrink-0 mt-1" />
            <div>
              <h3 className="pixel-text text-sky-900 text-xl mb-2">OBJECTIVE</h3>
              <p className="pixel-text text-sky-800 text-base">
                GUESS THE ARTIST AND TITLE OF EACH SONG. EACH CORRECT ANSWER EARNS YOU POINTS!
              </p>
            </div>
          </div>

          {/* Scoring */}
          <div className="flex gap-4 items-start">
            <img src="/clock.svg" alt="" width="32" height="32" aria-hidden="true" className="flex-shrink-0 mt-1" />
            <div>
              <h3 className="pixel-text text-sky-900 text-xl mb-2">SCORING</h3>
              <ul className="pixel-text text-sky-800 text-base space-y-2">
                <li>• UP TO 500 POINTS FOR ARTIST, 500 FOR TITLE</li>
                {isDailyMode && <li>• YOU HAVE {secondsPerRound} SECONDS PER SONG</li>}
                <li>• POINTS DECREASE OVER TIME (500 → 250)</li>
                <li>• SUBMIT EARLY TO MAXIMIZE YOUR SCORE!</li>
              </ul>
            </div>
          </div>

          {/* Pro Tip */}
          <div className="bg-yellow-50 border-4 border-yellow-600 p-4">
            <p className="pixel-text text-yellow-800 text-base">
              YOU CAN SUBMIT THE ARTIST WITHOUT THE TITLE (OR VICE VERSA). SUBMIT ONE ANSWER AS SOON AS YOU HAVE IT TO LOCK IN THOSE POINTS WHILE YOU WORK ON THE OTHER!
            </p>
          </div>

          {/* Hints */}
          <div className="flex gap-4 items-start">
            <img src="/light-bulb.svg" alt="" width="32" height="32" aria-hidden="true" className="flex-shrink-0 mt-1" />
            <div>
              <h3 className="pixel-text text-sky-900 text-xl mb-2">HINTS</h3>
              <ul className="pixel-text text-sky-800 text-base space-y-2">
                <li>• REVEALS RANDOM LETTERS IN ARTIST AND TITLE</li>
                <li>• EACH HINT COSTS -100 POINTS FROM YOUR TOTAL SCORE</li>
                <li>• USE WISELY!</li>
              </ul>
            </div>
          </div>

          {/* Don't show again */}
          <div className="border-t-4 border-sky-300 pt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-5 h-5 cursor-pointer"
              />
              <span className="pixel-text text-sky-800 text-base">
                DON'T SHOW THIS AGAIN
              </span>
            </label>
          </div>

          {/* Close Button */}
          <PixelButton
            onClick={handleClose}
            className="w-full"
            aria-label="Close tutorial and start playing"
          >
            GOT IT, LET'S PLAY!
          </PixelButton>
        </div>
      </div>
    </div>
  );
}
