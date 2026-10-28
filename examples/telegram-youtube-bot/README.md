# WEIRD Telegram YouTube Bot

A prototype Telegram bot whose command routing lives in WEIRD and whose transport/media integration uses Node.js libraries: grammY and yt-dlp-exec.

## Features

- `/start` and `/help` help text.
- `/info <YouTube URL>` shows title, channel, duration, and URL.
- `/download <YouTube URL>` attempts to download a single video and send it if the file is below 45 MiB.
- Only HTTPS YouTube and youtu.be hostnames are accepted.
- Per-chat request lock, bounded WEIRD subprocess output, timeout, temporary directory cleanup, and file-size checks.

## Requirements

- A compiled WEIRD runtime at `build/weird`, or set `WEIRD_BIN` to its absolute path.
- Node.js 20+, npm, and a Telegram bot token from BotFather.
- A working yt-dlp executable supported by the installed `yt-dlp-exec` package.

## Run

From this directory:

```sh
npm install
npm run check
export TELEGRAM_BOT_TOKEN="your-token"
# Optional if the runtime is not at the expected repository path:
# export WEIRD_BIN="/absolute/path/to/build/weird"
npm start
```

Never put a real bot token in source control or share it in chat. Use a dedicated test bot first.

## Important limitations

- The complete WEIRD C runtime source has not yet been committed to this GitHub repository. This example will not run from this checkout until the source tree is restored and built.
- The adapter and dependency versions have not been tested against a live Telegram account in this environment.
- Download only videos you own or are authorized to download, and respect copyright and YouTube's terms. This bot does not bypass DRM or access controls.
- Telegram upload limits can vary by API setup. The bot uses a conservative 45 MiB cap and may fail when a source cannot be downloaded or remuxed.
- yt-dlp and third-party site extraction can break when YouTube changes its service.
- This is a prototype, not a production-ready hosted service. Add deployment supervision, abuse controls, logging policy, and current dependency/security reviews before public release.
