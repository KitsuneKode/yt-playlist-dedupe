import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.config";
import path from "node:path";

const fixCrxPlugin = () => {
  return {
    name: "fix-crx-plugin",
    options(options: any) {
      if (options && typeof options === "object" && "platform" in options) {
        delete options.platform;
      }
      return options;
    },
  };
};

export default defineConfig({
  plugins: [tailwindcss(), react(), crx({ manifest }), fixCrxPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: `dist/${process.env.TARGET_BROWSER || "chrome"}`,
  },
});
