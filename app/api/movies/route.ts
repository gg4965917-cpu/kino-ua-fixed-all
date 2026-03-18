import { NextRequest, NextResponse } from 'next/server';
import { tmdbToMovie, staticMovies } from '@/lib/movies';

const TMDB_BASE = 'https://api.themoviedb.org/3';

// Endpoints that support language=uk-UA well
const ENDPOINTS: Record<string, string> = {
  popular: '/movie/popular',
  top_rated: '/movie/top_rated',
  now_playing: '/movie/now_playing',
  ukrainian: '/discover/movie', // + extra filters for UA-dubbed content
};

/**
 * GET /api/movies?category=popular&page=1
 * GET /api/movies?category=ukrainian&page=1
 * GET /api/movies?search=термін&page=1
 *
 * Uses the server-side TMDB_API_KEY so it is never exposed to the client.
 * Falls back to static Ukrainian movies if TMDB_API_KEY is not set.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const category = searchParams.get('category') ?? 'popular';
  const search   = searchParams.get('search') ?? '';
  const page     = parseInt(searchParams.get('page') ?? '1', 10);

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    // Return static Ukrainian movies when no API key is configured
    return NextResponse.json({ results: staticMovies, total_pages: 1, source: 'static' });
  }

  try {
    let url: string;

    if (search) {
      // Full-text search with Ukrainian locale
      url = `${TMDB_BASE}/search/movie?api_key=${apiKey}&language=uk-UA&query=${encodeURIComponent(search)}&page=${page}&include_adult=false`;
    } else if (category === 'ukrainian') {
      // Discover movies that have Ukrainian (uk) as an original language
      // or are translated to Ukrainian. We combine two strategies:
      // 1. with_original_language=uk  → native Ukrainian films
      // 2. language=uk-UA             → translated metadata
      url =
        `${TMDB_BASE}/discover/movie?api_key=${apiKey}&language=uk-UA` +
        `&with_original_language=uk&sort_by=popularity.desc&page=${page}`;
    } else {
      const endpoint = ENDPOINTS[category] ?? ENDPOINTS.popular;
      url = `${TMDB_BASE}${endpoint}?api_key=${apiKey}&language=uk-UA&page=${page}`;
    }

    const data = await fetch(url, {
      next: { revalidate: 300 }, // cache 5 min
    }).then((r) => {
      if (!r.ok) throw new Error(`TMDB ${r.status}`);
      return r.json();
    });

    const movies = (data.results ?? []).map(tmdbToMovie);

    // For "ukrainian" category we mark hasVoiceover = true heuristically
    if (category === 'ukrainian') {
      movies.forEach((m: ReturnType<typeof tmdbToMovie>) => { m.hasVoiceover = true; });
    }

    return NextResponse.json({
      results: movies,
      total_pages: data.total_pages ?? 1,
      source: 'tmdb',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
