#!/usr/bin/env python3
"""Integration tests for handler.wrd; run after building WEIRD 0.6.0."""
import json
import os
import pathlib
import subprocess
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[4]
HANDLER = ROOT / "examples" / "whatsapp-bot" / "handler.wrd"
WEIRD = pathlib.Path(os.environ.get("WEIRD_BIN", ROOT / "build" / "weird"))


def run_handler(event):
    with tempfile.TemporaryDirectory(prefix="weird-bot-test-") as directory:
        event_path = pathlib.Path(directory) / "event.json"
        event_path.write_text(json.dumps(event), encoding="utf-8")
        result = subprocess.run(
            [str(WEIRD), "run", str(HANDLER), str(event_path)],
            check=True,
            capture_output=True,
            text=True,
            timeout=8,
        )
        return json.loads(result.stdout.strip().splitlines()[-1])


def event(text, **overrides):
    base = {
        "text": text,
        "sender": "100@s.whatsapp.net",
        "chatId": "chat@s.whatsapp.net",
        "isGroup": False,
        "isAdmin": False,
        "isBotAdmin": False,
        "mentionedJid": "",
        "participants": [],
        "subject": "",
    }
    base.update(overrides)
    return base


class HandlerTests(unittest.TestCase):
    def test_ping(self):
        self.assertEqual(run_handler(event("!ping"))["reply"], "Pong.")

    def test_non_group_admin_action_is_denied(self):
        result = run_handler(event(
            "!kick @member",
            isGroup=True,
            isAdmin=False,
            isBotAdmin=True,
            mentionedJid="200@s.whatsapp.net",
        ))
        self.assertIn("Only group admins", result["reply"])
        self.assertEqual(result["action"], "none")

    def test_action_requires_bot_admin(self):
        result = run_handler(event(
            "!kick @member",
            isGroup=True,
            isAdmin=True,
            isBotAdmin=False,
            mentionedJid="200@s.whatsapp.net",
        ))
        self.assertIn("must be a group admin", result["reply"])
        self.assertEqual(result["action"], "none")

    def test_valid_kick_returns_action(self):
        result = run_handler(event(
            "!kick @member",
            isGroup=True,
            isAdmin=True,
            isBotAdmin=True,
            mentionedJid="200@s.whatsapp.net",
        ))
        self.assertEqual(result["action"], "kick")
        self.assertEqual(result["target"], "200@s.whatsapp.net")

    def test_self_target_is_denied(self):
        result = run_handler(event(
            "!kick @self",
            isGroup=True,
            isAdmin=True,
            isBotAdmin=True,
            mentionedJid="100@s.whatsapp.net",
        ))
        self.assertEqual(result["action"], "none")
        self.assertIn("cannot target yourself", result["reply"])


if __name__ == "__main__":
    if not WEIRD.is_file():
        raise SystemExit(f"WEIRD executable not found: {WEIRD}")
    unittest.main(verbosity=2)
