import React from 'react';
import { RefreshCw } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  label?: string;
  className?: string;
  variant?: 'brand' | 'white' | 'subtle';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  label,
  className,
  variant = 'brand',
}) => {
  const containerSize = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  };

  const coreSize = {
    sm: 'w-2.5 h-2.5',
    md: 'w-4 h-4',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  };

  const ringBorder =
    variant === 'white'
      ? 'border-white/80'
      : variant === 'subtle'
      ? 'border-fg-muted'
      : 'border-brand-500';

  const coreBg =
    variant === 'white'
      ? 'from-white to-white/70'
      : variant === 'subtle'
      ? 'from-fg-muted to-fg-secondary'
      : 'from-brand-600 via-brand-400 to-indigo-400';

  return (
    <div className={twMerge('flex flex-col items-center justify-center gap-3', className)}>
      <div className={twMerge('relative flex items-center justify-center perspective-800', containerSize[size])}>
        {/* Ambient 3D Glow */}
        <div className="absolute inset-1 rounded-full bg-brand-500/25 blur-md animate-pulse" />

        {/* 3D Orbital Ring 1 */}
        <div
          className={twMerge(
            'absolute inset-0 rounded-full border-2 border-t-transparent border-l-transparent animate-orbit-3d',
            ringBorder
          )}
        />

        {/* 3D Orbital Ring 2 */}
        <div
          className={twMerge(
            'absolute inset-1 rounded-full border-2 border-b-transparent border-r-transparent opacity-75 animate-orbit-3d-reverse',
            ringBorder
          )}
        />

        {/* 3D Floating Core Sphere */}
        <div
          className={twMerge(
            'rounded-full bg-gradient-to-tr shadow-lg animate-float-3d',
            coreSize[size],
            coreBg
          )}
          style={{
            boxShadow: 'inset 2px 2px 4px rgba(255,255,255,0.45), 0 4px 12px rgba(118,102,200,0.45)',
          }}
        />
      </div>

      {label && (
        <span className="text-xs font-semibold text-fg-secondary animate-pulse tracking-wide">
          {label}
        </span>
      )}
    </div>
  );
};

export const PageLoadingScreen: React.FC<{ message?: string; submessage?: string }> = ({
  message = 'Loading OrderFlow Pro...',
  submessage = 'Syncing real-time workspace records',
}) => {
  const cubeHalf = 22; // 44px cube

  return (
    <div className="min-h-[55vh] flex flex-col items-center justify-center p-8">
      {/* 3D Cube Container */}
      <div className="relative mb-8 perspective-800 flex items-center justify-center w-28 h-28">
        {/* Floor Shadow */}
        <div className="absolute -bottom-3 w-16 h-4 rounded-full bg-brand-500/25 blur-md animate-pulse" />

        {/* 3D Rotating Cube */}
        <div
          className="relative w-11 h-11 animate-cube-3d"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {[
            { transform: `translateZ(${cubeHalf}px)`, bg: 'from-brand-500 to-brand-600' },
            { transform: `rotateY(180deg) translateZ(${cubeHalf}px)`, bg: 'from-brand-600 to-indigo-600' },
            { transform: `rotateY(90deg) translateZ(${cubeHalf}px)`, bg: 'from-brand-400 to-brand-500' },
            { transform: `rotateY(-90deg) translateZ(${cubeHalf}px)`, bg: 'from-indigo-500 to-brand-500' },
            { transform: `rotateX(90deg) translateZ(${cubeHalf}px)`, bg: 'from-brand-300 to-brand-400' },
            { transform: `rotateX(-90deg) translateZ(${cubeHalf}px)`, bg: 'from-brand-700 to-brand-800' },
          ].map((face, idx) => (
            <div
              key={idx}
              className={`absolute inset-0 rounded-lg bg-gradient-to-br ${face.bg} border border-white/30 backdrop-blur-sm opacity-90 shadow-inner`}
              style={{ transform: face.transform }}
            />
          ))}
        </div>
      </div>

      <div className="text-center space-y-1.5 max-w-sm">
        <h3 className="text-base font-bold text-fg-primary tracking-tight">{message}</h3>
        <p className="text-xs text-fg-muted">{submessage}</p>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-brand-500 animate-bounce" />
        <div className="w-2 h-2 rounded-full bg-brand-400 animate-bounce [animation-delay:150ms]" />
        <div className="w-2 h-2 rounded-full bg-brand-300 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
};

export const ImportProgressLoader: React.FC<{
  current: number;
  total: number;
  label?: string;
}> = ({ current, total, label = 'Processing Records...' }) => {
  const percentage = total > 0 ? Math.min(Math.round((current / total) * 100), 100) : 0;

  return (
    <div className="w-full p-6 rounded-2xl card-3d space-y-4 text-center">
      <div className="flex items-center justify-center gap-3">
        <RefreshCw className="w-5 h-5 text-brand-500 animate-spin" />
        <h4 className="text-sm font-semibold text-fg-primary">{label}</h4>
      </div>

      {/* 3D Glossy Progress Bar Container */}
      <div className="w-full bg-bg-secondary rounded-full h-3.5 overflow-hidden border border-border/60 relative shadow-inner">
        <div
          className="bg-gradient-to-r from-brand-600 via-brand-500 to-indigo-400 h-full rounded-full transition-all duration-300 relative"
          style={{
            width: `${percentage}%`,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 0 12px rgba(118,102,200,0.45)',
          }}
        >
          <div className="absolute inset-0 bg-white/20 animate-pulse" />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-fg-muted px-1">
        <span>
          Processed <strong className="text-fg-primary">{current}</strong> of{' '}
          <strong className="text-fg-primary">{total}</strong>
        </span>
        <span className="font-mono font-bold text-brand-600 dark:text-brand-400">
          {percentage}%
        </span>
      </div>
    </div>
  );
};
