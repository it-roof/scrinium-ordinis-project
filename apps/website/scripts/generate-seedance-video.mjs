#!/usr/bin/env node
/**
 * Generiert ein Video via BytePlus Dreamina Seedance 2.0 und speichert es unter public/.
 *
 * Usage:
 *   node scripts/generate-seedance-video.mjs --out public/generated/footer.mp4 --prompt "..."
 *   node scripts/generate-seedance-video.mjs --out public/generated/footer.mp4 --prompt "..." --duration 5 --ratio 16:9
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const out = {
    duration: 5,
    ratio: "16:9",
    resolution: "720p",
    watermark: false,
    generateAudio: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") out.out = argv[++i];
    else if (a === "--prompt") out.prompt = argv[++i];
    else if (a === "--duration") out.duration = Number(argv[++i]);
    else if (a === "--ratio") out.ratio = argv[++i];
    else if (a === "--resolution") out.resolution = argv[++i];
    else if (a === "--watermark") out.watermark = true;
    else if (a === "--audio") out.generateAudio = true;
  }
  return out;
}

async function loadEnvLocal() {
  try {
    const raw = await readFile(path.join(root, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // optional
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  await loadEnvLocal();

  const args = parseArgs(process.argv.slice(2));
  if (!args.out || !args.prompt) {
    console.error(
      'Usage: node scripts/generate-seedance-video.mjs --out <path> --prompt "..." [--duration 5] [--ratio 16:9]',
    );
    process.exit(1);
  }

  const apiKey = process.env.BYTEPLUS_ARK_API_KEY;
  const baseUrl = (
    process.env.BYTEPLUS_ARK_BASE_URL ??
    "https://ark.ap-southeast.bytepluses.com/api/v3"
  ).replace(/\/$/, "");
  const model =
    process.env.BYTEPLUS_SEEDANCE_MODEL ?? "dreamina-seedance-2-0-260128";

  if (!apiKey) {
    console.error("BYTEPLUS_ARK_API_KEY fehlt (.env.local)");
    process.exit(1);
  }

  console.log(`Seedance → ${model}`);
  console.log(`Prompt: ${args.prompt.slice(0, 140)}…`);

  const createRes = await fetch(`${baseUrl}/contents/generations/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      content: [{ type: "text", text: args.prompt }],
      generate_audio: args.generateAudio,
      ratio: args.ratio,
      duration: args.duration,
      resolution: args.resolution,
      watermark: args.watermark,
    }),
  });

  const createText = await createRes.text();
  if (!createRes.ok) {
    console.error(`Create ${createRes.status}: ${createText.slice(0, 1000)}`);
    process.exit(1);
  }

  let created;
  try {
    created = JSON.parse(createText);
  } catch {
    console.error("Create-Antwort ist kein JSON:", createText.slice(0, 400));
    process.exit(1);
  }

  const taskId = created.id;
  if (!taskId) {
    console.error("Keine Task-ID:", createText.slice(0, 600));
    process.exit(1);
  }
  console.log(`Task: ${taskId}`);

  let videoUrl;
  for (let i = 0; i < 90; i++) {
    await sleep(4000);
    const pollRes = await fetch(
      `${baseUrl}/contents/generations/tasks/${taskId}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );
    const pollText = await pollRes.text();
    if (!pollRes.ok) {
      console.error(`Poll ${pollRes.status}: ${pollText.slice(0, 600)}`);
      process.exit(1);
    }
    const poll = JSON.parse(pollText);
    const status = poll.status;
    console.log(`  [${i + 1}] ${status}`);
    if (status === "succeeded") {
      videoUrl = poll.content?.video_url;
      break;
    }
    if (status === "failed" || status === "cancelled") {
      console.error("Task fehlgeschlagen:", pollText.slice(0, 800));
      process.exit(1);
    }
  }

  if (!videoUrl) {
    console.error("Timeout — kein video_url");
    process.exit(1);
  }

  console.log("Download…");
  const vidRes = await fetch(videoUrl);
  if (!vidRes.ok) {
    console.error(`Download ${vidRes.status}`);
    process.exit(1);
  }

  const outPath = path.isAbsolute(args.out)
    ? args.out
    : path.join(root, args.out);
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, Buffer.from(await vidRes.arrayBuffer()));
  console.log(`Gespeichert: ${path.relative(root, outPath)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
