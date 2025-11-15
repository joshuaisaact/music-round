interface RevealedLetter {
  index: number;
  letter: string;
}

interface HintDisplayProps {
  text: string;
  revealedLetters: RevealedLetter[];
}

export function HintDisplay({ text, revealedLetters }: HintDisplayProps) {
  return (
    <p className="pixel-text text-sky-900 text-lg font-mono">
      {text.split("").map((char, index) => {
        // Check if this position should be revealed
        const revealedLetter = revealedLetters.find((rl) => rl.index === index);

        if (revealedLetter) {
          // Show the revealed letter
          return <span key={index} className="inline-block mx-0.5">{char.toUpperCase()}</span>;
        } else if (char === " ") {
          // Show word spaces as a larger gap
          return <span key={index} className="inline-block w-4"></span>;
        } else if (char.match(/[a-zA-Z0-9]/)) {
          // Hide letters/numbers with underscore
          return <span key={index} className="inline-block mx-0.5">_</span>;
        } else {
          // Show other punctuation as-is
          return <span key={index} className="inline-block mx-0.5">{char}</span>;
        }
      })}
    </p>
  );
}
