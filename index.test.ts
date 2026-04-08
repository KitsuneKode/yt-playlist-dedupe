import { expect, test } from "bun:test";
import { parseArgs } from "./index.js";

test("parseArgs defaults to dry-run mode", () => {
  expect(parseArgs(["PLabc123"])).toEqual({
    help: false,
    execute: false,
    playlistId: "PLabc123",
  });
});

test("parseArgs enables execute mode explicitly", () => {
  expect(parseArgs(["PLabc123", "--execute"])).toEqual({
    help: false,
    execute: true,
    playlistId: "PLabc123",
  });
});

test("parseArgs rejects conflicting flags", () => {
  expect(() => parseArgs(["PLabc123", "--execute", "--dry-run"])).toThrow(
    "Use either --dry-run or --execute, not both.",
  );
});
