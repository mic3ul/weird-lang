#!/usr/bin/env node
import { Bot, InputFile } from "grammy";
import youtubedl from "yt-dlp-exec";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile, readdir, stat, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is required.");
  process.exit(2);
}
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "../../..");
const WEIRD_BIN = path.resolve(process.env.WEIRD_BIN || path.join(REPO_ROOT, "build/weird"));
const HANDLER = path.resolve(process.env.WEIRD_HANDLER || path.join(HERE, "handler.wrd"));
const MAX_UPLOAD_BYTES = 45 * 1024 * 1024;
const bot = new Bot(token);
const busy = new Set();

function validateYoutubeUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error("Invalid URL."); }
  const hosts = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be", "www.youtu.be"]);
  if (url.protocol !== "https:" || !hosts.has(url.hostname.toLowerCase())) {
    throw new Error("Only HTTPS YouTube URLs are supported.");
  }
  return url.toString();
}

async function runWeird(event) {
  const dir = await mkdtemp(path.join(tmpdir(), "weird-telegram-"));
  try {
    const eventFile = path.join(dir, "event.json");
    await writeFile(eventFile, JSON.stringify(event), { mode: 0o600 });
    return await new Promise((resolve, reject) => {
      const child = spawn(WEIRD_BIN, ["run", HANDLER, eventFile], {
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env }
      });
      let stdout = "";
      let stderr = "";
      const timer = setTimeout(() => child.kill("SIGKILL"), 8000);
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
      child.on("error", error => { clearTimeout(timer); reject(error); });
      child.on("close", code => {
        clearTimeout(timer);
        if (code !== 0) return reject(new Error(`WEIRD exited ${code}: ${stderr.slice(0, 300)}`));
        try {
          const line = stdout.trim().split("\n").filter(Boolean).at(-1);
          if (!line) throw new Error("WEIRD returned no response.");
          resolve(JSON.parse(line));
        } catch (error) { reject(error); }
      });
    });
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

async function videoInfo(url) {
  const raw = await youtubedl(url, {
    dumpSingleJson: true,
    noWarnings: true,
    noPlaylist: true,
    skipDownload: true,
    socketTimeout: 15
  });
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

bot.command("start", async ctx => {
  await ctx.reply("WEIRD YouTube bot is ready. Use /info <URL> or /download <URL>.");
});

bot.on("message:text", async ctx => {
  const key = String(ctx.chat.id);
  if (busy.has(key)) {
    await ctx.reply("A request is already running in this chat. Try again shortly.");
    return;
  }
  busy.add(key);
  try {
    const decision = await runWeird({
      text: ctx.message.text,
      chatId: key,
      userId: String(ctx.from.id)
    });
    if (decision.action === "reply") {
      await ctx.reply(String(decision.reply || "Unsupported command.").slice(0, 3500));
      return;
    }
    const url = validateYoutubeUrl(String(decision.url || ""));
    await ctx.reply("Fetching video information…");
    const info = await videoInfo(url);
    if (decision.action === "info") {
      const duration = Number.isFinite(info.duration) ? `${Math.floor(info.duration / 60)}:${String(Math.floor(info.duration % 60)).padStart(2, "0")}` : "unknown";
      await ctx.reply(`Title: ${String(info.title || "Unknown").slice(0, 700)}\nChannel: ${String(info.uploader || "Unknown").slice(0, 300)}\nDuration: ${duration}\nURL: ${url}`);
      return;
    }
    if (decision.action !== "download") {
      await ctx.reply("Unsupported action.");
      return;
    }
    await ctx.reply("Downloading. The file must be legally downloadable and smaller than 45 MiB.");
    const dir = await mkdtemp(path.join(tmpdir(), "weird-youtube-"));
    try {
      const template = path.join(dir, "%(id)s.%(ext)s");
      await youtubedl(url, {
        format: "best[ext=mp4][height<=720][filesize<45000000]/best[filesize<45000000]",
        output: template,
        noWarnings: true,
        noPlaylist: true,
        maxFilesize: "45M",
        socketTimeout: 20,
        retries: 1
      });
      const files = (await readdir(dir)).filter(name => !name.endsWith(".part") && !name.endsWith(".ytdl"));
      if (files.length !== 1) throw new Error("Could not identify a single completed video file.");
      const filePath = path.join(dir, files[0]);
      const details = await stat(filePath);
      if (!details.isFile() || details.size > MAX_UPLOAD_BYTES) {
        throw new Error("The video exceeds Telegram's upload limit.");
      }
      await ctx.replyWithVideo(new InputFile(filePath), { caption: String(info.title || "YouTube video").slice(0, 900) });
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  } catch (error) {
    console.error("Request failed:", error?.stack || error);
    await ctx.reply("Request failed. The video may be unavailable, too large, or not downloadable. Check the bot logs.");
  } finally {
    busy.delete(key);
  }
});

bot.catch(error => console.error("Telegram update failed:", error));
bot.start();
console.log("WEIRD YouTube bot started.");
