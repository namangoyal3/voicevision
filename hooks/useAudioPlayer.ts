'use client';

import { useRef, useState, useCallback } from 'react';

interface UseAudioPlayerReturn {
  isPlaying: boolean;
  playAudio: (audioData: ArrayBuffer) => Promise<void>;
  speakFallback: (text: string) => Promise<void>;
  stop: () => void;
}

export function useAudioPlayer(onPlaybackEnd?: () => void): UseAudioPlayerReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const onPlaybackEndRef = useRef(onPlaybackEnd);
  onPlaybackEndRef.current = onPlaybackEnd;

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setIsPlaying(false);
  }, []);

  const playAudio = useCallback(
    async (audioData: ArrayBuffer) => {
      stop();

      return new Promise<void>((resolve) => {
        const blob = new Blob([audioData], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onplay = () => setIsPlaying(true);

        audio.onended = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(url);
          audioRef.current = null;
          onPlaybackEndRef.current?.();
          resolve();
        };

        audio.onerror = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(url);
          audioRef.current = null;
          onPlaybackEndRef.current?.();
          resolve();
        };

        audio.play().catch(() => {
          setIsPlaying(false);
          URL.revokeObjectURL(url);
          onPlaybackEndRef.current?.();
          resolve();
        });
      });
    },
    [stop]
  );

  const speakFallback = useCallback(
    async (text: string) => {
      stop();

      return new Promise<void>((resolve) => {
        if (!window.speechSynthesis) {
          resolve();
          return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        setIsPlaying(true);

        utterance.onend = () => {
          setIsPlaying(false);
          onPlaybackEndRef.current?.();
          resolve();
        };

        utterance.onerror = () => {
          setIsPlaying(false);
          onPlaybackEndRef.current?.();
          resolve();
        };

        window.speechSynthesis.speak(utterance);
      });
    },
    [stop]
  );

  return { isPlaying, playAudio, speakFallback, stop };
}
