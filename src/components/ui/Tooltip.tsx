import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export interface TooltipProps {
  content: string;
  children?: React.ReactNode;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, className }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <span
      className="relative inline-flex items-center cursor-help"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
      tabIndex={0}
      aria-label={content}
    >
      {children || <HelpCircle className="w-3.5 h-3.5 text-fg-muted hover:text-brand-500 transition-colors ml-1" />}
      {isVisible && (
        <span
          className={twMerge(
            'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 px-2.5 py-1.5 text-xs font-normal text-white bg-[#242333] dark:bg-[#373544] rounded-md shadow-lg whitespace-normal max-w-xs text-center border border-border/20 pointer-events-none transition-all duration-150',
            className
          )}
        >
          {content}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#242333] dark:border-t-[#373544]" />
        </span>
      )}
    </span>
  );
};
