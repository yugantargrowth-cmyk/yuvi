// api/payment/upi.js — Vercel Serverless Function for UPI Payment Gateway

function resolveUpiVpa(customVpa) {
  if (customVpa && customVpa.trim()) return customVpa.trim();
  if (typeof process !== "undefined" && process.env && process.env.UPI_VPA) {
    return process.env.UPI_VPA.trim();
  }
  return "";
}

function buildUpiUri(params) {
  const vpa = resolveUpiVpa(params.vpa);
  if (!vpa) return "";
  const payeeName = (params.payeeName || "Yugantar Growth").trim();
  const amount = Math.max(0, params.amount);
  const note = (params.note || "Project Advance").trim();
  const tr = params.transactionRef ? `&tr=${encodeURIComponent(params.transactionRef)}` : "";
  return `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}${tr}`;
}

// Polynomial Galois Field GF(256) arithmetic for Reed-Solomon Error Correction
const EXP_TABLE = new Uint8Array(256);
const LOG_TABLE = new Uint8Array(256);
(function initGf() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x;
    LOG_TABLE[x] = i;
    x = (x << 1) ^ (x & 128 ? 0x11d : 0);
  }
  EXP_TABLE[255] = EXP_TABLE[0];
})();

function gMultiply(a, b) {
  if (a === 0 || b === 0) return 0;
  return EXP_TABLE[(LOG_TABLE[a] + LOG_TABLE[b]) % 255];
}

function rsCalculateEc(data, ecCount) {
  let gen = new Uint8Array([1]);
  for (let i = 0; i < ecCount; i++) {
    const nextPoly = new Uint8Array(gen.length + 1);
    const factor = EXP_TABLE[i];
    for (let j = 0; j < gen.length; j++) {
      nextPoly[j] ^= gMultiply(gen[j], factor);
      nextPoly[j + 1] ^= gen[j];
    }
    gen = nextPoly;
  }
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

function generateQrMatrix(text) {
  const encoder = new TextEncoder();
  const textBytes = encoder.encode(text);
  const specs = [
    { size: 21, dataBytes: 16, ecBytes: 10, align: [] },
    { size: 25, dataBytes: 28, ecBytes: 16, align: [6, 18] },
    { size: 29, dataBytes: 44, ecBytes: 26, align: [6, 22] },
    { size: 33, dataBytes: 64, ecBytes: 36, align: [6, 26] },
    { size: 37, dataBytes: 86, ecBytes: 48, align: [6, 30] },
    { size: 41, dataBytes: 108, ecBytes: 64, align: [6, 34] },
    { size: 45, dataBytes: 122, ecBytes: 72, align: [6, 22, 38] },
    { size: 49, dataBytes: 152, ecBytes: 88, align: [6, 24, 42] },
  ];
  let spec = specs.find((s) => textBytes.length + 3 <= s.dataBytes) || specs[specs.length - 1];
  const { size, dataBytes, ecBytes, align } = spec;

  const bits = [];
  function pushBits(val, len) {
    for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
  }
  pushBits(0b0100, 4);
  pushBits(textBytes.length, 8);
  for (let i = 0; i < textBytes.length; i++) pushBits(textBytes[i], 8);
  pushBits(0, Math.min(4, Math.max(0, dataBytes * 8 - bits.length)));
  while (bits.length % 8 !== 0) bits.push(0);
  const pad = [0xec, 0x11];
  let pIdx = 0;
  while (bits.length < dataBytes * 8) {
    pushBits(pad[pIdx % 2], 8);
    pIdx++;
  }

  const dataCodewords = new Uint8Array(dataBytes);
  for (let i = 0; i < dataBytes; i++) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i * 8 + j];
    dataCodewords[i] = b;
  }
  const ecCodewords = rsCalculateEc(dataCodewords, ecBytes);
  const allCodewords = new Uint8Array(dataBytes + ecBytes);
  allCodewords.set(dataCodewords, 0);
  allCodewords.set(ecCodewords, dataBytes);

  const matrix = Array.from({ length: size }, () => Array(size).fill(null));
  const isFunc = Array.from({ length: size }, () => Array(size).fill(false));
  function setMod(r, c, val) {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = val;
      isFunc[r][c] = true;
    }
  }

  function placeFinder(row, col) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r, nc = col + c;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
            setMod(nr, nc, r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
          } else {
            setMod(nr, nc, false);
          }
        }
      }
    }
  }
  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  for (let i = 0; i < align.length; i++) {
    for (let j = 0; j < align.length; j++) {
      const r = align[i], c = align[j];
      if (isFunc[r][c]) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          setMod(r + dr, c + dc, Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0));
        }
      }
    }
  }

  for (let i = 8; i < size - 8; i++) {
    if (!isFunc[6][i]) setMod(6, i, i % 2 === 0);
    if (!isFunc[i][6]) setMod(i, 6, i % 2 === 0);
  }
  setMod(size - 8, 8, true);

  for (let i = 0; i < 9; i++) {
    if (!isFunc[8][i]) isFunc[8][i] = true;
    if (!isFunc[i][8]) isFunc[i][8] = true;
  }
  for (let i = size - 8; i < size; i++) {
    if (!isFunc[8][i]) isFunc[8][i] = true;
    if (!isFunc[i][8]) isFunc[i][8] = true;
  }

  const allBits = [];
  for (let i = 0; i < allCodewords.length; i++) {
    for (let b = 7; b >= 0; b--) allBits.push((allCodewords[i] >> b) & 1);
  }

  let bitIdx = 0, upward = true;
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--;
    for (let vert = 0; vert < size; vert++) {
      const r = upward ? size - 1 - vert : vert;
      for (let c = right; c >= right - 1; c--) {
        if (!isFunc[r][c]) {
          const bitVal = bitIdx < allBits.length ? allBits[bitIdx] === 1 : false;
          matrix[r][c] = bitVal !== ((r + c) % 2 === 0);
          bitIdx++;
        }
      }
    }
    upward = !upward;
  }

  const formatBits = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0];
  for (let i = 0; i < 6; i++) matrix[8][i] = formatBits[i] === 1;
  matrix[8][7] = formatBits[6] === 1;
  matrix[8][8] = formatBits[7] === 1;
  matrix[7][8] = formatBits[8] === 1;
  for (let i = 9; i < 15; i++) matrix[14 - i][8] = formatBits[i] === 1;
  for (let i = 0; i < 7; i++) matrix[size - 1 - i][8] = formatBits[i] === 1;
  for (let i = 7; i < 15; i++) matrix[8][size - 15 + i] = formatBits[i] === 1;

  return matrix;
}

function generateUpiQrDataUrl(upiUri) {
  if (!upiUri || !upiUri.trim()) return "";
  const matrix = generateQrMatrix(upiUri.trim());
  const matrixSize = matrix.length;
  const quietZone = 4;
  const totalSize = matrixSize + quietZone * 2;
  let rects = "";
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (matrix[r][c]) {
        rects += `<rect x="${c + quietZone}" y="${r + quietZone}" width="1" height="1" fill="#080808"/>`;
      }
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" width="220" height="220" shape-rendering="crispEdges">
    <rect width="${totalSize}" height="${totalSize}" fill="#ffffff" rx="1"/>
    ${rects}
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function generatePaymentDetails(params) {
  const rawVpa = resolveUpiVpa(params.vpa);
  const isConfigured = Boolean(rawVpa);
  const payeeName = (params.payeeName || "Yugantar Growth").trim();
  const amount = Math.max(0, Math.round(params.amount));
  const note = params.note || "Project Advance Payment";
  const vpa = isConfigured ? rawVpa : "UPI not configured";
  const upiUri = isConfigured ? buildUpiUri({ ...params, vpa: rawVpa, payeeName, amount, note }) : "";
  const qrDataUrl = upiUri ? generateUpiQrDataUrl(upiUri) : "";
  const formattedAmount = `₹${amount.toLocaleString("en-IN")}`;

  return {
    vpa,
    payeeName,
    amount,
    note,
    upiUri,
    qrDataUrl,
    formattedAmount,
  };
}

async function parseBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const body = req.method === "POST" ? await parseBody(req) : {};
  const { amount = 0, note = "", transactionRef = "", vpa, payeeName } = body;

  const details = generatePaymentDetails({
    amount: Number(amount) || 0,
    note: String(note || ""),
    transactionRef: transactionRef ? String(transactionRef) : undefined,
    vpa: vpa ? String(vpa) : undefined,
    payeeName: payeeName ? String(payeeName) : undefined,
  });

  const isConfigured = details.vpa !== "UPI not configured" && Boolean(details.upiUri);

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(
    JSON.stringify({
      ok: true,
      configured: isConfigured,
      ...details,
    })
  );
}
