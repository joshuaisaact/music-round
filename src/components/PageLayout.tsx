import { ReactNode } from "react";

interface PageLayoutProps {
  children: ReactNode;
  showClouds?: boolean;
  showSkipLink?: boolean;
  className?: string;
}

export function PageLayout({
  children,
  showClouds = true,
  showSkipLink = true,
  className = "flex items-center justify-center"
}: PageLayoutProps) {
  return (
    <div className={`min-h-screen bg-sky-400 p-4 ${className}`}>
      {showSkipLink && (
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-yellow-400 focus:text-sky-900 focus:px-4 focus:py-2 focus:border-4 focus:border-sky-900 pixel-text"
        >
          Skip to main content
        </a>
      )}

      {showClouds && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="pixel-cloud cloud-1"></div>
          <div className="pixel-cloud cloud-2"></div>
          <div className="pixel-cloud cloud-3"></div>
        </div>
      )}

      <main id="main-content" className="relative z-10 text-center">
        {children}
      </main>
    </div>
  );
}
