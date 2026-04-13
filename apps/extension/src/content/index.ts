// YouTube Playlist Deduplicator - Native Content Script

console.log("[YT-DDP] Content script loaded and active.");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("[YT-DDP] Message received:", request.action);

  if (request.action === "SCAN_DOM") {
    try {
      const results = scanForDuplicates();
      console.log("[YT-DDP] Scan results:", results);
      sendResponse(results);
    } catch (error) {
      console.error("[YT-DDP] Scan failed:", error);
      sendResponse({ duplicates: [], totalScanned: 0, error: String(error) });
    }
    return true;
  }

  if (request.action === "EXECUTE_DELETE") {
    executeDeletions(request.items)
      .then(() => {
        console.log("[YT-DDP] All deletions completed.");
        sendResponse({ ok: true });
      })
      .catch((err) => {
        console.error("[YT-DDP] Execution failed:", err);
        sendResponse({ ok: false, error: err.message });
      });
    return true;
  }
});

function scanForDuplicates() {
  // Broaden selector to find all playlist items
  const items = Array.from(
    document.querySelectorAll("ytd-playlist-video-renderer, ytd-playlist-panel-video-renderer"),
  );

  if (items.length === 0) {
    console.warn("[YT-DDP] No playlist items found in DOM. Check if you are on a playlist page.");
  }

  const seenVideos = new Set();
  const duplicates: any[] = [];

  items.forEach((item, index) => {
    // Try multiple ways to find the video ID
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
        const uniqueId = `dup_${videoId}_${index}`;
        item.setAttribute("data-yt-ddp-id", uniqueId);

        duplicates.push({
          id: uniqueId,
          videoId,
          title,
          index: index + 1,
        });
      } else {
        seenVideos.add(videoId);
      }
    } catch (e) {
      console.error("[YT-DDP] Error parsing item:", e);
    }
  });

  return { duplicates, totalScanned: items.length };
}

async function executeDeletions(items: any[]) {
  let deletedCount = 0;

  for (const dup of items) {
    const element = document.querySelector(`[data-yt-ddp-id="${dup.id}"]`);
    if (!element) {
      console.warn("[YT-DDP] Could not find element to delete:", dup.id);
      continue;
    }

    try {
      // Find the menu button - broaden selector
      const menuBtn = element.querySelector(
        "yt-icon-button.ytd-menu-renderer button, button[aria-label='Action menu']",
      ) as HTMLElement;
      if (!menuBtn) {
        console.error("[YT-DDP] Action menu button not found for item:", dup.title);
        continue;
      }

      menuBtn.click();

      // Wait for menu to appear
      await new Promise((r) => setTimeout(r, 300));

      // Find "Remove from..." menu item
      const menuItems = Array.from(
        document.querySelectorAll("ytd-menu-service-item-renderer, tp-yt-paper-item"),
      );
      const removeBtn = menuItems.find((el) => {
        const text = el.textContent?.toLowerCase() || "";
        return text.includes("remove from") || text.includes("delete from");
      }) as HTMLElement;

      if (removeBtn) {
        removeBtn.click();
        deletedCount++;
        console.log(`[YT-DDP] Removed: ${dup.title}`);
        chrome.runtime.sendMessage({ action: "DELETE_PROGRESS", count: deletedCount });
      } else {
        console.warn("[YT-DDP] 'Remove' button not found in menu.");
        document.body.click(); // Close menu
      }

      // Human-like delay
      await new Promise((r) => setTimeout(r, 500 + Math.random() * 500));
    } catch (error) {
      console.error("[YT-DDP] Error during deletion step:", error);
    }
  }

  chrome.runtime.sendMessage({ action: "DELETE_COMPLETE" });
}
