import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export interface BookStep {
  level: number;
  name: string;
  nameEn?: string;
  summary?: string;
}

export interface BookUnit {
  id: string;
  name: string;
  nameEn?: string;
  focus?: string;
  steps: BookStep[];
}

export interface BookStructure {
  kind: string;
  units: BookUnit[];
}

export interface CoachProfile {
  name: string;
  persona: string;
  tone?: string;
  rules: string[];
}

export interface Book {
  id: string;
  title: string;
  titleEn?: string;
  author?: string;
  subtitle?: string;
  coverNote?: string;
  themes?: string[];
  coach: CoachProfile;
  structure: BookStructure;
}

export interface BookSummary {
  id: string;
  title: string;
  author?: string;
  coverNote?: string;
}

const BOOKS_DIR = join(import.meta.dir, "..", "books");

export function listBookIds(): string[] {
  if (!existsSync(BOOKS_DIR)) return [];
  return readdirSync(BOOKS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((id) => existsSync(join(BOOKS_DIR, id, "book.jsonc")));
}

export function loadBook(id: string): Book {
  const file = join(BOOKS_DIR, id, "book.jsonc");
  if (!existsSync(file)) throw new Error(`book not found: ${id}`);
  const parsed = Bun.JSONC.parse(readFileSync(file, "utf8")) as Book;
  if (parsed.id !== id) throw new Error(`book id mismatch: ${parsed.id} != ${id}`);
  if (!parsed.title || !parsed.coach || !parsed.structure?.units?.length) {
    throw new Error(`book "${id}": missing required fields (title/coach/structure.units)`);
  }
  return parsed;
}

export function listBooks(): BookSummary[] {
  return listBookIds().map((id) => {
    const b = loadBook(id);
    return { id: b.id, title: b.title, author: b.author, coverNote: b.coverNote };
  });
}
