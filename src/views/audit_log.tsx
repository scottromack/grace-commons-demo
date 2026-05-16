// Audit log page — all audit events with chain filter and per-row integrity check.
//
// Each row has a "Check" button that fires hx-get → /audit/:id/verify and
// swaps the button with a VerifyChip (green or red) inline, without a page reload.

import type { FC } from "hono/jsx";
import type { Actor } from "../domain/actor.ts";
import { Layout } from "./layout.tsx";

export type AuditEventRow = {
  event_id: number;
  seq: number;
  action_ref: string;
  actor_ref: string;
  chain_id: string | null;
  step_id: string | null;
  recorded_at: string;
  data_json: string;
  retention_policy: string;
  row_hash: string;
};

type AuditLogPageProps = {
  actor: Actor | null;
  actors: Actor[];
  events: AuditEventRow[];
  chainFilter?: string;
};

export const AuditLogPage: FC<AuditLogPageProps> = ({
  actor,
  actors,
  events,
  chainFilter,
}) => {
  return (
    <Layout title="Audit log — Grace Commons" currentActor={actor} actors={actors}>
      <div class="flex items-center justify-between mb-5">
        <h1 class="text-xl font-semibold text-gray-800">Audit log</h1>
        <span class="text-xs text-gray-400">{events.length} event{events.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Filter */}
      <form method="get" action="/audit-ui" class="mb-5 flex items-center gap-3">
        <input type="text" name="chain_id" value={chainFilter ?? ""}
          placeholder="Filter by chain ID"
          class="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 w-80" />
        <button type="submit"
          class="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
          Filter
        </button>
        {chainFilter && (
          <a href="/audit-ui" class="text-sm text-gray-400 hover:text-gray-600">Clear</a>
        )}
      </form>

      <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {events.length === 0 ? (
          <div class="text-center py-12 text-gray-400 text-sm">No events.</div>
        ) : (
          <table class="w-full">
            <thead class="bg-gray-50 border-b border-gray-200 text-left">
              <tr class="text-xs text-gray-600">
                <th class="py-3 px-4 font-medium w-12">Seq</th>
                <th class="py-3 px-4 font-medium">Action</th>
                <th class="py-3 px-4 font-medium">Actor</th>
                <th class="py-3 px-4 font-medium">Chain / Step</th>
                <th class="py-3 px-4 font-medium">Time (UTC)</th>
                <th class="py-3 px-4 font-medium">Retention</th>
                <th class="py-3 px-4 font-medium">Integrity</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr class="border-b border-gray-100 last:border-0 hover:bg-gray-50 text-xs">
                  <td class="py-2 px-4 text-gray-400 font-mono">{ev.seq}</td>
                  <td class="py-2 px-4 font-mono text-gray-700">{ev.action_ref}</td>
                  <td class="py-2 px-4 text-gray-600">{ev.actor_ref}</td>
                  <td class="py-2 px-4 text-gray-400">
                    {ev.chain_id ? (
                      <a href={`/chains/${ev.chain_id}`}
                        class="text-blue-500 hover:underline font-mono">
                        …{ev.chain_id.slice(-8)}
                      </a>
                    ) : "—"}
                    {ev.step_id && (
                      <span class="ml-1 text-gray-300 font-mono">/{ev.step_id.slice(-6)}</span>
                    )}
                  </td>
                  <td class="py-2 px-4 text-gray-400">
                    {ev.recorded_at.slice(0, 19).replace("T", " ")}
                  </td>
                  <td class="py-2 px-4 text-gray-400">{ev.retention_policy}</td>
                  <td class="py-2 px-4">
                    <span id={`verify-chip-${ev.event_id}`}>
                      {/* deno-lint-ignore no-explicit-any */}
                      <button
                        {...{
                          "hx-get": `/audit/${ev.event_id}/verify`,
                          "hx-target": `#verify-chip-${ev.event_id}`,
                          "hx-swap": "innerHTML",
                        } as any}
                        class="px-2 py-0.5 bg-gray-100 text-gray-500 rounded hover:bg-gray-200 cursor-pointer">
                        Check
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
};
