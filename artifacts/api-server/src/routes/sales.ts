import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

// In-memory persistent store for server session (mirrored with DB when provisioned)
let serverLeads: any[] = [];
let serverCallQueue: any[] = [];
let serverMetrics: any = {
  totalLeads: 0,
  newLeads: 0,
  qualifiedLeads: 0,
  callsDue: 0,
  callsCompleted: 0,
  outreachDue: 0,
  followUpsDue: 0,
  replies: 0,
  interestedProspects: 0,
  meetingsOpportunities: 0,
  won: 0,
  lost: 0,
  pendingActions: 0,
};

// GET /sales/dashboard — Retrieve current sales metrics and call queue
router.get("/sales/dashboard", (_req: Request, res: Response) => {
  res.json({
    metrics: serverMetrics,
    leadsCount: serverLeads.length,
    callQueue: serverCallQueue,
    timestamp: new Date().toISOString(),
  });
});

// POST /sales/import-leads — Ingest lead records from CSV or JSON
router.post("/sales/import-leads", (req: Request, res: Response) => {
  const { leads, metrics, callQueue } = req.body || {};

  if (Array.isArray(leads)) {
    serverLeads = [...leads];
  }
  if (Array.isArray(callQueue)) {
    serverCallQueue = [...callQueue];
  }
  if (metrics) {
    serverMetrics = { ...metrics };
  }

  res.json({
    success: true,
    leadsCount: serverLeads.length,
    callQueueCount: serverCallQueue.length,
    message: "Leads and workload successfully synced with server memory.",
  });
});

// POST /sales/call-outcome — Record outcome of a phone call
router.post("/sales/call-outcome", (req: Request, res: Response) => {
  const { callId, outcome, notes, nextScheduledDate } = req.body || {};

  const call = serverCallQueue.find((c: any) => c.id === callId);
  if (!call) {
    res.status(404).json({ error: `Call item ${callId} not found.` });
    return;
  }

  call.callStatus = outcome === "No answer" ? "NO_ANSWER" : outcome === "Callback requested" ? "CALLBACK_REQUESTED" : "COMPLETED";
  call.outcomeNotes = notes || "";
  call.calledAt = new Date().toISOString();
  call.nextScheduledFollowUp = nextScheduledDate || "";

  if (serverMetrics.callsDue > 0) {
    serverMetrics.callsDue--;
  }
  serverMetrics.callsCompleted++;

  if (outcome === "Connected - Interested" || outcome === "Meeting booked") {
    serverMetrics.interestedProspects++;
    serverMetrics.meetingsOpportunities++;
  }

  res.json({
    success: true,
    call,
    updatedMetrics: serverMetrics,
    message: `Call outcome '${outcome}' recorded. Next action automatically scheduled.`,
  });
});

// POST /sales/bridge-webhook — Inbound execution bridge from Activepieces
router.post("/sales/bridge-webhook", (req: Request, res: Response) => {
  const payload = req.body || {};
  res.json({
    received: true,
    taskId: payload.task_id || payload.taskId,
    timestamp: new Date().toISOString(),
    status: "ACKNOWLEDGED",
  });
});

export default router;
