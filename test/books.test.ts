import { expect, test } from "bun:test";
import { listBooks, loadBook } from "../src/books.ts";

test("demo book is discoverable and valid", () => {
  const ids = listBooks().map((book) => book.id);
  expect(ids).toContain("demo-book");
});

test("demo book exposes a coach and structure", () => {
  const book = loadBook("demo-book");
  expect(book.title).toBe("演示书");
  expect(book.coach.rules.length).toBeGreaterThan(0);
  expect(book.structure.units[0]?.steps.length).toBeGreaterThan(0);
});
