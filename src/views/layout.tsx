import type { FC } from "hono/jsx";
import type { Actor } from "../domain/actor.ts";

type LayoutProps = {
  title?: string;
  currentActor?: Actor | null;
  actors?: Actor[];
  children?: unknown;
};

export const Layout: FC<LayoutProps> = ({
  title = "Grace Commons Demo",
  currentActor,
  actors = [],
  children,
}) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <link rel="stylesheet" href="/styles.css" />
        <script src="/htmx.min.js" defer></script>
      </head>
      <body class="bg-gray-50 text-gray-900 min-h-screen">
        {/* Top bar */}
        <header class="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <nav class="flex items-center gap-6">
            <a href="/" class="font-semibold text-gray-800 hover:text-gray-600">
              Grace Commons
            </a>
            <a href="/" class="text-sm text-gray-600 hover:text-gray-900">
              Chains
            </a>
            <a href="/me/in-tray" class="text-sm text-gray-600 hover:text-gray-900">
              In-tray
            </a>
            <a href="/audit-ui" class="text-sm text-gray-600 hover:text-gray-900">
              Audit log
            </a>
          </nav>

          {/* Actor switcher */}
          {actors.length > 0 && (
            <form method="post" action="/act-as" class="flex items-center gap-2 text-sm">
              <span class="text-gray-500">Acting as:</span>
              <select
                name="actor_ref"
                onchange="this.form.submit()"
                class="border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
              >
                {actors
                  .filter((a) => a.kind === "human")
                  .map((a) => (
                    <option
                      value={a.actor_ref}
                      selected={currentActor?.actor_ref === a.actor_ref}
                    >
                      {a.display_name}
                    </option>
                  ))}
              </select>
            </form>
          )}

          {actors.length === 0 && (
            <span class="text-sm text-gray-400 italic">
              {currentActor ? currentActor.display_name : "No actor selected"}
            </span>
          )}
        </header>

        {/* Page content */}
        <main class="max-w-5xl mx-auto px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
};
