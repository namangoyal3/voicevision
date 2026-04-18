'use client';

import { forwardRef } from 'react';

interface CameraFeedProps {
  isReady: boolean;
  error: string | null;
}

export const CameraFeed = forwardRef<HTMLVideoElement, CameraFeedProps>(
  function CameraFeed({ isReady, error }, ref) {
    if (error) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <p className="text-red-400 text-xl text-center px-8" role="alert">
            Camera error: {error}
          </p>
        </div>
      );
    }

    return (
      <div className="absolute inset-0 overflow-hidden">
        <video
          ref={ref}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            isReady ? 'opacity-30' : 'opacity-0'
          }`}
          aria-hidden="true"
        />
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    );
  }
);
