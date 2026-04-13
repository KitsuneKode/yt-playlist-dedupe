// YouTube Playlist Dedupe - DevTools Script
// Paste this into your browser's Developer Tools Console while on your playlist page.

(async function () {
  console.log(
    "%c YouTube Playlist Dedupe - Native Extension Prototype",
    "color: #ff0000; font-size: 20px; font-weight: bold;",
  );
  console.log("Scanning DOM for duplicates...");

  // 1. Gather all video items currently rendered on the page
  // YouTube dynamically loads items, so you must scroll to the bottom first.
  const items = Array.from(document.querySelectorAll("ytd-playlist-video-renderer"));

  const seenVideos = new Set();
  const duplicates = [];

  for (const item of items) {
    // Extract the actual video ID from the thumbnail link
    const anchor = item.querySelector("a#thumbnail");
    if (!anchor) continue;

    const urlParams = new URLSearchParams(anchor.href.split("?")[1]);
    const videoId = urlParams.get("v");

    if (!videoId) continue;

    if (seenVideos.has(videoId)) {
      duplicates.push(item);
    } else {
      seenVideos.add(videoId);
    }
  }

  console.log(`Found ${items.length} total items rendered.`);
  console.log(`Found ${duplicates.length} duplicates.`);

  if (duplicates.length === 0) {
    console.log(
      "%c No duplicates found. (Did you scroll to the bottom of the playlist?)",
      "color: #00ff00",
    );
    return;
  }

  if (!confirm(`Found ${duplicates.length} duplicates. Do you want to natively delete them now?`)) {
    return;
  }

  console.log("Starting deletion...");
  let deletedCount = 0;

  // 2. Perform Native UI Deletions
  // We simulate clicks on the 3-dot menu and the "Remove from [Playlist]" button.
  for (const duplicate of duplicates) {
    try {
      // Click the action menu button (3 vertical dots)
      const menuBtn = duplicate.querySelector("yt-icon-button.ytd-menu-renderer button");
      if (!menuBtn) {
        console.warn("Could not find action menu for an item.");
        continue;
      }
      menuBtn.click();

      // Wait for the popup menu to render in the DOM
      await new Promise((r) => setTimeout(r, 250));

      // Find the "Remove from..." menu item.
      // It has a specific icon or text. The safest way is to check the text content.
      const menuItems = Array.from(document.querySelectorAll("ytd-menu-service-item-renderer"));
      const removeBtn = menuItems.find((el) =>
        el.textContent.toLowerCase().includes("remove from"),
      );

      if (removeBtn) {
        removeBtn.click();
        console.log(`Deleted item ${++deletedCount} of ${duplicates.length}`);
      } else {
        console.warn("Could not find 'Remove from' button in the menu. Skipping.");
        // Close the menu if we couldn't find the button to prevent DOM clutter
        document.body.click();
      }

      // Wait a moment between deletions to avoid aggressive rate-limiting by YouTube's servers
      await new Promise((r) => setTimeout(r, 600));
    } catch (error) {
      console.error("Error deleting an item:", error);
    }
  }

  console.log(
    `%c Deletion complete! Removed ${deletedCount} items.`,
    "color: #00ff00; font-size: 16px;",
  );
  console.log("Note: You may need to refresh the page to see the final state.");
})();
