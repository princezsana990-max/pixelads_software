import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';
import { Button } from './Button';
import { twMerge } from 'tailwind-merge';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div
      className={twMerge(
        'flex flex-col items-center justify-center text-center p-8 rounded-xl border border-dashed border-border bg-bg-surface/50 min-h-[220px]',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-base font-semibold text-fg-primary mb-1">{title}</h4>
      <p className="text-sm text-fg-secondary max-w-sm mb-4">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
