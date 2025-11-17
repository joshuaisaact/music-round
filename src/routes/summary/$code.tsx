import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { getSessionId } from "../../lib/session";
import { PixelButton, PlayerStandings, SoundToggle, LoadingState, ErrorState } from "@/components";
import { useState, useEffect } from "react";
import { generateSongEmojis } from "@/lib/shareUtils";
import { GameMode } from "@/types/gameMode";
import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;

export const Route = createFileRoute("/summary/$code")({
  component: Summary,
  loader: async ({ params }) => {
    const code = params.code;
    if (!code) {
      return { game: null, players: [], rounds: [], availablePlaylists: null, soloPlayerAnswers: null, isSolo: false };
    }

    try {
      // Call Convex directly from the loader (loaders run on the server in SSR)
      const convex = new ConvexHttpClient(CONVEX_URL);

      // Fetch game first
      const game = await convex.query(api.games.getByCode, { code });

      if (!game) {
        return {
          game: null,
          players: [],
          rounds: [],
          availablePlaylists: null,
          soloPlayerAnswers: null,
          isSolo: false
        };
      }

      // Fetch players, rounds, and playlists in parallel
      const [players, rounds, availablePlaylists] = await Promise.all([
        convex.query(api.players.list, { gameId: game._id }),
        convex.query(api.rounds.list, { gameId: game._id }),
        convex.query(api.songs.getAvailablePlaylists),
      ]);

      // For solo games, fetch the player's answers (no session needed!)
      let soloPlayerAnswers = null;
      if (game.settings.isSinglePlayer && players.length === 1) {
        soloPlayerAnswers = await convex.query(api.answers.listForPlayer, {
          playerId: players[0]._id,
        });
      }

      return {
        game,
        players,
        rounds,
        availablePlaylists,
        soloPlayerAnswers,
        isSolo: game.settings.isSinglePlayer,
      };
    } catch (error) {
      console.error('Error fetching game summary in loader:', error);
      return {
        game: null,
        players: [],
        rounds: [],
        availablePlaylists: null,
        soloPlayerAnswers: null,
        isSolo: false
      };
    }
  },
});

function Summary() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const sessionId = getSessionId();
  const [isCreatingNewGame, setIsCreatingNewGame] = useState(false);

  // Get SSR'd data from loader
  const loaderData = Route.useLoaderData();

  // For solo games: Use SSR data exclusively (no client-side fallback)
  // For multiplayer: Fallback to client-side queries if needed
  const isSoloGame = loaderData?.isSolo ?? false;

  // Always use SSR data for game, players, rounds, playlists
  const game = loaderData?.game ?? null;
  const players = Array.isArray(loaderData?.players) ? loaderData.players : [];
  const rounds = Array.isArray(loaderData?.rounds) ? loaderData.rounds : [];
  const availablePlaylists = loaderData?.availablePlaylists ?? null;

  // Solo games: Everything comes from SSR (no client queries needed!)
  const soloPlayer = isSoloGame && players.length === 1 ? players[0] : null;
  const soloPlayerAnswers = loaderData?.soloPlayerAnswers ?? null;

  // Multiplayer: Fetch current player and their answers client-side (needs session)
  const currentPlayerQuery = useQuery(
    api.players.getBySession,
    (!isSoloGame && game) ? { gameId: game._id, sessionId } : "skip",
  );
  const playerAnswersQuery = useQuery(
    api.answers.listForPlayer,
    (!isSoloGame && currentPlayerQuery) ? { playerId: currentPlayerQuery._id } : "skip",
  );

  // Use the appropriate data source based on game type
  const currentPlayer = isSoloGame ? soloPlayer : currentPlayerQuery;
  const playerAnswers = isSoloGame ? soloPlayerAnswers : playerAnswersQuery;

  // Daily mode specific queries
  const isDailyMode = game?.settings.gameMode === GameMode.DAILY;
  const dailyLeaderboard = useQuery(
    api.daily.getDailyLeaderboard,
    isDailyMode ? { limit: 10 } : "skip"
  );
  const playerRank = useQuery(
    api.daily.getPlayerRank,
    isDailyMode ? { playerId: sessionId } : "skip"
  );
  const playerStats = useQuery(
    api.daily.getPlayerStats,
    isDailyMode ? { playerId: sessionId } : "skip"
  );

  // Battle royale mode specific queries
  const isBattleRoyale = game?.settings.gameMode === GameMode.BATTLE_ROYALE;
  const battleRoyaleLeaderboard = useQuery(
    api.battleRoyale.getLeaderboard,
    isBattleRoyale && game ? { playlistTag: game.settings.playlistTag || "daily-songs" } : "skip"
  );
  const battleRoyalePlayerRank = useQuery(
    api.battleRoyale.getPlayerRank,
    isBattleRoyale && game ? { playerId: sessionId, playlistTag: game.settings.playlistTag || "daily-songs" } : "skip"
  );

  const createGame = useMutation(api.games.create);
  const joinGame = useMutation(api.players.join);
  const submitDailyScore = useMutation(api.daily.submitDailyScore);
  const updateStreak = useMutation(api.daily.updateStreak);
  const submitBattleRoyaleScore = useMutation(api.battleRoyale.submitScore);

  // Submit daily score and update streak on mount for daily mode
  useEffect(() => {
    if (isDailyMode && game && currentPlayer) {
      // Submit score
      submitDailyScore({
        playerId: sessionId,
        playerName: currentPlayer.name,
        score: currentPlayer.score,
        gameId: game._id,
      }).catch(err => {
        console.error("Failed to submit daily score:", err);
      });

      // Update streak
      updateStreak({
        playerId: sessionId,
      }).catch(err => {
        console.error("Failed to update streak:", err);
      });
    }
  }, [isDailyMode, game?._id, currentPlayer?.score, currentPlayer?.name, sessionId, submitDailyScore, updateStreak]);

  // Submit battle royale score on mount
  useEffect(() => {
    if (isBattleRoyale && game && currentPlayer && playerAnswers) {
      // Count actual rounds completed (where player submitted answers)
      const roundsCompleted = playerAnswers.length;
      const livesRemaining = currentPlayer.lives ?? 0;

      submitBattleRoyaleScore({
        playerId: sessionId,
        playerName: currentPlayer.name,
        score: currentPlayer.score,
        roundsCompleted,
        livesRemaining,
        gameId: game._id,
        playlistTag: game.settings.playlistTag || "daily-songs",
      }).catch(err => {
        console.error("Failed to submit battle royale score:", err);
      });
    }
  }, [isBattleRoyale, game?._id, currentPlayer?.score, currentPlayer?.name, currentPlayer?.lives, playerAnswers?.length, sessionId, submitBattleRoyaleScore]);

  const handlePlayAgain = async () => {
    if (!game || !currentPlayer || isCreatingNewGame) return;

    try {
      setIsCreatingNewGame(true);

      const newGame = await createGame({
        hostId: sessionId,
        settings: game.settings,
      });

      await joinGame({
        code: newGame.code,
        sessionId,
        name: currentPlayer.name,
      });

      // For daily mode, skip lobby and go straight to game
      if (isDailyMode) {
        navigate({ to: `/game/${newGame.code}` });
      } else {
        navigate({ to: `/lobby/${newGame.code}` });
      }
    } catch (error) {
      console.error("Failed to create new game:", error);
      setIsCreatingNewGame(false);
    }
  };

  const handleShare = () => {
    if (!currentPlayer || !game || !playerAnswers) return;

    // Calculate daily number (days since Jan 1, 2025)
    const startDate = new Date('2025-01-01');
    const today = new Date();
    const dayNumber = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Create visual representation for each song
    const songEmojis = generateSongEmojis(playerAnswers);

    const hintsUsed = currentPlayer.hintsUsed || 0;
    const streak = playerStats?.currentStreak || 1;

    const shareText = `Music Round Daily #${dayNumber}
${songEmojis}
Score: ${currentPlayer.score.toLocaleString()}/5,000 | Hints: ${hintsUsed}
Streak: ${streak}🔥
${window.location.origin}/daily`;

    navigator.clipboard.writeText(shareText).then(() => {
      alert("Results copied to clipboard!");
    }).catch(err => {
      console.error("Failed to copy:", err);
    });
  };

  const handleShareBattleRoyale = () => {
    if (!currentPlayer || !game || !playerAnswers || !availablePlaylists) return;

    const playlistName = availablePlaylists.find(p => p.tag === game.settings.playlistTag)?.name || game.settings.playlistTag || "Daily Songs";
    const playlistTag = game.settings.playlistTag || "daily-songs";
    const roundsCompleted = playerAnswers.length;

    // Create visual representation for each song (show first 10, then ...)
    const displayedAnswers = playerAnswers.slice(0, 10);
    const songEmojis = generateSongEmojis(displayedAnswers);

    const moreRounds = roundsCompleted > 10 ? ` +${roundsCompleted - 10}` : '';

    // Use solo or multiplayer route based on game settings
    const battleRoyaleRoute = game.settings.isSinglePlayer
      ? `/battle-royale/solo?playlist=${playlistTag}`
      : `/battle-royale/multiplayer?playlist=${playlistTag}`;

    const shareText = `Music Round Battle Royale 🎵
${playlistName}
${songEmojis}${moreRounds}
Rounds Survived: ${roundsCompleted} | Score: ${currentPlayer.score.toLocaleString()}

${window.location.href}
${window.location.origin}${battleRoyaleRoute}`;

    navigator.clipboard.writeText(shareText).then(() => {
      alert("Results copied to clipboard!");
    }).catch(err => {
      console.error("Failed to copy:", err);
    });
  };

  // For solo games: data is always synchronous from SSR (null = error, not loading)
  // For multiplayer: undefined = still loading, null = error
  if (isSoloGame) {
    // Solo game validation - no loading states, just errors
    if (!game) {
      return (
        <ErrorState
          title="GAME NOT FOUND"
          onButtonClick={() => navigate({ to: "/" })}
        />
      );
    }
    if (!currentPlayer || players.length === 0) {
      return (
        <ErrorState
          title="NO PLAYER DATA"
          onButtonClick={() => navigate({ to: "/" })}
        />
      );
    }
  } else {
    // Multiplayer: wait for client-side queries
    if (game === undefined || currentPlayer === undefined || playerAnswers === undefined) {
      return <LoadingState />;
    }

    // Game not found
    if (game === null) {
      return (
        <ErrorState
          title="GAME NOT FOUND"
          onButtonClick={() => navigate({ to: "/" })}
        />
      );
    }

    // No player data
    if (!currentPlayer || players.length === 0) {
      return <LoadingState />;
    }
  }

  // Game wrong status
  if (game.status !== "finished") {
    return (
      <ErrorState
        title="GAME NOT FINISHED"
        onButtonClick={() => navigate({ to: "/" })}
      />
    );
  }

  const sortedPlayers = players.toSorted((a, b) => b.score - a.score);
  const topScore = sortedPlayers[0].score;
  const winners = sortedPlayers.filter((p) => p.score === topScore);
  const isHost = currentPlayer.isHost === true;

  return (
    <div className="min-h-screen bg-sky-400 p-4 md:p-8">
      <main className="max-w-4xl mx-auto">
        {/* Winner Announcement - only show if multiplayer */}
        {players.length > 1 && (
          <section className="bg-yellow-100 border-4 border-yellow-600 p-8 mb-6" aria-labelledby="winner-heading">
            <div className="text-center">
              <h1 id="winner-heading" className="pixel-text text-yellow-900 text-2xl md:text-4xl mb-4 flex items-center justify-center gap-4">
                <img src="/trophy.svg" alt="" width="40" height="40" aria-hidden="true" />
                {winners.length > 1 ? "TIE!" : "WINNER"}
                <img src="/trophy.svg" alt="" width="40" height="40" aria-hidden="true" />
              </h1>
              {winners.length > 1 ? (
                <div className="space-y-2" role="list" aria-label="Tied winners">
                  {winners.map((w) => (
                    <p
                      key={w._id}
                      className="pixel-text text-yellow-900 text-2xl md:text-4xl"
                      role="listitem"
                    >
                      {w.name.toUpperCase()}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="pixel-text text-yellow-900 text-3xl md:text-5xl" aria-label={`Winner is ${winners[0].name}`}>
                  {winners[0].name.toUpperCase()}
                </p>
              )}
            </div>
          </section>
        )}

        {/* Final Leaderboard or Solo Score */}
        <section className="bg-white border-4 border-sky-900 p-6 mb-6" aria-labelledby="standings-heading">
          {game.settings.isSinglePlayer ? (
            <div className="text-center">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="pixel-text text-sky-600 text-sm mb-2">PLAYER</p>
                    <p className="pixel-text text-sky-900 text-2xl md:text-3xl font-bold">
                      {currentPlayer.name.toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <p className="pixel-text text-sky-600 text-sm mb-2">PLAYLIST</p>
                    <p className="pixel-text text-sky-900 text-xl md:text-2xl font-bold">
                      {availablePlaylists?.find(p => p.tag === game.settings.playlistTag)?.name || game.settings.playlistTag || "Daily Songs"}
                    </p>
                  </div>
                </div>
                {isBattleRoyale ? (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="pixel-text text-sky-600 text-sm mb-2">SONGS COMPLETED</p>
                      <p className="pixel-text text-sky-900 text-3xl md:text-4xl font-bold">
                        {playerAnswers?.length || 0}
                      </p>
                    </div>
                    <div>
                      <p className="pixel-text text-sky-600 text-sm mb-2">FINAL SCORE</p>
                      <p className="pixel-text text-sky-900 text-3xl md:text-4xl font-bold">
                        {currentPlayer.score.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="pixel-text text-red-600 text-sm mb-2">LIVES USED</p>
                      <p className="pixel-text text-red-900 text-3xl md:text-4xl font-bold flex items-center justify-center gap-1">
                        <img src="/heart.svg" alt="" width="28" height="28" aria-hidden="true" />
                        {3 - (currentPlayer.lives ?? 3)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="pixel-text text-sky-600 text-sm mb-2">FINAL SCORE</p>
                      <p className="pixel-text text-sky-900 text-3xl md:text-4xl font-bold">
                        {currentPlayer.score} / {game.settings.roundCount * 1000}
                      </p>
                    </div>
                    <div>
                      <p className="pixel-text text-sky-600 text-sm mb-2">ACCURACY</p>
                      <p className="pixel-text text-sky-900 text-3xl md:text-4xl font-bold">
                        {playerAnswers ?
                          `${playerAnswers.filter(a => a.artistCorrect).length + playerAnswers.filter(a => a.titleCorrect).length} / ${game.settings.roundCount * 2}` :
                          '0 / 0'
                        }
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <h2 id="standings-heading" className="pixel-text text-sky-900 text-2xl mb-6 text-center">
                FINAL STANDINGS
              </h2>
              <PlayerStandings
                players={players}
                currentPlayerId={currentPlayer._id}
                variant="detailed"
                showRankMedals={!game.settings.isSinglePlayer}
                showLives={game.settings.gameMode === GameMode.BATTLE_ROYALE && !game.settings.isSinglePlayer}
              />
            </>
          )}
        </section>

        {/* Daily Leaderboard - only show for daily mode */}
        {isDailyMode && (
          <section className="bg-yellow-50 border-4 border-yellow-600 p-6 mb-6" aria-labelledby="daily-leaderboard-heading">
            <div className="text-center mb-6">
              <h2 id="daily-leaderboard-heading" className="pixel-text text-yellow-900 text-2xl mb-2">
                🏆 TODAY'S LEADERBOARD
              </h2>
              {playerRank && (
                <p className="pixel-text text-yellow-800 text-lg">
                  YOUR RANK: #{playerRank.rank} OUT OF {playerRank.totalPlayers} PLAYERS
                </p>
              )}
              {playerStats && (
                <p className="pixel-text text-yellow-800 text-lg mt-2 flex items-center justify-center gap-2">
                  <span className="flex items-center gap-1">
                    STREAK: {playerStats.currentStreak}
                    <img src="/fire.svg" alt="" width="16" height="16" aria-hidden="true" />
                  </span>
                  <span>|</span>
                  <span className="flex items-center gap-1">
                    BEST: {playerStats.longestStreak}
                    <img src="/fire.svg" alt="" width="16" height="16" aria-hidden="true" />
                  </span>
                </p>
              )}
            </div>

            {dailyLeaderboard && dailyLeaderboard.length > 0 ? (
              <div className="space-y-2 mb-6">
                {dailyLeaderboard.map((entry, index) => (
                  <div
                    key={entry._id}
                    className={`flex justify-between items-center p-3 border-2 ${
                      entry.playerId === sessionId
                        ? 'bg-yellow-200 border-yellow-700'
                        : 'bg-white border-yellow-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="pixel-text text-yellow-900 text-xl font-bold w-8">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                      </span>
                      <span className="pixel-text text-yellow-900 text-lg">
                        {entry.playerName.toUpperCase()}
                      </span>
                    </div>
                    <span className="pixel-text text-yellow-900 text-xl font-bold">
                      {entry.score.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="pixel-text text-yellow-800 text-center mb-6">
                Loading leaderboard...
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <PixelButton
                onClick={handleShare}
                className="flex-1 border-yellow-600"
              >
                <span className="flex items-center justify-center gap-2">
                  <img src="/copy.svg" alt="" width="20" height="20" aria-hidden="true" />
                  SHARE RESULTS
                </span>
              </PixelButton>
              <PixelButton
                onClick={() => navigate({ to: "/daily-leaderboard" })}
                className="flex-1"
              >
                VIEW FULL LEADERBOARD
              </PixelButton>
            </div>
          </section>
        )}

        {/* Battle Royale Leaderboard - only show for battle royale mode */}
        {isBattleRoyale && (
          <section className="bg-red-50 border-4 border-red-600 p-6 mb-6" aria-labelledby="battle-royale-leaderboard-heading">
            <div className="text-center mb-6">
              <h2 id="battle-royale-leaderboard-heading" className="pixel-text text-red-900 text-2xl mb-2 flex items-center justify-center gap-2">
                <img src="/trophy.svg" alt="" width="28" height="28" aria-hidden="true" />
                LEADERBOARD
              </h2>
              <p className="pixel-text text-red-800 text-lg mb-2">
                {availablePlaylists?.find(p => p.tag === game.settings.playlistTag)?.name || game.settings.playlistTag || "Daily Songs"}
              </p>
              {battleRoyalePlayerRank && (
                <p className="pixel-text text-red-800 text-lg">
                  YOUR RANK: #{battleRoyalePlayerRank.rank} OUT OF {battleRoyalePlayerRank.totalPlayers} PLAYERS
                </p>
              )}
            </div>

            {battleRoyaleLeaderboard && battleRoyaleLeaderboard.length > 0 ? (
              <div className="space-y-2 mb-6">
                {battleRoyaleLeaderboard.slice(0, 10).map((entry, index) => (
                  <div
                    key={entry._id}
                    className={`flex justify-between items-center p-3 border-2 ${
                      entry.playerId === sessionId
                        ? 'bg-red-200 border-red-700'
                        : 'bg-white border-red-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="pixel-text text-red-900 text-xl font-bold w-8">
                        {index === 0 ? (
                          <img src="/medal-1.svg" alt="1st place" width="24" height="24" />
                        ) : index === 1 ? (
                          <img src="/medal-2.svg" alt="2nd place" width="24" height="24" />
                        ) : index === 2 ? (
                          <img src="/medal-3.svg" alt="3rd place" width="24" height="24" />
                        ) : (
                          `${index + 1}.`
                        )}
                      </span>
                      <span className="pixel-text text-red-900 text-lg">
                        {entry.playerName.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="pixel-text text-red-700 text-sm">
                        R{entry.roundsCompleted}
                      </span>
                      <span className="pixel-text text-red-900 text-xl font-bold">
                        {entry.score.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="pixel-text text-red-800 text-center mb-6">
                Loading leaderboard...
              </p>
            )}

            <PixelButton
              onClick={handleShareBattleRoyale}
              className="w-full border-red-600"
            >
              <span className="flex items-center justify-center gap-2">
                <img src="/copy.svg" alt="" width="20" height="20" aria-hidden="true" />
                SHARE RESULTS
              </span>
            </PixelButton>
          </section>
        )}

        {/* Round Breakdown */}
        {playerAnswers && rounds && (
          <section className="bg-white border-4 border-sky-900 p-6 mb-6" aria-labelledby="breakdown-heading">
            <h2 id="breakdown-heading" className="sr-only">Round by Round Breakdown</h2>
            <ul className="space-y-4" role="list">
              {rounds.map((round) => {
                const answer = playerAnswers.find(
                  (a) => a.roundId === round._id,
                );
                const { correctArtist, correctTitle, albumArt } = round.songData;

                return (
                  <li
                    key={round._id}
                    className="border-2 border-sky-300 p-4 bg-sky-50"
                  >
                    <article className="flex gap-4">
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="pixel-text text-sky-900 text-sm font-bold mb-2">
                            SONG {round.roundNumber + 1}
                          </h3>
                          {answer && (
                            <div>
                              <p
                                className={`pixel-text text-base md:text-lg mb-1 md:mb-2 ${answer.artistCorrect ? "text-green-700" : "text-red-700"}`}
                                aria-label={`Your artist answer: ${answer.artist || "blank"}, ${answer.artistCorrect ? "correct" : "incorrect"}`}
                              >
                                {answer.artist ? answer.artist.toUpperCase() : "—"}
                              </p>
                              <p
                                className={`pixel-text text-base md:text-lg ${answer.titleCorrect ? "text-green-700" : "text-red-700"}`}
                                aria-label={`Your title answer: ${answer.title || "blank"}, ${answer.titleCorrect ? "correct" : "incorrect"}`}
                              >
                                {answer.title ? answer.title.toUpperCase() : "—"}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <p className="pixel-text text-sky-700 text-sm md:text-lg" aria-label={answer ? `You earned ${answer.points} points` : "No answer submitted"}>
                            {answer ? `${answer.points}PTS` : "NO ANSWER"}
                          </p>
                          {answer && answer.hintsUsed && answer.hintsUsed > 0 && (
                            <div className="flex items-center gap-1">
                              {Array.from({ length: answer.hintsUsed }).map((_, i) => (
                                <img key={`hint-${i}`} src="/light-bulb.svg" alt="" width="12" height="12" aria-hidden="true" />
                              ))}
                              <span className="pixel-text text-yellow-700 text-xs">
                                {answer.hintsUsed} {answer.hintsUsed === 1 ? 'HINT' : 'HINTS'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        {albumArt && (
                          <img
                            src={albumArt}
                            alt={`Album art for ${correctTitle} by ${correctArtist}`}
                            className="w-24 h-24 border-4 border-sky-900"
                          />
                        )}
                        <div className="text-right" aria-label={`Correct answer: ${correctArtist}, ${correctTitle}`}>
                          <p className="pixel-text text-sky-900 text-sm">
                            {correctArtist.toUpperCase()}
                          </p>
                          <p className="pixel-text text-sky-900 text-sm">
                            {correctTitle.toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Action Buttons */}
        <nav className="space-y-4" aria-label="Game actions">
          {isHost && (
            <PixelButton
              onClick={handlePlayAgain}
              disabled={isCreatingNewGame}
              className="w-full"
              aria-label={isCreatingNewGame ? "Creating new game..." : "Play again with same settings"}
            >
              {isCreatingNewGame ? "CREATING..." : "PLAY AGAIN"}
            </PixelButton>
          )}
          <PixelButton
            onClick={() => navigate({ to: "/" })}
            className="w-full"
            size="medium"
            variant="danger"
            aria-label="Return to home screen"
          >
            BACK TO HOME
          </PixelButton>
        </nav>
      </main>
      <SoundToggle />
    </div>
  );
}
