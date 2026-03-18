'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Search, Film, Star, Play, Info, ChevronLeft, ChevronRight,
  TrendingUp, X, Heart, Filter, SlidersHorizontal, Clock,
  Calendar, Volume2, VolumeX, Share2, ChevronDown, Menu,
  Sparkles, CheckCircle, Settings, RefreshCw, Tv,
} from 'lucide-react';
import { useMovieStore } from '@/lib/store';
import {
  staticMovies, genres, type Movie, tmdbToMovie,
  fetchPopularTMDB, fetchTopRatedTMDB, fetchNowPlayingTMDB,
  searchTMDB, fetchMovieDetails,
} from '@/lib/movies';
import { MovieCardSkeleton } from '@/components/Skeleton';
import MovieCard from '@/components/MovieCard';
import ContinueWatching from '@/components/ContinueWatching';
import UserRating from '@/components/UserRating';
import RelatedMovies from '@/components/RelatedMovies';

// ── Navigation categories ─────────────────────────────────────────────────────
const CATEGORIES = [
  { name: 'Головна',     icon: Film      },
  { name: 'Популярне',   icon: TrendingUp },
  { name: 'Топ',         icon: Star       },
  { name: 'Новинки',     icon: Sparkles   },
  { name: 'Мій список',  icon: Heart      },
  { name: 'Переглянуті', icon: Tv         },
];

export default function HomePage() {
  const {
    favorites, toggleFavorite,
    selectedGenre, setSelectedGenre,
    sortBy, setSortBy,
    voiceoverOnly, toggleVoiceoverOnly,
    searchQuery, setSearchQuery,
    activeCategory, setActiveCategory,
    selectedMovie, setSelectedMovie,
    isPlaying, setIsPlaying,
    addToHistory,
    resetFilters,
    userRatings,
    updateProgress,
    continueWatching,
    tmdbKey, setTmdbKey,
    allMovies, setAllMovies,
    addNotification,
  } = useMovieStore();

  // ── Local state ───────────────────────────────────────────────────────────
  const [currentSlide, setCurrentSlide]           = useState(0);
  const [isSearchFocused, setIsSearchFocused]      = useState(false);
  const [scrolled, setScrolled]                    = useState(false);
  const [isLoading, setIsLoading]                  = useState(true);
  const [isFetchingMovies, setIsFetchingMovies]    = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen]        = useState(false);
  const [shareSuccess, setShareSuccess]            = useState(false);
  const [simulatedProgress, setSimulatedProgress] = useState(0);
  const [showSettings, setShowSettings]            = useState(false);
  const [tmpKey, setTmpKey]                        = useState('');
  const [movieDetailsCache, setMovieDetailsCache]  = useState<Record<number, Partial<Movie>>>({});

  // ── Movie list ────────────────────────────────────────────────────────────
  const movies = allMovies.length > 0 ? allMovies : staticMovies;

  // ── Load from TMDB ────────────────────────────────────────────────────────
  const loadTMDB = useCallback(async (category: string, key: string) => {
    if (!key) return;
    setIsFetchingMovies(true);
    try {
      let fetched: Movie[] = [];
      if (category === 'Популярне')  fetched = await fetchPopularTMDB(key);
      else if (category === 'Топ')   fetched = await fetchTopRatedTMDB(key);
      else if (category === 'Новинки') fetched = await fetchNowPlayingTMDB(key);
      else                             fetched = await fetchPopularTMDB(key);
      if (fetched.length) setAllMovies(fetched);
    } catch (e: unknown) {
      addNotification('TMDB: ' + (e instanceof Error ? e.message : 'Помилка'), 'error');
    } finally {
      setIsFetchingMovies(false);
    }
  }, [setAllMovies, addNotification]);

  const loadMovieDetails = useCallback(async (movie: Movie) => {
    if (!tmdbKey || !movie.tmdbId || movieDetailsCache[movie.id]) return;
    try {
      const details = await fetchMovieDetails(movie.tmdbId, tmdbKey);
      setMovieDetailsCache((prev) => ({ ...prev, [movie.id]: details }));
    } catch { /* silently ignore */ }
  }, [tmdbKey, movieDetailsCache]);

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => { setTimeout(() => setIsLoading(false), 600); }, []);
  useEffect(() => { if (tmdbKey) loadTMDB(activeCategory, tmdbKey); }, [activeCategory, tmdbKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  // ── Hero auto-slider ──────────────────────────────────────────────────────
  const heroMovies = useMemo(() => movies.filter((m) => m.isTrending).slice(0, 3), [movies]);
  const currentHero = heroMovies[currentSlide] ?? movies[0];

  useEffect(() => {
    if (!heroMovies.length) return;
    const t = setInterval(() => setCurrentSlide((p) => (p + 1) % heroMovies.length), 7000);
    return () => clearInterval(t);
  }, [heroMovies.length]);

  // ── TMDB search debounce ──────────────────────────────────────────────────
  useEffect(() => {
    if (!searchQuery || !tmdbKey) return;
    const t = setTimeout(async () => {
      try {
        const results = await searchTMDB(searchQuery, tmdbKey);
        if (results.length) setAllMovies(results);
      } catch { /* silently ignore */ }
    }, 600);
    return () => clearTimeout(t);
  }, [searchQuery, tmdbKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filtering & sorting ───────────────────────────────────────────────────
  const filteredMovies = useMemo(() => {
    let list = [...movies];

    if (activeCategory === 'Мій список') {
      return list.filter((m) => favorites.includes(m.id)).sort((a, b) => b.rating - a.rating);
    }
    if (activeCategory === 'Переглянуті') {
      const ids = continueWatching.map((c) => c.movieId);
      return list.filter((m) => ids.includes(m.id));
    }
    if (activeCategory === 'Топ')     list = list.filter((m) => m.rating >= 7.5);
    if (activeCategory === 'Новинки') list = list.filter((m) => m.year >= new Date().getFullYear() - 2);

    if (voiceoverOnly)        list = list.filter((m) => m.hasVoiceover);
    if (selectedGenre !== 'all') list = list.filter((m) => m.genre.includes(selectedGenre));

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.titleEn.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q),
      );
    }

    list.sort((a, b) => {
      switch (sortBy) {
        case 'rating':   return b.rating - a.rating;
        case 'year':     return b.year - a.year;
        case 'title':    return a.title.localeCompare(b.title, 'uk');
        case 'trending': return (b.viewCount ?? 0) - (a.viewCount ?? 0);
        case 'myrating': return (userRatings[b.id] ?? 0) - (userRatings[a.id] ?? 0);
        default:         return 0;
      }
    });
    return list;
  }, [movies, voiceoverOnly, selectedGenre, searchQuery, sortBy, favorites, activeCategory, userRatings, continueWatching]);

  // ── Search suggestions ────────────────────────────────────────────────────
  const suggestions = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();
    return movies
      .filter((m) => m.title.toLowerCase().includes(q) || m.titleEn.toLowerCase().includes(q))
      .slice(0, 5);
  }, [searchQuery, movies]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const openMovie = (movie: Movie) => {
    setSelectedMovie(movie);
    addToHistory(movie.id);
    loadMovieDetails(movie);
  };
  const playMovie = (movie: Movie) => {
    setSelectedMovie(movie);
    setIsPlaying(true);
    addToHistory(movie.id);
  };

  const handleShare = useCallback(async (movie: Movie) => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: movie.title, url });
      else {
        await navigator.clipboard.writeText(url);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2500);
      }
    } catch { /* ignore */ }
  }, []);

  // ── Simulated progress (demo) ─────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying || !selectedMovie) return;
    setSimulatedProgress(0);
    const t = setInterval(() => {
      setSimulatedProgress((p) => {
        const n = p + 0.5;
        updateProgress(selectedMovie.id, Math.round(n));
        if (n >= 100) { clearInterval(t); return 100; }
        return n;
      });
    }, 500);
    return () => clearInterval(t);
  }, [isPlaying, selectedMovie]); // eslint-disable-line react-hooks/exhaustive-deps

  const nextSlide = () => setCurrentSlide((p) => (p + 1) % heroMovies.length);
  const prevSlide = () => setCurrentSlide((p) => (p - 1 + heroMovies.length) % heroMovies.length);
  const detailsOf = (m: Movie) => ({ ...m, ...(movieDetailsCache[m.id] ?? {}) });

  // ── Loading splash ────────────────────────────────────────────────────────
  if (isLoading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="bg-gradient-to-br from-kino-yellow-400 to-kino-yellow-600 p-3 rounded-lg animate-pulse inline-block">
          <Film className="w-8 h-8 text-black" strokeWidth={2.5} />
        </div>
        <div className="text-xl font-bold text-white animate-pulse">Завантаження КІНО.UA...</div>
        <div className="flex justify-center gap-2">
          {[0, 150, 300].map((d) => (
            <div key={d} className="w-2 h-2 bg-kino-yellow-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">

      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-black/95 backdrop-blur-lg shadow-2xl border-b border-gray-800'
          : 'bg-gradient-to-b from-black/90 to-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between">

            {/* Logo + desktop nav */}
            <div className="flex items-center space-x-6">
              <button
                className="flex items-center space-x-2 group"
                onClick={() => { setActiveCategory('Головна'); resetFilters(); }}
              >
                <div className="bg-gradient-to-br from-kino-yellow-400 to-kino-yellow-600 p-1.5 rounded-lg group-hover:scale-110 group-hover:rotate-6 transition-all shadow-lg shadow-kino-yellow-500/50">
                  <Film className="w-5 h-5 text-black" strokeWidth={2.5} />
                </div>
                <span className="text-xl font-black font-bebas tracking-tight gradient-text">КІНО.UA</span>
              </button>

              <div className="hidden lg:flex items-center gap-5">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.name}
                      onClick={() => { setActiveCategory(cat.name); resetFilters(); }}
                      className={`flex items-center gap-1.5 text-sm font-semibold transition-all relative group ${
                        activeCategory === cat.name
                          ? 'text-kino-yellow-400'
                          : 'text-gray-300 hover:text-kino-yellow-400'
                      }`}
                    >
                      <Icon className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                      {cat.name}
                      {activeCategory === cat.name && (
                        <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-kino-yellow-400 rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-2 md:gap-3">

              {/* Search */}
              <div className="relative">
                <div className={`flex items-center bg-white/10 backdrop-blur-md rounded-full px-3 py-1.5 transition-all border ${
                  isSearchFocused
                    ? 'border-kino-yellow-400/50 w-52 md:w-80 shadow-lg shadow-kino-yellow-500/20 bg-white/20'
                    : 'border-white/20 w-32 md:w-56'
                }`}>
                  <Search className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                    placeholder="Пошук фільмів..."
                    className="bg-transparent outline-none text-white placeholder-gray-400 w-full text-sm"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="ml-1 text-gray-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Search suggestions dropdown */}
                {searchQuery && isSearchFocused && suggestions.length > 0 && (
                  <div className="absolute top-full mt-2 w-full md:w-96 bg-gray-900/98 backdrop-blur-xl rounded-xl border border-gray-800 shadow-2xl overflow-hidden z-50 animate-fadeIn">
                    <div className="p-3 text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800 flex items-center gap-2">
                      <Sparkles className="w-3 h-3" />Результати пошуку
                    </div>
                    {suggestions.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => { openMovie(m); setSearchQuery(''); }}
                        className="p-3 hover:bg-gray-800/50 cursor-pointer flex items-center gap-3 group"
                      >
                        <div className="relative w-10 h-14 rounded overflow-hidden flex-shrink-0 group-hover:scale-105 transition-transform">
                          <div className="absolute inset-0" style={{ background: m.poster }} />
                          {m.posterUrl
                            ? <Image src={m.posterUrl} alt={m.title} fill sizes="40px" className="object-cover" />
                            : <Film className="w-6 h-6 text-white/20 absolute inset-0 m-auto" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate group-hover:text-kino-yellow-400 transition-colors">{m.title}</div>
                          <div className="text-xs text-gray-400">{m.year} • {m.genre[0]}</div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Star className="w-3.5 h-3.5 text-kino-yellow-400 fill-kino-yellow-400" />
                          <span className="text-sm font-bold text-kino-yellow-400">{m.rating.toFixed(1)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* TMDB settings button */}
              <button
                onClick={() => { setShowSettings(true); setTmpKey(tmdbKey); }}
                className={`p-2 rounded-lg border transition-all ${
                  tmdbKey
                    ? 'bg-kino-yellow-400/10 border-kino-yellow-400/30 text-kino-yellow-400'
                    : 'bg-white/10 border-white/20 text-gray-400 hover:bg-white/20'
                }`}
                title={tmdbKey ? 'TMDB підключено' : 'Підключити TMDB'}
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden mt-4 pb-4 space-y-2 border-t border-gray-800 pt-4 animate-fadeIn">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.name}
                    onClick={() => { setActiveCategory(cat.name); setMobileMenuOpen(false); resetFilters(); }}
                    className={`flex items-center gap-2 w-full p-3 rounded-lg transition-all ${
                      activeCategory === cat.name
                        ? 'bg-kino-yellow-400/20 text-kino-yellow-400 border border-kino-yellow-400/30'
                        : 'text-gray-300 hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-semibold">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      {/* ── TMDB Settings modal ──────────────────────────────────────────── */}
      {showSettings && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-kino-dark-800 rounded-2xl max-w-md w-full border border-gray-800 p-6 shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Підключити TMDB</h3>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-4 text-sm text-gray-300 space-y-2">
              <p className="text-blue-400 font-semibold">Як отримати безкоштовний API ключ:</p>
              <ol className="space-y-1 text-xs">
                <li>1. Зайдіть на <a href="https://www.themoviedb.org/signup" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">themoviedb.org</a> → зареєструйтесь</li>
                <li>2. Профіль → Settings → API → Create</li>
                <li>3. Скопіюйте <strong>API Key (v3 auth)</strong></li>
              </ol>
            </div>

            <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">TMDB API Key</label>
            <input
              type="text"
              value={tmpKey}
              onChange={(e) => setTmpKey(e.target.value)}
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-kino-yellow-400 mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={async () => {
                  if (!tmpKey.trim()) return;
                  try {
                    const res = await fetch(
                      `https://api.themoviedb.org/3/movie/popular?api_key=${tmpKey.trim()}&language=uk-UA`,
                    );
                    if (!res.ok) throw new Error('Невірний ключ');
                    setTmdbKey(tmpKey.trim());
                    setShowSettings(false);
                    addNotification('TMDB підключено! Завантажуємо фільми...', 'success');
                    loadTMDB(activeCategory, tmpKey.trim());
                  } catch {
                    addNotification('Невірний TMDB API ключ', 'error');
                  }
                }}
                className="flex-1 bg-kino-yellow-400 text-black py-3 rounded-lg font-bold hover:bg-kino-yellow-500 transition-colors"
              >
                Зберегти та підключити
              </button>
              {tmdbKey && (
                <button
                  onClick={() => {
                    setTmdbKey('');
                    setAllMovies([]);
                    setShowSettings(false);
                    addNotification('TMDB відключено', 'info');
                  }}
                  className="px-4 py-3 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
                >
                  Відключити
                </button>
              )}
            </div>

            {!tmdbKey && (
              <p className="text-xs text-gray-500 mt-3 text-center">
                Без ключа показуються вбудовані українські фільми
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Hero section ────────────────────────────────────────────────── */}
      {currentHero && (
        <div className="relative h-screen overflow-hidden">

          {/* Backdrop */}
          <div className="absolute inset-0">
            {currentHero.backdropUrl ? (
              <Image
                src={currentHero.backdropUrl}
                alt={currentHero.title}
                fill
                priority
                sizes="100vw"
                className="object-cover transition-opacity duration-1000"
              />
            ) : (
              <div className="absolute inset-0 transition-all duration-1000" style={{ background: currentHero.backdrop }} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/40" />
          </div>

          {/* Hero content */}
          <div className="relative h-full flex items-center">
            <div className="max-w-7xl mx-auto px-4 md:px-6 w-full">
              <div className="max-w-2xl space-y-4 md:space-y-6 animate-fadeInUp">

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-kino-yellow-500/20 border border-kino-yellow-500/30 text-kino-yellow-400 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    {tmdbKey ? 'TMDB' : 'Українське кіно'}
                  </span>
                  <span className="flex items-center gap-1 bg-black/40 px-3 py-1.5 rounded-full border border-kino-yellow-400/30">
                    <Star className="w-4 h-4 text-kino-yellow-400 fill-kino-yellow-400" />
                    <span className="font-bold text-kino-yellow-400">{currentHero.rating.toFixed(1)}</span>
                  </span>
                  {currentHero.hasVoiceover && (
                    <span className="bg-blue-500/20 border border-blue-500/30 text-blue-400 px-3 py-1.5 rounded-full text-xs font-bold uppercase flex items-center gap-1">
                      <Volume2 className="w-3 h-3" />UA озвучка
                    </span>
                  )}
                </div>

                {/* Title */}
                <div>
                  <h1 className="text-4xl md:text-7xl font-black font-bebas mb-2 leading-none">
                    <span className="gradient-text drop-shadow-2xl">{currentHero.title}</span>
                  </h1>
                  <p className="text-gray-400 text-sm md:text-xl font-light">
                    {currentHero.titleEn} • {currentHero.year}
                  </p>
                </div>

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-gray-300">
                  {currentHero.duration && (
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{currentHero.duration}</span>
                  )}
                  {currentHero.genre.length > 0 && (
                    <><span>•</span><span>{currentHero.genre.join(', ')}</span></>
                  )}
                </div>

                <p className="text-gray-300 text-sm md:text-lg leading-relaxed max-w-xl line-clamp-3">
                  {currentHero.description}
                </p>

                {/* CTA buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={() => playMovie(currentHero)}
                    className="group flex items-center gap-2 bg-gradient-to-r from-kino-yellow-400 to-kino-yellow-500 text-black px-6 md:px-8 py-3 md:py-4 rounded-lg font-bold hover:scale-105 transition-all shadow-2xl hover:shadow-kino-yellow-500/50 text-sm md:text-base"
                  >
                    <Play className="w-5 h-5 fill-black group-hover:scale-110 transition-transform" />
                    Дивитись
                  </button>
                  <button
                    onClick={() => openMovie(currentHero)}
                    className="flex items-center gap-2 glass border px-6 md:px-8 py-3 md:py-4 rounded-lg font-bold hover:bg-white/20 transition-all text-sm md:text-base"
                  >
                    <Info className="w-5 h-5" />Детальніше
                  </button>
                  {/* Link to dedicated player page */}
                  <Link
                    href={`/movie/${currentHero.id}`}
                    className="flex items-center gap-2 glass border px-4 py-3 md:py-4 rounded-lg font-bold hover:bg-white/20 transition-all text-sm md:text-base"
                  >
                    <Film className="w-5 h-5" />Сторінка фільму
                  </Link>
                  <button
                    onClick={() => toggleFavorite(currentHero.id)}
                    className={`p-3 md:p-4 rounded-lg border transition-all ${
                      favorites.includes(currentHero.id)
                        ? 'bg-red-500/20 border-red-500/30 text-red-400'
                        : 'glass hover:bg-white/20'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${favorites.includes(currentHero.id) ? 'fill-red-400' : ''}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Slider controls */}
          <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 glass border p-3 md:p-4 rounded-full hover:bg-black/60 transition-all group z-10">
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>
          <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 glass border p-3 md:p-4 rounded-full hover:bg-black/60 transition-all group z-10">
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Slide dots */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
            {heroMovies.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`transition-all rounded-full ${
                  i === currentSlide
                    ? 'bg-kino-yellow-400 w-10 h-1.5 shadow-lg shadow-kino-yellow-400/50'
                    : 'bg-white/30 w-6 h-1.5 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Continue watching ────────────────────────────────────────────── */}
      <ContinueWatching />

      {/* ── Filters bar ─────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-b from-black to-kino-dark-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
          <div className="flex flex-wrap items-center gap-3">

            {/* UA voiceover toggle */}
            {activeCategory !== 'Мій список' && activeCategory !== 'Переглянуті' && (
              <button
                onClick={toggleVoiceoverOnly}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all border text-sm ${
                  voiceoverOnly
                    ? 'bg-blue-500/20 border-blue-500/30 text-blue-400'
                    : 'glass border-white/20 text-gray-400 hover:bg-white/20'
                }`}
              >
                {voiceoverOnly ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                UA озвучка
              </button>
            )}

            {/* Genre filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="glass border border-white/20 text-white px-3 py-2 rounded-lg text-sm cursor-pointer hover:bg-white/20 transition-colors"
              >
                <option value="all">Всі жанри</option>
                {genres.slice(1).map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as Parameters<typeof setSortBy>[0])}
                className="glass border border-white/20 text-white px-3 py-2 rounded-lg text-sm cursor-pointer hover:bg-white/20 transition-colors"
              >
                <option value="rating">За рейтингом</option>
                <option value="year">За роком</option>
                <option value="title">За назвою</option>
                <option value="trending">За популярністю</option>
                <option value="myrating">Моя оцінка</option>
              </select>
            </div>

            {/* Counter + loading indicator */}
            <div className="text-sm text-gray-400 ml-auto flex items-center gap-2">
              {isFetchingMovies && <RefreshCw className="w-4 h-4 animate-spin text-kino-yellow-400" />}
              <span>Знайдено: <span className="font-bold text-kino-yellow-400">{filteredMovies.length}</span></span>
            </div>

            {/* Reset filters */}
            {(selectedGenre !== 'all' || sortBy !== 'rating' || searchQuery) && (
              <button
                onClick={() => resetFilters()}
                className="text-sm text-gray-400 hover:text-kino-yellow-400 transition-colors flex items-center gap-1"
              >
                <X className="w-4 h-4" />Скинути
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Movies grid ──────────────────────────────────────────────────── */}
      <div className="bg-kino-dark-900 min-h-screen py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="mb-6 md:mb-8">
            <h2 className="text-2xl md:text-3xl font-black font-bebas mb-2 gradient-text">
              {activeCategory === 'Мій список'  ? 'Обране'
               : activeCategory === 'Переглянуті' ? 'Переглянуті'
               : activeCategory}
            </h2>
            <div className="h-1 w-16 bg-gradient-to-r from-kino-yellow-400 to-kino-yellow-600 rounded-full" />
          </div>

          {filteredMovies.length === 0 ? (
            <div className="text-center py-20">
              <Film className="w-20 h-20 mx-auto opacity-10 mb-4" />
              {activeCategory === 'Мій список' ? (
                <>
                  <h3 className="text-xl font-bold text-gray-400 mb-2">Список порожній</h3>
                  <p className="text-gray-500 mb-4">Натисніть ❤ на будь-якому фільмі щоб додати</p>
                  <button onClick={() => setActiveCategory('Головна')} className="bg-kino-yellow-400 text-black px-6 py-2 rounded-lg font-bold hover:bg-kino-yellow-500 transition-colors">
                    Переглянути фільми
                  </button>
                </>
              ) : activeCategory === 'Переглянуті' ? (
                <>
                  <h3 className="text-xl font-bold text-gray-400 mb-2">Ще нічого не переглядали</h3>
                  <p className="text-gray-500 mb-4">Почніть дивитись фільми — вони з'являться тут</p>
                  <button onClick={() => setActiveCategory('Головна')} className="bg-kino-yellow-400 text-black px-6 py-2 rounded-lg font-bold hover:bg-kino-yellow-500 transition-colors">
                    До фільмів
                  </button>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-bold text-gray-400 mb-2">Нічого не знайдено</h3>
                  <p className="text-gray-500 mb-4">Спробуйте змінити фільтри</p>
                  <button onClick={() => resetFilters()} className="bg-kino-yellow-400 text-black px-6 py-2 rounded-lg font-bold hover:bg-kino-yellow-500 transition-colors">
                    Скинути фільтри
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-5">
              {filteredMovies.map((movie, idx) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  animationDelay={idx * 25}
                  onClick={openMovie}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Movie detail modal ───────────────────────────────────────────── */}
      {selectedMovie && (() => {
        const m = detailsOf(selectedMovie);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fadeIn">
            <div className="bg-kino-dark-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-800 shadow-2xl animate-scaleIn">

              {/* Backdrop header */}
              <div className="relative h-64 md:h-80 overflow-hidden rounded-t-2xl">
                <div className="absolute inset-0">
                  {m.backdropUrl ? (
                    <Image src={m.backdropUrl} alt="" fill sizes="100vw" className="object-cover" />
                  ) : (
                    <div className="absolute inset-0" style={{ background: m.backdrop }} />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-kino-dark-800 via-kino-dark-800/50 to-transparent" />
                </div>
                <button
                  onClick={() => { setSelectedMovie(null); setIsPlaying(false); setSimulatedProgress(0); }}
                  className="absolute top-4 right-4 p-2 bg-black/60 backdrop-blur-sm rounded-full hover:bg-black/80 transition-colors border border-white/20"
                >
                  <X className="w-6 h-6" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                  <h2 className="text-3xl md:text-5xl font-black font-bebas mb-1 gradient-text">{m.title}</h2>
                  <p className="text-gray-300">{m.titleEn}</p>
                </div>
              </div>

              <div className="p-6 md:p-8 space-y-6">

                {/* Player area */}
                {isPlaying ? (
                  <div className="aspect-video bg-black rounded-xl overflow-hidden border border-gray-800 flex items-center justify-center">
                    <div className="text-center space-y-3 w-full px-8">
                      <Play className="w-16 h-16 text-kino-yellow-400 mx-auto animate-pulse" />
                      <p className="text-gray-400 text-sm">Відеоплеєр — відкрийте сторінку фільму для повноцінного перегляду</p>
                      <div className="w-full bg-gray-800 rounded-full h-2">
                        <div className="bg-kino-yellow-400 h-2 rounded-full transition-all" style={{ width: `${simulatedProgress}%` }} />
                      </div>
                      <p className="text-xs text-gray-600">{Math.round(simulatedProgress)}% переглянуто</p>
                      <div className="flex gap-3 justify-center">
                        <button
                          onClick={() => setIsPlaying(false)}
                          className="bg-kino-yellow-400 text-black px-6 py-2 rounded-lg font-bold hover:bg-kino-yellow-500 transition-colors"
                        >
                          Зупинити
                        </button>
                        <Link
                          href={`/movie/${selectedMovie.id}`}
                          className="bg-white/10 border border-white/20 text-white px-6 py-2 rounded-lg font-bold hover:bg-white/20 transition-colors"
                          onClick={() => setSelectedMovie(null)}
                        >
                          Відкрити сторінку
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsPlaying(true)}
                    className="w-full aspect-video bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border border-gray-700 flex items-center justify-center group hover:border-kino-yellow-400/50 transition-all"
                  >
                    <div className="text-center">
                      <div className="bg-kino-yellow-400 p-6 rounded-full mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-kino-yellow-500/50">
                        <Play className="w-12 h-12 text-black fill-black" />
                      </div>
                      <p className="text-xl font-bold">Дивитись фільм</p>
                      {m.duration && <p className="text-sm text-gray-400 mt-1">{m.duration}</p>}
                      {continueWatching.find((c) => c.movieId === m.id) && (
                        <p className="text-xs text-kino-yellow-400 mt-1">
                          Продовжити з {continueWatching.find((c) => c.movieId === m.id)?.progress}%
                        </p>
                      )}
                    </div>
                  </button>
                )}

                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <div className="flex items-center gap-2 bg-kino-yellow-500/20 border border-kino-yellow-500/30 px-3 py-1.5 rounded-lg">
                    <Star className="w-4 h-4 text-kino-yellow-400 fill-kino-yellow-400" />
                    <span className="font-bold text-kino-yellow-400">{m.rating.toFixed(1)}</span>
                  </div>
                  {m.year > 0 && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Calendar className="w-4 h-4" />{m.year}
                    </div>
                  )}
                  {m.duration && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Clock className="w-4 h-4" />{m.duration}
                    </div>
                  )}
                  {m.hasVoiceover && (
                    <div className="flex items-center gap-2 bg-blue-500/20 border border-blue-500/30 px-3 py-1.5 rounded-lg text-blue-400">
                      <Volume2 className="w-4 h-4" />UA озвучка
                    </div>
                  )}
                </div>

                {/* Genres */}
                {m.genre.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Жанри</h3>
                    <div className="flex flex-wrap gap-2">
                      {m.genre.map((g) => (
                        <button
                          key={g}
                          onClick={() => { setSelectedGenre(g); setSelectedMovie(null); }}
                          className="bg-white/10 hover:bg-kino-yellow-400/20 hover:text-kino-yellow-400 px-3 py-1 rounded-full text-sm text-gray-300 border border-white/20 hover:border-kino-yellow-400/30 transition-all"
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                {m.description && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Опис</h3>
                    <p className="text-gray-300 leading-relaxed">{m.description}</p>
                  </div>
                )}

                {/* Director & cast */}
                {(m.director || (m.cast && m.cast.length > 0)) && (
                  <div className="grid md:grid-cols-2 gap-4">
                    {m.director && (
                      <div>
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Режисер</h3>
                        <p className="text-white font-semibold">{m.director}</p>
                      </div>
                    )}
                    {m.cast && m.cast.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">У ролях</h3>
                        <p className="text-gray-300 text-sm">{m.cast.join(', ')}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* User rating */}
                <div className="pt-2 border-t border-gray-800/50">
                  <UserRating movieId={m.id} />
                </div>

                {/* Related */}
                <div className="pt-2 border-t border-gray-800/50">
                  <RelatedMovies movie={selectedMovie} />
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-800">
                  <button
                    onClick={() => toggleFavorite(m.id)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all border ${
                      favorites.includes(m.id)
                        ? 'bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30'
                        : 'glass border-white/20 text-white hover:bg-white/20'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${favorites.includes(m.id) ? 'fill-red-400' : ''}`} />
                    {favorites.includes(m.id) ? 'В обраному' : 'До обраного'}
                  </button>
                  <button
                    onClick={() => handleShare(selectedMovie)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all border ${
                      shareSuccess
                        ? 'bg-green-500/20 border-green-500/30 text-green-400'
                        : 'glass border-white/20 text-white hover:bg-white/20'
                    }`}
                  >
                    {shareSuccess
                      ? <><CheckCircle className="w-5 h-5" />Скопійовано!</>
                      : <><Share2 className="w-5 h-5" />Поділитися</>
                    }
                  </button>
                  <Link
                    href={`/movie/${selectedMovie.id}`}
                    className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all border glass border-white/20 text-white hover:bg-white/20"
                    onClick={() => setSelectedMovie(null)}
                  >
                    <Film className="w-5 h-5" />Сторінка фільму
                  </Link>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Scroll to top */}
      {scrolled && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-8 right-8 p-4 bg-kino-yellow-400 text-black rounded-full shadow-2xl hover:scale-110 transition-all z-40 border-2 border-kino-yellow-500 animate-fadeIn"
        >
          <ChevronDown className="w-6 h-6 rotate-180" />
        </button>
      )}
    </div>
  );
}
