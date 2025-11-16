import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getSessionId } from "../lib/session";
import { PixelButton, SoundToggle } from "@/components";
import { useState } from "react";

export const Route = createFileRoute("/daily-leaderboard")({
  component: DailyLeaderboard,
});

function DailyLeaderboard() {
  const navigate = useNavigate();
  const sessionId = getSessionId();
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Default to today
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const leaderboard = useQuery(api.daily.getDailyLeaderboard, {
    date: selectedDate,
    limit: 100,
  });

  const playerRank = useQuery(api.daily.getPlayerRank, {
    playerId: sessionId,
    date: selectedDate,
  });

  const playerStats = useQuery(api.daily.getPlayerStats, {
    playerId: sessionId,
  });

  const formatDisplayDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };
    return date.toLocaleDateString('en-US', options);
  };

  const getTodayDate = () => {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const changeDateBy = (days: number) => {
    const [year, month, day] = selectedDate.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    date.setDate(date.getDate() + days);

    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    const newDay = String(date.getDate()).padStart(2, '0');
    setSelectedDate(`${newYear}-${newMonth}-${newDay}`);
  };

  const isToday = selectedDate === getTodayDate();
  const isFuture = selectedDate > getTodayDate();

  const handlePlayDaily = () => {
    navigate({ to: "/daily" });
  };

  return (
    <div className="min-h-screen bg-sky-400 p-4 md:p-8">
      <main className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="pixel-text text-white text-4xl md:text-6xl mb-4" style={{
            WebkitTextStroke: '2px #0c4a6e',
            textShadow: `
              2px 2px 0 #0c4a6e,
              4px 4px 0 #075985,
              6px 6px 0 #0369a1
            `
          }}>
            DAILY LEADERBOARD
          </h1>
        </div>

        {/* Date Navigation */}
        <div className="bg-white border-4 border-sky-900 p-4 mb-6">
          <div className="flex items-center justify-between gap-4">
            <PixelButton
              onClick={() => changeDateBy(-1)}
              size="small"
              aria-label="Previous day"
            >
              ← PREV
            </PixelButton>

            <div className="text-center flex-1">
              <p className="pixel-text text-sky-900 text-xl md:text-2xl">
                {formatDisplayDate(selectedDate)}
              </p>
              {isToday && (
                <p className="pixel-text text-sky-600 text-sm mt-1">TODAY</p>
              )}
            </div>

            <PixelButton
              onClick={() => changeDateBy(1)}
              size="small"
              disabled={isFuture}
              aria-label="Next day"
            >
              NEXT →
            </PixelButton>
          </div>

          {isToday && (
            <div className="mt-4 text-center">
              <PixelButton
                onClick={() => setSelectedDate(getTodayDate())}
                size="small"
                className="bg-yellow-400 hover:bg-yellow-300 border-yellow-600"
              >
                📅 TODAY
              </PixelButton>
            </div>
          )}
        </div>

        {/* Player Rank Banner */}
        {playerRank && isToday && (
          <div className="bg-yellow-100 border-4 border-yellow-600 p-4 mb-6 text-center">
            <p className="pixel-text text-yellow-900 text-lg">
              Your Rank: <span className="text-2xl font-bold">#{playerRank.rank}</span> out of {playerRank.totalPlayers} players
            </p>
            <p className="pixel-text text-yellow-800 text-base mt-2">
              Score: {playerRank.score.toLocaleString()}
            </p>
            {playerStats && (
              <p className="pixel-text text-yellow-800 text-base mt-2 flex items-center justify-center gap-2">
                <span className="flex items-center gap-1">
                  Streak: {playerStats.currentStreak}
                  <img src="/fire.svg" alt="" width="16" height="16" aria-hidden="true" />
                </span>
                <span>|</span>
                <span className="flex items-center gap-1">
                  Best: {playerStats.longestStreak}
                  <img src="/fire.svg" alt="" width="16" height="16" aria-hidden="true" />
                </span>
              </p>
            )}
          </div>
        )}

        {/* Leaderboard */}
        <section className="bg-white border-4 border-sky-900 p-6 mb-6">
          <h2 className="pixel-text text-sky-900 text-2xl mb-6 text-center flex items-center justify-center gap-2">
            <img src="/trophy.svg" alt="" width="32" height="32" aria-hidden="true" />
            TOP PLAYERS
          </h2>

          {leaderboard && leaderboard.length > 0 ? (
            <div className="space-y-2">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry._id}
                  className={`flex justify-between items-center p-4 border-2 ${
                    entry.playerId === sessionId
                      ? 'bg-yellow-100 border-yellow-600'
                      : index < 3
                        ? 'bg-sky-50 border-sky-300'
                        : 'bg-white border-sky-200'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className={`pixel-text text-2xl font-bold w-12 ${
                      index < 3 ? 'text-yellow-600' : 'text-sky-900'
                    }`}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                    </span>
                    <div>
                      <span className="pixel-text text-sky-900 text-lg md:text-xl">
                        {entry.playerName.toUpperCase()}
                      </span>
                      {entry.playerId === sessionId && (
                        <span className="pixel-text text-yellow-700 text-sm ml-2">
                          (YOU)
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="pixel-text text-sky-900 text-xl md:text-2xl font-bold">
                    {entry.score.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="pixel-text text-sky-600 text-xl mb-4">
                {isFuture ? "No data available for future dates" : "No players yet for this date"}
              </p>
              {isToday && (
                <p className="pixel-text text-sky-500 text-base">
                  Be the first to play today's challenge!
                </p>
              )}
            </div>
          )}
        </section>

        {/* Action Buttons */}
        <div className="space-y-4">
          {isToday && (
            <PixelButton
              onClick={handlePlayDaily}
              className="w-full bg-yellow-400 hover:bg-yellow-300 border-yellow-600"
            >
              🎵 PLAY TODAY'S CHALLENGE
            </PixelButton>
          )}
          <PixelButton
            onClick={() => navigate({ to: "/" })}
            className="w-full"
            variant="danger"
          >
            BACK TO HOME
          </PixelButton>
        </div>
      </main>
      <SoundToggle />
    </div>
  );
}
