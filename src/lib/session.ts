export function getSessionId(): string {
  if (typeof window === "undefined") return "";

  let sessionId = localStorage.getItem("musicround-session");
  if (!sessionId) {
    sessionId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("musicround-session", sessionId);
  }
  return sessionId;
}
