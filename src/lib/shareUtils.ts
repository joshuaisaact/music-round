import type { Doc } from "../../convex/_generated/dataModel";

export function generateSongEmojis(answers: Doc<"answers">[]): string {
  return answers
    .map((answer) => {
      if (answer.artistCorrect && answer.titleCorrect) return "✅";
      if (answer.artistCorrect || answer.titleCorrect) return "🟨";
      return "❌";
    })
    .join(" ");
}
