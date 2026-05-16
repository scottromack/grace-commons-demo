import type { FC } from "hono/jsx";

type LayoutProps = {
  title?: string;
  currentActor?: { actor_ref: string; display_name: string } | null;
  children?: unknown;
};

export const Layout: FC<LayoutProps> = ({
  title = "Grace Commons Demo",
  currentActor,
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
            <a href="/" class="text-sm text-gray-600 hover:text-gray-800">
              Chains
            </a>
            <a href="/me/in-tray" class="text-sm text-gray-600 hover:text-gray-800">
              In-tray
            </a>
            <a href="/audit-ui" class="text-sm text-gray-600 hover:text-gray-800">
              Audit log
            </a>
          </nav>
          <div class="flex items-center gap-3 text-sm">
            {currentActor ? (
              <form method="post" action="/act-as" class="flex items-center gap-2">
                <span class="text-gray-500">Acting as:</span>
                <span class="font-medium">{currentActor.display_name}</span>
                {/* Actor switcher will be wired in Step 3 */}
              </form>
            ) : (
              <span class="text-gray-400 italic">No actor selected</span>
            )}
          </div>
        </header>

        {/* Page content */}
        <main class="max-w-5xl mx-auto px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
};
