import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { Layout } from "./views/layout.tsx";

const app = new Hono();

// Static assets
app.use("/styles.css", serveStatic({ path: "./public/styles.css" }));
app.use("/htmx.min.js", serveStatic({ path: "./public/htmx.min.js" }));

// Landing page — placeholder until Step 9 wires the real chain list
app.get("/", (c) => {
  return c.html(
    <Layout title="Grace Commons Demo">
      <div class="text-center py-16 text-gray-400">
        <p class="text-lg font-medium text-gray-600">Multi-Party Approval Demo</p>
        <p class="mt-2 text-sm">Build in progress — step 1 of 10</p>
      </div>
    </Layout>
  );
});

export { app };
