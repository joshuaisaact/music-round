import { describe, it, expect } from "vitest";
import { normalize } from "./utils";

describe("normalize", () => {
  it("lowercases input", () => {
    expect(normalize("ACDC")).toBe("acdc");
    expect(normalize("The Beatles")).toBe("beatles");
  });

  it("removes leading 'the'", () => {
    expect(normalize("The Rolling Stones")).toBe("rolling stones");
    expect(normalize("the who")).toBe("who");
  });

  it("handles accented characters", () => {
    expect(normalize("Björk")).toBe("bjork");
    expect(normalize("Mótor")).toBe("motor");
    expect(normalize("Sigur Rós")).toBe("sigur ros");
  });

  it("converts & to 'and'", () => {
    expect(normalize("Guns N' Roses")).toBe("guns n roses");
    expect(normalize("Tom & Jerry")).toBe("tom and jerry");
    expect(normalize("Earth, Wind & Fire")).toBe("earth wind and fire");
  });

  it("handles slashes and hyphens", () => {
    expect(normalize("AC/DC")).toBe("ac dc");
    expect(normalize("Jay-Z")).toBe("jay z");
    expect(normalize("Twenty-One Pilots")).toBe("twenty one pilots");
  });

  it("strips remaster/remix suffixes after hyphens", () => {
    expect(normalize("Bohemian Rhapsody - Remastered 2011")).toBe("bohemian rhapsody");
    expect(normalize("Track - 2023 Remix")).toBe("track");
    expect(normalize("Song - Live Version")).toBe("song");
  });

  it("strips parenthetical suffixes", () => {
    expect(normalize("Song Title (Deluxe Edition)")).toBe("song title");
    expect(normalize("Album Track (Remastered 2020)")).toBe("album track");
    expect(normalize("Hit Song (Acoustic Version)")).toBe("hit song");
  });

  it("normalizes whitespace", () => {
    expect(normalize("  too   many   spaces  ")).toBe("too many spaces");
  });

  it("removes punctuation", () => {
    expect(normalize("What's Going On?")).toBe("whats going on");
    expect(normalize("Don't Stop Me Now!")).toBe("dont stop me now");
  });
});
