'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { useMovieStore } from '@/lib/store';

interface UserRatingProps {
  movieId: number;
}

export default function UserRating({ movieId }: UserRatingProps) {
  const { getUserRating, setUserRating } = useMovieStore();
  const [hovered, setHovered] = useState<number | null>(null);

  const currentRating = getUserRating(movieId);
  const displayRating = hovered ?? currentRating ?? 0;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Ваша оцінка
      </h3>
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => setUserRating(movieId, star)}
            className="group transition-transform duration-100 hover:scale-125 focus:outline-none"
            aria-label={`Оцінити ${star} зірок`}
          >
            <Star
              className={`w-8 h-8 transition-colors duration-150 ${
                star <= displayRating
                  ? 'text-kino-yellow-400 fill-kino-yellow-400'
                  : 'text-gray-600 group-hover:text-gray-400'
              }`}
            />
          </button>
        ))}
        {currentRating && (
          <span className="ml-3 text-sm text-gray-400">
            {currentRating === 5 ? 'Шедевр!' :
             currentRating === 4 ? 'Чудово' :
             currentRating === 3 ? 'Непогано' :
             currentRating === 2 ? 'Слабо' : 'Погано'}
          </span>
        )}
        {!currentRating && (
          <span className="ml-3 text-sm text-gray-500 italic">Оцініть фільм</span>
        )}
      </div>
    </div>
  );
}
