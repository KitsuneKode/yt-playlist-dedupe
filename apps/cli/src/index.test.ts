import { expect, test } from "bun:test";
import { parseArgs } from "./index.js";

test("parseArgs defaults to dry-run mode", () => {
  expect(parseArgs(["PLabc123"])).toEqual({
    command: "scan",
    completionShell: null,
    help: false,
    execute: false,
    outputJson: false,
    yes: false,
    playlistId: "PLabc123",
    playlistInput: "PLabc123",
    playlistInputKind: "id",
    refresh: false,
  });
});

test("parseArgs enables execute mode explicitly", () => {
  expect(parseArgs(["PLabc123", "--execute"])).toEqual({
    command: "scan",
    completionShell: null,
    help: false,
    execute: true,
    outputJson: false,
    yes: false,
    playlistId: "PLabc123",
    playlistInput: "PLabc123",
    playlistInputKind: "id",
    refresh: false,
  });
});

test("parseArgs rejects conflicting flags", () => {
  expect(() => parseArgs(["PLabc123", "--execute", "--dry-run"])).toThrow(
    "Use either --dry-run or --execute, not both.",
  );
});

test("parseArgs accepts playlist URLs", () => {
  expect(parseArgs(["https://www.youtube.com/watch?v=abc123&list=PLabc123"])).toEqual({
    command: "scan",
    completionShell: null,
    help: false,
    execute: false,
    outputJson: false,
    yes: false,
    playlistId: "PLabc123",
    playlistInput: "https://www.youtube.com/watch?v=abc123&list=PLabc123",
    playlistInputKind: "url",
    refresh: false,
  });
});

test("parseArgs accepts --playlist", () => {
  expect(parseArgs(["scan", "--playlist", "PLabc123"])).toEqual({
    command: "scan",
    completionShell: null,
    help: false,
    execute: false,
    outputJson: false,
    yes: false,
    playlistId: "PLabc123",
    playlistInput: "PLabc123",
    playlistInputKind: "id",
    refresh: false,
  });
});

test("parseArgs rejects --yes without execute", () => {
  expect(() => parseArgs(["PLabc123", "--yes"])).toThrow("Use --yes only together with --execute.");
});

test("parseArgs recognizes setup command", () => {
  expect(parseArgs(["setup"])).toEqual({
    command: "setup",
    completionShell: null,
    help: false,
    execute: false,
    outputJson: false,
    yes: false,
    playlistId: null,
    playlistInput: null,
    playlistInputKind: null,
    refresh: false,
  });
});

test("parseArgs recognizes login as a setup alias", () => {
  expect(parseArgs(["login"])).toEqual({
    command: "login",
    completionShell: null,
    help: false,
    execute: false,
    outputJson: false,
    yes: false,
    playlistId: null,
    playlistInput: null,
    playlistInputKind: null,
    refresh: false,
  });
});

test("parseArgs enables json output for scans", () => {
  expect(parseArgs(["PLabc123", "--json"])).toEqual({
    command: "scan",
    completionShell: null,
    help: false,
    execute: false,
    outputJson: true,
    yes: false,
    playlistId: "PLabc123",
    playlistInput: "PLabc123",
    playlistInputKind: "id",
    refresh: false,
  });
});

test("parseArgs supports refresh for live scans", () => {
  expect(parseArgs(["PLabc123", "--refresh"])).toEqual({
    command: "scan",
    completionShell: null,
    help: false,
    execute: false,
    outputJson: false,
    yes: false,
    playlistId: "PLabc123",
    playlistInput: "PLabc123",
    playlistInputKind: "id",
    refresh: true,
  });
});

test("parseArgs recognizes the quota command", () => {
  expect(parseArgs(["quota", "--json"])).toEqual({
    command: "quota",
    completionShell: null,
    help: false,
    execute: false,
    outputJson: true,
    yes: false,
    playlistId: null,
    playlistInput: null,
    playlistInputKind: null,
    refresh: false,
  });
});

test("parseArgs supports zsh completion command", () => {
  expect(parseArgs(["completion", "zsh"])).toEqual({
    command: "completion",
    completionShell: "zsh",
    help: false,
    execute: false,
    outputJson: false,
    yes: false,
    playlistId: null,
    playlistInput: null,
    playlistInputKind: null,
    refresh: false,
  });
});
