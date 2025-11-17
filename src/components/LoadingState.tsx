import { PageLayout } from "./PageLayout";

interface LoadingStateProps {
  message?: string;
  showSpinner?: boolean;
}

export function LoadingState({ message = "LOADING...", showSpinner = true }: LoadingStateProps) {
  return (
    <PageLayout showClouds={false}>
      <div className="flex flex-col items-center justify-center gap-8">
        {showSpinner && (
          <div className="relative w-24 h-24">
            {/* Spinning vinyl record */}
            <div className="absolute inset-0 animate-spin-slow">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* Outer ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="#1e293b"
                  stroke="#0ea5e9"
                  strokeWidth="2"
                />
                {/* Inner grooves */}
                <circle cx="50" cy="50" r="38" fill="none" stroke="#475569" strokeWidth="1" />
                <circle cx="50" cy="50" r="32" fill="none" stroke="#475569" strokeWidth="1" />
                <circle cx="50" cy="50" r="26" fill="none" stroke="#475569" strokeWidth="1" />
                {/* Center label */}
                <circle cx="50" cy="50" r="15" fill="#fbbf24" stroke="#f59e0b" strokeWidth="2" />
                <circle cx="50" cy="50" r="5" fill="#1e293b" />
                {/* Speed indicator line */}
                <line x1="50" y1="50" x2="50" y2="20" stroke="#0ea5e9" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        )}

        <p className="pixel-text text-white text-2xl md:text-3xl animate-pulse">
          {message}
        </p>

        {/* Pixel dots animation */}
        <div className="flex gap-3">
          <div className="w-4 h-4 bg-white animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-4 h-4 bg-white animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-4 h-4 bg-white animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>

      <style>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 2s linear infinite;
        }
      `}</style>
    </PageLayout>
  );
}
