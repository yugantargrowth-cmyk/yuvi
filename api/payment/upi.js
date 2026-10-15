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

function generateUpiQrDataUrl(upiUri) {
  if (!upiUri || !upiUri.trim()) return "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
    <rect width="200" height="200" fill="#ffffff" rx="12"/>
    <rect x="20" y="20" width="40" height="40" fill="#080808" rx="4"/>
    <rect x="28" y="28" width="24" height="24" fill="#ffffff"/>
    <rect x="34" y="34" width="12" height="12" fill="#e8520a"/>
    <rect x="140" y="20" width="40" height="40" fill="#080808" rx="4"/>
    <rect x="148" y="28" width="24" height="24" fill="#ffffff"/>
    <rect x="154" y="34" width="12" height="12" fill="#e8520a"/>
    <rect x="20" y="140" width="40" height="40" fill="#080808" rx="4"/>
    <rect x="28" y="148" width="24" height="24" fill="#ffffff"/>
    <rect x="34" y="154" width="12" height="12" fill="#e8520a"/>
    <rect x="80" y="86" width="40" height="28" rx="6" fill="#080808" stroke="#e8520a" stroke-width="2"/>
    <text x="100" y="104" font-family="system-ui, sans-serif" font-size="11" font-weight="900" fill="#ffffff" text-anchor="middle">UPI</text>
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
