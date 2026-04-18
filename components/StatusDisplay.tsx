'use client';

export type AppState = 'initializing' | 'listening' | 'processing' | 'speaking' | 'error' | 'monitoring';

interface StatusDisplayProps {
  state: AppState;
  transcript?: string;
  error?: string;
  isContinuous?: boolean;
  isChatMode?: boolean;
}

const STATE_CONFIG: Record<AppState, { label: string; color: string; animate: boolean }> = {
  initializing: {
    label: 'Starting up...',
    color: 'text-gray-400',
    animate: true,
  },
  listening: {
    label: 'Listening...',
    color: 'text-green-400',
    animate: true,
  },
  processing: {
    label: 'Processing...',
    color: 'text-blue-400',
    animate: true,
  },
  speaking: {
    label: 'Speaking...',
    color: 'text-purple-400',
    animate: false,
  },
  error: {
    label: 'Error occurred',
    color: 'text-red-400',
    animate: false,
  },
  monitoring: {
    label: 'Monitoring...',
    color: 'text-cyan-400',
    animate: true,
  },
};

export function StatusDisplay({ state, transcript, error, isContinuous }: StatusDisplayProps) {
  const config = STATE_CONFIG[state];

  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-8 text-center">
      {/* Pulsing indicator */}
      <div className="mb-8">
        <div
          className={`w-24 h-24 rounded-full border-4 flex items-center justify-center transition-all duration-300 ${
            state === 'listening'
              ? 'border-green-400 shadow-[0_0_30px_rgba(74,222,128,0.4)]'
              : state === 'processing'
              ? 'border-blue-400 shadow-[0_0_30px_rgba(96,165,250,0.4)]'
              : state === 'speaking'
              ? 'border-purple-400 shadow-[0_0_30px_rgba(192,132,252,0.4)]'
              : state === 'monitoring'
              ? 'border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.4)]'
              : 'border-gray-600'
          }`}
        >
          {config.animate && (
            <div
              className={`w-16 h-16 rounded-full ${
                state === 'listening'
                  ? 'bg-green-400/30 animate-pulse'
                  : state === 'processing'
                  ? 'bg-blue-400/30 animate-spin'
                  : state === 'monitoring'
                  ? 'bg-cyan-400/30 animate-pulse'
                  : 'bg-gray-600/30 animate-pulse'
              }`}
            />
          )}
          {state === 'speaking' && (
            <div className="flex gap-1 items-end h-8">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-1.5 bg-purple-400 rounded-full animate-bounce"
                  style={{
                    height: `${12 + Math.random() * 20}px`,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: '0.6s',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Status text */}
      <h1
        className={`text-4xl font-bold mb-4 ${config.color}`}
        role="status"
        aria-live="polite"
      >
        {config.label}
      </h1>

      {/* Transcript */}
      {transcript && state === 'processing' && (
        <p className="text-xl text-gray-300 mb-4 max-w-md" aria-live="polite">
          Heard: &ldquo;{transcript}&rdquo;
        </p>
      )}

      {/* Error message */}
      {error && (
        <p className="text-lg text-red-300 mb-4 max-w-md" role="alert">
          {error}
        </p>
      )}

      {/* Help text */}
      {state === 'listening' && (
        <div className="space-y-2">
          <p className="text-lg text-gray-500 max-w-sm">
            Say &ldquo;read this&rdquo; or &ldquo;describe&rdquo;
          </p>
          <p className="text-sm text-gray-600">
            Or say &ldquo;start watching&rdquo; for real-time mode
          </p>
        </div>
      )}

      {isContinuous && state !== 'initializing' && (
        <div className="absolute top-8 right-8 flex items-center gap-2 bg-cyan-400/10 border border-cyan-400/20 px-4 py-2 rounded-full">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-cyan-400 font-medium text-sm tracking-wider uppercase">Live Monitoring</span>
        </div>
      )}

      {isChatMode && state !== 'initializing' && (
        <div className="absolute top-8 left-8 flex items-center gap-2 bg-purple-400/10 border border-purple-400/20 px-4 py-2 rounded-full">
          <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
          <span className="text-purple-400 font-medium text-sm tracking-wider uppercase">Conversation</span>
        </div>
      )}

      {/* Tap fallback */}
      <button
        className="mt-12 px-8 py-4 bg-white/10 hover:bg-white/20 rounded-2xl text-white text-xl transition-colors focus:outline-none focus:ring-4 focus:ring-white/50"
        aria-label="Tap to capture and describe what the camera sees"
        onClick={() => {
          // This will be wired up by the parent
          const event = new CustomEvent('voicevision:tap');
          window.dispatchEvent(event);
        }}
      >
        Tap to Capture
      </button>
    </div>
  );
}
