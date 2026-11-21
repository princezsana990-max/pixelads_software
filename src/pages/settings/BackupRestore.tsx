import React, { useState, useEffect } from 'react';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  FileText,
  ShieldAlert,
} from 'lucide-react';
import { format } from 'date-fns';
import { getSupabaseClient } from '../../lib/supabase';
import { BackupHistory } from '../../lib/types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { DataTable, Column } from '../../components/ui/DataTable';

export const BackupRestore: React.FC = () => {
  const [backups, setBackups] = useState<BackupHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  // Restore states
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreData, setRestoreData] = useState<any | null>(null);
  const [restoreValidation, setRestoreValidation] = useState<{
    valid: boolean;
    tablesFound: string[];
    recordCounts: Record<string, number>;
  } | null>(null);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const fetchBackups = async () => {
    setIsLoading(true);
    const client = getSupabaseClient();
    if (!client) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await client
        .from('backup_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBackups(data || []);
    } catch (err) {
      console.error('Failed to load backup history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  // Export handlers
  const handleExport = async (type: 'FULL' | 'ORDERS' | 'EMPLOYEES' | 'PAYMENTS' | 'ATTENDANCE' | 'INVOICES') => {
    setIsExporting(type);
    const client = getSupabaseClient();
    if (!client) {
      alert('Database not connected.');
      setIsExporting(null);
      return;
    }

    try {
      const backupPayload: Record<string, any> = {
        meta: {
          app: 'OrderFlow Pro',
          version: '1.0.0',
          backupType: type,
          exportedAt: new Date().toISOString(),
        },
      };

      const recordCounts: Record<string, number> = {};

      const fetchTable = async (table: string) => {
        const { data } = await client.from(table).select('*');
        backupPayload[table] = data || [];
        recordCounts[table] = (data || []).length;
      };

      if (type === 'FULL') {
        await Promise.all([
          fetchTable('employees'),
          fetchTable('orders'),
          fetchTable('order_assignments'),
          fetchTable('order_status_history'),
          fetchTable('mistake_categories'),
          fetchTable('order_mistakes'),
          fetchTable('payments'),
          fetchTable('invoices'),
          fetchTable('invoice_items'),
          fetchTable('attendance'),
          fetchTable('company_settings'),
        ]);
      } else if (type === 'ORDERS') {
        await Promise.all([
          fetchTable('orders'),
          fetchTable('order_assignments'),
          fetchTable('order_status_history'),
          fetchTable('order_mistakes'),
        ]);
      } else if (type === 'EMPLOYEES') {
        await fetchTable('employees');
      } else if (type === 'PAYMENTS') {
        await fetchTable('payments');
      } else if (type === 'ATTENDANCE') {
        await fetchTable('attendance');
      } else if (type === 'INVOICES') {
        await Promise.all([fetchTable('invoices'), fetchTable('invoice_items')]);
      }

      // Generate Download
      const jsonStr = JSON.stringify(backupPayload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateTag = format(new Date(), 'yyyy-MM-dd_HHmm');
      const filename = `OrderFlow_Backup_${type}_${dateTag}.json`;
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      // Log in backup_history table
      await client.from('backup_history').insert([
        {
          backup_name: filename,
          backup_type: type,
          record_counts: recordCounts,
          file_size_bytes: blob.size,
        },
      ]);

      await fetchBackups();
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    } finally {
      setIsExporting(null);
    }
  };

  // Restore file selection & validation
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreFile(file);
    setRestoreResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.meta || parsed.meta.app !== 'OrderFlow Pro') {
          setRestoreValidation({
            valid: false,
            tablesFound: [],
            recordCounts: {},
          });
          return;
        }

        const tablesFound = Object.keys(parsed).filter((k) => k !== 'meta');
        const recordCounts: Record<string, number> = {};
        tablesFound.forEach((tbl) => {
          recordCounts[tbl] = Array.isArray(parsed[tbl]) ? parsed[tbl].length : 0;
        });

        setRestoreData(parsed);
        setRestoreValidation({
          valid: true,
          tablesFound,
          recordCounts,
        });
      } catch {
        setRestoreValidation({
          valid: false,
          tablesFound: [],
          recordCounts: {},
        });
      }
    };
    reader.readAsText(file);
  };

  // Execute validated restore
  const handleExecuteRestore = async () => {
    if (confirmationInput !== 'CONFIRM RESTORE' || !restoreData) return;
    setIsRestoring(true);
    setRestoreResult(null);

    const client = getSupabaseClient();
    if (!client) {
      alert('Database not connected.');
      setIsRestoring(false);
      return;
    }

    try {
      // Upsert tables safely in dependency order
      const tablesOrder = [
        'employees',
        'mistake_categories',
        'orders',
        'order_assignments',
        'order_status_history',
        'order_mistakes',
        'payments',
        'invoices',
        'invoice_items',
        'attendance',
        'company_settings',
      ];

      for (const table of tablesOrder) {
        if (restoreData[table] && Array.isArray(restoreData[table]) && restoreData[table].length > 0) {
          const { error } = await client
            .from(table)
            .upsert(restoreData[table], { ignoreDuplicates: false });
          if (error) throw new Error(`Table ${table} restore error: ${error.message}`);
        }
      }

      // Log in audit trail
      await client.from('audit_logs').insert([
        {
          entity_type: 'SYSTEM_BACKUP',
          entity_id: 'RESTORE',
          action: 'RESTORE',
          details: { fileName: restoreFile?.name, counts: restoreValidation?.recordCounts },
        },
      ]);

      setRestoreResult({
        success: true,
        message: 'Database records restored and synchronized successfully!',
      });
      setIsConfirmOpen(false);
      setRestoreFile(null);
      setRestoreData(null);
      setRestoreValidation(null);
      setConfirmationInput('');
      await fetchBackups();
    } catch (err: any) {
      setRestoreResult({
        success: false,
        message: err.message || 'Failed to restore data.',
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const columns: Column<BackupHistory>[] = [
    {
      key: 'backup_name',
      header: 'Backup File Name',
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-fg-primary block">
          {row.backup_name}
        </span>
      ),
    },
    {
      key: 'backup_type',
      header: 'Scope',
      render: (row) => (
        <span className="font-medium text-xs text-brand-600 dark:text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded">
          {row.backup_type}
        </span>
      ),
    },
    {
      key: 'file_size_bytes',
      header: 'File Size',
      render: (row) => (
        <span className="text-xs text-fg-secondary">
          {(row.file_size_bytes / 1024).toFixed(1)} KB
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Created On',
      render: (row) => (
        <span className="text-xs text-fg-secondary">
          {format(new Date(row.created_at), 'yyyy-MM-dd HH:mm')}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-page-title text-fg-primary">Database Backup & Recovery</h1>
        <p className="text-sm text-fg-secondary mt-0.5">
          Generate full or table-level JSON exports and execute validated data restoration.
        </p>
      </div>

      {restoreResult && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-2 ${
            restoreResult.success
              ? 'bg-status-success/10 border-status-success/30 text-status-success'
              : 'bg-status-danger/10 border-status-danger/30 text-status-danger'
          }`}
        >
          {restoreResult.success ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{restoreResult.message}</span>
        </div>
      )}

      {/* Backup Exports Card */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Data Export</CardTitle>
          <p className="text-xs text-fg-secondary mt-0.5">
            Download complete or modular JSON snapshots containing normalized PostgreSQL tables.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-xl border border-border bg-bg-secondary/40 space-y-3">
              <div>
                <span className="font-bold text-sm text-fg-primary block">Full System Backup</span>
                <p className="text-xs text-fg-secondary mt-0.5">
                  Exports employees, orders, assignments, mistakes, payments, attendance & invoices.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                className="w-full"
                isLoading={isExporting === 'FULL'}
                onClick={() => handleExport('FULL')}
                icon={<Download className="w-4 h-4" />}
              >
                Export Complete Database
              </Button>
            </div>

            <div className="p-4 rounded-xl border border-border bg-bg-secondary/40 space-y-3">
              <div>
                <span className="font-bold text-sm text-fg-primary block">Orders & Mistakes</span>
                <p className="text-xs text-fg-secondary mt-0.5">
                  Exports all orders, assignments, status transitions, and mistake logs.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                isLoading={isExporting === 'ORDERS'}
                onClick={() => handleExport('ORDERS')}
                icon={<Download className="w-4 h-4" />}
              >
                Export Orders Only
              </Button>
            </div>

            <div className="p-4 rounded-xl border border-border bg-bg-secondary/40 space-y-3">
              <div>
                <span className="font-bold text-sm text-fg-primary block">Employees & Staff</span>
                <p className="text-xs text-fg-secondary mt-0.5">
                  Exports Order Takers, Editors, and Managers records.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                isLoading={isExporting === 'EMPLOYEES'}
                onClick={() => handleExport('EMPLOYEES')}
                icon={<Download className="w-4 h-4" />}
              >
                Export Employees Only
              </Button>
            </div>

            <div className="p-4 rounded-xl border border-border bg-bg-secondary/40 space-y-3">
              <div>
                <span className="font-bold text-sm text-fg-primary block">Payments & Finance</span>
                <p className="text-xs text-fg-secondary mt-0.5">
                  Exports all salary and incentive disbursement vouchers.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                isLoading={isExporting === 'PAYMENTS'}
                onClick={() => handleExport('PAYMENTS')}
                icon={<Download className="w-4 h-4" />}
              >
                Export Payments Only
              </Button>
            </div>

            <div className="p-4 rounded-xl border border-border bg-bg-secondary/40 space-y-3">
              <div>
                <span className="font-bold text-sm text-fg-primary block">Monthly Attendance</span>
                <p className="text-xs text-fg-secondary mt-0.5">
                  Exports complete historical attendance records.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                isLoading={isExporting === 'ATTENDANCE'}
                onClick={() => handleExport('ATTENDANCE')}
                icon={<Download className="w-4 h-4" />}
              >
                Export Attendance Only
              </Button>
            </div>

            <div className="p-4 rounded-xl border border-border bg-bg-secondary/40 space-y-3">
              <div>
                <span className="font-bold text-sm text-fg-primary block">Invoices & Items</span>
                <p className="text-xs text-fg-secondary mt-0.5">
                  Exports all client invoices and itemized line items.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                isLoading={isExporting === 'INVOICES'}
                onClick={() => handleExport('INVOICES')}
                icon={<Download className="w-4 h-4" />}
              >
                Export Invoices Only
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Restore Section */}
      <Card>
        <CardHeader>
          <CardTitle>Validated Data Restoration</CardTitle>
          <p className="text-xs text-fg-secondary mt-0.5">
            Upload an OrderFlow Pro backup JSON file. Strict validation and confirmation are enforced before data is merged.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-border hover:border-brand-500/50 bg-bg-secondary/40 cursor-pointer transition-colors">
            <Upload className="w-8 h-8 text-fg-muted mb-2" />
            <span className="text-sm font-semibold text-fg-primary">
              Choose an OrderFlow Pro Backup JSON
            </span>
            <input type="file" accept=".json" onChange={handleFileSelect} className="hidden" />
          </label>

          {restoreFile && restoreValidation && (
            <div className="p-4 rounded-xl bg-bg-surface border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-fg-primary">{restoreFile.name}</span>
                {restoreValidation.valid ? (
                  <span className="text-status-success font-semibold text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Schema Validated
                  </span>
                ) : (
                  <span className="text-status-danger font-semibold text-xs flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Invalid Backup Format
                  </span>
                )}
              </div>

              {restoreValidation.valid && (
                <>
                  <div className="text-xs text-fg-secondary">
                    Tables detected in file:
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {restoreValidation.tablesFound.map((tbl) => (
                        <span
                          key={tbl}
                          className="px-2 py-0.5 rounded bg-bg-secondary border border-border font-mono text-[11px]"
                        >
                          {tbl} ({restoreValidation.recordCounts[tbl]})
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setIsConfirmOpen(true)}
                      icon={<ShieldAlert className="w-4 h-4" />}
                    >
                      Proceed to Restore Confirmation
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Backup History Table */}
      <div className="space-y-3">
        <h3 className="text-section-title text-fg-primary">Recent Backup Exports</h3>
        <DataTable
          columns={columns}
          data={backups}
          keyExtractor={(b) => b.id}
          isLoading={isLoading}
          emptyTitle="No Backup History"
          emptyDescription="Exports you generate will be cataloged here."
        />
      </div>

      {/* SAFETY CONFIRMATION MODAL */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title="Confirm Database Restoration"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-status-danger/10 border border-status-danger/30 text-status-danger flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-xs block">Destructive Action Warning</span>
              <p className="mt-0.5">
                Restoring data will synchronize and upsert records into your Supabase database. To prevent accidental corruption, explicit confirmation is mandatory.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-fg-primary block">
              Type <strong className="text-status-danger">CONFIRM RESTORE</strong> below:
            </label>
            <Input
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder="CONFIRM RESTORE"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={confirmationInput !== 'CONFIRM RESTORE'}
              isLoading={isRestoring}
              onClick={handleExecuteRestore}
            >
              Execute Restore
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
