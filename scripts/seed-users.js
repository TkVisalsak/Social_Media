#!/usr/bin/env node
/**
 * Bulk user seeder — injects up to 10 users from a JSON file.
 *
 * Usage:
 *   node scripts/seed-users.js [path-to-json] [--base-url http://localhost:5001]
 *
 * Defaults:
 *   JSON file  → scripts/sample-users.json
 *   Base URL   → http://localhost:5001
 *
 * Each user entry can have:
 *   email, password, userName          (required for signup)
 *   firstName, lastName, dob, gender,
 *   bio, phoneNumber                   (optional profile info)
 *   hobbies                            (optional array of hobby names)
 *   post.caption                       (optional)
 *   post.photo                         (optional — local file path OR http(s) URL)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── CLI args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const baseUrlFlagIdx = args.indexOf("--base-url");
const BASE_URL =
  baseUrlFlagIdx !== -1 ? args[baseUrlFlagIdx + 1] : "http://localhost:5001";

const jsonArg = args.find((a) => !a.startsWith("--") && a !== args[baseUrlFlagIdx + 1]);
const jsonPath = jsonArg
  ? path.resolve(jsonArg)
  : path.join(__dirname, "sample-users.json");

// ── Helpers ─────────────────────────────────────────────────────────────────
const color = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

function log(symbol, msg) {
  console.log(`  ${symbol} ${msg}`);
}

async function apiPost(endpoint, body, token) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

async function uploadPhoto(endpoint, fileSrc, caption, token) {
  const form = new FormData();
  if (caption) form.append("caption", caption);

  if (fileSrc.startsWith("http://") || fileSrc.startsWith("https://")) {
    // Download from URL then attach as Blob
    const imgRes = await fetch(fileSrc);
    if (!imgRes.ok) throw new Error(`Could not fetch photo from URL: ${fileSrc}`);
    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    const buf = await imgRes.arrayBuffer();
    const ext = contentType.split("/")[1]?.split(";")[0] || "jpg";
    form.append("file", new Blob([buf], { type: contentType }), `photo.${ext}`);
  } else {
    // Local file
    const absPath = path.resolve(fileSrc);
    if (!fs.existsSync(absPath)) throw new Error(`Photo file not found: ${absPath}`);
    const buf = fs.readFileSync(absPath);
    const ext = path.extname(absPath).slice(1).toLowerCase() || "jpg";
    const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    form.append("file", new Blob([buf], { type: mime }), path.basename(absPath));
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return { status: res.status, data: await res.json() };
}

// ── Per-user injection ───────────────────────────────────────────────────────
async function injectUser(user, index) {
  const label = color.bold(`[${index + 1}] ${user.userName || user.email}`);
  console.log(`\n${label}`);

  const results = { signup: null, profile: null, hobbies: null, post: null };

  // 1. Signup
  const { status: s1, data: d1 } = await apiPost("/api/auth/signup", {
    email: user.email,
    userName: user.userName,
    password: user.password,
  });
  results.signup = { status: s1, ok: d1.success };
  if (!d1.success) {
    const hint = d1.message?.toLowerCase().includes("already")
      ? `${d1.message} — change the email/userName in the JSON and retry`
      : d1.message;
    log(color.red("✗"), `Signup failed (${s1}): ${hint}`);
    return results;
  }
  log(color.green("✓"), `Signup OK — userId: ${d1.user._id}`);
  const token = d1.accessToken;

  // 2. Personal info (optional fields)
  const profileFields = ["firstName", "lastName", "dob", "gender", "bio", "phoneNumber"];
  const profileBody = Object.fromEntries(
    profileFields.filter((f) => user[f] !== undefined).map((f) => [f, user[f]])
  );
  if (Object.keys(profileBody).length > 0) {
    const { status: s2, data: d2 } = await apiPost("/api/auth/personal_info", profileBody, token);
    results.profile = { status: s2, ok: d2.success };
    if (d2.success) log(color.green("✓"), "Profile info set");
    else log(color.yellow("⚠"), `Profile info failed (${s2}): ${d2.message}`);
  }

  // 3. Hobbies (optional)
  if (Array.isArray(user.hobbies) && user.hobbies.length > 0) {
    const { status: s3, data: d3 } = await apiPost("/api/hobbies/me", { hobbies: user.hobbies }, token);
    results.hobbies = { status: s3, ok: d3.success };
    if (d3.success) log(color.green("✓"), `Hobbies set: ${d3.hobbies.join(", ") || "(none matched catalog)"}`);
    else log(color.yellow("⚠"), `Hobbies failed (${s3}): ${d3.message}`);
  }

  // 4. Post with photo (optional)
  if (user.post) {
    const { caption, photo } = user.post;
    try {
      let postResult;
      if (photo) {
        postResult = await uploadPhoto("/api/feeds", photo, caption, token);
      } else {
        // Text-only post (no file)
        postResult = await apiPost("/api/feeds", { caption }, token);
      }
      const postOk = postResult.status >= 200 && postResult.status < 300;
      results.post = { status: postResult.status, ok: postOk };
      if (postOk) {
        log(color.green("✓"), `Post created — id: ${postResult.data.data?._id || "ok"}`);
      } else {
        log(color.yellow("⚠"), `Post failed (${postResult.status}): ${postResult.data.message}`);
      }
    } catch (err) {
      results.post = { status: 0, ok: false, error: err.message };
      log(color.red("✗"), `Post error: ${err.message}`);
    }
  }

  return results;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(color.bold("\n=== Social Media User Seeder ==="));
  console.log(`  Base URL : ${color.cyan(BASE_URL)}`);
  console.log(`  JSON file: ${color.cyan(jsonPath)}\n`);

  if (!fs.existsSync(jsonPath)) {
    console.error(color.red(`ERROR: JSON file not found at ${jsonPath}`));
    console.error(`  Run: cp scripts/sample-users.json scripts/my-users.json and edit it.`);
    process.exit(1);
  }

  let users;
  try {
    users = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  } catch (err) {
    console.error(color.red(`ERROR: Invalid JSON — ${err.message}`));
    process.exit(1);
  }

  if (!Array.isArray(users)) {
    console.error(color.red("ERROR: JSON must be an array of user objects."));
    process.exit(1);
  }

  if (users.length > 20) {
    console.warn(color.yellow(`WARNING: Only the first 20 users will be processed (got ${users.length}).`));
    users = users.slice(0, 20);
  }

  const summary = [];
  for (let i = 0; i < users.length; i++) {
    const result = await injectUser(users[i], i);
    summary.push({ user: users[i].userName || users[i].email, ...result });
  }

  // Summary table
  console.log(color.bold("\n── Summary ──────────────────────────────────"));
  for (const s of summary) {
    const steps = [
      s.signup?.ok ? color.green("signup✓") : color.red("signup✗"),
      s.profile ? (s.profile.ok ? color.green("profile✓") : color.yellow("profile⚠")) : null,
      s.hobbies ? (s.hobbies.ok ? color.green("hobbies✓") : color.yellow("hobbies⚠")) : null,
      s.post ? (s.post.ok ? color.green("post✓") : color.yellow("post⚠")) : null,
    ]
      .filter(Boolean)
      .join("  ");
    console.log(`  ${color.bold(s.user.padEnd(20))}  ${steps}`);
  }

  const succeeded = summary.filter((s) => s.signup?.ok).length;
  console.log(
    color.bold(`\n  ${succeeded}/${summary.length} users created successfully.\n`)
  );
}

main().catch((err) => {
  console.error(color.red(`\nFatal error: ${err.message}`));
  process.exit(1);
});
