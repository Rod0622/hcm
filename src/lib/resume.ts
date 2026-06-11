/* Server-only resume text extraction and candidate-info heuristics. */

import mammoth from "mammoth";
import pdfParse from "pdf-parse";

export async function extractResumeText(buffer: Buffer, filename: string): Promise<string> {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  if (ext === "pdf") {
    const parsed = await pdfParse(buffer);
    return parsed.text;
  }
  if (ext === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  if (ext === "txt" || ext === "md") {
    return buffer.toString("utf8");
  }
  throw new Error(`Unsupported file type ".${ext}" — upload PDF, DOCX, TXT, or MD`);
}

export type CandidateGuess = { name: string; email: string | null; phone: string | null };

export function guessCandidate(text: string, filename: string): CandidateGuess {
  const email = text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)?.[0].toLowerCase() ?? null;
  const phone = text.match(/\+?\d[\d\s().-]{7,}\d/)?.[0].replace(/\s+/g, " ").trim() ?? null;

  // Name: first short line near the top that looks like "First Last",
  // otherwise fall back to a cleaned-up filename.
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 8);
  for (const line of lines) {
    if (line.length > 40 || /[@\d]/.test(line)) continue;
    const words = line.split(/\s+/);
    if (words.length < 2 || words.length > 4) continue;
    if (/resume|curriculum|vitae|profile/i.test(line)) continue;
    if (words.every((w) => /^[A-Z][a-zA-Z'.-]*$/.test(w))) {
      return { name: line, email, phone };
    }
  }

  const fromFile = filename
    .replace(/\.[^.]+$/, "")
    .replace(/[_.-]+/g, " ")
    .replace(/\b(resume|cv|curriculum|vitae)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return { name: fromFile || "Unknown candidate", email, phone };
}
