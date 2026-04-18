import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest((_env) => {
  const isFirefox = process.env.TARGET_BROWSER === "firefox";

  return {
    manifest_version: 3,
    name: "YouTube Playlist Deduplicator",
    short_name: "YT Dedupe",
    description:
      "Instantly scan and remove duplicate videos from your YouTube playlists natively in your browser.",
    homepage_url: "https://yt-ddp.kitsunelabs.xyz",
    version: "1.0.0",
    action: {
      default_popup: "src/popup/index.html",
      default_icon: {
        "16": "icon16.png",
        "32": "icon32.png",
        "48": "icon48.png",
        "128": "icon128.png",
      },
    },
    icons: {
      "16": "icon16.png",
      "32": "icon32.png",
      "48": "icon48.png",
      "128": "icon128.png",
    },
    permissions: ["activeTab", "scripting"],
    host_permissions: ["*://*.youtube.com/*"],
    content_scripts: [
      {
        matches: ["*://*.youtube.com/*"],
        js: ["src/content/index.ts"],
        run_at: "document_idle",
      },
    ],
    ...(isFirefox && {
      browser_specific_settings: {
        gecko: {
          id: "yt-dedupe@kitsunekode.com",
          strict_min_version: "109.0",
        },
      },
    }),
  };
});
