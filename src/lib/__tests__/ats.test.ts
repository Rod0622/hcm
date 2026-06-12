import { describe, expect, it } from "vitest";
import { SCREEN_THRESHOLD, scoreResume } from "../ats";

const keywords = [
  { term: "react", weight: 3, required: true, aliases: ["reactjs"] },
  { term: "typescript", weight: 3, required: true },
  { term: "css", weight: 1 },
  { term: "testing", weight: 1, aliases: ["jest", "playwright"] },
];

describe("scoreResume", () => {
  it("scores a full match at 100", () => {
    const r = scoreResume("React and TypeScript with CSS, tested via Playwright", keywords);
    expect(r.score).toBe(100);
    expect(r.missing).toEqual([]);
  });

  it("matches aliases and word boundaries", () => {
    const r = scoreResume("Built apps with ReactJS; jest for tests", keywords);
    expect(r.matched).toContain("react");
    expect(r.matched).toContain("testing");
    // 'css' must not match inside other words
    const noCss = scoreResume("successor processor typescript react", keywords);
    expect(noCss.matched).not.toContain("css");
  });

  it("caps the score below the screen line when a required skill is missing", () => {
    const r = scoreResume("typescript css jest", keywords); // react missing (required)
    expect(r.missingRequired).toEqual(["react"]);
    expect(r.score).toBeLessThan(SCREEN_THRESHOLD);
  });

  it("handles empty keyword lists", () => {
    expect(scoreResume("anything", []).score).toBe(0);
  });
});
