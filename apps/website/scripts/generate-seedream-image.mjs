#!/usr/bin/env node
/**
 * Generiert ein Bild via BytePlus Seedream 5.0 Pro und speichert es unter public/.
 *
 * Usage:
 *   node scripts/generate-seedream-image.mjs --out public/generated/hero.png --prompt "..."
 *   node scripts/generate-seedream-image.mjs --out public/generated/hero.png --prompt "..." --size 2K
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const out = { size: "2K", watermark: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") out.out = argv[++i];
    else if (a === "--prompt") out.prompt = argv[++i];
    else if (a === "--size") out.size = argv[++i];
    else if (a === "--watermark") out.watermark = true;
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

async function main() {
  await loadEnvLocal();

  const args = parseArgs(process.argv.slice(2));
  if (!args.out || !args.prompt) {
    console.error(
      "Usage: node scripts/generate-seedream-image.mjs --out <path> --prompt \"...\" [--size 2K]",
    );
    process.exit(1);
  }

  const apiKey = process.env.BYTEPLUS_ARK_API_KEY;
  const baseUrl = (
    process.env.BYTEPLUS_ARK_BASE_URL ??
    "https://ark.ap-southeast.bytepluses.com/api/v3"
  ).replace(/\/$/, "");
  const model =
    process.env.BYTEPLUS_SEEDREAM_MODEL ?? "dola-seedream-5-0-pro-260628";

  if (!apiKey) {
    console.error("BYTEPLUS_ARK_API_KEY fehlt (.env.local)");
    process.exit(1);
  }

  const endpoint = `${baseUrl}/images/generations`;
  console.log(`Seedream → ${model}`);
  console.log(`Prompt: ${args.prompt.slice(0, 120)}…`);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt: args.prompt,
      size: args.size,
      response_format: "b64_json",
      output_format: "png",
      watermark: args.watermark,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error(`API ${res.status}: ${text.slice(0, 800)}`);
    process.exit(1);
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    console.error("Antwort ist kein JSON:", text.slice(0, 400));
    process.exit(1);
  }

  const item = json?.data?.[0];
  if (!item) {
    console.error("Keine data[0] in Antwort:", JSON.stringify(json).slice(0, 600));
    process.exit(1);
  }

  const outPath = path.isAbsolute(args.out)
    ? args.out
    : path.join(root, args.out);
  await mkdir(path.dirname(outPath), { recursive: true });

  if (item.b64_json) {
    await writeFile(outPath, Buffer.from(item.b64_json, "base64"));
  } else if (item.url) {
    const imgRes = await fetch(item.url);
    if (!imgRes.ok) {
      console.error(`Download fehlgeschlagen: ${imgRes.status}`);
      process.exit(1);
    }
    await writeFile(outPath, Buffer.from(await imgRes.arrayBuffer()));
  } else {
    console.error("Weder b64_json noch url in data[0]");
    process.exit(1);
  }

  console.log(`Gespeichert: ${path.relative(root, outPath)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
