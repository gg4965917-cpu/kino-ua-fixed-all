'use client';

import { useMovieStore } from '@/lib/store';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useEffect } from 'react';

export default function ToastNotifications() {
  const { notifications, removeNotification } = useMovieStore();

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <Toast
          key={notification.id}
          id={notification.id}
          message={notification.message}
          type={notification.type}
          onClose={removeNotification}
        />
      ))}
    </div>
  );
}

interface ToastProps {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: (id: string) => void;
}

function Toast({ id, message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(id), 3000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />
  };

  const colors = {
    success: 'bg-green-500/20 border-green-500/30 text-green-400',
    error: 'bg-red-500/20 border-red-500/30 text-red-400',
    info: 'bg-blue-500/20 border-blue-500/30 text-blue-400'
  };

  return (
    <div
      className={`flex items-center space-x-3 ${colors[type]} border backdrop-blur-lg px-4 py-3 rounded-lg shadow-2xl animate-slideInRight`}
    >
      {icons[type]}
      <span className="flex-1 text-sm font-semibold">{message}</span>
      <button
        onClick={() => onClose(id)}
        className="hover:opacity-70 transition-opacity"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
