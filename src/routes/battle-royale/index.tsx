import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PixelButton, SoundToggle, BouncingMusicIcons, PageLayout, PixelTitle } from "@/components";

export const Route = createFileRoute("/battle-royale/")({
  component: BattleRoyaleIndex,
});

function BattleRoyaleIndex() {
  const navigate = useNavigate();

  return (
    <PageLayout>
      <div className="max-w-2xl w-full">
        <PixelTitle size="medium" className="mb-8">BATTLE ROYALE</PixelTitle>

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
      </div>

      <SoundToggle />
    </PageLayout>
  );
}
