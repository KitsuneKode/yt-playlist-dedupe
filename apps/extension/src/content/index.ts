// YouTube Playlist Deduplicator - Native Content Script

console.log("[YT-DDP] Content script loaded and active.");

let isExecuting = false;
let stopExecution = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("[YT-DDP] Message received:", request.action);

  if (request.action === "SCAN_DOM") {
    if (!window.location.href.includes("youtube.com/playlist")) {
      sendResponse({ duplicates: [], totalScanned: 0, error: "Not on a playlist page" });
      return;
    }

    try {
      const results = scanForDuplicates();
      sendResponse(results);
    } catch (error) {
      console.error("[YT-DDP] Scan failed:", error);
      sendResponse({ duplicates: [], totalScanned: 0, error: String(error) });
    }
    return true;
  }

  if (request.action === "SCROLL_TO_BOTTOM") {
    scrollToBottom()
      .then((count) => sendResponse({ count }))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }

  if (request.action === "STOP_EXECUTION") {
    stopExecution = true;
    sendResponse({ ok: true });
    return true;
  }

  if (request.action === "EXECUTE_DELETE") {
    if (isExecuting) {
      sendResponse({ ok: false, error: "Execution already in progress" });
      return;
    }

    if (!window.location.href.includes("youtube.com/playlist")) {
      sendResponse({ ok: false, error: "Not on a playlist page" });
      return;
    }

    isExecuting = true;
    stopExecution = false;

    executeDeletions(request.items, request.options || { speed: "normal" })
      .then(() => {
        console.log("[YT-DDP] Deletion process finished.");
        isExecuting = false;
        sendResponse({ ok: true });
      })
      .catch((err) => {
        console.error("[YT-DDP] Execution failed:", err);
        isExecuting = false;
        sendResponse({ ok: false, error: err.message });
      });
    return true;
  }
});

async function scrollToBottom() {
  let lastCount = 0;
  let stagnantCount = 0;

  while (stagnantCount < 5) {
    const items = document.querySelectorAll(
      "ytd-playlist-video-renderer, ytd-playlist-panel-video-renderer",
    );
    const currentCount = items.length;

    if (currentCount === lastCount) {
      stagnantCount++;
    } else {
      stagnantCount = 0;
      lastCount = currentCount;
    }

    window.scrollTo(0, document.documentElement.scrollHeight);

    // Wait for either the count to change or a timeout
    const waitStart = Date.now();
    let countChanged = false;
    while (Date.now() - waitStart < 2000) {
      const newCount = document.querySelectorAll(
        "ytd-playlist-video-renderer, ytd-playlist-panel-video-renderer",
      ).length;
      if (newCount > currentCount) {
        countChanged = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    if (!countChanged && stagnantCount >= 3) {
      // One last check if the spinner is gone
      const spinner = document.querySelector(
        "ytd-continuation-item-renderer tp-yt-paper-spinner, #spinner",
      );
      if (!spinner) break;
    }

    // Extra safety wait for DOM to settle
    await new Promise((r) => setTimeout(r, 300));
  }

  return lastCount;
}

function scanForDuplicates() {
  const items = Array.from(
    document.querySelectorAll("ytd-playlist-video-renderer, ytd-playlist-panel-video-renderer"),
  );

  const seenVideos = new Map<string, { index: number; title: string }>();
  const duplicates: any[] = [];

  items.forEach((item, index) => {
    const anchor = item.querySelector(
      "a#thumbnail, a.ytd-playlist-video-renderer",
    ) as HTMLAnchorElement;
    if (!anchor) return;

    try {
      const href = anchor.getAttribute("href") || "";
      const url = new URL(href, window.location.origin);
      const videoId = url.searchParams.get("v");

      if (!videoId) return;

      const titleEl = item.querySelector(
        "#video-title, .ytd-playlist-video-renderer #video-title",
      ) as HTMLElement;
      const title = titleEl ? titleEl.textContent?.trim() || "Unknown Title" : "Unknown Title";

      if (seenVideos.has(videoId)) {
        const original = seenVideos.get(videoId)!;
        const uniqueId = `dup_${videoId}_${index}`;
        item.setAttribute("data-yt-ddp-id", uniqueId);

        duplicates.push({
          id: uniqueId,
          videoId,
          title,
          index: index + 1,
          originalIndex: original.index,
        });
      } else {
        seenVideos.set(videoId, { index: index + 1, title });
      }
    } catch (e) {
      console.error("[YT-DDP] Error parsing item:", e);
    }
  });

  return { duplicates, totalScanned: items.length };
}

async function waitForElementByText(
  selector: string,
  text: string,
  timeout = 2000,
): Promise<HTMLElement | null> {
  const start = Date.now();
  const lowerText = text.toLowerCase();
  while (Date.now() - start < timeout) {
    const elements = Array.from(document.querySelectorAll(selector));
    for (const el of elements) {
      if (el.textContent?.toLowerCase().includes(lowerText)) {
        return el as HTMLElement;
      }
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  return null;
}

async function executeDeletions(items: any[], options: { speed: string }) {
  let deletedCount = 0;
  const speedConfigs = {
    fast: { min: 200, max: 400, menuWait: 200 },
    normal: { min: 500, max: 1000, menuWait: 400 },
    safe: { min: 1200, max: 2500, menuWait: 800 },
  };

  const speedDelays =
    speedConfigs[options.speed as keyof typeof speedConfigs] || speedConfigs.normal;

  for (const dup of items) {
    if (stopExecution) {
      console.log("[YT-DDP] Execution stopped by user.");
      break;
    }

    const element = document.querySelector(`[data-yt-ddp-id="${dup.id}"]`);
    if (!element) {
      console.warn("[YT-DDP] Could not find element to delete:", dup.id);
      chrome.runtime.sendMessage({
        action: "DELETE_PROGRESS",
        count: deletedCount,
        currentTitle: dup.title,
        status: "failed",
        error: "Element not found",
      });
      continue;
    }

    try {
      chrome.runtime.sendMessage({
        action: "DELETE_PROGRESS",
        count: deletedCount,
        currentTitle: dup.title,
        status: "processing",
      });

      element.scrollIntoView({ behavior: "smooth", block: "center" });
      await new Promise((r) => setTimeout(r, 300));

      const menuBtn = element.querySelector(
        "#button > yt-icon-button, yt-icon-button#button, [aria-label='More actions'], ytd-menu-renderer button",
      ) as HTMLElement;

      if (!menuBtn) {
        throw new Error("Action menu button not found");
      }

      menuBtn.click();

      // Wait for menu with smarter logic
      const removeBtn = await waitForElementByText(
        "ytd-menu-service-item-renderer, tp-yt-paper-item, ytd-menu-navigation-item-renderer",
        "remove from",
      );

      if (!removeBtn) {
        // Fallback for some languages or UI variants
        const fallbackBtn = await waitForElementByText(
          "ytd-menu-service-item-renderer, tp-yt-paper-item",
          "delete from",
        );
        if (!fallbackBtn) throw new Error("'Remove from' button not found in menu");
        fallbackBtn.click();
      } else {
        removeBtn.click();
      }

      deletedCount++;
      chrome.runtime.sendMessage({
        action: "DELETE_PROGRESS",
        count: deletedCount,
        currentTitle: dup.title,
        status: "success",
      });

      // Human-like delay
      const delay = speedDelays.min + Math.random() * (speedDelays.max - speedDelays.min);
      await new Promise((r) => setTimeout(r, delay));
    } catch (error: any) {
      console.error("[YT-DDP] Error during deletion:", error);
      chrome.runtime.sendMessage({
        action: "DELETE_PROGRESS",
        count: deletedCount,
        currentTitle: dup.title,
        status: "failed",
        error: error.message,
      });

      // Close menu on error
      document.body.click();
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  chrome.runtime.sendMessage({ action: "DELETE_COMPLETE", total: deletedCount });
}
