import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Minimal compliant PNG generator in pure Node.js (no external canvas/sharp dependencies required)
function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[i] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(4 + 4 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const crcTarget = buf.subarray(4, 8 + len);
  const crcVal = crc32(crcTarget);
  buf.writeUInt32BE(crcVal, 8 + len);
  return buf;
}

// Function to check if point (nx, ny) in normalized [-1, 1] is inside a Spade ♠️
function isInsideSpade(nx, ny) {
  // Translate center: top apex at (0, -0.65), bottom waist at y = 0.25, stem down to 0.55
  if (ny > 0.18 && ny <= 0.52) {
    // Stem check (narrow triangular base)
    const stemWidth = 0.08 + (ny - 0.18) * 0.45;
    if (Math.abs(nx) <= stemWidth) return 2; // Stem
  }

  // Spade main heart-inverted lobes
  // Shift y: apex at top (y = -0.55), lobes around y = 0.05
  const py = ny + 0.15; // now center is around py = 0
  if (py >= -0.70 && py <= 0.35) {
    // Top triangle tapering to apex
    const apexDist = Math.abs(nx) - (py + 0.70) * 0.75;
    
    // Bottom two circular lobes
    const r1x = nx - 0.22, r1y = py - 0.08;
    const r2x = nx + 0.22, r2y = py - 0.08;
    const inLobe1 = (r1x * r1x + r1y * r1y) <= 0.08;
    const inLobe2 = (r2x * r2x + r2y * r2y) <= 0.08;

    if (inLobe1 || inLobe2 || (apexDist <= 0 && py <= 0.25)) {
      return 1; // Main spade body
    }
  }
  return 0;
}

function generateSpadePngBuffer(width, height, options = {}) {
  const { isMaskable = false, isForeground = false } = options;
  const rowBytes = width * 4 + 1; // filter byte (0) + RGBA per pixel
  const rawData = Buffer.alloc(rowBytes * height);

  const cx = width / 2;
  const cy = height / 2;
  const outerRadius = width * (isMaskable ? 0.49 : 0.46);
  const feltRadius = width * 0.40;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // Filter type: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let r = 0, g = 0, b = 0, a = 0;

      if (isForeground) {
        // Transparent background for adaptive icon foreground
        r = 0; g = 0; b = 0; a = 0;
      } else {
        // Base dark navy background
        const diag = (x + y) / (width + height);
        r = Math.floor(10 + diag * 15);
        g = Math.floor(18 + diag * 20);
        b = Math.floor(32 + diag * 25);
        a = 255;

        // Outer Gold / Green Felt Board
        if (dist <= outerRadius) {
          if (dist > outerRadius - width * 0.025) {
            // Gold Outer Ring
            r = 234; g = 179; b = 8;
          } else if (dist <= feltRadius) {
            // Deep emerald green felt
            const f = dist / feltRadius;
            r = Math.floor(6 + (1 - f) * 12);
            g = Math.floor(58 + (1 - f) * 45);
            b = Math.floor(36 + (1 - f) * 20);

            // Subtle gold inner dashed ring
            if (Math.abs(dist - feltRadius * 0.92) < width * 0.012) {
              r = 217; g = 119; b = 6;
            }
          }
        }
      }

      // Normalized coordinates for Spade rendering [-1, 1]
      const scale = isForeground ? (width * 0.42) : (width * 0.36);
      const nx = dx / scale;
      const ny = (dy + (isForeground ? 0 : width * 0.02)) / scale;

      const spadeType = isInsideSpade(nx, ny);
      if (spadeType > 0) {
        // Golden spade outline check
        const isBorder = isInsideSpade(nx * 1.08, ny * 1.08) && !isInsideSpade(nx * 0.92, ny * 0.92);
        
        if (isBorder) {
          // Gold Border
          r = 250; g = 204; b = 21;
          a = 255;
        } else {
          // Sleek Onyx Spade Body with gold inner highlight
          const innerSpade = isInsideSpade(nx * 1.8, ny * 1.8);
          if (innerSpade) {
            // Inner gold engraving
            r = 245; g = 158; b = 11;
            a = 255;
          } else {
            // Dark luxury spade
            r = 15; g = 23; b = 42;
            a = 255;
          }
        }
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdrData);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// Ensure public directory
const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. PWA Icons
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generateSpadePngBuffer(192, 192));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generateSpadePngBuffer(512, 512));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), generateSpadePngBuffer(512, 512, { isMaskable: true }));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generateSpadePngBuffer(180, 180));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), generateSpadePngBuffer(48, 48));
console.log('✓ Generated public/ PWA & Web icons');

// 2. Android App Icons across all standard densities
const mipmapSizes = [
  { dir: 'mipmap-mdpi', size: 48 },
  { dir: 'mipmap-hdpi', size: 72 },
  { dir: 'mipmap-xhdpi', size: 96 },
  { dir: 'mipmap-xxhdpi', size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
];

const resBase = path.resolve('android/app/src/main/res');
if (fs.existsSync(resBase)) {
  mipmapSizes.forEach(({ dir, size }) => {
    const targetDir = path.join(resBase, dir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.writeFileSync(path.join(targetDir, 'ic_launcher.png'), generateSpadePngBuffer(size, size));
    fs.writeFileSync(path.join(targetDir, 'ic_launcher_round.png'), generateSpadePngBuffer(size, size, { isMaskable: true }));
    fs.writeFileSync(path.join(targetDir, 'ic_launcher_foreground.png'), generateSpadePngBuffer(size, size, { isForeground: true }));
  });
  console.log('✓ Generated Android mipmap icons (ic_launcher, ic_launcher_round, ic_launcher_foreground)');
}

console.log('All icons generated successfully with ♠️ Spade brand theme!');
