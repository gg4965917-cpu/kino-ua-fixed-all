'use client';

import { Film, Play, X, Clock } from 'lucide-react';
import { useMovieStore } from '@/lib/store';
import { moviesData } from '@/lib/movies';

export default function ContinueWatching() {
  const { continueWatching, removeFromContinueWatching, setSelectedMovie, setIsPlaying, addToHistory } = useMovieStore();

  if (continueWatching.length === 0) return null;

  // Sort by most recently watched
  const sorted = [...continueWatching].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="bg-kino-dark-900 py-8 border-b border-gray-800/50">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-black font-bebas gradient-text">
              Продовжити перегляд
            </h2>
            <div className="h-0.5 w-16 bg-gradient-to-r from-kino-yellow-400 to-kino-yellow-600 rounded-full mt-1" />
          </div>
          <span className="text-xs text-gray-500">{sorted.length} {sorted.length === 1 ? 'фільм' : 'фільми'}</span>
        </div>

        <div className="flex space-x-4 overflow-x-auto pb-3 scrollbar-hide">
          {sorted.map(({ movieId, progress }) => {
            const movie = moviesData.find(m => m.id === movieId);
            if (!movie) return null;

            const minutes = Math.round((progress / 100) * parseInt(movie.duration));
            const totalMinutes = parseInt(movie.duration);

            return (
              <div
                key={movieId}
                className="relative flex-shrink-0 w-44 md:w-52 group cursor-pointer"
                onClick={() => {
                  setSelectedMovie(movie);
                  setIsPlaying(true);
                  addToHistory(movie.id);
                }}
              >
                {/* Poster */}
                <div
                  className="relative overflow-hidden rounded-xl aspect-[2/3] border border-gray-800 group-hover:border-kino-yellow-400/50 transition-all duration-300"
                  style={{ background: movie.poster || movie.backdrop }}
                >
                  {/* Play overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="bg-kino-yellow-400 rounded-full p-3 transform scale-90 group-hover:scale-100 transition-transform">
                      <Play className="w-6 h-6 text-black fill-black" />
                    </div>
                  </div>

                  {/* Film icon placeholder */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Film className="w-10 h-10 text-white/10" />
                  </div>

                  {/* Progress bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
                    <div
                      className="h-full bg-kino-yellow-400 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromContinueWatching(movieId);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80 border border-white/20"
                    aria-label="Видалити"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>

                {/* Info */}
                <div className="mt-2 space-y-1">
                  <h4 className="font-semibold text-sm text-white line-clamp-1 group-hover:text-kino-yellow-400 transition-colors">
                    {movie.title}
                  </h4>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{minutes} / {totalMinutes} хв</span>
                    </span>
                    <span className="text-kino-yellow-400 font-semibold">{progress}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
