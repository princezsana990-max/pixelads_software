import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, Layers } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export interface PageOption {
  label: string;
  path: string;
  icon?: React.ReactNode;
  badge?: string;
}

interface PageViewDropdownProps {
  title: string;
  options: PageOption[];
  className?: string;
}

export const PageViewDropdown: React.FC<PageViewDropdownProps> = ({
  title,
  options,
  className,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const currentOption = options.find((opt) => opt.path === location.pathname) || options[0];

  return (
    <div
      className={twMerge(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-bg-surface border border-border shadow-xs text-xs font-medium text-fg-secondary',
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-fg-muted font-medium">
        <Layers className="w-3.5 h-3.5 text-brand-500" />
        <span>{title}:</span>
      </div>

      <div className="relative inline-block">
        <select
          value={currentOption.path}
          onChange={(e) => navigate(e.target.value)}
          aria-label={`${title} page selector`}
          className="appearance-none pl-2.5 pr-7 py-1 rounded-lg bg-bg-secondary hover:bg-brand-500/10 text-xs font-semibold text-fg-primary border border-border/80 hover:border-brand-500/40 cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors"
        >
          {options.map((opt) => (
            <option key={opt.path} value={opt.path}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-fg-muted pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
      </div>
    </div>
  );
};
