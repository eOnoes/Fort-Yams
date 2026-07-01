// Dashboard API response types — mirrors server shapes

export interface HealthResponse {
  status: string;
  uptimeMs: number;
}

export interface ServerStatus {
  providerName: string;
  model: string;
  dbPath: string;
  workdir: string;
  activeTools: string[];
  readonlyMode: boolean;
  approvalsEnabled: boolean;
  pendingApprovals: number;
  swarmApiEnabled: boolean;
  swarmRunsCount: number;
  dashboardApiGapsClosed: string[];
  mcp: {
    enabled: boolean;
    configPath: string;
    serverCount: number;
    connectedCount: number;
    totalToolCount: number;
    servers: unknown[];
  };
}

export interface ToolInfo {
  name: string;
  description: string;
  requiresApproval: boolean;
}

export interface SessionSummary {
  id: string;
  title: string | null;
  status: string;
  provider: string;
  model: string;
  created_at: string;
  updated_at: string;
}

export interface ReportEntry {
  path: string;
  type: "phase" | "run" | "swarm" | "unknown";
  name: string;
  createdAt?: string;
  sizeBytes?: number;
}

export interface ApprovalItem {
  id: string;
  toolName: string;
  riskLevel: string;
  args: unknown;
  sessionId: string;
  runId: string;
  status: string;
  createdAt: string;
  expiresAt?: string;
}

export interface SwarmSummary {
  id: string;
  mode: string;
  workerCount: number;
  status: string;
  startedAt: string;
  completedAt?: string;
  wardenStatus?: string;
  promptSummary: string;
  reportPath?: string;
}

// ── Swarm Detail subtypes ────────────────────────────────────

export interface SwarmTaskPacket {
  id: string;
  role: string;
  title: string;
  objective: string;
  scope?: string;
  allowedFiles?: string[];
  forbiddenFiles?: string[];
  allowedTools?: string[];
  forbiddenTools?: string[];
  modelTier?: string;
  riskLevel?: string;
  timeoutMs?: number;
  requiresApproval?: boolean;
  expectedOutput?: string;
  dependsOn?: string[];
}

export interface SwarmResultPacket {
  taskId: string;
  role: string;
  status: string;
  summary: string;
  findings?: { severity: string; message: string }[];
  filesTouched?: string[];
  toolCalls?: { tool: string; status: string; summary: string }[];
  risks?: { level: string; description: string; mitigation?: string }[];
  nextRecommendation?: string;
}

export interface SwarmWardenVerdict {
  status: "PASS" | "PARTIAL" | "FAIL";
  reasoning: string;
  violations: { severity: string; rule: string; detail: string; taskId?: string }[];
  recommendations: string[];
}

export interface SwarmConflict {
  id: string;
  file: string;
  taskIds: string[];
  status: string;
  resolution?: string;
}

export interface SwarmDetail extends SwarmSummary {
  operatorPrompt: string;
  taskPackets: SwarmTaskPacket[];
  resultPackets: SwarmResultPacket[];
  conflicts: SwarmConflict[];
  wardenVerdict: SwarmWardenVerdict | null;
}

export interface SwarmRunRequest {
  prompt: string;
  mode?: string;
  workers?: number;
  fake?: boolean;
}

// ── SSE Event types — mirrors StreamEvent from @tripp-reason/shared ──

export type SseEventType = "message" | "tool_request" | "tool_result" | "finish" | "error";

export interface SseEventMessage {
  type: "message";
  content: string;
  role: "assistant";
  sessionId?: string;
  runId?: string;
}

export interface SseEventToolRequest {
  type: "tool_request";
  tool: string;
  args: unknown;
  requiresApproval: boolean;
  sessionId?: string;
  runId?: string;
}

export interface SseEventToolResult {
  type: "tool_result";
  tool: string;
  result: unknown;
  status: "ok" | "error";
  sessionId?: string;
  runId?: string;
}

export interface SseEventFinish {
  type: "finish";
  reason: string;
  runId: string;
  reportPath?: string;
  sessionId?: string;
}

export interface SseEventError {
  type: "error";
  message: string;
  recoverable: boolean;
  sessionId?: string;
  runId?: string;
}

export type SseEvent = SseEventMessage | SseEventToolRequest | SseEventToolResult | SseEventFinish | SseEventError;

/** Parsed SSE frame from text/event-stream */
export interface SseFrame {
  event: string;
  data: string;
}

/** Reply body sent to POST /reply */
export interface ReplyRequest {
  prompt: string;
  sessionId?: string;
  title?: string;
  model?: string;
  provider?: string;
  workdir?: string;
}

// ── Phase 7G: Agent Bus API types ──────────────────────────────

export interface AgentBusStatus {
  busRoot: string;
  folders: { name: string; present: boolean }[];
  inboxCount: number;
  outboxCount: number;
  reportsCount: number;
  archiveCount: number;
  rejectedCount: number;
  traceEventCount: number;
  traceMalformedCount: number;
  traceValidCount: number;
  traceLedgerPath: string;
}

export interface AgentBusPacketEntry {
  fileName: string;
  relativePath: string;
  packetId?: string;
  runId?: string;
  agentRole?: string;
  taskType?: string;
  title?: string;
  status?: string;
  createdAt?: string;
  malformed: boolean;
  error?: string;
}

export interface AgentBusResultEntry {
  fileName: string;
  relativePath: string;
  packetId?: string;
  resultId?: string;
  runId?: string;
  agentRole?: string;
  trustZone?: string;
  status?: string;
  summary?: string;
  createdAt?: string;
  proposedChangesCount?: number;
  highRiskChangesCount?: number;
  malformed: boolean;
  error?: string;
}

export interface AgentBusReviewEntry {
  fileName: string;
  relativePath: string;
  reviewId?: string;
  packetId?: string;
  resultId?: string;
  runId?: string;
  reviewerRole?: string;
  verdict?: string;
  createdAt?: string;
  issueCount?: number;
  malformed: boolean;
  error?: string;
}

export interface AgentBusMdReportEntry {
  fileName: string;
  relativePath: string;
  type: string;
}

export interface AgentBusTraceEvent {
  eventId: string;
  eventType: string;
  severity: string;
  createdAt: string;
  actorType: string;
  actorId?: string;
  runId?: string;
  packetId?: string;
  resultId?: string;
  reviewId?: string;
  parentEventId?: string;
  rootCauseEventId?: string;
  agentRole?: string;
  subagentId?: string;
  subagentRole?: string;
  toolNames?: string[];
  sourcePath?: string;
  targetPath?: string;
  summary: string;
  tags?: string[];
}

export interface AgentBusTraceResponse {
  events: AgentBusTraceEvent[];
  totalEvents: number;
  malformedLines: number;
}

export interface AgentBusTraceChainResponse {
  eventId: string;
  selectedEvent: AgentBusTraceEvent | null;
  chain: AgentBusTraceEvent[];
  chainLength: number;
  missingLinks: boolean;
}

export interface AgentBusReadResponse {
  type: string;
  validated?: boolean;
  data?: unknown;
  text?: string;
  error?: string;
}
