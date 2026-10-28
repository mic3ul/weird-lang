# WEIRD WhatsApp Bot Architecture

## Goal

Write the bot's command and business logic in WEIRD while keeping the messaging transport replaceable. WhatsApp connectivity is not a built-in WEIRD feature in the 0.6.0 baseline.

## Proposed components

1. **Transport adapter** — receives message/group events and sends text/media through the selected API or library.
2. **Event envelope** — normalized fields: event ID, chat/group ID, sender ID, message type, timestamp, sender role snapshot, and content metadata.
3. **WEIRD command engine** — prefix/alias parsing, command registry, argument validation, help/menu output, and business rules.
4. **Permission policy** — deny by default for moderation actions; require the requester to be a group admin and the bot to have the necessary capability.
5. **Services** — configuration, per-group settings, persistent storage, logging, cooldowns, and bounded media processing.
6. **Response adapter** — translates validated WEIRD results into transport operations.

## Initial command families

- General: help/menu, ping, status, uptime, version.
- Configuration: prefix, language, welcome settings, anti-link policy, logging policy.
- Moderation: warn, mute/restrict, kick/remove, promote/demote, group description/settings — only if the transport supports the action and the bot has permission.
- Utility: quote/reply, polls, text formatting, URL metadata, media information.
- Safety: rate limits, per-command cooldowns, duplicate-event protection, audit log, safe error responses.

These are proposed commands, not implemented capabilities.

## Event contract

The adapter should send a JSON object with a versioned schema. Keep identifiers as strings and include a unique event ID for deduplication. Do not pass raw library objects into the language runtime.

Example conceptual envelope:

```json
{
  "schema_version": 1,
  "event_id": "unique-event-id",
  "kind": "message",
  "chat": {"id": "group-id", "is_group": true},
  "sender": {"id": "user-id", "is_admin": false},
  "message": {"id": "message-id", "type": "text", "text": ".ping"}
}
```

## Security requirements

- Keep credentials and session state outside source control.
- Validate all IDs, arguments, message lengths, and file paths.
- Apply least privilege and explicit admin checks before destructive group actions.
- Rate-limit commands and protect against event replay/duplicates.
- Enforce media byte limits, MIME/signature checks, network timeouts, and cleanup of temporary files.
- Do not scrape private data or bypass platform restrictions.
- Test with a dedicated test group and non-production account before enabling moderation commands.

## Integration choice

Use the official WhatsApp Business Platform when its supported capabilities match the project. Community WhatsApp Web-compatible libraries may expose different functionality and have account, reliability, and policy risks. Verify current upstream documentation before selecting one. Do not promise group administration features until proven against the chosen integration.
