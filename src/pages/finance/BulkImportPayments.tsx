import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  Download,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  ArrowRight,
  Clipboard,
  RefreshCw,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { format, parseISO } from 'date-fns';
import { getSupabaseClient } from '../../lib/supabase';
import { Employee, PaymentMode } from '../../lib/types';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { PageViewDropdown } from '../../components/layout/PageViewDropdown';
import { ImportProgressLoader, LoadingSpinner } from '../../components/ui/LoadingAnimation';
import {
  generateOldPaymentImportTemplate,
  generateStandardPaymentImportTemplate,
} from '../../lib/exportUtils';

interface ParsedPaymentRow {
  rowNumber: number;
  date: string;
  employeeIdentifier: string;
  amount: number;
  statusOrMode: string;
  notes: string;
  category: string;

  // Validation
  isValid: boolean;
  errors: string[];
  resolvedEmployeeId?: string;
  resolvedEmployeeName?: string;
  normalizedMode: PaymentMode;
}

export const BulkImportPayments: React.FC = () => {
  const navigate = useNavigate();

  // Mode: 'old' (DATE | NAME | AMOUNT | STATUS | NOTES) or 'standard'
  const [importMode, setImportMode] = useState<'old' | 'standard'>('old');

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);

  // Settings
  const [autoCreateMissingEmployees, setAutoCreateMissingEmployees] = useState(true);
  const [defaultPaymentMode, setDefaultPaymentMode] = useState<PaymentMode>('Bank Transfer');
  const [defaultCategory, setDefaultCategory] = useState('Salary');

  // Input state
  const [fileName, setFileName] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [parsedRows, setParsedRows] = useState<ParsedPaymentRow[]>([]);
  const [detectedNewEmployees, setDetectedNewEmployees] = useState<string[]>([]);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setIsLoadingMeta(true);
    const client = getSupabaseClient();
    if (!client) {
      setIsLoadingMeta(false);
      return;
    }

    try {
      const { data } = await client.from('employees').select('*').order('name');
      setEmployees(data || []);
    } catch (err) {
      console.error('Failed to load employees for payment import:', err);
    } finally {
      setIsLoadingMeta(false);
    }
  };

  // Helper to normalize payment mode
  const normalizePaymentMode = (raw: any): PaymentMode => {
    if (!raw) return defaultPaymentMode;
    const s = String(raw).trim().toLowerCase();
    if (s.includes('cash')) return 'Cash';
    if (s.includes('bank') || s.includes('transfer') || s.includes('online')) return 'Bank Transfer';
    if (s.includes('easy') || s.includes('paisa')) return 'Easypaisa';
    if (s.includes('jazz')) return 'JazzCash';
    return 'Other';
  };

  // Helper to parse dates reliably
  const parseFlexibleDate = (rawDate: any): string => {
    if (!rawDate) return format(new Date(), 'yyyy-MM-dd');
    if (typeof rawDate === 'number') {
      // Excel serial date format
      const parsed = new Date((rawDate - (25567 + 2)) * 86400 * 1000);
      if (!isNaN(parsed.getTime())) {
        return format(parsed, 'yyyy-MM-dd');
      }
    }
    const str = String(rawDate).trim();
    // Try YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    // Try DD/MM/YYYY or DD-MM-YYYY
    const dmy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (dmy) {
      const day = dmy[1].padStart(2, '0');
      const month = dmy[2].padStart(2, '0');
      const year = dmy[3];
      return `${year}-${month}-${day}`;
    }
    try {
      const parsed = new Date(str);
      if (!isNaN(parsed.getTime())) return format(parsed, 'yyyy-MM-dd');
    } catch {
      // fallback
    }
    return format(new Date(), 'yyyy-MM-dd');
  };

  // Process rows from 2D array
  const processRawData = (rows: any[][]) => {
    if (!rows || rows.length === 0) return;

    setIsProcessing(true);
    setImportSuccessMessage(null);

    // Look for header row or start directly
    let startIndex = 0;
    const firstRowStr = rows[0].map((c) => String(c).trim().toUpperCase()).join(' ');

    if (
      firstRowStr.includes('DATE') ||
      firstRowStr.includes('NAME') ||
      firstRowStr.includes('AMOUNT') ||
      firstRowStr.includes('STATUS')
    ) {
      startIndex = 1;
    }

    const employeeMapByName = new Map<string, Employee>();
    const employeeMapByCode = new Map<string, Employee>();

    employees.forEach((emp) => {
      employeeMapByName.set(emp.name.trim().toLowerCase(), emp);
      employeeMapByCode.set(emp.employee_code.trim().toLowerCase(), emp);
    });

    const parsed: ParsedPaymentRow[] = [];
    const missingEmployees = new Set<string>();

    for (let i = startIndex; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0 || row.every((c) => c === undefined || c === null || String(c).trim() === '')) {
        continue;
      }

      const errors: string[] = [];
      let date = '';
      let employeeIdentifier = '';
      let amount = 0;
      let statusOrMode = '';
      let notes = '';
      let category = defaultCategory;

      if (importMode === 'old') {
        // OLD FORMAT: DATE | NAME | AMOUNT | STATUS | NOTES
        date = parseFlexibleDate(row[0]);
        employeeIdentifier = String(row[1] || '').trim();
        amount = parseFloat(String(row[2] || '0').replace(/[^0-9.-]+/g, '')) || 0;
        statusOrMode = String(row[3] || '').trim();
        notes = String(row[4] || '').trim();
      } else {
        // STANDARD FORMAT: Date | Employee | Amount | Mode | Category | Reference | Notes
        date = parseFlexibleDate(row[0]);
        employeeIdentifier = String(row[1] || '').trim();
        amount = parseFloat(String(row[2] || '0').replace(/[^0-9.-]+/g, '')) || 0;
        statusOrMode = String(row[3] || '').trim();
        category = String(row[4] || defaultCategory).trim();
        const ref = String(row[5] || '').trim();
        const baseNotes = String(row[6] || '').trim();
        notes = ref ? (baseNotes ? `${baseNotes} (Ref: ${ref})` : `Ref: ${ref}`) : baseNotes;
      }

      if (!employeeIdentifier) {
        errors.push('Employee name or code is missing');
      }

      if (!amount || amount <= 0) {
        errors.push('Invalid payment amount (must be > 0)');
      }

      // Resolve employee
      const cleanIdent = employeeIdentifier.toLowerCase();
      let matchedEmp = employeeMapByName.get(cleanIdent) || employeeMapByCode.get(cleanIdent);

      // Partial fuzzy search if exact match fails
      if (!matchedEmp && cleanIdent) {
        matchedEmp = employees.find(
          (e) =>
            e.name.toLowerCase().includes(cleanIdent) ||
            cleanIdent.includes(e.name.toLowerCase()) ||
            e.employee_code.toLowerCase() === cleanIdent
        );
      }

      if (!matchedEmp) {
        missingEmployees.add(employeeIdentifier);
        if (!autoCreateMissingEmployees) {
          errors.push(`Employee "${employeeIdentifier}" not found in database`);
        }
      }

      const normalizedMode = normalizePaymentMode(statusOrMode);

      // Append status to notes if old status contains additional information (e.g. "Paid", "Pending")
      let finalNotes = notes;
      if (statusOrMode && !['cash', 'bank transfer', 'easypaisa', 'jazzcash'].includes(statusOrMode.toLowerCase())) {
        finalNotes = finalNotes ? `[Status: ${statusOrMode}] ${finalNotes}` : `[Status: ${statusOrMode}]`;
      }

      parsed.push({
        rowNumber: i + 1,
        date,
        employeeIdentifier,
        amount,
        statusOrMode,
        notes: finalNotes,
        category: category || 'Salary',
        isValid: errors.length === 0,
        errors,
        resolvedEmployeeId: matchedEmp?.id,
        resolvedEmployeeName: matchedEmp?.name || employeeIdentifier,
        normalizedMode,
      });
    }

    setParsedRows(parsed);
    setDetectedNewEmployees(Array.from(missingEmployees));
    setIsProcessing(false);
  };

  // Handle Excel/CSV file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'csv') {
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          processRawData(results.data as any[][]);
        },
        error: (err) => {
          alert(`CSV Parse Error: ${err.message}`);
        },
      });
    } else {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const firstWsName = wb.SheetNames[0];
          const ws = wb.Sheets[firstWsName];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
          processRawData(data);
        } catch (err: any) {
          alert(`Excel Parse Error: ${err.message}`);
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  // Handle Clipboard / Paste processing
  const handleProcessPastedText = () => {
    if (!pastedText.trim()) return;

    // Detect if lines are tab-separated or comma-separated
    const lines = pastedText.trim().split(/\r?\n/);
    const rows: string[][] = lines.map((line) => {
      if (line.includes('\t')) {
        return line.split('\t');
      } else if (line.includes(',')) {
        return line.split(',');
      } else {
        // Space or multiple spaces separated
        return line.split(/\s{2,}|\t/);
      }
    });

    setFileName(`Pasted Data (${rows.length} rows)`);
    processRawData(rows);
  };

  // Execute Import
  const handleExecuteImport = async () => {
    const client = getSupabaseClient();
    if (!client) {
      alert('Database connection unavailable.');
      return;
    }

    setIsImporting(true);
    setImportSuccessMessage(null);

    try {
      // 1. Create missing employees if autoCreateMissingEmployees is ON
      const empMap = new Map<string, string>();
      employees.forEach((e) => {
        empMap.set(e.name.toLowerCase().trim(), e.id);
        empMap.set(e.employee_code.toLowerCase().trim(), e.id);
      });

      if (autoCreateMissingEmployees && detectedNewEmployees.length > 0) {
        for (let i = 0; i < detectedNewEmployees.length; i++) {
          const empName = detectedNewEmployees[i];
          const clean = empName.toLowerCase().trim();
          if (!empMap.has(clean)) {
            const empCode = `EMP-${Date.now().toString().slice(-4)}-${i + 1}`;
            const { data: newEmp, error: newEmpErr } = await client
              .from('employees')
              .insert([
                {
                  employee_code: empCode,
                  name: empName.trim(),
                  role: 'Editor',
                  joining_date: format(new Date(), 'yyyy-MM-dd'),
                  is_active: true,
                  notes: 'Auto-created via Bulk Payment Import',
                },
              ])
              .select()
              .single();

            if (!newEmpErr && newEmp) {
              empMap.set(clean, newEmp.id);
            }
          }
        }
        // Refresh local employees
        await fetchEmployees();
      }

      // 2. Prepare Payment Payloads
      const validRowsToInsert = parsedRows
        .filter((r) => r.isValid || (autoCreateMissingEmployees && r.amount > 0))
        .map((r) => {
          const resolvedId =
            r.resolvedEmployeeId || empMap.get(r.employeeIdentifier.toLowerCase().trim());

          return {
            employee_id: resolvedId,
            payment_date: r.date,
            amount: r.amount,
            payment_mode: r.normalizedMode,
            category: r.category || defaultCategory,
            notes: r.notes || null,
          };
        })
        .filter((p) => Boolean(p.employee_id));

      if (validRowsToInsert.length === 0) {
        alert('No valid payment records ready to import.');
        setIsImporting(false);
        return;
      }

      setImportProgress({ current: 0, total: validRowsToInsert.length });

      // Insert in chunks of 50 to prevent timeout
      const chunkSize = 50;
      let insertedCount = 0;

      for (let i = 0; i < validRowsToInsert.length; i += chunkSize) {
        const chunk = validRowsToInsert.slice(i, i + chunkSize);

        const { error } = await client.from('payments').insert(chunk);

        if (error) {
          // Fallback if category column is not recognized
          if (error.message?.toLowerCase().includes('category')) {
            const fallbackChunk = chunk.map((c) => {
              const copy: any = { ...c };
              if (copy.category) {
                copy.notes = copy.notes ? `[${copy.category}] ${copy.notes}` : `[${copy.category}]`;
                delete copy.category;
              }
              return copy;
            });
            const { error: retryErr } = await client.from('payments').insert(fallbackChunk);
            if (retryErr) throw retryErr;
          } else {
            throw error;
          }
        }

        insertedCount += chunk.length;
        setImportProgress({ current: insertedCount, total: validRowsToInsert.length });
      }

      setImportSuccessMessage(`Successfully imported ${insertedCount} payment records!`);
      setParsedRows([]);
      setFileName(null);
      setPastedText('');
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const validCount = parsedRows.filter(
    (r) => r.isValid || (autoCreateMissingEmployees && r.amount > 0)
  ).length;
  const invalidCount = parsedRows.length - validCount;
  const totalAmount = parsedRows.reduce((sum, r) => sum + (r.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header & Page View Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-page-title text-fg-primary">Bulk Import Payments</h1>
            <Badge variant="role">Bulk Upload</Badge>
          </div>
          <p className="text-sm text-fg-secondary mt-1">
            Add existing historical payments in bulk using Excel (.xlsx), CSV, or direct copy-paste.
          </p>
        </div>

        {/* View Switcher Dropdown */}
        <PageViewDropdown
          title="Finance View"
          options={[
            { label: '💳 Payments List', path: '/finance/payments' },
            { label: '📥 Bulk Import Payments', path: '/finance/payments/bulk-import' },
            { label: '🧾 Invoice History', path: '/finance/invoices' },
            { label: '➕ Invoice Generator', path: '/finance/invoices/new' },
          ]}
        />
      </div>

      {/* Format Selector & Template Download */}
      <div className="p-5 rounded-2xl bg-bg-surface border border-border shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-fg-primary">Choose Payment Format</h3>
            <p className="text-xs text-fg-muted mt-0.5">
              Select your file format structure before uploading or pasting records.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setImportMode('old')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                importMode === 'old'
                  ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                  : 'bg-bg-secondary text-fg-secondary border-border hover:text-fg-primary'
              }`}
            >
              Old Format (DATE NAME AMOUNT STATUS NOTES)
            </button>
            <button
              onClick={() => setImportMode('standard')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                importMode === 'standard'
                  ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                  : 'bg-bg-secondary text-fg-secondary border-border hover:text-fg-primary'
              }`}
            >
              Standard Format
            </button>
          </div>
        </div>

        {/* Format Explanation Banner */}
        <div className="p-3.5 rounded-xl bg-bg-secondary border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-4 h-4 text-brand-500 shrink-0" />
            <div>
              <span className="font-semibold text-fg-primary">
                {importMode === 'old' ? 'Old Format Column Order:' : 'Standard Format Columns:'}
              </span>
              <span className="ml-2 font-mono text-brand-600 dark:text-brand-400 font-medium">
                {importMode === 'old'
                  ? 'DATE | NAME | AMOUNT | STATUS | NOTES'
                  : 'Date | Employee Code or Name | Amount | Payment Mode | Category | Reference | Notes'}
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={
              importMode === 'old'
                ? generateOldPaymentImportTemplate
                : generateStandardPaymentImportTemplate
            }
            icon={<Download className="w-3.5 h-3.5 text-brand-500" />}
          >
            Download Sample Excel
          </Button>
        </div>

        {/* Configuration Switches */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/60 text-xs">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoCreateMissingEmployees}
              onChange={(e) => setAutoCreateMissingEmployees(e.target.checked)}
              className="rounded border-border text-brand-500 focus:ring-brand-500"
            />
            <span className="text-fg-primary font-medium">
              Auto-create missing staff members as Editors
            </span>
          </label>

          <div className="flex items-center gap-2">
            <span className="text-fg-muted">Default Category:</span>
            <select
              value={defaultCategory}
              onChange={(e) => setDefaultCategory(e.target.value)}
              className="px-2 py-1 rounded bg-bg-secondary border border-border text-fg-primary text-xs"
            >
              <option value="Salary">Salary</option>
              <option value="Bonus">Bonus</option>
              <option value="Advance">Advance</option>
              <option value="Incentive">Incentive</option>
              <option value="Expense">Expense</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-fg-muted">Default Mode:</span>
            <select
              value={defaultPaymentMode}
              onChange={(e) => setDefaultPaymentMode(e.target.value as PaymentMode)}
              className="px-2 py-1 rounded bg-bg-secondary border border-border text-fg-primary text-xs"
            >
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cash">Cash</option>
              <option value="Easypaisa">Easypaisa</option>
              <option value="JazzCash">JazzCash</option>
            </select>
          </div>
        </div>
      </div>

      {/* Upload & Paste Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Method 1: File Upload */}
        <div className="p-6 rounded-2xl bg-bg-surface border-2 border-dashed border-border hover:border-brand-500/50 transition-all flex flex-col items-center justify-center text-center space-y-3 relative">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-500">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-fg-primary">Upload Excel or CSV File</h4>
            <p className="text-xs text-fg-muted mt-0.5">
              Drag & drop .xlsx, .xls, or .csv file here
            </p>
          </div>
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileUpload}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          {fileName && (
            <div className="px-3 py-1 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 font-mono text-xs font-semibold">
              Selected: {fileName}
            </div>
          )}
        </div>

        {/* Method 2: Direct Paste */}
        <div className="p-5 rounded-2xl bg-bg-surface border border-border shadow-card flex flex-col space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clipboard className="w-4 h-4 text-brand-500" />
              <h4 className="text-sm font-semibold text-fg-primary">Or Paste Table Data Directly</h4>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleProcessPastedText}
              disabled={!pastedText.trim()}
            >
              Process Text
            </Button>
          </div>
          <textarea
            rows={4}
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder={`Paste Excel rows directly:\n2026-11-07\tMISBAH2\t15000\tPAID\tMonthly salary\n2026-11-08\tALI\t8000\tBANK\tBonus`}
            className="w-full text-xs font-mono p-3 rounded-xl bg-bg-secondary border border-border text-fg-primary focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
          />
        </div>
      </div>

      {/* Import In-Progress Animation */}
      {isImporting && (
        <ImportProgressLoader
          current={importProgress.current}
          total={importProgress.total}
          label="Writing Payment Records to Database..."
        />
      )}

      {/* Success Notification */}
      {importSuccessMessage && (
        <div className="p-4 rounded-xl bg-status-success/10 border border-status-success/30 flex items-center justify-between gap-3 text-status-success text-xs font-semibold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>{importSuccessMessage}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/finance/payments')}
            icon={<ArrowRight className="w-4 h-4" />}
          >
            View Payments List
          </Button>
        </div>
      )}

      {/* Parsed Preview Table */}
      {parsedRows.length > 0 && !isImporting && (
        <div className="space-y-4">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-bg-surface border border-border">
              <span className="text-xs text-fg-muted block">Total Rows</span>
              <span className="text-lg font-bold text-fg-primary">{parsedRows.length}</span>
            </div>
            <div className="p-4 rounded-xl bg-bg-surface border border-border">
              <span className="text-xs text-fg-muted block">Valid & Ready</span>
              <span className="text-lg font-bold text-status-success">{validCount}</span>
            </div>
            <div className="p-4 rounded-xl bg-bg-surface border border-border">
              <span className="text-xs text-fg-muted block">Total Amount</span>
              <span className="text-lg font-bold text-brand-600 dark:text-brand-400">
                PKR {totalAmount.toLocaleString()}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-bg-surface border border-border">
              <span className="text-xs text-fg-muted block">New Staff Detected</span>
              <span className="text-lg font-bold text-amber-500">
                {detectedNewEmployees.length}
              </span>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-bg-surface border border-border">
            <span className="text-xs text-fg-secondary">
              Review records below. Click <strong>Import All Records</strong> to commit to Supabase.
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setParsedRows([])}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleExecuteImport}
                disabled={validCount === 0}
                icon={<Sparkles className="w-4 h-4" />}
              >
                Import {validCount} Payment Records
              </Button>
            </div>
          </div>

          {/* Preview Table */}
          <div className="w-full rounded-xl border border-border bg-bg-surface overflow-hidden shadow-card">
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-bg-secondary border-b border-border text-[11px] font-semibold text-fg-muted uppercase">
                  <tr>
                    <th className="px-3 py-2.5">#</th>
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5">Employee Name</th>
                    <th className="px-3 py-2.5">Amount</th>
                    <th className="px-3 py-2.5">Mode</th>
                    <th className="px-3 py-2.5">Category</th>
                    <th className="px-3 py-2.5">Notes</th>
                    <th className="px-3 py-2.5 text-right">Validation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {parsedRows.map((row) => (
                    <tr
                      key={row.rowNumber}
                      className={
                        row.isValid || (autoCreateMissingEmployees && row.amount > 0)
                          ? 'hover:bg-brand-500/[0.02]'
                          : 'bg-status-danger/[0.04]'
                      }
                    >
                      <td className="px-3 py-2.5 font-mono text-fg-muted">{row.rowNumber}</td>
                      <td className="px-3 py-2.5 font-mono">{row.date}</td>
                      <td className="px-3 py-2.5 font-semibold text-fg-primary">
                        {row.resolvedEmployeeName}
                        {!row.resolvedEmployeeId && autoCreateMissingEmployees && (
                          <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500">
                            Auto-create
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-mono font-semibold text-brand-600 dark:text-brand-400">
                        {row.amount.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="px-2 py-0.5 rounded bg-bg-secondary border border-border font-medium">
                          {row.normalizedMode}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">{row.category}</td>
                      <td className="px-3 py-2.5 text-fg-secondary truncate max-w-xs">
                        {row.notes || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {row.isValid || (autoCreateMissingEmployees && row.amount > 0) ? (
                          <span className="inline-flex items-center gap-1 text-status-success font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-status-danger font-semibold"
                            title={row.errors.join(', ')}
                          >
                            <XCircle className="w-3.5 h-3.5" /> Error
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
