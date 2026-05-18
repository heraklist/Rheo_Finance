#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

function parseArgs() {
  const args = {};
  for (let index = 2; index < process.argv.length; index += 2) {
    const key = process.argv[index]?.replace(/^--/, "");
    const value = process.argv[index + 1];
    if (key) args[key] = value;
  }
  return args;
}

function requireArg(args, key) {
  const value = args[key];
  if (!value) {
    console.error(`Missing required arg: --${key}`);
    process.exit(1);
  }
  return value;
}

const args = parseArgs();
const version = requireArg(args, "version");
const notes = requireArg(args, "notes");
const windowsPackage = requireArg(args, "windows-package");
const windowsSignature = requireArg(args, "windows-signature");
const androidApk = requireArg(args, "android-apk");
const releaseUrl = requireArg(args, "release-url");
const output = requireArg(args, "output");

for (const path of [windowsPackage, windowsSignature, androidApk]) {
  if (!existsSync(path)) {
    console.error(`File does not exist: ${path}`);
    process.exit(1);
  }
}

const signature = readFileSync(windowsSignature, "utf8").trim();
const pubDate = new Date().toISOString();

function releaseAssetName(filePath) {
  // softprops/action-gh-release normalizes spaces in uploaded asset names to dots.
  return basename(filePath).replaceAll(" ", ".");
}

const desktopManifest = {
  version,
  notes,
  pub_date: pubDate,
  platforms: {
    "windows-x86_64": {
      signature,
      url: `${releaseUrl}/${releaseAssetName(windowsPackage)}`,
    },
  },
};

const androidManifest = {
  version,
  pub_date: pubDate,
  notes,
  url: `${releaseUrl}/${releaseAssetName(androidApk)}`,
};

writeFileSync(join(output, "latest-desktop.json"), `${JSON.stringify(desktopManifest, null, 2)}\n`);
writeFileSync(join(output, "latest.json"), `${JSON.stringify(desktopManifest, null, 2)}\n`);
writeFileSync(join(output, "latest-android.json"), `${JSON.stringify(androidManifest, null, 2)}\n`);

console.log("Wrote latest-desktop.json");
console.log("Wrote latest.json");
console.log("Wrote latest-android.json");
