'use client';

import Image from 'next/image';
import { Film, Star, Play, Heart, Volume2, TrendingUp } from 'lucide-react';
import { Movie } from '@/lib/movies';
import { useMovieStore } from '@/lib/store';

interface MovieCardProps {
  movie: Movie;
  /** delay for staggered fade-in animation (ms) */
  animationDelay?: number;
  onClick?: (movie: Movie) => void;
}

export default function MovieCard({ movie, animationDelay = 0, onClick }: MovieCardProps) {
  const { favorites, toggleFavorite, userRatings, continueWatching } = useMovieStore();

  const isFavorite = favorites.includes(movie.id);
  const myRating = userRatings[movie.id];
  const cw = continueWatching.find((c) => c.movieId === movie.id);

  const handleCardClick = () => {
    onClick?.(movie);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(movie.id);
  };

  return (
    <div
      className="group cursor-pointer animate-fadeIn"
      style={{ animationDelay: `${animationDelay}ms` }}
      onClick={handleCardClick}
    >
      {/* ── Poster ───────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-xl aspect-[2/3] mb-2.5 border border-gray-800 group-hover:border-kino-yellow-400/50 transition-all duration-300">

        {/* Background fallback gradient */}
        <div
          className="absolute inset-0"
          style={{ background: movie.poster ?? 'linear-gradient(135deg,#1a1a2e,#0f3460)' }}
        />

        {/* Poster image (Next.js optimized) */}
        {movie.posterUrl ? (
          <Image
            src={movie.posterUrl}
            alt={movie.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Film className="w-14 h-14 text-white/10" />
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-3 gap-2">
          <Play className="w-14 h-14 text-white transform scale-90 group-hover:scale-100 transition-transform" />
          <p className="text-xs text-center line-clamp-3 text-gray-300">{movie.description}</p>
        </div>

        {/* ── Badges ─────────────────────────────────── */}

        {/* TMDB / IMDb rating */}
        <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1 border border-kino-yellow-400/20">
          <Star className="w-3 h-3 text-kino-yellow-400 fill-kino-yellow-400" />
          <span className="text-xs font-bold text-white">{movie.rating.toFixed(1)}</span>
        </div>

        {/* Personal rating */}
        {myRating && (
          <div className="absolute top-2 left-14 bg-purple-600/80 backdrop-blur-sm px-2 py-1 rounded-md">
            <span className="text-xs font-bold text-white">{'⭐'.repeat(myRating)}</span>
          </div>
        )}

        {/* Favourite toggle */}
        <button
          onClick={handleFavoriteClick}
          aria-label={isFavorite ? 'Видалити з обраного' : 'Додати до обраного'}
          className="absolute top-2 right-2 p-1.5 bg-black/80 backdrop-blur-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 border border-white/20"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              isFavorite ? 'fill-red-400 text-red-400' : 'text-white'
            }`}
          />
        </button>

        {/* UA Voiceover badge */}
        {movie.hasVoiceover && (
          <div className="absolute bottom-2 left-2 bg-blue-500/80 backdrop-blur-sm px-1.5 py-0.5 rounded flex items-center gap-1">
            <Volume2 className="w-3 h-3 text-white" />
            <span className="text-xs font-bold text-white">UA</span>
          </div>
        )}

        {/* Trending badge */}
        {movie.isTrending && (
          <div className="absolute bottom-2 right-2 bg-kino-yellow-500/80 backdrop-blur-sm px-1.5 py-0.5 rounded flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-black" />
            <span className="text-xs font-bold text-black">TOP</span>
          </div>
        )}

        {/* Continue-watching progress bar */}
        {cw && cw.progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700/80">
            <div
              className="h-full bg-kino-yellow-400 transition-all duration-300"
              style={{ width: `${cw.progress}%` }}
            />
          </div>
        )}
      </div>

      {/* ── Text info ──────────────────────────────── */}
      <div>
        <h3 className="font-bold text-sm text-white line-clamp-1 group-hover:text-kino-yellow-400 transition-colors">
          {movie.title}
        </h3>
        <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
          {movie.year > 0 && <span>{movie.year}</span>}
          {movie.genre[0] && (
            <>
              <span>•</span>
              <span>{movie.genre[0]}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
