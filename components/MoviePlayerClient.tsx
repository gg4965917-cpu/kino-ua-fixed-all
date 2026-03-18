'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Star, Heart,
  Calendar, Clock, Share2, CheckCircle, Film, TrendingUp,
} from 'lucide-react';
import { Movie } from '@/lib/movies';
import { useMovieStore } from '@/lib/store';

interface MoviePlayerClientProps {
  movie: Movie;
  related: Movie[];
}

// ── Custom HTML5 video player ────────────────────────────────────────────────
// For real streaming: replace <video> src with an embed URL from
// VideoCDN / Ashdi / Rezka, or wrap a react-player <ReactPlayer />.
// The iframe approach (videospider) works too — just swap the <video> block.

function VideoPlayer({ movie }: { movie: Movie }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();

  const { updateProgress } = useMovieStore();

  // Auto-hide controls after 3s of inactivity
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 3000);
  }, [playing]);

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const pct = (v.currentTime / v.duration) * 100;
    setProgress(pct);
    // Persist every 5% tick
    if (Math.round(pct) % 5 === 0) updateProgress(movie.id, Math.round(pct));
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const pct = parseFloat(e.target.value);
    v.currentTime = (pct / 100) * v.duration;
    setProgress(pct);
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen();
    else document.exitFullscreen();
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div
      ref={containerRef}
      className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-gray-800 group"
      onMouseMove={resetHideTimer}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      {/* Real video – replace src with your CDN URL or use an embed iframe */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
        onEnded={() => { setPlaying(false); setShowControls(true); }}
        poster={movie.backdropUrl ?? undefined}
        playsInline
        preload="metadata"
      >
        {/*
          Replace the src below with a real .mp4 / HLS (.m3u8) URL.
          For embed players (Ashdi, Rezka, etc.), swap the <video> tag
          for an <iframe> with the embed URL and className="w-full h-full".

          Example embed:
          <iframe
            src={`https://ashdi.vip/embed/${movie.tmdbId}`}
            allow="fullscreen"
            className="w-full h-full border-0"
          />
        */}
        <source src="" type="video/mp4" />
      </video>

      {/* Big play / pause button overlay */}
      <button
        onClick={togglePlay}
        className="absolute inset-0 flex items-center justify-center focus:outline-none"
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {!playing && (
          <div className="bg-kino-yellow-400/90 rounded-full p-5 shadow-2xl hover:scale-110 transition-transform">
            <Play className="w-12 h-12 text-black fill-black" />
          </div>
        )}
      </button>

      {/* Controls bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 px-4 pb-3 pt-8 transition-opacity duration-300
          bg-gradient-to-t from-black/90 to-transparent
          ${showControls || !playing ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        {/* Seek bar */}
        <input
          type="range"
          min={0}
          max={100}
          step={0.1}
          value={progress}
          onChange={handleSeek}
          className="w-full h-1 mb-2 accent-kino-yellow-400 cursor-pointer"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
              {playing
                ? <Pause className="w-5 h-5 text-white" />
                : <Play className="w-5 h-5 text-white fill-white" />
              }
            </button>
            <button onClick={() => { if (videoRef.current) videoRef.current.muted = !videoRef.current.muted; setMuted(m => !m); }}>
              {muted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
            </button>
            {duration > 0 && (
              <span className="text-xs text-gray-300">
                {formatTime((progress / 100) * duration)} / {formatTime(duration)}
              </span>
            )}
          </div>
          <button onClick={toggleFullscreen}>
            <Maximize className="w-5 h-5 text-white hover:text-kino-yellow-400 transition-colors" />
          </button>
        </div>
      </div>

      {/* Placeholder notice when no src is set */}
      {!playing && (
        <div className="absolute bottom-20 left-0 right-0 flex justify-center pointer-events-none">
          <span className="text-xs text-gray-500 bg-black/60 px-3 py-1 rounded-full">
            Підключіть відео-CDN або embed-плеєр
          </span>
        </div>
      )}
    </div>
  );
}

// ── Main client component ────────────────────────────────────────────────────

export default function MoviePlayerClient({ movie, related }: MoviePlayerClientProps) {
  const { favorites, toggleFavorite, addToHistory, setUserRating, getUserRating } = useMovieStore();
  const [shareSuccess, setShareSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);
  const myRating = getUserRating(movie.id);

  useEffect(() => {
    setMounted(true);
    addToHistory(movie.id);
  }, [movie.id, addToHistory]);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: movie.title, url });
      else { await navigator.clipboard.writeText(url); setShareSuccess(true); setTimeout(() => setShareSuccess(false), 2500); }
    } catch { /* ignore */ }
  };

  const isFav = mounted && favorites.includes(movie.id);

  return (
    <>
      {/* ── Title & meta ───────────────────────── */}
      <div>
        <h1 className="text-3xl md:text-5xl font-black font-bebas gradient-text leading-tight">
          {movie.title}
        </h1>
        {movie.titleEn && movie.titleEn !== movie.title && (
          <p className="text-gray-400 text-sm mt-1">{movie.titleEn}</p>
        )}

        <div className="flex flex-wrap items-center gap-3 mt-3 text-sm">
          <div className="flex items-center gap-1.5 bg-kino-yellow-500/20 border border-kino-yellow-500/30 px-3 py-1.5 rounded-lg">
            <Star className="w-4 h-4 text-kino-yellow-400 fill-kino-yellow-400" />
            <span className="font-bold text-kino-yellow-400">{movie.rating.toFixed(1)}</span>
          </div>
          {movie.year > 0 && (
            <div className="flex items-center gap-1.5 text-gray-300">
              <Calendar className="w-4 h-4" />
              <span>{movie.year}</span>
            </div>
          )}
          {movie.duration && (
            <div className="flex items-center gap-1.5 text-gray-300">
              <Clock className="w-4 h-4" />
              <span>{movie.duration}</span>
            </div>
          )}
          {movie.hasVoiceover && (
            <div className="flex items-center gap-1.5 bg-blue-500/20 border border-blue-500/30 px-3 py-1.5 rounded-lg text-blue-400">
              <Volume2 className="w-4 h-4" />
              <span>UA озвучка</span>
            </div>
          )}
          {movie.isTrending && (
            <div className="flex items-center gap-1.5 bg-kino-yellow-500/20 border border-kino-yellow-500/30 px-2 py-1 rounded-lg text-kino-yellow-400">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-bold">Trending</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Player ─────────────────────────────── */}
      <VideoPlayer movie={movie} />

      {/* ── Description ────────────────────────── */}
      {movie.description && (
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Опис</h2>
          <p className="text-gray-300 leading-relaxed text-sm md:text-base">{movie.description}</p>
        </div>
      )}

      {/* ── Genres ──────────────────────────────── */}
      {movie.genre.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Жанри</h2>
          <div className="flex flex-wrap gap-2">
            {movie.genre.map((g) => (
              <Link
                key={g}
                href={`/?genre=${encodeURIComponent(g)}`}
                className="bg-white/10 hover:bg-kino-yellow-400/20 hover:text-kino-yellow-400 px-3 py-1 rounded-full text-sm text-gray-300 border border-white/20 hover:border-kino-yellow-400/30 transition-all"
              >
                {g}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Crew & Cast ─────────────────────────── */}
      {(movie.director || (movie.cast && movie.cast.length > 0)) && (
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          {movie.director && (
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Режисер</h2>
              <p className="text-white font-semibold">{movie.director}</p>
            </div>
          )}
          {movie.cast && movie.cast.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">У ролях</h2>
              <p className="text-gray-300">{movie.cast.join(', ')}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Personal rating ─────────────────────── */}
      <div className="border-t border-gray-800 pt-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Ваша оцінка</h2>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setUserRating(movie.id, star)}
              aria-label={`Оцінити ${star} зірок`}
              className={`text-2xl transition-transform hover:scale-125 ${
                myRating && star <= myRating ? 'text-kino-yellow-400' : 'text-gray-600 hover:text-kino-yellow-400'
              }`}
            >
              ★
            </button>
          ))}
          {myRating && (
            <span className="text-xs text-gray-400 ml-2 self-center">Ваша оцінка: {myRating}/5</span>
          )}
        </div>
      </div>

      {/* ── Actions ─────────────────────────────── */}
      <div className="flex flex-wrap gap-3 border-t border-gray-800 pt-4">
        <button
          onClick={() => toggleFavorite(movie.id)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition-all border text-sm ${
            isFav
              ? 'bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30'
              : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
          }`}
        >
          <Heart className={`w-4 h-4 ${isFav ? 'fill-red-400' : ''}`} />
          {isFav ? 'В обраному' : 'До обраного'}
        </button>
        <button
          onClick={handleShare}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition-all border text-sm ${
            shareSuccess
              ? 'bg-green-500/20 border-green-500/30 text-green-400'
              : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
          }`}
        >
          {shareSuccess
            ? <><CheckCircle className="w-4 h-4" />Скопійовано!</>
            : <><Share2 className="w-4 h-4" />Поділитися</>
          }
        </button>
      </div>

      {/* ── Related Movies ──────────────────────── */}
      {related.length > 0 && (
        <div className="border-t border-gray-800 pt-6">
          <h2 className="text-xl font-black font-bebas gradient-text mb-4">Схожі фільми</h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {related.map((m) => (
              <Link key={m.id} href={`/movie/${m.id}`} className="group">
                <div
                  className="relative aspect-[2/3] rounded-lg overflow-hidden border border-gray-800 group-hover:border-kino-yellow-400/50 transition-all mb-1.5"
                >
                  {m.posterUrl ? (
                    <Image
                      src={m.posterUrl}
                      alt={m.title}
                      fill
                      sizes="(max-width: 640px) 33vw, 15vw"
                      className="object-cover"
                    />
                  ) : (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ background: m.poster }}
                    >
                      <Film className="w-6 h-6 text-white/10" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="w-7 h-7 text-white" />
                  </div>
                  <div className="absolute top-1.5 left-1.5 bg-black/80 backdrop-blur-sm px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <Star className="w-2.5 h-2.5 text-kino-yellow-400 fill-kino-yellow-400" />
                    <span className="text-xs font-bold text-white">{m.rating.toFixed(1)}</span>
                  </div>
                </div>
                <p className="text-xs font-semibold text-white line-clamp-1 group-hover:text-kino-yellow-400 transition-colors">
                  {m.title}
                </p>
                <p className="text-xs text-gray-500">{m.year}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
