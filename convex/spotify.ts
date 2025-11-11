import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

interface SpotifyAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    images: { url: string }[];
    release_date: string;
  };
  preview_url: string | null;
}

async function getSpotifyAccessToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Spotify credentials not configured. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in Convex environment.",
    );
  }

  const credentials = btoa(`${clientId}:${clientSecret}`);

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error(`Spotify auth failed: ${response.statusText}`);
  }

  const data = (await response.json()) as SpotifyAuthResponse;
  return data.access_token;
}

export const searchTrack = action({
  args: {
    artist: v.string(),
    title: v.string(),
  },
  handler: async (ctx, { artist, title }) => {
    console.log(`[Spotify] Searching for: ${artist} - ${title}`);
    const accessToken = await getSpotifyAccessToken();

    // Search for the specific track
    const query = encodeURIComponent(`track:${title} artist:${artist}`);
    const searchUrl = `https://api.spotify.com/v1/search?q=${query}&type=track&limit=1&market=US`;
    console.log(`[Spotify] Query URL: ${searchUrl}`);

    const response = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error(`[Spotify] Search failed: ${response.statusText}`);
      throw new Error(`Spotify search failed: ${response.statusText}`);
    }

    const data = await response.json();
    const track = data.tracks?.items?.[0] as SpotifyTrack | undefined;

    if (!track) {
      console.error(`[Spotify] Track not found: ${artist} - ${title}`);
      throw new Error(`Track not found: ${artist} - ${title}`);
    }

    console.log(`[Spotify] Found track:`, {
      id: track.id,
      name: track.name,
      artist: track.artists[0]?.name,
      hasPreview: !!track.preview_url,
      previewUrl: track.preview_url,
      hasAlbumArt: track.album.images.length > 0,
      albumArtUrl: track.album.images[0]?.url,
    });

    // Extract the year from release date (YYYY-MM-DD)
    const releaseYear = track.album.release_date
      ? parseInt(track.album.release_date.split("-")[0], 10)
      : undefined;

    // Try to get Deezer preview URL as fallback (or primary source)
    let deezerPreviewURL = "";
    try {
      console.log(`[Spotify] Fetching Deezer preview for: ${artist} - ${title}`);
      const deezerData = await ctx.runAction(api.deezer.searchTrack, {
        artist: track.artists[0]?.name || artist,
        title: track.name,
      });
      deezerPreviewURL = deezerData.previewURL;
      console.log(`[Spotify] Deezer preview URL found: ${deezerPreviewURL}`);
    } catch (error) {
      console.error(`[Spotify] Failed to fetch Deezer preview:`, error);
      // Continue without Deezer preview
    }

    const result = {
      spotifyId: track.id,
      previewURL: deezerPreviewURL || track.preview_url || "",
      correctArtist: track.artists[0]?.name || artist,
      correctTitle: track.name,
      albumArt: track.album.images[0]?.url || "",
      releaseYear,
    };

    console.log(`[Spotify] Returning:`, result);
    return result;
  },
});
