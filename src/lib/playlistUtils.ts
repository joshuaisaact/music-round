interface Playlist {
  tag: string;
  name: string;
  subtitle?: string;
  section?: string;
  songCount: number;
  previewSong: { artist: string; title: string };
}

export function groupPlaylistsBySection(
  playlists: Playlist[] | undefined
): Record<string, Playlist[]> {
  if (!playlists) return {};

  return playlists.reduce((acc, playlist) => {
    const section = playlist.section || "default";
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(playlist);
    return acc;
  }, {} as Record<string, Playlist[]>);
}
