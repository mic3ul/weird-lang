import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  jidNormalizedUser
} from "@whiskeysockets/baileys";
import pino from "pino";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";

const logger = pino({ level: process.env.LOG_LEVEL || "info" });
const WEIRD_BIN = path.resolve(process.env.WEIRD_BIN || "../../../../build/weird");
const HANDLER = path.resolve(process.env.WEIRD_HANDLER || "../handler.wrd");
const STATE_DIR = path.resolve(process.env.WEIRD_STATE_DIR || "./auth");
const PREFIX = "!";
const COOLDOWN_MS = 1800;
const lastCommandAt = new Map();

function runWeird(event) {
  return new Promise(async (resolve, reject) => {
    let dir;
    try {
      dir = await mkdtemp(path.join(tmpdir(), "weird-event-"));
      const eventPath = path.join(dir, "event.json");
      await writeFile(eventPath, JSON.stringify(event), { mode: 0o600 });
      const child = spawn(WEIRD_BIN, ["run", HANDLER, eventPath], {
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env }
      });
      const timeout = setTimeout(() => child.kill("SIGKILL"), 8000);
      let stdout = "";
      let stderr = "";
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", chunk => {
        stdout += chunk;
        if (stdout.length > 1024 * 1024) child.kill("SIGKILL");
      });
      child.stderr.on("data", chunk => {
        stderr += chunk;
        if (stderr.length > 256 * 1024) child.kill("SIGKILL");
      });
      child.on("error", error => {
        clearTimeout(timeout);
        reject(error);
      });
      child.on("close", code => {
        clearTimeout(timeout);
        if (code !== 0) return reject(new Error(`WEIRD exited ${code}: ${stderr.slice(0, 500)}`));
        try {
          const line = stdout.trim().split("\n").filter(Boolean).at(-1);
          if (!line) throw new Error("WEIRD returned no JSON output");
          resolve(JSON.parse(line));
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      reject(error);
    } finally {
      if (dir) setTimeout(() => rm(dir, { recursive: true, force: true }).catch(() => {}), 10000);
    }
  });
}

function textOf(message) {
  const m = message?.message;
  if (!m) return "";
  return m.conversation
    || m.extendedTextMessage?.text
    || m.imageMessage?.caption
    || m.videoMessage?.caption
    || m.documentMessage?.caption
    || "";
}

function mentionedJid(message) {
  const m = message?.message;
  const context = m?.extendedTextMessage?.contextInfo
    || m?.imageMessage?.contextInfo
    || m?.videoMessage?.contextInfo;
  return context?.mentionedJid?.[0] ? jidNormalizedUser(context.mentionedJid[0]) : "";
}

function isGroupAdmin(metadata, jid) {
  return metadata?.participants?.some(p => jidNormalizedUser(p.id) === jid && (p.admin === "admin" || p.admin === "superadmin")) ?? false;
}

function isBotAdmin(metadata, botJid) {
  return isGroupAdmin(metadata, botJid);
}

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState(STATE_DIR);
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: true,
    markOnlineOnConnect: false,
    syncFullHistory: false
  });

  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "close") {
      const status = lastDisconnect?.error?.output?.statusCode;
      if (status !== DisconnectReason.loggedOut) start().catch(err => logger.error(err));
      else logger.error("Session logged out; remove local auth state and pair again manually.");
    }
    if (connection === "open") logger.info("WhatsApp connection opened.");
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const message of messages) {
      if (!message?.message || message.key.fromMe) continue;
      const chatId = message.key.remoteJid;
      if (!chatId || chatId === "status@broadcast") continue;
      const text = textOf(message).trim();
      if (!text.startsWith(PREFIX)) continue;

      const sender = jidNormalizedUser(message.key.participant || message.key.remoteJid);
      const isGroup = chatId.endsWith("@g.us");
      const now = Date.now();
      const cooldownKey = `${chatId}:${sender}`;
      if (now - (lastCommandAt.get(cooldownKey) || 0) < COOLDOWN_MS) continue;
      lastCommandAt.set(cooldownKey, now);

      try {
        let metadata = null;
        if (isGroup) metadata = await sock.groupMetadata(chatId);
        const botJid = jidNormalizedUser(sock.user?.id || "");
        const context = {
          text,
          sender,
          chatId,
          isGroup,
          isAdmin: isGroupAdmin(metadata, sender),
          isBotAdmin: isGroup && isBotAdmin(metadata, botJid),
          mentionedJid: mentionedJid(message),
          participants: (metadata?.participants || []).map(p => jidNormalizedUser(p.id)),
          subject: metadata?.subject || ""
        };
        const output = await runWeird(context);
        const action = String(output?.action || "none");

        if (action === "none") {
          if (output?.reply) {
            await sock.sendMessage(chatId, { text: String(output.reply).slice(0, 4000) }, { quoted: message });
          }
          continue;
        }

        if (!isGroup || !context.isAdmin || !context.isBotAdmin) {
          await sock.sendMessage(chatId, { text: "Action denied: admin permissions changed or are missing." }, { quoted: message });
          continue;
        }

        if (action === "tagall") {
          const ids = context.participants.slice(0, 256);
          const mentions = ids.length ? ids.map(id => `@${id.split("@")[0]}`).join(" ") : "";
          await sock.sendMessage(chatId, { text: mentions || "No participants found.", mentions: ids }, { quoted: message });
          continue;
        }

        if (["kick", "promote", "demote"].includes(action)) {
          const target = jidNormalizedUser(String(output.target || ""));
          if (!target || !context.participants.includes(target) || target === botJid || target === sender) {
            await sock.sendMessage(chatId, { text: "Invalid target. Mention a different current group member." }, { quoted: message });
            continue;
          }
          const operation = { kick: "remove", promote: "promote", demote: "demote" }[action];
          await sock.groupParticipantsUpdate(chatId, [target], operation);
          if (output?.reply) {
            await sock.sendMessage(chatId, { text: String(output.reply).slice(0, 4000) }, { quoted: message });
          }
          continue;
        }

        logger.warn({ action, chatId }, "Ignored unsupported WEIRD action");
      } catch (error) {
        logger.error({ err: error }, "Command processing failed");
        await sock.sendMessage(chatId, { text: "Command failed. Check the bot logs." }, { quoted: message }).catch(() => {});
      }
    }
  });
}

start().catch(error => {
  logger.error(error);
  process.exitCode = 1;
});
