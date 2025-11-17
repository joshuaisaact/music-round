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

interface SpotifyPlaylistTrack {
  track: SpotifyTrack;
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
    const accessToken = await getSpotifyAccessToken();

    const query = encodeURIComponent(`track:${title} artist:${artist}`);
    const searchUrl = `https://api.spotify.com/v1/search?q=${query}&type=track&limit=1&market=US`;

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

    const releaseYear = track.album.release_date
      ? parseInt(track.album.release_date.split("-")[0], 10)
      : undefined;

    let deezerPreviewURL = "";
    try {
      const deezerData = await ctx.runAction(api.deezer.searchTrack, {
        artist: track.artists[0]?.name || artist,
        title: track.name,
      });
      deezerPreviewURL = deezerData.previewURL;
    } catch (error) {
      console.error(`[Spotify] Failed to fetch Deezer preview:`, error);
    }

    return {
      spotifyId: track.id,
      previewURL: deezerPreviewURL || track.preview_url || "",
      correctArtist: track.artists[0]?.name || artist,
      correctTitle: track.name,
      albumArt: track.album.images[0]?.url || "",
      releaseYear,
    };
  },
});

export const getPlaylistTracks = action({
  args: {
    playlistId: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const playlistId = args.playlistId || "6G9mBCSozMx0sOSXhSzZRY"; // Rolling Stone's 500 Greatest Songs
    const accessToken = await getSpotifyAccessToken();

    const allTracks: { artist: string; title: string; spotifyId: string }[] = [];
    let nextUrl: string | null = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50&market=US`;

    // Pagination requires sequential fetching - each response contains the next URL
    /* eslint-disable no-await-in-loop */
    while (nextUrl) {
      const response: Response = await fetch(nextUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Spotify playlist fetch failed: ${response.statusText}`);
      }

      const data: { items: SpotifyPlaylistTrack[]; next: string | null } = await response.json();
      const items = data.items;

      const tracks = items
        .filter((item) => item.track && item.track.artists.length > 0)
        .map((item) => ({
          artist: item.track.artists[0].name,
          title: item.track.name,
          spotifyId: item.track.id,
        }));

      allTracks.push(...tracks);
      nextUrl = data.next;
    }
    /* eslint-enable no-await-in-loop */

    return allTracks;
  },
});
