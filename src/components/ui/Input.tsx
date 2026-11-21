import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-fg-primary tracking-wide"
          >
            {label}
            {props.required && <span className="text-status-danger ml-0.5">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 pointer-events-none text-fg-muted flex items-center">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={twMerge(
              'w-full h-10 px-3 py-2 text-sm bg-bg-surface text-fg-primary rounded-lg border border-border shadow-sm placeholder:text-fg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 focus-visible:border-brand-500 disabled:opacity-50 disabled:bg-bg-secondary disabled:cursor-not-allowed',
              leftIcon ? 'pl-9' : '',
              rightIcon ? 'pr-9' : '',
              error ? 'border-status-danger focus-visible:ring-status-danger/30' : '',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 pointer-events-none text-fg-muted flex items-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-status-danger mt-1">{error}</p>}
        {helperText && !error && <p className="text-xs text-fg-muted mt-1">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
