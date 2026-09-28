import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ICONS_DIR = path.join(process.cwd(), "public", "icons");
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

// 1. Generate SVG Icon
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#5C0000" />
      <stop offset="100%" stop-color="#3D0000" />
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F6E05E" />
      <stop offset="100%" stop-color="#D69E2E" />
    </linearGradient>
  </defs>

  <!-- Background with subtle institutional rounded shape -->
  <rect width="512" height="512" rx="112" fill="url(#bg)" />
  <rect x="24" y="24" width="464" height="464" rx="92" fill="none" stroke="url(#gold)" stroke-width="6" stroke-opacity="0.4" />

  <!-- Outer Emblem Shield -->
  <path d="M256 72 C336 72 384 100 384 180 C384 310 256 420 256 420 C256 420 128 310 128 180 C128 100 176 72 256 72 Z"
        fill="#FFFFFF" fill-opacity="0.06" stroke="#FFFFFF" stroke-width="4" stroke-opacity="0.3" />

  <!-- Crossed Fork & Spoon with Plate / Dining Motif -->
  <!-- Plate -->
  <circle cx="256" cy="224" r="88" fill="none" stroke="#FFFFFF" stroke-width="10" stroke-opacity="0.9" />
  <circle cx="256" cy="224" r="68" fill="none" stroke="url(#gold)" stroke-width="4" stroke-opacity="0.8" />

  <!-- Fork (Left) -->
  <g transform="translate(256, 224) rotate(-35) translate(-256, -224)">
    <rect x="252" y="152" width="8" height="144" rx="4" fill="#FFFFFF" />
    <path d="M242 152 C242 180 270 180 270 152 L266 152 C266 172 246 172 246 152 Z" fill="#FFFFFF" />
    <line x1="247" y1="152" x2="247" y2="170" stroke="#5C0000" stroke-width="3" stroke-linecap="round" />
    <line x1="256" y1="152" x2="256" y2="170" stroke="#5C0000" stroke-width="3" stroke-linecap="round" />
    <line x1="265" y1="152" x2="265" y2="170" stroke="#5C0000" stroke-width="3" stroke-linecap="round" />
  </g>

  <!-- Spoon (Right) -->
  <g transform="translate(256, 224) rotate(35) translate(-256, -224)">
    <rect x="252" y="152" width="8" height="144" rx="4" fill="#FFFFFF" />
    <ellipse cx="256" cy="162" rx="18" ry="24" fill="#FFFFFF" />
    <ellipse cx="256" cy="164" rx="12" ry="16" fill="#5C0000" />
  </g>

  <!-- Monogram Label: UNSCH -->
  <text x="256" y="370"
        font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
        font-size="34"
        font-weight="800"
        letter-spacing="6"
        fill="#FFFFFF"
        text-anchor="middle">UNSCH</text>

  <!-- Subtext: COMEDOR -->
  <text x="256" y="402"
        font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
        font-size="18"
        font-weight="700"
        letter-spacing="4"
        fill="url(#gold)"
        text-anchor="middle">COMEDOR</text>
</svg>`;

fs.writeFileSync(path.join(ICONS_DIR, "icon.svg"), svgIcon.trim(), "utf8");

// 2. Pure Node PNG Generator
function createPng(width: number, height: number, r: number, g: number, b: number): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }

  function crc32(buf: Buffer): number {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ -1) >>> 0;
  }

  function chunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeAndData = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeAndData), 0);
    return Buffer.concat([len, typeAndData, crc]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const rowSize = 1 + width * 4;
  const raw = Buffer.alloc(rowSize * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.42;
  const innerRadius = width * 0.36;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    raw[rowOffset] = 0; // filter none
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Base: Crimson #5C0000 (92, 0, 0)
      let pr = r;
      let pg = g;
      let pb = b;
      const pa = 255;

      // Rounded border ring
      if (Math.abs(dist - radius) < Math.max(2, width * 0.015)) {
        // Gold accent border
        pr = 246;
        pg = 224;
        pb = 94;
      } else if (Math.abs(dist - innerRadius) < Math.max(1, width * 0.008)) {
        // White inner circle
        pr = 255;
        pg = 255;
        pb = 255;
      }

      raw[pxOffset] = pr;
      raw[pxOffset + 1] = pg;
      raw[pxOffset + 2] = pb;
      raw[pxOffset + 3] = pa;
    }
  }

  const idat = zlib.deflateSync(raw);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// Generate standard PWA icons
const icon192 = createPng(192, 192, 92, 0, 0);
fs.writeFileSync(path.join(ICONS_DIR, "icon-192x192.png"), icon192);

const icon512 = createPng(512, 512, 92, 0, 0);
fs.writeFileSync(path.join(ICONS_DIR, "icon-512x512.png"), icon512);

const appleIcon = createPng(180, 180, 92, 0, 0);
fs.writeFileSync(path.join(ICONS_DIR, "apple-touch-icon.png"), appleIcon);

console.log("PWA Icons successfully generated in public/icons/");
