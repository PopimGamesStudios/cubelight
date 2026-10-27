import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const buildDir = path.resolve(__dirname, "..", "build");
fs.mkdirSync(buildDir, { recursive: true });

const appIcon = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="top" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e2ff8a"/>
      <stop offset="1" stop-color="#c8ff3d"/>
    </linearGradient>
    <linearGradient id="left" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#a9e62e"/>
      <stop offset="1" stop-color="#6f9f12"/>
    </linearGradient>
    <linearGradient id="right" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#c8ff3d"/>
      <stop offset="1" stop-color="#8fbf1f"/>
    </linearGradient>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="18" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="512" height="512" rx="104" fill="#08090b"/>
  <g opacity="0.5" stroke="#23272e" stroke-width="1">
    <path d="M0 128H512M0 256H512M0 384H512M128 0V512M256 0V512M384 0V512"/>
  </g>
  <circle cx="256" cy="250" r="170" fill="#c8ff3d" opacity="0.08"/>
  <g filter="url(#glow)">
    <polygon points="256,112 392,190 256,268 120,190" fill="url(#top)"/>
    <polygon points="120,190 256,268 256,420 120,342" fill="url(#left)"/>
    <polygon points="392,190 256,268 256,420 392,342" fill="url(#right)"/>
  </g>
  <g fill="none" stroke="#08090b" stroke-width="10" stroke-linejoin="round">
    <polygon points="256,112 392,190 256,268 120,190"/>
    <polygon points="120,190 256,268 256,420 120,342"/>
    <polygon points="392,190 256,268 256,420 392,342"/>
  </g>
  <path d="M256 112V268M120 190L256 268L392 190" stroke="#08090b" stroke-width="8" opacity="0.55"/>
</svg>`;

const trayIcon = `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <polygon points="32,5 57,19 32,33 7,19" fill="#c8ff3d"/>
  <polygon points="7,19 32,33 32,59 7,45" fill="#8fbf1f"/>
  <polygon points="57,19 32,33 32,59 57,45" fill="#a9e62e"/>
  <g fill="none" stroke="#08090b" stroke-width="2.5" stroke-linejoin="round">
    <polygon points="32,5 57,19 32,33 7,19"/>
    <polygon points="7,19 32,33 32,59 7,45"/>
    <polygon points="57,19 32,33 32,59 57,45"/>
  </g>
</svg>`;

const png512 = await sharp(Buffer.from(appIcon)).png().toBuffer();
await sharp(png512).toFile(path.join(buildDir, "icon.png"));
await sharp(Buffer.from(trayIcon)).resize(64, 64).png().toFile(path.join(buildDir, "tray.png"));

// Windows ICO containing PNG frames (Vista+).
const icoSizes = [16, 24, 32, 48, 64, 128, 256];
const frames = [];
for (const size of icoSizes) {
  const data = await sharp(png512).resize(size, size).png().toBuffer();
  frames.push({ size, data });
}
const header = Buffer.alloc(6 + frames.length * 16);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(frames.length, 4);
let offset = header.length;
frames.forEach((frame, index) => {
  const entry = 6 + index * 16;
  header.writeUInt8(frame.size >= 256 ? 0 : frame.size, entry);
  header.writeUInt8(frame.size >= 256 ? 0 : frame.size, entry + 1);
  header.writeUInt8(0, entry + 2);
  header.writeUInt8(0, entry + 3);
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(frame.data.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += frame.data.length;
});
fs.writeFileSync(path.join(buildDir, "icon.ico"), Buffer.concat([header, ...frames.map((f) => f.data)]));

console.log("Generated build/icon.png, build/icon.ico, build/tray.png");
