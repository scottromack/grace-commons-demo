import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { Layout } from "./views/layout.tsx";
import { currentActorMiddleware, type AppVariables } from "./middleware/current_actor.ts";
import { listActors } from "./domain/actor.ts";
import { auth } from "./routes/auth.ts";

const app = new Hono<{ Variables: AppVariables }>();

// Static assets
app.use("/styles.css", serveStatic({ path: "./public/styles.css" }));
app.use("/htmx.min.js", serveStatic({ path: "./public/htmx.min.js" }));

// Resolve current actor from cookie on every request
app.use("*", currentActorMiddleware);

// Auth route
app.route("/", auth);

// Landing page — placeholder until Step 9 wires the real chain list
app.get("/", (c) => {
  const actor = c.get("actor");
  const actors = listActors();

  return c.html(
    <Layout title="Grace Commons Demo" currentActor={actor} actors={actors}>
      <div class="text-center py-16 text-gray-400">
        <p class="text-lg font-medium text-gray-600">Multi-Party Approval Demo</p>
        <p class="mt-2 text-sm">Build in progress — step 3 of 10</p>
        {actor && (
          <p class="mt-4 text-sm text-gray-500">
            Current actor: <span class="font-medium text-gray-700">{actor.display_name}</span>
            {" "}(<code class="text-xs">{actor.actor_ref}</code>)
          </p>
        )}
      </div>
    </Layout>,
  );
});

export { app };
