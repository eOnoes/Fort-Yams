/**
 * Reports index route — Phase 6B
 *
 * GET /reports — list known report files under reports/ directory.
 */
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import type { FastifyInstance } from "fastify";

interface ReportEntry {
  path: string;
  type: "phase" | "run" | "swarm" | "unknown";
  name: string;
  createdAt?: string;
  sizeBytes?: number;
}

export function reportsRoute(app: FastifyInstance, workdir: string): void {
  app.get("/reports", async (_req, reply) => {
    const reportsDir = join(workdir, "reports");
    const reports: ReportEntry[] = [];

    try {
      const entries = await readdir(reportsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith(".md")) {
          const fullPath = join(reportsDir, entry.name);
          try {
            const st = await stat(fullPath);
            reports.push({
              path: `reports/${entry.name}`,
              type: classifyReport(entry.name),
              name: entry.name,
              createdAt: st.birthtime.toISOString(),
              sizeBytes: st.size,
            });
          } catch {
            // skip unreadable
          }
        }

        // Recurse into date directories
        if (entry.isDirectory()) {
          try {
            const subEntries = await readdir(join(reportsDir, entry.name), { withFileTypes: true });
            for (const sub of subEntries) {
              if (sub.isFile() && sub.name.endsWith(".md")) {
                const fullPath = join(reportsDir, entry.name, sub.name);
                try {
                  const st = await stat(fullPath);
                  reports.push({
                    path: `reports/${entry.name}/${sub.name}`,
                    type: classifyReport(sub.name),
                    name: sub.name,
                    createdAt: st.birthtime.toISOString(),
                    sizeBytes: st.size,
                  });
                } catch {
                  // skip unreadable
                }
              }
            }
          } catch {
            // skip unreadable dir
          }
        }
      }
    } catch {
      // reports dir may not exist yet
    }

    return { reports };
  });
}

function classifyReport(filename: string): ReportEntry["type"] {
  const lower = filename.toLowerCase();
  if (lower.includes("phase") || lower.includes("step_0")) return "phase";
  if (lower.includes("swarm") || lower.startsWith("plan_")) return "swarm";
  if (lower.startsWith("run-") || lower.includes("_run_")) return "run";
  return "unknown";
}
