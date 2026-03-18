export interface Movie {
  id: number;
  title: string;
  titleEn: string;
  description: string;
  rating: number;
  year: number;
  duration: string;
  genre: string[];
  /** CSS gradient used as fallback when no posterUrl is available */
  backdrop?: string;
  /** CSS gradient used as fallback when no posterUrl is available */
  poster?: string;
  /** Full TMDB poster URL (w342) */
  posterUrl?: string;
  /** Full TMDB backdrop URL (w1280) */
  backdropUrl?: string;
  director?: string;
  cast?: string[];
  /** True when Ukrainian dubbing / voiceover is available */
  hasVoiceover: boolean;
  trailer?: string;
  viewCount?: number;
  isTrending?: boolean;
  /** TMDB numeric ID — used for API calls and embed players */
  tmdbId?: number;
  /** ISO 639-1 original language code from TMDB, e.g. "uk", "en" */
  originalLanguage?: string;
}

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG  = 'https://image.tmdb.org/t/p';

const GENRE_MAP: Record<number, string> = {
  28: 'Бойовик', 12: 'Пригоди', 16: 'Анімація', 35: 'Комедія',
  80: 'Кримінал', 99: 'Документальний', 18: 'Драма', 10751: 'Сімейний',
  14: 'Фентезі', 36: 'Історичний', 27: 'Жахи', 10402: 'Музика',
  9648: 'Містика', 10749: 'Романтика', 878: 'Sci-Fi', 53: 'Трилер',
  10752: 'Військовий', 37: 'Вестерн',
};

function mapGenres(ids: number[]): string[] {
  return ids.map(id => GENRE_MAP[id] || '').filter(Boolean).slice(0, 3);
}

const GRADIENTS = [
  'linear-gradient(135deg,#1a1a2e,#0f3460)',
  'linear-gradient(135deg,#0f2027,#2c5364)',
  'linear-gradient(135deg,#4a148c,#8e24aa)',
  'linear-gradient(135deg,#1f4037,#667db6)',
  'linear-gradient(135deg,#283048,#b8c6db)',
  'linear-gradient(135deg,#355c7d,#c06c84)',
  'linear-gradient(135deg,#fc4a1a,#ffd700)',
  'linear-gradient(135deg,#4b6cb7,#0a0e27)',
  'linear-gradient(135deg,#ee0979,#ffa726)',
  'linear-gradient(135deg,#232526,#667db6)',
];

export function tmdbToMovie(m: any): Movie {
  const year = m.release_date ? parseInt(m.release_date.split('-')[0]) : 0;
  const g = GRADIENTS[m.id % GRADIENTS.length];
  const originalLanguage: string = m.original_language ?? '';

  // Heuristic: mark as Ukrainian voiceover for native Ukrainian films or
  // when the TMDB record was fetched via the "ukrainian" discover endpoint.
  // Real dubbing data requires a separate Ashdi/VideoCDN lookup.
  const hasVoiceover = originalLanguage === 'uk';

  // Map full details genres if available, fallback to genre_ids
  const genres =
    Array.isArray(m.genres) && m.genres.length > 0
      ? m.genres.map((g: { name: string }) => g.name).slice(0, 3)
      : mapGenres(m.genre_ids || []);

  return {
    id: m.id,
    tmdbId: m.id,
    title: m.title || m.original_title || '',
    titleEn: m.original_title || '',
    description: m.overview || '',
    rating: Math.round((m.vote_average || 0) * 10) / 10,
    year,
    duration: m.runtime ? `${m.runtime} хв` : '',
    genre: genres,
    poster: g,
    backdrop: g,
    posterUrl:  m.poster_path   ? `${TMDB_IMG}/w342${m.poster_path}`   : undefined,
    backdropUrl: m.backdrop_path ? `${TMDB_IMG}/w1280${m.backdrop_path}` : undefined,
    hasVoiceover,
    viewCount: m.popularity ? Math.round(m.popularity * 100) : 0,
    isTrending: (m.popularity || 0) > 100,
    originalLanguage,
  };
}

// ── Client-side helpers (use only in 'use client' components with user key) ──

async function tmdbGet(path: string, apiKey: string) {
  const sep = path.includes('?') ? '&' : '?';
  const res = await fetch(`${TMDB_BASE}${path}${sep}api_key=${apiKey}&language=uk-UA`);
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.status_message || `TMDB помилка ${res.status}`);
  }
  return res.json();
}

// ── Server-side helpers (use in Server Components / API routes only) ────────

/**
 * Fetch movies via the internal Next.js API route so the TMDB key stays
 * server-side. Safe to call from Client Components.
 */
export async function fetchMoviesFromAPI(
  category: string,
  page = 1,
): Promise<Movie[]> {
  const base =
    typeof window !== 'undefined'
      ? ''
      : process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const res = await fetch(
    `${base}/api/movies?category=${encodeURIComponent(category)}&page=${page}`,
    { next: { revalidate: 300 } },
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.results ?? [];
}

export async function searchMoviesFromAPI(query: string): Promise<Movie[]> {
  const base =
    typeof window !== 'undefined'
      ? ''
      : process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const res = await fetch(
    `${base}/api/movies?search=${encodeURIComponent(query)}`,
    { cache: 'no-store' },
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.results ?? [];
}

export async function fetchPopularTMDB(apiKey: string): Promise<Movie[]> {
  const data = await tmdbGet('/movie/popular', apiKey);
  return (data.results || []).map(tmdbToMovie);
}

export async function fetchTopRatedTMDB(apiKey: string): Promise<Movie[]> {
  const data = await tmdbGet('/movie/top_rated', apiKey);
  return (data.results || []).map(tmdbToMovie);
}

export async function fetchNowPlayingTMDB(apiKey: string): Promise<Movie[]> {
  const data = await tmdbGet('/movie/now_playing', apiKey);
  return (data.results || []).map(tmdbToMovie);
}

export async function searchTMDB(query: string, apiKey: string): Promise<Movie[]> {
  const data = await tmdbGet(`/search/movie?query=${encodeURIComponent(query)}`, apiKey);
  return (data.results || []).slice(0, 20).map(tmdbToMovie);
}

export async function fetchMovieDetails(tmdbId: number, apiKey: string): Promise<Partial<Movie>> {
  const [details, credits] = await Promise.all([
    tmdbGet(`/movie/${tmdbId}`, apiKey),
    tmdbGet(`/movie/${tmdbId}/credits`, apiKey),
  ]);
  return {
    duration: details.runtime ? `${details.runtime} хв` : '',
    director: credits.crew?.find((c: any) => c.job === 'Director')?.name,
    cast: credits.cast?.slice(0, 5).map((c: any) => c.name) || [],
  };
}

// Статичні українські фільми — використовуються якщо немає TMDB ключа
export const staticMovies: Movie[] = [
  { id:1001, title:'Захар Беркут',  titleEn:'Zakhar Berkut',  description:'Епічна боротьба карпатських горян проти монгольської навали.',    rating:8.2, year:2019, duration:'120 хв', genre:['Історичний','Драма','Бойовик'],   backdrop:GRADIENTS[0], poster:GRADIENTS[0], director:'Ахтем Сеітаблаєв', hasVoiceover:true,  viewCount:125000, isTrending:true  },
  { id:1002, title:'Кіборги',       titleEn:'Cyborgs',        description:'Героїчна оборона Донецького аеропорту. Мужність та братерство.',    rating:8.5, year:2017, duration:'112 хв', genre:['Бойовик','Військовий','Драма'],   backdrop:GRADIENTS[3], poster:GRADIENTS[3], director:'Ахтем Сеітаблаєв', hasVoiceover:true,  viewCount:145000, isTrending:true  },
  { id:1003, title:'Атлантида',     titleEn:'Atlantis',       description:'Постапокаліптична драма про ветерана у зруйнованому Донбасі.',       rating:7.8, year:2020, duration:'106 хв', genre:['Драма','Sci-Fi','Військовий'],    backdrop:GRADIENTS[1], poster:GRADIENTS[1], director:'Валентин Васянович', hasVoiceover:true,  viewCount:98000,  isTrending:true  },
  { id:1004, title:'Ціна правди',   titleEn:'Mr. Jones',      description:'Журналіст розкриває правду про Голодомор в Україні.',               rating:8.1, year:2019, duration:'119 хв', genre:['Історичний','Драма','Біографія'], backdrop:GRADIENTS[4], poster:GRADIENTS[4], director:'Агнєшка Холланд',   hasVoiceover:true,  viewCount:112000, isTrending:true  },
  { id:1005, title:'Стоп-Земля',    titleEn:'Stop-Earth',     description:'Фантастична драма про дівчину, яка може зупиняти час.',              rating:7.8, year:2020, duration:'105 хв', genre:['Sci-Fi','Драма'],                 backdrop:GRADIENTS[6], poster:GRADIENTS[6], director:'Катерина Горностай',hasVoiceover:true,  viewCount:83000,  isTrending:true  },
  { id:1006, title:'Додому',        titleEn:'Home',           description:'Зворушлива драма про повернення. Родинні зв\'язки та пробачення.',   rating:7.9, year:2019, duration:'110 хв', genre:['Драма'],                          backdrop:GRADIENTS[5], poster:GRADIENTS[5], director:'Наріман Алієв',      hasVoiceover:true,  viewCount:76000,  isTrending:false },
  { id:1007, title:'Бліндаж',       titleEn:'Blindage',       description:'Люди у прифронтовій зоні — їхня стійкість та надія на майбутнє.',    rating:8.0, year:2021, duration:'92 хв',  genre:['Драма','Військовий'],            backdrop:GRADIENTS[7], poster:GRADIENTS[7], director:'Олександр Течинський',hasVoiceover:true, viewCount:92000,  isTrending:true  },
  { id:1008, title:'Толока',        titleEn:'Toloka',         description:'Містична історія: реальність переплітається з українським фольклором.',rating:7.5, year:2020, duration:'95 хв',  genre:['Трилер','Містика','Драма'],      backdrop:GRADIENTS[2], poster:GRADIENTS[2], director:'Михайло Іллєнко',    hasVoiceover:true,  viewCount:87000,  isTrending:false },
  { id:1009, title:'Поводир',       titleEn:'The Guide',      description:'Американець в Україні 30-х під час Голодомору. Трагедія та стійкість.',rating:7.6, year:2014, duration:'99 хв',  genre:['Історичний','Драма'],            backdrop:GRADIENTS[8], poster:GRADIENTS[8], director:'Олесь Санін',        hasVoiceover:true,  viewCount:68000,  isTrending:false },
  { id:1010, title:'Чорний ворон',  titleEn:'Black Raven',    description:'Атмосферний трилер — таємниці карпатських лісів та древні легенди.', rating:7.3, year:2019, duration:'87 хв',  genre:['Трилер','Містика'],              backdrop:GRADIENTS[9], poster:GRADIENTS[9], director:'Тарас Химич',        hasVoiceover:true,  viewCount:54000,  isTrending:false },
];

export const genres = [
  'all','Драма','Бойовик','Історичний','Sci-Fi','Трилер',
  'Містика','Військовий','Комедія','Фентезі','Романтика',
  'Біографія','Кримінал','Пригоди','Анімація','Жахи',
];

export const moviesData = staticMovies;
