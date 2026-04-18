// Shared types for content script <-> popup communication

export type Speed = "fast" | "normal" | "safe";

export interface DuplicateItem {
  id: string;
  videoId: string;
  title: string;
  index: number;
  originalIndex: number;
  selected?: boolean;
  status?: "queued" | "processing" | "success" | "failed";
  error?: string;
}

export interface ScanResponse {
  duplicates: DuplicateItem[];
  totalScanned: number;
  error?: string;
}

export interface ScrollResponse {
  count: number;
  error?: string;
}

export type ContentAction =
  | { action: "SCAN_DOM" }
  | { action: "SCROLL_TO_BOTTOM" }
  | { action: "STOP_EXECUTION" }
  | { action: "EXECUTE_DELETE"; items: DuplicateItem[]; options: { speed: Speed } };

export type ContentResponse =
  | { ok: true }
  | { ok: false; error: string }
  | ScanResponse
  | ScrollResponse;

export type DeletionMessage =
  | {
      action: "DELETE_PROGRESS";
      count: number;
      currentTitle: string;
      status: "queued" | "processing" | "success" | "failed";
      error?: string;
    }
  | { action: "DELETE_COMPLETE"; total: number };
