import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";

import ConvexProvider from "../integrations/convex/provider";

import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";

import appCss from "../styles.css?url";

import type { QueryClient } from "@tanstack/react-query";

interface MyRouterContext {
  queryClient: QueryClient;
}

function RootErrorComponent({ error }: ErrorComponentProps) {
  return (
    <div className="min-h-screen bg-sky-500 flex items-center justify-center p-4">
      <div className="bg-white border-4 border-sky-900 p-8 max-w-md text-center">
        <h1 className="pixel-text text-2xl text-sky-900 mb-4">SOMETHING WENT WRONG</h1>
        <p className="pixel-text text-sky-700 text-sm mb-6">
          {error.message || "An unexpected error occurred"}
        </p>
        <a
          href="/"
          className="pixel-button bg-white text-xl py-3 px-6 inline-block"
        >
          BACK TO HOME
        </a>
        {import.meta.env.DEV && (
          <pre className="mt-4 text-left text-xs bg-red-50 p-2 overflow-auto max-h-40 border border-red-200">
            {error.stack}
          </pre>
        )}
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  errorComponent: RootErrorComponent,
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Music Round",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),

  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <ConvexProvider>
          {children}
          {import.meta.env.DEV && (
            <TanStackDevtools
              config={{
                position: "bottom-right",
              }}
              plugins={[
                {
                  name: "Tanstack Router",
                  render: <TanStackRouterDevtoolsPanel />,
                },
                TanStackQueryDevtools,
              ]}
            />
          )}
        </ConvexProvider>

        <Scripts />
      </body>
    </html>
  );
}
