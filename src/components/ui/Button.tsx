import React from 'react';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      icon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: 'h-8 px-3 text-xs rounded-md gap-1.5',
      md: 'h-10 px-4 text-sm rounded-lg gap-2',
      lg: 'h-11 px-6 text-base rounded-lg gap-2.5',
    };

    const variantClasses = {
      primary:
        'bg-[#7666C8] hover:bg-[#6655B8] text-white shadow-sm hover:shadow active:scale-[0.98] border border-transparent',
      secondary:
        'bg-bg-secondary hover:bg-border/60 text-fg-primary border border-border shadow-sm active:scale-[0.98]',
      outline:
        'bg-transparent hover:bg-bg-secondary text-fg-primary border border-border hover:border-brand-500/40 active:scale-[0.98]',
      ghost:
        'bg-transparent hover:bg-bg-secondary text-fg-secondary hover:text-fg-primary',
      danger:
        'bg-status-danger hover:opacity-90 text-white shadow-sm active:scale-[0.98] border border-transparent',
      success:
        'bg-status-success hover:opacity-90 text-white shadow-sm active:scale-[0.98] border border-transparent',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={twMerge(
          'inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer',
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
        ) : (
          icon && <span className="shrink-0">{icon}</span>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
