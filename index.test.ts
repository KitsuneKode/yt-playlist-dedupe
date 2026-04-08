import { expect, test } from "bun:test";
import { parseArgs } from "./index.js";

test("parseArgs defaults to dry-run mode", () => {
  expect(parseArgs(["PLabc123"])).toEqual({
    command: "scan",
    help: false,
    execute: false,
    yes: false,
    playlistId: "PLabc123",
    playlistInput: "PLabc123",
    playlistInputKind: "id",
  });
});

test("parseArgs enables execute mode explicitly", () => {
  expect(parseArgs(["PLabc123", "--execute"])).toEqual({
    command: "scan",
    help: false,
    execute: true,
    yes: false,
    playlistId: "PLabc123",
    playlistInput: "PLabc123",
    playlistInputKind: "id",
  });
});

test("parseArgs rejects conflicting flags", () => {
  expect(() => parseArgs(["PLabc123", "--execute", "--dry-run"])).toThrow(
    "Use either --dry-run or --execute, not both.",
  );
});

test("parseArgs accepts playlist URLs", () => {
  expect(
    parseArgs(["https://www.youtube.com/watch?v=abc123&list=PLabc123"]),
  ).toEqual({
    command: "scan",
    help: false,
    execute: false,
    yes: false,
    playlistId: "PLabc123",
    playlistInput: "https://www.youtube.com/watch?v=abc123&list=PLabc123",
    playlistInputKind: "url",
  });
});

test("parseArgs accepts --playlist", () => {
  expect(parseArgs(["scan", "--playlist", "PLabc123"])).toEqual({
    command: "scan",
    help: false,
    execute: false,
    yes: false,
    playlistId: "PLabc123",
    playlistInput: "PLabc123",
    playlistInputKind: "id",
  });
});

test("parseArgs rejects --yes without execute", () => {
  expect(() => parseArgs(["PLabc123", "--yes"])).toThrow(
    "Use --yes only together with --execute.",
  );
});

test("parseArgs recognizes setup command", () => {
  expect(parseArgs(["setup"])).toEqual({
    command: "setup",
    help: false,
    execute: false,
    yes: false,
    playlistId: null,
    playlistInput: null,
    playlistInputKind: null,
  });
});
