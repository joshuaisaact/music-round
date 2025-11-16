import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PixelButton, SoundToggle, BouncingMusicIcons } from "@/components";

export const Route = createFileRoute("/battle-royale/")({
  component: BattleRoyaleIndex,
});

function BattleRoyaleIndex() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-sky-400 flex items-center justify-center p-4">
      {/* Skip to main content link for screen readers */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-yellow-400 focus:text-sky-900 focus:px-4 focus:py-2 focus:border-4 focus:border-sky-900 pixel-text"
      >
        Skip to main content
      </a>

      {/* Pixel art clouds background effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="pixel-cloud cloud-1"></div>
        <div className="pixel-cloud cloud-2"></div>
        <div className="pixel-cloud cloud-3"></div>
      </div>

      <main id="main-content" className="relative z-10 text-center max-w-2xl w-full">
        {/* Title */}
        <h1
          className="text-white max-w-[800px] mx-auto text-[3rem] sm:text-[6rem] leading-[1.3] mb-8"
          style={{
            fontFamily: '"VCR OSD Mono", monospace',
            WebkitTextStroke: '3px #0c4a6e',
            textShadow: `
              3px 3px 0 #0c4a6e,
              6px 6px 0 #075985,
              9px 9px 0 #0369a1,
              12px 12px 0 #0284c7
            `
          }}
        >
          BATTLE ROYALE
        </h1>

        {/* Musical notes decoration */}
        <BouncingMusicIcons size="medium" />

        {/* Mode Selection */}
        <div className="space-y-6 max-w-md mx-auto mt-8">
          <div className="bg-white border-4 border-sky-900 p-6">
            <h2 className="pixel-text text-sky-900 text-2xl mb-6">SELECT MODE</h2>

            <div className="space-y-4">
              {/* Solo Mode */}
              <PixelButton
                onClick={() => navigate({ to: "/battle-royale/solo" })}
                className="w-full bg-yellow-400 hover:bg-yellow-300 border-yellow-600"
                aria-label="Play solo battle royale"
              >
                <div className="text-center">
                  <div className="text-2xl mb-1">SOLO</div>
                  <div className="text-xs">SURVIVE AS LONG AS YOU CAN</div>
                </div>
              </PixelButton>

              {/* Multiplayer Mode */}
              <PixelButton
                onClick={() => navigate({ to: "/battle-royale/multiplayer" })}
                className="w-full"
                aria-label="Play multiplayer battle royale"
              >
                <div className="text-center">
                  <div className="text-2xl mb-1">MULTIPLAYER</div>
                  <div className="text-xs">COMPETE WITH FRIENDS</div>
                </div>
              </PixelButton>
            </div>
          </div>

          {/* Back Button */}
          <PixelButton
            onClick={() => navigate({ to: "/" })}
            className="w-full"
            variant="danger"
            size="small"
          >
            BACK TO HOME
          </PixelButton>
        </div>
      </main>

      <SoundToggle />
    </div>
  );
}
