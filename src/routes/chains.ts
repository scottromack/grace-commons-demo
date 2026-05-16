// Chain-level routes — initiate, withdraw, read.
// All routes return JSON in step 8; HTML rendering added in step 9.

import { Hono } from "hono";
import type { AppVariables } from "../middleware/current_actor.ts";
import {
  initiate_chain,
  withdraw_chain,
  read_chain,
  type ReadChainQuery,
} from "../domain/chain.ts";
import { tokenToStatus } from "../middleware/error.ts";

const chains = new Hono<{ Variables: AppVariables }>();

// POST /chains — initiate_chain
chains.post("/", async (c) => {
  const actor = c.get("actor");
  if (!actor) return c.json({ error: "no actor selected" }, 401);

  let body: Record<string, unknown>;
  try { body = await c.req.json(); }
  catch { return c.json({ error: "invalid JSON" }, 400); }

  const result = initiate_chain({
    actor_ref: actor.actor_ref,
    subject_ref: String(body.subject_ref ?? ""),
    scope: String(body.scope ?? ""),
    approver_set: Array.isArray(body.approver_set) ? body.approver_set.map(String) : [],
    quorum_kind: body.quorum_kind as "all-of-N" | "M-of-N" | "one-of-N",
    quorum_m: body.m != null ? Number(body.m) : null,
    reason: body.reason != null ? String(body.reason) : null,
    retention_policy: body.retention_policy as "sox_7_year" | "fda_part_11_predicate_rule" | "ich_e6_tmf" | undefined,
  });

  if ("err" in result) return c.json({ error: result.err }, tokenToStatus(result.err));
  return c.json(result.ok, 201);
});

// GET /chains — read_chain (list)
chains.get("/", (c) => {
  const actor = c.get("actor");
  if (!actor) return c.json({ error: "no actor selected" }, 401);

  const query: ReadChainQuery = Object.fromEntries(
    Object.entries(c.req.query()).filter(([, v]) => v !== ""),
  );

  const result = read_chain(actor.actor_ref, query);
  if ("err" in result) return c.json({ error: result.err }, tokenToStatus(result.err));
  return c.json(result.ok);
});

// GET /chains/:chain_id — read_chain (single)
chains.get("/:chain_id", (c) => {
  const actor = c.get("actor");
  if (!actor) return c.json({ error: "no actor selected" }, 401);

  const chain_id = c.req.param("chain_id");
  const result = read_chain(actor.actor_ref, { chain_id });
  if ("err" in result) return c.json({ error: result.err }, tokenToStatus(result.err));
  if (result.ok.length === 0) return c.json({ error: "not-known" }, 404);
  return c.json(result.ok[0]);
});

// POST /chains/:chain_id/withdraw
chains.post("/:chain_id/withdraw", async (c) => {
  const actor = c.get("actor");
  if (!actor) return c.json({ error: "no actor selected" }, 401);

  let body: Record<string, unknown>;
  try { body = await c.req.json(); }
  catch { return c.json({ error: "invalid JSON" }, 400); }

  const result = withdraw_chain(
    actor.actor_ref,
    c.req.param("chain_id"),
    String(body.reason ?? ""),
  );

  if ("err" in result) return c.json({ error: result.err }, tokenToStatus(result.err));
  return c.json(result.ok);
});

export { chains };
