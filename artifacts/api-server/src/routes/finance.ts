// artifacts/api-server/src/routes/finance.ts — Real Route Handler for UPI Payments & Finance
import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

export function resolveServerUpiVpa(customVpa?: string): string {
  if (customVpa && customVpa.trim()) {
    return customVpa.trim();
  }
  if (typeof process !== "undefined" && process.env?.UPI_VPA) {
    return process.env.UPI_VPA.trim();
  }
  return "";
}

export function buildServerUpiUri(params: { vpa?: string; payeeName?: string; amount: number; note?: string; transactionRef?: string }): string {
  const vpa = resolveServerUpiVpa(params.vpa);
  if (!vpa) return "";
  const payeeName = (params.payeeName || "Yugantar Growth").trim();
  const amount = Math.max(0, params.amount);
  const note = (params.note || "Project Advance").trim();
  const tr = params.transactionRef ? `&tr=${encodeURIComponent(params.transactionRef)}` : "";
  return `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}${tr}`;
}

export function generateServerUpiQrDataUrl(upiUri: string): string {
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

export function generateServerPaymentDetails(params: { amount: number; note?: string; vpa?: string; payeeName?: string; transactionRef?: string }) {
  const rawVpa = resolveServerUpiVpa(params.vpa);
  const isConfigured = Boolean(rawVpa);
  const payeeName = (params.payeeName || "Yugantar Growth").trim();
  const amount = Math.max(0, Math.round(params.amount));
  const note = params.note || "Project Advance Payment";
  const vpa = isConfigured ? rawVpa : "UPI not configured";
  const upiUri = isConfigured ? buildServerUpiUri({ ...params, vpa: rawVpa, payeeName, amount, note }) : "";
  const qrDataUrl = upiUri ? generateServerUpiQrDataUrl(upiUri) : "";
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

export function validateServerUpiReference(utr: string): { valid: boolean; normalized?: string; error?: string } {
  if (!utr || typeof utr !== "string") {
    return { valid: false, error: "UTR reference number is required." };
  }
  const clean = utr.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (clean.length < 6) {
    return { valid: false, error: "UTR reference number must be at least 6 alphanumeric characters." };
  }
  if (clean.length > 30) {
    return { valid: false, error: "UTR reference number exceeds maximum permitted length (30 characters)." };
  }
  return { valid: true, normalized: clean };
}

// POST /api/finance/upi & POST /api/payment/upi
router.post(["/finance/upi", "/payment/upi"], (req: Request, res: Response) => {
  const { amount = 0, note = "", transactionRef = "", vpa, payeeName } = req.body || {};
  const details = generateServerPaymentDetails({
    amount: Number(amount) || 0,
    note: String(note || ""),
    transactionRef: transactionRef ? String(transactionRef) : undefined,
    vpa: vpa ? String(vpa) : undefined,
    payeeName: payeeName ? String(payeeName) : undefined,
  });

  const isConfigured = details.vpa !== "UPI not configured" && Boolean(details.upiUri);

  res.json({
    ok: true,
    configured: isConfigured,
    ...details,
  });
});

// GET /api/finance/upi/status & GET /api/payment/upi/status
router.get(["/finance/upi/status", "/payment/upi/status"], (_req: Request, res: Response) => {
  const currentVpa = resolveServerUpiVpa();
  const isConfigured = Boolean(currentVpa);
  res.json({
    ok: true,
    configured: isConfigured,
    vpa: isConfigured ? currentVpa : "UPI not configured",
    message: isConfigured ? "UPI payee VPA configured." : "UPI not configured. Set UPI_VPA env or configure in settings.",
  });
});

// POST /api/finance/verify-utr
router.post("/finance/verify-utr", (req: Request, res: Response) => {
  const { utr = "" } = req.body || {};
  const result = validateServerUpiReference(String(utr));
  res.json({
    ok: result.valid,
    ...result,
  });
});

export default router;
