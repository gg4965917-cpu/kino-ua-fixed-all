'use client';

import { Film, Star, Play } from 'lucide-react';
import { Movie } from '@/lib/store';
import { moviesData } from '@/lib/movies';
import { useMovieStore } from '@/lib/store';

interface RelatedMoviesProps {
  movie: Movie;
}

export default function RelatedMovies({ movie }: RelatedMoviesProps) {
  const { setSelectedMovie, addToHistory, setIsPlaying } = useMovieStore();

  const related = moviesData
    .filter(m => m.id !== movie.id && m.genre.some(g => movie.genre.includes(g)))
    .sort((a, b) => {
      // More shared genres = higher priority
      const aShared = a.genre.filter(g => movie.genre.includes(g)).length;
      const bShared = b.genre.filter(g => movie.genre.includes(g)).length;
      return bShared - aShared || b.rating - a.rating;
    })
    .slice(0, 4);

  if (related.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Схожі фільми
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {related.map(m => (
          <div
            key={m.id}
            className="group cursor-pointer"
            onClick={() => {
              setSelectedMovie(m);
              setIsPlaying(false);
              addToHistory(m.id);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <div
              className="relative overflow-hidden rounded-lg aspect-[2/3] mb-2 border border-gray-800 group-hover:border-kino-yellow-400/50 transition-all duration-300"
              style={{ background: m.poster || m.backdrop }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <Film className="w-8 h-8 text-white/10" />
              </div>
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <Play className="w-8 h-8 text-white" />
              </div>
              <div className="absolute top-1.5 left-1.5 bg-black/80 backdrop-blur-sm px-1.5 py-0.5 rounded flex items-center space-x-0.5">
                <Star className="w-2.5 h-2.5 text-kino-yellow-400 fill-kino-yellow-400" />
                <span className="text-xs font-bold text-white">{m.rating}</span>
              </div>
            </div>
            <p className="text-xs font-semibold text-white line-clamp-1 group-hover:text-kino-yellow-400 transition-colors">
              {m.title}
            </p>
            <p className="text-xs text-gray-500">{m.year}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
