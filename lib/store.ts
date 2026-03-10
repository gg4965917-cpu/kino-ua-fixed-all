import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Movie } from './movies';

interface MovieStore {
  favorites: number[];
  toggleFavorite: (id: number) => void;
  isFavorite: (id: number) => boolean;

  watchHistory: number[];
  addToHistory: (id: number) => void;

  userRatings: Record<number, number>;
  setUserRating: (id: number, r: number) => void;
  getUserRating: (id: number) => number | null;

  selectedGenre: string;
  setSelectedGenre: (g: string) => void;

  sortBy: 'rating' | 'year' | 'title' | 'trending' | 'myrating';
  setSortBy: (s: 'rating' | 'year' | 'title' | 'trending' | 'myrating') => void;

  voiceoverOnly: boolean;
  toggleVoiceoverOnly: () => void;

  searchQuery: string;
  setSearchQuery: (q: string) => void;

  activeCategory: string;
  setActiveCategory: (c: string) => void;

  selectedMovie: Movie | null;
  setSelectedMovie: (m: Movie | null) => void;

  isPlaying: boolean;
  setIsPlaying: (p: boolean) => void;

  notifications: { id: string; message: string; type: 'success' | 'error' | 'info' }[];
  addNotification: (msg: string, type: 'success' | 'error' | 'info') => void;
  removeNotification: (id: string) => void;

  continueWatching: { movieId: number; progress: number; timestamp: number }[];
  updateProgress: (movieId: number, progress: number) => void;
  removeFromContinueWatching: (movieId: number) => void;

  // TMDB
  tmdbKey: string;
  setTmdbKey: (key: string) => void;

  // всі доступні фільми (статичні або з TMDB)
  allMovies: Movie[];
  setAllMovies: (movies: Movie[]) => void;

  resetFilters: () => void;
}

export const useMovieStore = create<MovieStore>()(
  persist(
    (set, get) => ({
      favorites: [],
      toggleFavorite: (id) => {
        const s = get();
        const has = s.favorites.includes(id);
        set({ favorites: has ? s.favorites.filter(f => f !== id) : [...s.favorites, id] });
        s.addNotification(has ? 'Видалено з обраного' : 'Додано до обраного ❤️', has ? 'info' : 'success');
      },
      isFavorite: (id) => get().favorites.includes(id),

      watchHistory: [],
      addToHistory: (id) => set(s => ({
        watchHistory: [id, ...s.watchHistory.filter(h => h !== id)].slice(0, 20),
      })),

      userRatings: {},
      setUserRating: (id, r) => {
        set(s => ({ userRatings: { ...s.userRatings, [id]: r } }));
        get().addNotification(`Ваша оцінка: ${'⭐'.repeat(r)}`, 'success');
      },
      getUserRating: (id) => get().userRatings[id] ?? null,

      selectedGenre: 'all',
      setSelectedGenre: (g) => set({ selectedGenre: g }),

      sortBy: 'rating',
      setSortBy: (s) => set({ sortBy: s }),

      // ⚠️ За замовчуванням ВИМКНЕНО — щоб вкладки працювали коректно
      voiceoverOnly: false,
      toggleVoiceoverOnly: () => set(s => ({ voiceoverOnly: !s.voiceoverOnly })),

      searchQuery: '',
      setSearchQuery: (q) => set({ searchQuery: q }),

      activeCategory: 'Головна',
      setActiveCategory: (c) => set({ activeCategory: c }),

      selectedMovie: null,
      setSelectedMovie: (m) => set({ selectedMovie: m }),

      isPlaying: false,
      setIsPlaying: (p) => set({ isPlaying: p }),

      notifications: [],
      addNotification: (message, type) => {
        const id = Date.now().toString();
        set(s => ({ notifications: [...s.notifications, { id, message, type }] }));
        setTimeout(() => get().removeNotification(id), 3000);
      },
      removeNotification: (id) => set(s => ({
        notifications: s.notifications.filter(n => n.id !== id),
      })),

      continueWatching: [],
      updateProgress: (movieId, progress) => set(s => {
        const idx = s.continueWatching.findIndex(c => c.movieId === movieId);
        const updated = [...s.continueWatching];
        if (idx !== -1) { updated[idx] = { movieId, progress, timestamp: Date.now() }; }
        else { updated.unshift({ movieId, progress, timestamp: Date.now() }); }
        return { continueWatching: updated.slice(0, 10) };
      }),
      removeFromContinueWatching: (movieId) => set(s => ({
        continueWatching: s.continueWatching.filter(c => c.movieId !== movieId),
      })),

      tmdbKey: '',
      setTmdbKey: (key) => set({ tmdbKey: key }),

      allMovies: [],
      setAllMovies: (movies) => set({ allMovies: movies }),

      // ⚠️ resetFilters НЕ скидає voiceoverOnly — щоб не ламати вкладки
      resetFilters: () => set({
        selectedGenre: 'all',
        sortBy: 'rating',
        searchQuery: '',
      }),
    }),
    {
      name: 'kino-ua-v2',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        favorites: s.favorites,
        watchHistory: s.watchHistory,
        continueWatching: s.continueWatching,
        voiceoverOnly: s.voiceoverOnly,
        userRatings: s.userRatings,
        tmdbKey: s.tmdbKey,
      }),
    }
  )
);
