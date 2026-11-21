import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-bg-surface border border-border rounded-2xl p-8 shadow-card">
        <div className="w-16 h-16 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center mx-auto mb-4">
          <FileQuestion className="w-9 h-9" />
        </div>
        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-600 dark:text-brand-400 mb-3">
          Error 404 — Page Not Found
        </span>
        <h1 className="text-page-title text-fg-primary mb-2">Requested Route Does Not Exist</h1>
        <p className="text-sm text-fg-secondary mb-6">
          The page you are looking for may have been moved, renamed, or is currently unavailable in OrderFlow Pro.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="primary"
            onClick={() => navigate('/dashboard')}
            icon={<Home className="w-4 h-4" />}
            className="w-full sm:w-auto"
          >
            Go to Dashboard
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            icon={<ArrowLeft className="w-4 h-4" />}
            className="w-full sm:w-auto"
          >
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
};
