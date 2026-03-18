import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { staticMovies, tmdbToMovie, type Movie } from '@/lib/movies';
import MoviePlayerClient from '@/components/MoviePlayerClient';

// ── Server-side data fetch ───────────────────────────────────────────────────

async function getMovie(id: string): Promise<Movie | null> {
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return null;

  // 1. Check static Ukrainian movies first (fast, no API needed)
  const staticMatch = staticMovies.find((m) => m.id === numId);
  if (staticMatch) return staticMatch;

  // 2. Fetch from TMDB using server-side API key (not exposed to client)
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return null;

  try {
    const [details, credits] = await Promise.all([
      fetch(
        `https://api.themoviedb.org/3/movie/${numId}?api_key=${apiKey}&language=uk-UA`,
        { next: { revalidate: 3600 } }, // cache 1h on Vercel Edge
      ).then((r) => (r.ok ? r.json() : null)),
      fetch(
        `https://api.themoviedb.org/3/movie/${numId}/credits?api_key=${apiKey}&language=uk-UA`,
        { next: { revalidate: 3600 } },
      ).then((r) => (r.ok ? r.json() : null)),
    ]);

    if (!details) return null;

    const movie = tmdbToMovie(details);
    return {
      ...movie,
      director: credits?.crew?.find((c: { job: string; name: string }) => c.job === 'Director')?.name,
      cast: credits?.cast?.slice(0, 6).map((c: { name: string }) => c.name) ?? [],
    };
  } catch {
    return null;
  }
}

// ── Metadata (SSR SEO) ───────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const movie = await getMovie(params.id);
  if (!movie) {
    return { title: 'Фільм не знайдено — КІНО.UA' };
  }

  const posterUrl = movie.posterUrl ?? '/og-image.jpg';

  return {
    title: `${movie.title} (${movie.year}) — КІНО.UA`,
    description: movie.description,
    openGraph: {
      title: `${movie.title} — КІНО.UA`,
      description: movie.description,
      images: [{ url: posterUrl, width: 500, height: 750, alt: movie.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: movie.title,
      description: movie.description,
      images: [posterUrl],
    },
  };
}

// ── Page (Server Component) ──────────────────────────────────────────────────

export default async function MoviePage({ params }: { params: { id: string } }) {
  const movie = await getMovie(params.id);
  if (!movie) notFound();

  // Fetch related movies server-side
  const apiKey = process.env.TMDB_API_KEY;
  let related: Movie[] = [];

  if (apiKey && movie.tmdbId) {
    try {
      const data = await fetch(
        `https://api.themoviedb.org/3/movie/${movie.tmdbId}/recommendations?api_key=${apiKey}&language=uk-UA`,
        { next: { revalidate: 3600 } },
      ).then((r) => (r.ok ? r.json() : { results: [] }));
      related = (data.results ?? []).slice(0, 6).map(tmdbToMovie);
    } catch {
      /* silently skip related */
    }
  }

  // Fallback: static movies with shared genres
  if (related.length === 0) {
    related = staticMovies
      .filter((m) => m.id !== movie.id && m.genre.some((g) => movie.genre.includes(g)))
      .sort((a, b) => {
        const aS = a.genre.filter((g) => movie.genre.includes(g)).length;
        const bS = b.genre.filter((g) => movie.genre.includes(g)).length;
        return bS - aS || b.rating - a.rating;
      })
      .slice(0, 6);
  }

  return (
    <main className="min-h-screen bg-black text-white">

      {/* ── Backdrop hero ─────────────────────────── */}
      <div className="relative h-[50vh] md:h-[60vh] overflow-hidden">
        {movie.backdropUrl ? (
          <Image
            src={movie.backdropUrl}
            alt={movie.title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0" style={{ background: movie.backdrop }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />

        {/* Back button */}
        <a
          href="/"
          className="absolute top-6 left-4 md:left-8 flex items-center gap-2 text-white/80 hover:text-kino-yellow-400 transition-colors text-sm font-semibold group"
        >
          <span className="w-8 h-8 rounded-full bg-black/60 border border-white/20 flex items-center justify-center group-hover:border-kino-yellow-400/50 transition-colors">
            ←
          </span>
          Назад
        </a>
      </div>

      {/* ── Content ───────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 -mt-32 md:-mt-48 relative z-10">
        <div className="flex flex-col md:flex-row gap-8">

          {/* Poster */}
          <div className="flex-shrink-0 w-40 md:w-56 lg:w-64 mx-auto md:mx-0">
            <div className="relative aspect-[2/3] rounded-2xl overflow-hidden border-2 border-gray-700 shadow-2xl">
              {movie.posterUrl ? (
                <Image
                  src={movie.posterUrl}
                  alt={movie.title}
                  fill
                  sizes="(max-width: 768px) 160px, 256px"
                  className="object-cover"
                  priority
                />
              ) : (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ background: movie.poster }}
                >
                  <span className="text-white/20 text-6xl">🎬</span>
                </div>
              )}
            </div>
          </div>

          {/* Movie info + player (client component handles interactivity) */}
          <div className="flex-1 space-y-4">
            <MoviePlayerClient movie={movie} related={related} />
          </div>
        </div>
      </div>

      {/* ── Structured data (JSON-LD) ─────────────── */}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Movie',
            name: movie.title,
            description: movie.description,
            dateCreated: movie.year,
            director: movie.director ? { '@type': 'Person', name: movie.director } : undefined,
            image: movie.posterUrl,
          }),
        }}
      />
    </main>
  );
}
