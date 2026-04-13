# Publishing and Testing the Extension

This guide provides step-by-step instructions on how to test the extension locally during development and how to publish it to the official browser extension stores.

## 🧪 Testing Locally (Developer Mode)

Before publishing, you should always test the built extension locally to ensure it works as expected.

### Step 1: Build the Extension
First, generate the production-ready builds for both browsers from the root of the monorepo:

```bash
bun run build
```
This will create two folders:
- `apps/extension/dist/chrome`
- `apps/extension/dist/firefox`

### Step 2: Load into Google Chrome (or Edge/Brave/Arc)
1. Open Chrome and navigate to `chrome://extensions` in your URL bar.
2. In the top-right corner, toggle on **Developer mode**.
3. Click the **Load unpacked** button that appears in the top-left.
4. Select the `apps/extension/dist/chrome` directory on your machine.
5. The extension is now installed! Pin it to your toolbar, navigate to a YouTube playlist, and click the icon to test it.

### Step 3: Load into Mozilla Firefox
1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox` in your URL bar.
2. Click the **Load Temporary Add-on...** button.
3. Navigate to the `apps/extension/dist/firefox` directory and select the `manifest.json` file inside it.
4. The extension is now installed for your current session! It will appear in your toolbar.
*Note: Temporary add-ons in Firefox are automatically removed when you close the browser.*

---

## 🚀 Publishing to the Stores

When you are ready to release the extension to the public, follow these steps.

### Step 1: Create the Zip Archives
Store dashboards require you to upload a compressed `.zip` file of your extension.

**For Chrome:**
1. Navigate into the Chrome build directory: `cd apps/extension/dist/chrome`
2. Select **all files and folders** inside this directory (do not just zip the `chrome` folder itself).
3. Compress them into a zip file named `yt-dedupe-chrome.zip`.

**For Firefox:**
1. Navigate into the Firefox build directory: `cd apps/extension/dist/firefox`
2. Select **all files and folders** inside this directory.
3. Compress them into a zip file named `yt-dedupe-firefox.zip`.

### Step 2: Publish to the Chrome Web Store
1. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/).
2. Pay the one-time $5 developer registration fee (if you haven't already).
3. Click the **New Item** button in the top right.
4. Upload your `yt-dedupe-chrome.zip` file.
5. Fill out the Store Listing:
   - Add a description (you can use the copy from the landing page).
   - Upload your Store Icons (128x128), Promotional Marquees (1400x560), and Screenshots.
   - Justify your permissions (`activeTab` and `scripting` are needed to read the YouTube DOM and execute the deletion clicks).
6. Submit for review! (Reviews typically take 1-3 days).

### Step 3: Publish to Mozilla Firefox Add-ons
1. Go to the [Firefox Add-on Developer Hub](https://addons.mozilla.org/en-US/developers/).
2. Create a developer account.
3. Click **Submit a New Add-on** and select **On this site** (for public listing).
4. Upload your `yt-dedupe-firefox.zip` file. 
   - *Note: The Mozilla automated validator will scan it. Because we correctly injected the `gecko.id` into the manifest via our Turborepo build process, it will pass automatically.*
5. Complete the Store Listing details (description, images, etc.).
6. Submit for review!
