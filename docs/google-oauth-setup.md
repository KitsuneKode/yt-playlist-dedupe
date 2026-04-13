# Google OAuth Setup For yt-ddp

`yt-ddp` runs locally on your machine. It does not send your playlist data to a hosted `yt-ddp` server, because there is no hosted service involved in the normal CLI flow.

What the OAuth permission is for:

- letting Google know which app is requesting access
- letting you approve that app for your own YouTube account
- letting the CLI read playlist items and optionally remove duplicate playlist entries

## The Short Version

1. Create a Google Cloud project.
2. Enable the YouTube Data API v3.
3. Create `Desktop app` OAuth credentials.
4. Download the client JSON file.
5. Run `yt-ddp setup`.
6. If the JSON file is already in your current directory, just press Enter.
7. Run `yt-ddp "https://www.youtube.com/playlist?list=PLAYLIST_ID"`.

## Why Google Requires This

Google needs two identities for private YouTube access:

- your Google account: who is granting access
- an OAuth app: which app is asking for access

That is why signing into your own account is not enough by itself. Google still requires a client ID for the app making the request.

## Step By Step

### 1. Create or open a Google Cloud project

Open the Google Cloud Console and pick a project for this CLI.

### 2. Enable the YouTube Data API v3

In that project:

- go to `APIs & Services`
- open `Library`
- enable `YouTube Data API v3`

### 3. Configure the OAuth consent screen

Open `Google Auth Platform` or `OAuth consent screen`.

Recommended for local personal use:

- choose `External`
- give the app a simple name like `yt-ddp`
- add your email

### 4. Add yourself as a test user

If the app is in `Testing`, Google will only allow approved test users.

Add the Google account you plan to use with `yt-ddp` as a test user. If you skip this, Google may show:

`Access blocked: <app-name> has not completed the Google verification process`

### 5. Create Desktop app OAuth credentials

Under `Credentials`:

- choose `Create credentials`
- choose `OAuth client ID`
- choose `Desktop app`

Then download the JSON file.

### 6. Run yt-ddp setup

From the directory where you are working:

```bash
yt-ddp setup
```

If the downloaded JSON is already there and named something like `client_secret*.json`, `yt-ddp` should detect it automatically and pressing Enter will accept it.

The CLI stores the normalized OAuth client config and token in:

```text
~/.config/yt-ddp/
```

## Privacy Notes

For the normal local CLI workflow:

- your playlist scan happens locally on your machine
- your OAuth token is stored locally on your machine
- your downloaded client JSON stays local unless you share it

That does **not** mean Google is out of the loop. Google still handles the OAuth login and the YouTube API request authorization. But there is no separate `yt-ddp` backend collecting your playlist data in the local setup flow.

## Common Problems

### “Access blocked: app has not completed the Google verification process”

Usually this means one of these:

- the OAuth app is in `Testing`
- your Google account is not listed as a test user
- you are using someone else's OAuth client and they did not approve your account

Fix:

- add your account as a test user
- or create your own Desktop app OAuth client

### “Authorization was denied or blocked”

If Google returns `access_denied`, check:

- you finished the consent flow in the browser
- the app is not blocked by testing restrictions
- the OAuth client is a `Desktop app` client, not a web client

### “Quota exceeded”

That is a Google API quota issue, not a playlist parsing issue. Wait and try again later, or use a project with available quota.

## Recommended Mental Model

For personal/local use, the safest trust model is:

- use your own Google Cloud project
- use your own Desktop app OAuth client
- keep the CLI local

That way, you are authorizing your own app identity against your own YouTube account.
