import { NextRequest, NextResponse } from 'next/server';
import { tmdbToMovie, staticMovies } from '@/lib/movies';

const TMDB_BASE = 'https://api.themoviedb.org/3';

/**
 * GET /api/movies/[id]
 * Returns full movie details + credits from TMDB (server-side API key).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const numId = parseInt(params.id, 10);
  if (isNaN(numId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  // Check static movies first
  const staticMatch = staticMovies.find((m) => m.id === numId);
  if (staticMatch) {
    return NextResponse.json(staticMatch);
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'TMDB_API_KEY not configured' }, { status: 503 });
  }

  try {
    const [details, credits, recommendations] = await Promise.all([
      fetch(`${TMDB_BASE}/movie/${numId}?api_key=${apiKey}&language=uk-UA`, {
        next: { revalidate: 3600 },
      }).then((r) => (r.ok ? r.json() : null)),

      fetch(`${TMDB_BASE}/movie/${numId}/credits?api_key=${apiKey}&language=uk-UA`, {
        next: { revalidate: 3600 },
      }).then((r) => (r.ok ? r.json() : null)),

      fetch(`${TMDB_BASE}/movie/${numId}/recommendations?api_key=${apiKey}&language=uk-UA`, {
        next: { revalidate: 3600 },
      }).then((r) => (r.ok ? r.json() : { results: [] })),
    ]);

    if (!details) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }

    const movie = tmdbToMovie(details);
    movie.director = credits?.crew?.find((c: { job: string; name: string }) => c.job === 'Director')?.name;
    movie.cast = credits?.cast?.slice(0, 6).map((c: { name: string }) => c.name) ?? [];

    const related = (recommendations?.results ?? []).slice(0, 6).map(tmdbToMovie);

    return NextResponse.json({ movie, related });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
