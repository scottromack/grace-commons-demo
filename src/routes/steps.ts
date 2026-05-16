// Step-level routes — approve, reject, withdraw.
// Returns JSON in step 8; HTMX fragment responses added in step 9.

import { Hono } from "hono";
import type { AppVariables } from "../middleware/current_actor.ts";
import { approve_step, reject_step, withdraw_step } from "../domain/chain.ts";
import { tokenToStatus } from "../middleware/error.ts";

const steps = new Hono<{ Variables: AppVariables }>();

// POST /chains/:chain_id/steps/:step_id/approve
steps.post("/:chain_id/steps/:step_id/approve", async (c) => {
  const actor = c.get("actor");
  if (!actor) return c.json({ error: "no actor selected" }, 401);

  let body: Record<string, unknown> = {};
  try { body = await c.req.json(); } catch { /* reason is optional */ }

  const result = approve_step(
    actor.actor_ref,
    c.req.param("chain_id"),
    c.req.param("step_id"),
    body.reason != null ? String(body.reason) : null,
  );

  if ("err" in result) return c.json({ error: result.err }, tokenToStatus(result.err));
  return c.json(result.ok);
});

// POST /chains/:chain_id/steps/:step_id/reject
steps.post("/:chain_id/steps/:step_id/reject", async (c) => {
  const actor = c.get("actor");
  if (!actor) return c.json({ error: "no actor selected" }, 401);

  let body: Record<string, unknown>;
  try { body = await c.req.json(); }
  catch { return c.json({ error: "invalid JSON" }, 400); }

  const result = reject_step(
    actor.actor_ref,
    c.req.param("chain_id"),
    c.req.param("step_id"),
    String(body.reason ?? ""),
  );

  if ("err" in result) return c.json({ error: result.err }, tokenToStatus(result.err));
  return c.json(result.ok);
});

// POST /chains/:chain_id/steps/:step_id/withdraw
steps.post("/:chain_id/steps/:step_id/withdraw", async (c) => {
  const actor = c.get("actor");
  if (!actor) return c.json({ error: "no actor selected" }, 401);

  let body: Record<string, unknown>;
  try { body = await c.req.json(); }
  catch { return c.json({ error: "invalid JSON" }, 400); }

  const result = withdraw_step(
    actor.actor_ref,
    c.req.param("chain_id"),
    c.req.param("step_id"),
    String(body.reason ?? ""),
  );

  if ("err" in result) return c.json({ error: result.err }, tokenToStatus(result.err));
  return c.json(result.ok);
});

export { steps };
