// YouTube Playlist Dedupe - Native Extension Content Script

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "SCAN_DOM") {
    const results = scanForDuplicates();
    sendResponse(results);
    return true; // Async response not needed for scan, but good practice
  }

  if (request.action === "EXECUTE_DELETE") {
    executeDeletions(request.items)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true; // Keep message channel open for async response
  }
});

function scanForDuplicates() {
  const items = Array.from(document.querySelectorAll("ytd-playlist-video-renderer"));

  const seenVideos = new Set();
  const duplicates: any[] = [];

  items.forEach((item, index) => {
    const anchor = item.querySelector("a#thumbnail") as HTMLAnchorElement;
    if (!anchor) return;

    try {
      const url = new URL(anchor.href);
      const videoId = url.searchParams.get("v");

      if (!videoId) return;

      const titleEl = item.querySelector("#video-title") as HTMLElement;
      const title = titleEl ? titleEl.textContent?.trim() || "Unknown Title" : "Unknown Title";

      if (seenVideos.has(videoId)) {
        // Mark DOM element with a data attribute so we can find it again later
        const uniqueId = `dup_${videoId}_${index}`;
        item.setAttribute("data-yt-ddp-id", uniqueId);

        duplicates.push({
          id: uniqueId,
          videoId,
          title,
          index: index + 1, // 1-based index for UI
        });
      } else {
        seenVideos.add(videoId);
      }
    } catch {
      // Ignore URL parsing errors
    }
  });

  return { duplicates, totalScanned: items.length };
}

async function executeDeletions(items: any[]) {
  let deletedCount = 0;

  for (const dup of items) {
    const element = document.querySelector(
      `ytd-playlist-video-renderer[data-yt-ddp-id="${dup.id}"]`,
    );
    if (!element) {
      console.warn("Could not find element to delete:", dup);
      continue;
    }

    try {
      // 1. Click the action menu button (3 vertical dots)
      const menuBtn = element.querySelector(
        "yt-icon-button.ytd-menu-renderer button",
      ) as HTMLElement;
      if (!menuBtn) continue;

      menuBtn.click();

      // Wait for popup menu to render
      await new Promise((r) => setTimeout(r, Math.random() * 200 + 200));

      // 2. Find and click "Remove from..."
      const menuItems = Array.from(document.querySelectorAll("ytd-menu-service-item-renderer"));
      const removeBtn = menuItems.find((el) =>
        el.textContent?.toLowerCase().includes("remove from"),
      ) as HTMLElement;

      if (removeBtn) {
        removeBtn.click();
        deletedCount++;
        chrome.runtime.sendMessage({ action: "DELETE_PROGRESS", count: deletedCount });
      } else {
        // Close menu
        document.body.click();
      }

      // Add jitter delay between deletions to avoid rate limiting
      await new Promise((r) => setTimeout(r, Math.random() * 400 + 600));
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  }

  chrome.runtime.sendMessage({ action: "DELETE_COMPLETE" });
}
