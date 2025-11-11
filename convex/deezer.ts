import { v } from "convex/values";
import { action } from "./_generated/server";

interface DeezerTrack {
  id: number;
  title: string;
  preview: string; // 30-second MP3 URL
  artist: {
    name: string;
  };
  album: {
    cover_medium: string;
    release_date?: string;
  };
}

interface DeezerSearchResponse {
  data: DeezerTrack[];
  total: number;
}

export const searchTrack = action({
  args: {
    artist: v.string(),
    title: v.string(),
  },
  handler: async (ctx, { artist, title }) => {
    console.log(`[Deezer] Searching for: ${artist} - ${title}`);

    // Search Deezer for the track
    const query = encodeURIComponent(`artist:"${artist}" track:"${title}"`);
    const searchUrl = `https://api.deezer.com/search?q=${query}`;
    console.log(`[Deezer] Query URL: ${searchUrl}`);

    const response = await fetch(searchUrl);

    if (!response.ok) {
      console.error(`[Deezer] Search failed: ${response.statusText}`);
      throw new Error(`Deezer search failed: ${response.statusText}`);
    }

    const data = (await response.json()) as DeezerSearchResponse;
    const track = data.data?.[0];

    if (!track) {
      console.error(`[Deezer] Track not found: ${artist} - ${title}`);
      throw new Error(`Track not found: ${artist} - ${title}`);
    }

    console.log(`[Deezer] Found track:`, {
      id: track.id,
      title: track.title,
      artist: track.artist.name,
      hasPreview: !!track.preview,
      previewUrl: track.preview,
      hasAlbumArt: !!track.album.cover_medium,
      albumArtUrl: track.album.cover_medium,
    });

    // Extract the year from release date (YYYY-MM-DD)
    const releaseYear = track.album.release_date
      ? parseInt(track.album.release_date.split("-")[0], 10)
      : undefined;

    const result = {
      deezerId: track.id.toString(),
      previewURL: track.preview || "",
      correctArtist: track.artist.name,
      correctTitle: track.title,
      albumArt: track.album.cover_medium || "",
      releaseYear,
    };

    console.log(`[Deezer] Returning:`, result);
    return result;
  },
});
