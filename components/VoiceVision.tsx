'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useCamera } from '@/hooks/useCamera';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { parseCommand, HELP_TEXT } from '@/lib/commands';
import { CameraFeed } from './CameraFeed';
import { StatusDisplay, type AppState } from './StatusDisplay';

export function VoiceVision() {
  const [appState, setAppState] = useState<AppState>('initializing');
  const [isContinuous, setIsContinuous] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const isProcessingRef = useRef(false);
  const lastProcessedTextRef = useRef('');

  const { videoRef, isReady: cameraReady, error: cameraError, captureFrame, startCamera } = useCamera();

  const onPlaybackEnd = useCallback(() => {
    setAppState(isContinuous ? 'processing' : 'listening');
    isProcessingRef.current = false;
  }, [isContinuous]);

  const { isPlaying, playAudio, speakFallback, stop: stopAudio } = useAudioPlayer(onPlaybackEnd);

  const processImage = useCallback(
    async (mode: 'read' | 'describe' | 'continuous' = 'describe') => {
      if (isProcessingRef.current && mode !== 'continuous') return;
      if (mode === 'continuous' && (isProcessingRef.current || isPlaying)) return;

      isProcessingRef.current = true;
      if (mode !== 'continuous') {
        setAppState('processing');
      }

      try {
        // Capture frame
        const imageData = captureFrame();
        if (!imageData) {
          throw new Error('Could not capture image from camera');
        }

        // Send to Vision API
        const visionResponse = await fetch('/api/vision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageData }),
        });

        if (!visionResponse.ok) {
          throw new Error('Failed to analyze image');
        }

        const visionData = await visionResponse.json();

        // Determine what to speak
        let textToSpeak: string;
        if (mode === 'read' && visionData.text) {
          textToSpeak = visionData.text;
        } else {
          textToSpeak = visionData.description;
        }

        // In continuous mode, don't repeat the exact same description
        if (mode === 'continuous' && textToSpeak === lastProcessedTextRef.current) {
          isProcessingRef.current = false;
          return;
        }

        if (!textToSpeak) {
          if (mode === 'continuous') {
            isProcessingRef.current = false;
            return;
          }
          textToSpeak = "I couldn't detect anything clearly. Try moving closer or adjusting the lighting.";
        }

        lastProcessedTextRef.current = textToSpeak;
        setAppState('speaking');

        // Try ElevenLabs TTS first
        try {
          const ttsResponse = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: textToSpeak }),
          });

          if (ttsResponse.ok) {
            const audioData = await ttsResponse.arrayBuffer();
            await playAudio(audioData);
            return;
          }
        } catch {
          console.warn('ElevenLabs TTS failed, falling back to browser TTS');
        }

        // Fallback to browser TTS
        await speakFallback(textToSpeak);
      } catch (error) {
        if (mode === 'continuous') {
          isProcessingRef.current = false;
          return; // Ignore errors in continuous mode to avoid annoying the user
        }
        const message = error instanceof Error ? error.message : 'Something went wrong';
        setErrorMessage(message);
        setAppState('error');

        // Speak the error
        await speakFallback(`Error: ${message}`);
      }
    },
    [captureFrame, isPlaying, playAudio, speakFallback]
  );

  const handleVoiceResult = useCallback(
    (transcript: string) => {
      if (isProcessingRef.current) return;

      setLastTranscript(transcript);
      const command = parseCommand(transcript);

      switch (command.type) {
        case 'read':
          processImage('read');
          break;
        case 'describe':
          processImage('describe');
          break;
        case 'start_continuous':
          setIsContinuous(true);
          speakFallback('Starting real-time monitoring. I will describe what I see every few seconds.');
          break;
        case 'stop_continuous':
          setIsContinuous(false);
          speakFallback('Stopping real-time monitoring.');
          break;
        case 'stop':
          stopAudio();
          setIsContinuous(false);
          setAppState('listening');
          isProcessingRef.current = false;
          break;
        case 'help':
          setAppState('speaking');
          isProcessingRef.current = true;
          speakFallback(HELP_TEXT);
          break;
        default:
          // Unknown command — try describing anyway
          if (transcript.length > 2) {
            processImage('describe');
          }
          break;
      }
    },
    [processImage, stopAudio, speakFallback, isContinuous]
  );

  const { isListening, isSupported, error: voiceError, startListening, stopListening } =
    useVoiceRecognition(handleVoiceResult);

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      await startCamera();
      startListening();
      setAppState('listening');
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(init, 500);
    return () => {
      clearTimeout(timer);
      stopListening();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle continuous monitoring interval
  useEffect(() => {
    if (!isContinuous || isPlaying || isProcessingRef.current) return;

    const interval = setInterval(() => {
      if (!isProcessingRef.current && !isPlaying) {
        processImage('continuous');
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [isContinuous, isPlaying, processImage]);

  // Handle tap-to-capture
  useEffect(() => {
    const handleTap = () => {
      if (!isProcessingRef.current) {
        processImage('describe');
      }
    };

    window.addEventListener('voicevision:tap', handleTap);
    return () => window.removeEventListener('voicevision:tap', handleTap);
  }, [processImage]);

  // Update state based on listening
  useEffect(() => {
    if (isListening && !isProcessingRef.current && !isPlaying) {
      setAppState('listening');
    }
  }, [isListening, isPlaying]);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <CameraFeed
        ref={videoRef}
        isReady={cameraReady}
        error={cameraError}
      />
      <StatusDisplay
        state={appState}
        transcript={lastTranscript}
        error={errorMessage || voiceError || undefined}
        isContinuous={isContinuous}
      />

      {/* Screen reader announcements */}
      <div className="sr-only" aria-live="assertive">
        {appState === 'listening' && 'VoiceVision is ready. Say a command or tap the screen.'}
        {appState === 'processing' && `Processing your request: ${lastTranscript}`}
        {!isSupported && 'Speech recognition is not supported in this browser. Please use Chrome on Android.'}
      </div>
    </div>
  );
}
