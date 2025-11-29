export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD") // Decompose accented characters (é -> e + ́)
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritical marks (accents)
    .trim()
    .replace(/\s*\([^)]*?(remastered|remix|re-?master|deluxe|edition|version|live|acoustic)[^)]*\)/i, "") // Remove parenthetical suffixes like (Deluxe Edition)
    .replace(/[^\w\s&\-/]/g, "") // Remove punctuation (keep &, -, / for now)
    .replace(/\s*&\s*/g, " and ") // Convert & to "and" (with spaces normalized)
    .replace(/\s*-\s*.*?(remastered|remix|re-?master|deluxe|edition|version|live|acoustic).*$/i, "") // Remove remaster/remix/edition suffixes after hyphens
    .replace(/^the\s+/i, "") // Remove leading "the"
    .replace(/[-/]/g, " ") // Convert hyphens and slashes to spaces
    .replace(/[^\w\s]/g, "") // Remove any remaining punctuation
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}
