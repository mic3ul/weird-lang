# WEIRD WhatsApp Bot Prototype

This directory contains the first WEIRD-side command-policy prototype. The WhatsApp connection is intentionally separated into the Node.js adapter under `bridge/`; command decisions are returned as JSON from `handler.wrd`.

## Current command policy

- `!ping` and `!menu`
- `!groupinfo` (initial placeholder response)
- `!tagall` (group admins only; adapter supplies participant list)
- `!kick @mention`, `!promote @mention`, and `!demote @mention` (group admins and bot-admin status required)

The handler expects normalized event JSON fields: `text`, `sender`, `isGroup`, `isAdmin`, `isBotAdmin`, and `mentionedJid`. The adapter must validate the target and permissions against current group metadata before carrying out any action.

## Important status

This is a development prototype, not a production-ready bot. The current public repository still needs the WEIRD 0.6.0 interpreter source and automated runtime tests before this script can be claimed as executable. WhatsApp support depends on the adapter and the account/session being used. Baileys is an unofficial WhatsApp Web integration and can be affected by upstream changes or account restrictions.

Never commit `creds.json`, auth state, session directories, API keys, or personal message exports.


## Run the handler integration tests

After building the WEIRD 0.6.0 interpreter at the repository root:

```sh
python3 examples/whatsapp-bot/tests/test_handler.py
```

Set `WEIRD_BIN=/absolute/path/to/weird` to test against a different build. These tests exercise the WEIRD command policy only; they do not establish that a WhatsApp account can connect or that server-side group actions succeed.
