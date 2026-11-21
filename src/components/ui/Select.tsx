import React from 'react';
import { ChevronDown } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: { value: string | number; label: string; disabled?: boolean }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helperText, options, children, id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-medium text-fg-primary tracking-wide"
          >
            {label}
            {props.required && <span className="text-status-danger ml-0.5">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          <select
            id={selectId}
            ref={ref}
            className={twMerge(
              'w-full h-10 px-3 py-2 pr-9 text-sm bg-bg-surface text-fg-primary rounded-lg border border-border shadow-sm appearance-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 focus-visible:border-brand-500 disabled:opacity-50 disabled:bg-bg-secondary disabled:cursor-not-allowed cursor-pointer',
              error ? 'border-status-danger focus-visible:ring-status-danger/30' : '',
              className
            )}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div className="absolute right-3 pointer-events-none text-fg-muted flex items-center">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error && <p className="text-xs text-status-danger mt-1">{error}</p>}
        {helperText && !error && <p className="text-xs text-fg-muted mt-1">{helperText}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
