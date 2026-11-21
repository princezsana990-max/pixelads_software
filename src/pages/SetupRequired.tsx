import React, { useState } from 'react';
import {
  Database,
  Key,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { useSupabase } from '../context/SupabaseContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export const SetupRequired: React.FC = () => {
  const { missingVars, testConnection, saveCredentials, isChecking } = useSupabase();

  const [inputUrl, setInputUrl] = useState('');
  const [inputKey, setInputKey] = useState('');
  const [testingStatus, setTestingStatus] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: string } | null>(null);
  const [copiedMigration, setCopiedMigration] = useState(false);

  const handleTestAndConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestingStatus('Testing connection to Supabase PostgreSQL...');
    setTestResult(null);

    const result = await testConnection(inputUrl, inputKey);
    setTestResult(result);
    setTestingStatus(null);

    if (result.success && result.tablesFound) {
      await saveCredentials(inputUrl, inputKey);
      window.location.href = '/dashboard';
    }
  };

  const copySqlNotice = () => {
    navigator.clipboard.writeText('supabase/migrations/20260221000000_orderflow_init.sql');
    setCopiedMigration(true);
    setTimeout(() => setCopiedMigration(false), 2000);
  };

  return (
    <div className="min-h-screen bg-bg-app flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white shadow-md">
            <Layers className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-fg-primary tracking-tight">
              OrderFlow<span className="text-brand-500 font-extrabold ml-0.5">PRO</span>
            </h1>
            <p className="text-xs uppercase tracking-widest text-fg-muted font-semibold">
              Enterprise Setup Required
            </p>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="rounded-2xl border border-status-warning/40 bg-status-warning/10 p-5 mb-8">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-status-warning shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-semibold text-fg-primary">
                Supabase PostgreSQL Connection Required
              </h2>
              <p className="text-xs text-fg-secondary mt-1">
                OrderFlow Pro strictly mandates a real Supabase database. Demo modes, mock storage, and local fallbacks are prohibited by enterprise compliance rules.
              </p>
              <div className="mt-3">
                <span className="text-xs font-semibold text-status-warning uppercase tracking-wider block mb-1">
                  Missing Configuration:
                </span>
                <ul className="list-disc list-inside text-xs text-fg-primary space-y-0.5">
                  {missingVars.map((v) => (
                    <li key={v} className="font-mono">{v}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Setup Card */}
        <div className="bg-bg-surface border border-border rounded-2xl shadow-card p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-base font-semibold text-fg-primary">
              Connect to Your Supabase Instance
            </h3>
            <p className="text-xs text-fg-secondary mt-1">
              Enter your project URL and public Anon key below, or set them in your local <code className="font-mono bg-bg-secondary px-1.5 py-0.5 rounded border border-border">.env</code> file.
            </p>
          </div>

          <form onSubmit={handleTestAndConnect} className="space-y-4">
            <Input
              label="Supabase Project URL"
              type="url"
              placeholder="https://your-project.supabase.co"
              required
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              leftIcon={<Globe className="w-4 h-4" />}
              helperText="Find in Supabase Dashboard → Settings → API → Project URL"
            />

            <Input
              label="Supabase Anon / Public API Key"
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              required
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              leftIcon={<Key className="w-4 h-4" />}
              helperText="Find in Supabase Dashboard → Settings → API → Project API Keys (anon public)"
            />

            {testingStatus && (
              <div className="p-3 rounded-lg bg-bg-secondary border border-border flex items-center gap-2 text-xs text-fg-primary">
                <RefreshCw className="w-4 h-4 animate-spin text-brand-500" />
                <span>{testingStatus}</span>
              </div>
            )}

            {testResult && (
              <div
                className={`p-4 rounded-xl border text-xs space-y-1 ${
                  testResult.success
                    ? 'bg-status-success/10 border-status-success/30 text-fg-primary'
                    : 'bg-status-danger/10 border-status-danger/30 text-fg-primary'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold">
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-status-success" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-status-danger" />
                  )}
                  <span>{testResult.message}</span>
                </div>
                {testResult.details && (
                  <p className="text-fg-secondary mt-1">{testResult.details}</p>
                )}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isChecking}
              icon={<Database className="w-4 h-4" />}
            >
              Verify Connection & Connect
            </Button>
          </form>

          {/* Migration Instructions */}
          <div className="pt-6 border-t border-border space-y-3">
            <h4 className="text-xs font-semibold text-fg-primary uppercase tracking-wider">
              Step 1: Execute Database Schema Migration
            </h4>
            <p className="text-xs text-fg-secondary">
              Before your first connection, run the official OrderFlow Pro schema migration in your Supabase SQL Editor.
            </p>
            <div className="flex items-center justify-between p-3 rounded-lg bg-bg-secondary border border-border">
              <span className="font-mono text-xs text-fg-primary truncate mr-2">
                supabase/migrations/20260221000000_orderflow_init.sql
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={copySqlNotice}
                icon={copiedMigration ? <Check className="w-3.5 h-3.5 text-status-success" /> : <Copy className="w-3.5 h-3.5" />}
              >
                {copiedMigration ? 'Copied Path' : 'Copy Path'}
              </Button>
            </div>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-brand-500 hover:text-brand-600 font-medium"
            >
              Open Supabase Dashboard
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
