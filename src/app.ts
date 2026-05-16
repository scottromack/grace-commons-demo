import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { Layout } from "./views/layout.tsx";
import { currentActorMiddleware, type AppVariables } from "./middleware/current_actor.ts";
import { listActors } from "./domain/actor.ts";
import { auth } from "./routes/auth.ts";
import { chains } from "./routes/chains.ts";
import { steps } from "./routes/steps.ts";
import { audit } from "./routes/audit.ts";
import { verify } from "./routes/verify.ts";

const app = new Hono<{ Variables: AppVariables }>();

// Static assets
app.use("/styles.css", serveStatic({ path: "./public/styles.css" }));
app.use("/htmx.min.js", serveStatic({ path: "./public/htmx.min.js" }));

// Resolve current actor from cookie on every request
app.use("*", currentActorMiddleware);

// Auth
app.route("/", auth);

// API routes
app.route("/chains", chains);
app.route("/chains", steps);   // step routes nest under /chains/:id/steps/:id
app.route("/audit", audit);
app.route("/verify", verify);

// Landing page — placeholder until Step 9 wires the real chain list
app.get("/", (c) => {
  const actor = c.get("actor");
  const actors = listActors();

  return c.html(
    <Layout title="Grace Commons Demo" currentActor={actor} actors={actors}>
      <div class="text-center py-16 text-gray-400">
        <p class="text-lg font-medium text-gray-600">Multi-Party Approval Demo</p>
        <p class="mt-2 text-sm">Build in progress — step 8 of 10</p>
        {actor && (
          <p class="mt-4 text-sm text-gray-500">
            Current actor:{" "}
            <span class="font-medium text-gray-700">{actor.display_name}</span>
            {" "}(<code class="text-xs">{actor.actor_ref}</code>)
          </p>
        )}
        <div class="mt-8 text-xs text-gray-400 space-y-1">
          <p>JSON API live: <code>GET /chains</code> · <code>POST /chains</code> · <code>GET /audit</code> · <code>GET /verify/chains/:id</code></p>
        </div>
      </div>
    </Layout>,
  );
});

export { app };
