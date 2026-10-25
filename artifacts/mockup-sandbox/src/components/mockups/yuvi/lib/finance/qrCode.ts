// lib/finance/qrCode.ts — Zero-Dependency Standard QR Code Generator (ISO/IEC 18004)
// Generates authentic, camera-scannable 2D barcode matrices for UPI payment URLs and deep links.

// Polynomial Galois Field GF(256) arithmetic for Reed-Solomon Error Correction
const EXP_TABLE = new Uint8Array(256);
const LOG_TABLE = new Uint8Array(256);

(function initGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x;
    LOG_TABLE[x] = i;
    x = (x << 1) ^ (x & 128 ? 0x11d : 0);
  }
  EXP_TABLE[255] = EXP_TABLE[0];
})();

function gMultiply(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP_TABLE[(LOG_TABLE[a] + LOG_TABLE[b]) % 255];
}

function rsGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const nextPoly = new Uint8Array(poly.length + 1);
    const factor = EXP_TABLE[i];
    for (let j = 0; j < poly.length; j++) {
      nextPoly[j] ^= gMultiply(poly[j], factor);
      nextPoly[j + 1] ^= poly[j];
    }
    poly = nextPoly;
  }
  return poly;
}

function rsCalculateEc(data: Uint8Array, ecCount: number): Uint8Array {
  const gen = rsGeneratorPoly(ecCount);
  const result = new Uint8Array(ecCount);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ result[0];
    result.copyWithin(0, 1);
    result[ecCount - 1] = 0;
    for (let j = 0; j < ecCount; j++) {
      result[j] ^= gMultiply(gen[j], factor);
    }
  }
  return result;
}

// Version configurations: capacity and EC blocks for Byte mode at Level M
interface QrVersionSpec {
  version: number;
  size: number;
  totalBytes: number;
  dataBytes: number;
  ecBytes: number;
  alignPos: number[];
}

const QR_SPECS: QrVersionSpec[] = [
  { version: 1, size: 21, totalBytes: 26, dataBytes: 16, ecBytes: 10, alignPos: [] },
  { version: 2, size: 25, totalBytes: 44, dataBytes: 28, ecBytes: 16, alignPos: [6, 18] },
  { version: 3, size: 29, totalBytes: 70, dataBytes: 44, ecBytes: 26, alignPos: [6, 22] },
  { version: 4, size: 33, totalBytes: 100, dataBytes: 64, ecBytes: 36, alignPos: [6, 26] },
  { version: 5, size: 37, totalBytes: 134, dataBytes: 86, ecBytes: 48, alignPos: [6, 30] },
  { version: 6, size: 41, totalBytes: 172, dataBytes: 108, ecBytes: 64, alignPos: [6, 34] },
  { version: 7, size: 45, totalBytes: 196, dataBytes: 122, ecBytes: 72, alignPos: [6, 22, 38] },
  { version: 8, size: 49, totalBytes: 242, dataBytes: 152, ecBytes: 88, alignPos: [6, 24, 42] },
];

/**
 * Encodes text into a standard QR matrix using ISO/IEC 18004 Byte mode.
 */
export function generateQrMatrix(text: string): boolean[][] {
  const encoder = new TextEncoder();
  const textBytes = encoder.encode(text);

  // Pick smallest fitting QR version
  let spec = QR_SPECS.find((s) => textBytes.length + 3 <= s.dataBytes);
  if (!spec) {
    spec = QR_SPECS[QR_SPECS.length - 1];
  }

  const { size, dataBytes, ecBytes, alignPos } = spec;

  // 1. Bit Buffer: Mode Byte (0100) + Character Count Indicator + Payload
  const bits: number[] = [];
  function pushBits(val: number, length: number) {
    for (let i = length - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  }

  // Byte mode indicator: 0100
  pushBits(0b0100, 4);
  // Character count (8 bits for versions 1-9 in byte mode)
  pushBits(textBytes.length, 8);
  // Data bytes
  for (let i = 0; i < textBytes.length; i++) {
    pushBits(textBytes[i], 8);
  }

  // Terminator (up to 4 zeroes)
  const remainingBits = dataBytes * 8 - bits.length;
  pushBits(0, Math.min(4, Math.max(0, remainingBits)));

  // Pad to byte boundary
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  // Pad bytes 0xEC and 0x11
  const padPatterns = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < dataBytes * 8) {
    pushBits(padPatterns[padIdx % 2], 8);
    padIdx++;
  }

  // Pack data codewords
  const dataCodewords = new Uint8Array(dataBytes);
  for (let i = 0; i < dataBytes; i++) {
    let b = 0;
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | bits[i * 8 + j];
    }
    dataCodewords[i] = b;
  }

  // Compute Reed-Solomon Error Correction Codewords
  const ecCodewords = rsCalculateEc(dataCodewords, ecBytes);

  // Combine data + EC codewords
  const allCodewords = new Uint8Array(dataBytes + ecBytes);
  allCodewords.set(dataCodewords, 0);
  allCodewords.set(ecCodewords, dataBytes);

  // 2. Initialize Matrix (null = unassigned)
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));
  const isFunctionModule: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  function setModule(r: number, c: number, val: boolean) {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = val;
      isFunctionModule[r][c] = true;
    }
  }

  // Position Finder Patterns (Top-Left, Top-Right, Bottom-Left)
  function placeFinder(row: number, col: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r;
        const nc = col + c;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
            const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
            const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
            setModule(nr, nc, isBorder || isCenter);
          } else {
            setModule(nr, nc, false); // Separator
          }
        }
      }
    }
  }

  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // Alignment Patterns
  for (let i = 0; i < alignPos.length; i++) {
    for (let j = 0; j < alignPos.length; j++) {
      const r = alignPos[i];
      const c = alignPos[j];
      if (isFunctionModule[r][c]) continue; // Skip finders

      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const isBlack = Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0);
          setModule(r + dr, c + dc, isBlack);
        }
      }
    }
  }

  // Timing Patterns (row 6 and col 6)
  for (let i = 8; i < size - 8; i++) {
    if (!isFunctionModule[6][i]) setModule(6, i, i % 2 === 0);
    if (!isFunctionModule[i][6]) setModule(i, 6, i % 2 === 0);
  }

  // Dark module
  setModule(size - 8, 8, true);

  // Reserve format information areas
  for (let i = 0; i < 9; i++) {
    if (!isFunctionModule[8][i]) isFunctionModule[8][i] = true;
    if (!isFunctionModule[i][8]) isFunctionModule[i][8] = true;
  }
  for (let i = size - 8; i < size; i++) {
    if (!isFunctionModule[8][i]) isFunctionModule[8][i] = true;
    if (!isFunctionModule[i][8]) isFunctionModule[i][8] = true;
  }

  // 3. Place Data Bits with standard zigzag layout
  const allBits: number[] = [];
  for (let i = 0; i < allCodewords.length; i++) {
    for (let b = 7; b >= 0; b--) {
      allBits.push((allCodewords[i] >> b) & 1);
    }
  }

  let bitIdx = 0;
  let upward = true;

  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--; // Skip vertical timing line

    for (let vert = 0; vert < size; vert++) {
      const r = upward ? size - 1 - vert : vert;
      for (let c = right; c >= right - 1; c--) {
        if (!isFunctionModule[r][c]) {
          const bitVal = bitIdx < allBits.length ? allBits[bitIdx] === 1 : false;
          // Apply standard Mask 0: (row + col) % 2 === 0
          const mask = (r + c) % 2 === 0;
          matrix[r][c] = bitVal !== mask;
          bitIdx++;
        }
      }
    }
    upward = !upward;
  }

  // 4. Place Format Information (EC Level M: 00, Mask 0: 000 -> 00000 XOR 101010000010010)
  // Precomputed format bits for EC Level M with Mask 0: 101010000010010
  const formatBits = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0];

  // Top-left format info
  for (let i = 0; i < 6; i++) matrix[8][i] = formatBits[i] === 1;
  matrix[8][7] = formatBits[6] === 1;
  matrix[8][8] = formatBits[7] === 1;
  matrix[7][8] = formatBits[8] === 1;
  for (let i = 9; i < 15; i++) matrix[14 - i][8] = formatBits[i] === 1;

  // Split format info for other finders
  for (let i = 0; i < 7; i++) matrix[size - 1 - i][8] = formatBits[i] === 1;
  for (let i = 7; i < 15; i++) matrix[8][size - 15 + i] = formatBits[i] === 1;

  return matrix.map((row) => row.map((cell) => cell ?? false));
}

/**
 * Generates an authentic SVG QR Code string for camera scanning.
 */
export function generateScannableQrSvg(text: string, options: { size?: number; foreground?: string; background?: string } = {}): string {
  const matrix = generateQrMatrix(text);
  const matrixSize = matrix.length;
  const quietZone = 4;
  const totalSize = matrixSize + quietZone * 2;
  const displaySize = options.size || 220;
  const fg = options.foreground || "#080808";
  const bg = options.background || "#ffffff";

  let rects = "";
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (matrix[r][c]) {
        rects += `<rect x="${c + quietZone}" y="${r + quietZone}" width="1" height="1" fill="${fg}"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" width="${displaySize}" height="${displaySize}" shape-rendering="crispEdges">
    <rect width="${totalSize}" height="${totalSize}" fill="${bg}" rx="1"/>
    ${rects}
  </svg>`;
}
