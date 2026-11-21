import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, rows = 3, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-xs font-medium text-fg-primary tracking-wide"
          >
            {label}
            {props.required && <span className="text-status-danger ml-0.5">*</span>}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          rows={rows}
          className={twMerge(
            'w-full px-3 py-2 text-sm bg-bg-surface text-fg-primary rounded-lg border border-border shadow-sm placeholder:text-fg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 focus-visible:border-brand-500 disabled:opacity-50 disabled:bg-bg-secondary disabled:cursor-not-allowed resize-y',
            error ? 'border-status-danger focus-visible:ring-status-danger/30' : '',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-status-danger mt-1">{error}</p>}
        {helperText && !error && <p className="text-xs text-fg-muted mt-1">{helperText}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
