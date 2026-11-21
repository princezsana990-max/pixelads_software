import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'default'
    | 'secondary'
    | 'pending'
    | 'in-progress'
    | 'completed'
    | 'issue'
    | 'active'
    | 'inactive'
    | 'role';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  children,
  ...props
}) => {
  const variantStyles = {
    default: 'bg-brand-500/10 text-brand-500 border-brand-500/20',
    secondary: 'bg-bg-secondary text-fg-secondary border-border',
    pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    'in-progress': 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    completed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    issue: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    inactive: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
    role: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  };

  return (
    <span
      className={twMerge(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border transition-colors',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
