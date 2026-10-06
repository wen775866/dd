import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Minimal compliant PNG generator in pure Node.js
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

function generatePngBuffer(width, height, isMaskable = false) {
  const rowBytes = width * 4 + 1; // filter byte (0) + RGBA per pixel
  const rawData = Buffer.alloc(rowBytes * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * (isMaskable ? 0.48 : 0.44);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // Filter type: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Default dark navy background
      let r = 15, g = 32, b = 39, a = 255;

      // Diagonal gradient
      const diag = (x + y) / (width + height);
      r = Math.floor(15 + diag * 30);
      g = Math.floor(32 + diag * 50);
      b = Math.floor(50 + diag * 50);

      // Green Felt Table Circle
      if (dist < radius) {
        // Table border gold
        if (dist > radius - width * 0.03) {
          r = 234; g = 179; b = 8;
        } else {
          // Felt green gradient
          const f = dist / radius;
          r = Math.floor(12 + (1 - f) * 15);
          g = Math.floor(76 + (1 - f) * 45);
          b = Math.floor(45 + (1 - f) * 20);
        }
      }

      // Center Gold Emblem
      if (dist < width * 0.22) {
        if (dist > width * 0.20) {
          r = 255; g = 255; b = 255;
        } else {
          // Gold crown center
          r = 245; g = 158; b = 11;
        }
      }

      // Crown pattern / '斗' center
      if (Math.abs(dx) < width * 0.08 && Math.abs(dy) < height * 0.08) {
        if (Math.abs(dx) < width * 0.06 && Math.abs(dy) < height * 0.06) {
          r = 255; g = 255; b = 255;
        }
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG Signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT chunk
  const idatChunk = makeChunk('IDAT', deflated);

  // IEND chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. 192x192
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generatePngBuffer(192, 192, false));
console.log('✓ Generated pwa-192x192.png');

// 2. 512x512
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generatePngBuffer(512, 512, false));
console.log('✓ Generated pwa-512x512.png');

// 3. Maskable 512x512
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), generatePngBuffer(512, 512, true));
console.log('✓ Generated pwa-maskable-512x512.png');

// 4. Apple Touch Icon 180x180
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generatePngBuffer(180, 180, false));
console.log('✓ Generated apple-touch-icon.png');

// 5. Favicon 48x48
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), generatePngBuffer(48, 48, false));
console.log('✓ Generated favicon.ico');

console.log('All PWA icon assets generated successfully!');
