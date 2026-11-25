import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  Download,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  ArrowRight,
  Clipboard,
  Sparkles,
  CalendarCheck,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { format } from 'date-fns';
import { getSupabaseClient } from '../../lib/supabase';
import { Employee } from '../../lib/types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { PageViewDropdown } from '../../components/layout/PageViewDropdown';
import { ImportProgressLoader } from '../../components/ui/LoadingAnimation';
import {
  generateOldAttendanceImportTemplate,
  generateStandardAttendanceImportTemplate,
} from '../../lib/exportUtils';

interface ParsedAttendanceRow {
  rowNumber: number;
  date: string;
  employeeIdentifier: string;
  rawStatus: string;
  isPresent: boolean;
  notes: string;
  isValid: boolean;
  errors: string[];
  resolvedEmployeeId?: string;
  resolvedEmployeeName?: string;
}

export const BulkImportAttendance: React.FC = () => {
  const navigate = useNavigate();

  // Mode: 'old' (DATE | NAME | STATUS) or 'standard' (Date | Employee | Status | Notes)
  const [importMode, setImportMode] = useState<'old' | 'standard'>('old');

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [autoCreateMissingEmployees, setAutoCreateMissingEmployees] = useState(true);

  const [fileName, setFileName] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [parsedRows, setParsedRows] = useState<ParsedAttendanceRow[]>([]);
  const [detectedNewEmployees, setDetectedNewEmployees] = useState<string[]>([]);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      const { data } = await client.from('employees').select('*').order('name');
      setEmployees(data || []);
    } catch (err) {
      console.error('Failed to load employees for attendance import:', err);
    }
  };

  const parseFlexibleDate = (rawDate: any): string => {
    if (!rawDate) return format(new Date(), 'yyyy-MM-dd');
    if (typeof rawDate === 'number') {
      const parsed = new Date((rawDate - (25567 + 2)) * 86400 * 1000);
      if (!isNaN(parsed.getTime())) return format(parsed, 'yyyy-MM-dd');
    }
    const str = String(rawDate).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    const dmy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (dmy) {
      return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    }
    try {
      const parsed = new Date(str);
      if (!isNaN(parsed.getTime())) return format(parsed, 'yyyy-MM-dd');
    } catch {
      // fallback
    }
    return format(new Date(), 'yyyy-MM-dd');
  };

  const parsePresenceStatus = (raw: any): { valid: boolean; isPresent: boolean } => {
    const s = String(raw || '').trim().toUpperCase();
    if (['PRESENT', 'P', '1', 'YES', 'TRUE', 'ON'].includes(s)) {
      return { valid: true, isPresent: true };
    }
    if (['ABSENT', 'A', '0', 'NO', 'FALSE', 'OFF', 'LEAVE'].includes(s)) {
      return { valid: true, isPresent: false };
    }
    return { valid: false, isPresent: false };
  };

  const processRawData = (rows: any[][]) => {
    if (!rows || rows.length === 0) return;

    setImportSuccessMessage(null);

    let startIndex = 0;
    const firstRowStr = rows[0].map((c) => String(c).trim().toUpperCase()).join(' ');
    if (
      firstRowStr.includes('DATE') ||
      firstRowStr.includes('NAME') ||
      firstRowStr.includes('EMPLOYEE') ||
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

    const parsed: ParsedAttendanceRow[] = [];
    const missingEmployees = new Set<string>();

    for (let i = startIndex; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0 || row.every((c) => c === undefined || c === null || String(c).trim() === '')) {
        continue;
      }

      const errors: string[] = [];
      let date = '';
      let employeeIdentifier = '';
      let rawStatus = '';
      let notes = '';

      if (importMode === 'old') {
        // OLD FORMAT: DATE | NAME | STATUS (e.g. 2026-11-07 | MISBAH2 | PRESENT)
        date = parseFlexibleDate(row[0]);
        employeeIdentifier = String(row[1] || '').trim();
        rawStatus = String(row[2] || '').trim();
        notes = String(row[3] || '').trim();
      } else {
        // STANDARD FORMAT: Date | Employee Code or Name | Status | Notes
        date = parseFlexibleDate(row[0]);
        employeeIdentifier = String(row[1] || '').trim();
        rawStatus = String(row[2] || '').trim();
        notes = String(row[3] || '').trim();
      }

      if (!employeeIdentifier) {
        errors.push('Employee name or code is missing');
      }

      const statusParsed = parsePresenceStatus(rawStatus);
      if (!statusParsed.valid) {
        errors.push(`Unrecognized status "${rawStatus}" (use PRESENT or ABSENT)`);
      }

      const cleanIdent = employeeIdentifier.toLowerCase();
      let matchedEmp = employeeMapByName.get(cleanIdent) || employeeMapByCode.get(cleanIdent);
      if (!matchedEmp && cleanIdent) {
        matchedEmp = employees.find(
          (e) =>
            e.name.toLowerCase().includes(cleanIdent) ||
            cleanIdent.includes(e.name.toLowerCase()) ||
            e.employee_code.toLowerCase() === cleanIdent
        );
      }

      if (!matchedEmp && employeeIdentifier) {
        missingEmployees.add(employeeIdentifier);
        if (!autoCreateMissingEmployees) {
          errors.push(`Employee "${employeeIdentifier}" not found`);
        }
      }

      parsed.push({
        rowNumber: i + 1,
        date,
        employeeIdentifier,
        rawStatus: rawStatus || 'UNKNOWN',
        isPresent: statusParsed.isPresent,
        notes,
        isValid: errors.length === 0,
        errors,
        resolvedEmployeeId: matchedEmp?.id,
        resolvedEmployeeName: matchedEmp?.name || employeeIdentifier,
      });
    }

    setParsedRows(parsed);
    setDetectedNewEmployees(Array.from(missingEmployees));
  };

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
        error: (err) => alert(`CSV Parse Error: ${err.message}`),
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

  const handleProcessPastedText = () => {
    if (!pastedText.trim()) return;
    const lines = pastedText.trim().split(/\r?\n/);
    const rows: string[][] = lines.map((line) => {
      if (line.includes('\t')) return line.split('\t');
      if (line.includes(',')) return line.split(',');
      return line.trim().split(/\s+/);
    });
    setFileName(`Pasted Data (${rows.length} rows)`);
    processRawData(rows);
  };

  const handleExecuteImport = async () => {
    const client = getSupabaseClient();
    if (!client) {
      alert('Database connection unavailable.');
      return;
    }

    setIsImporting(true);
    setImportSuccessMessage(null);

    try {
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
                  notes: 'Auto-created via Bulk Attendance Import',
                },
              ])
              .select()
              .single();

            if (!newEmpErr && newEmp) {
              empMap.set(clean, newEmp.id);
            }
          }
        }
        await fetchEmployees();
      }

      // Deduplicate by employee_id + date (last row wins) so upsert never conflicts within same batch
      const upsertMap = new Map<string, any>();
      parsedRows
        .filter((r) => r.isValid && r.employeeIdentifier)
        .forEach((r) => {
          const resolvedId =
            r.resolvedEmployeeId || empMap.get(r.employeeIdentifier.toLowerCase().trim());
          if (!resolvedId) return;

          const key = `${resolvedId}__${r.date}`;
          upsertMap.set(key, {
            employee_id: resolvedId,
            attendance_date: r.date,
            is_present: r.isPresent,
            notes: r.notes || null,
            updated_at: new Date().toISOString(),
          });
        });

      const payloads = Array.from(upsertMap.values());
      if (payloads.length === 0) {
        alert('No valid attendance records ready to import.');
        setIsImporting(false);
        return;
      }

      setImportProgress({ current: 0, total: payloads.length });

      const chunkSize = 50;
      let processed = 0;
      for (let i = 0; i < payloads.length; i += chunkSize) {
        const chunk = payloads.slice(i, i + chunkSize);
        const { error } = await client
          .from('attendance')
          .upsert(chunk, { onConflict: 'employee_id,attendance_date' });

        if (error) throw error;
        processed += chunk.length;
        setImportProgress({ current: processed, total: payloads.length });
      }

      setImportSuccessMessage(`Successfully updated/imported ${processed} attendance records!`);
      setParsedRows([]);
      setFileName(null);
      setPastedText('');
    } catch (err: any) {
      alert(`Attendance import failed: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const presentCount = parsedRows.filter((r) => r.isValid && r.isPresent).length;
  const absentCount = parsedRows.filter((r) => r.isValid && !r.isPresent).length;

  return (
    <div className="space-y-6">
      {/* Header & Page View Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-page-title text-fg-primary">Bulk Import Attendance</h1>
            <Badge variant="role">Old & New Formats</Badge>
          </div>
          <p className="text-sm text-fg-secondary mt-1">
            Upload Excel, CSV, or paste attendance records in Old Format or Standard Format.
          </p>
        </div>

        <PageViewDropdown
          title="Attendance View"
          options={[
            { label: '📅 Daily Attendance', path: '/attendance/daily' },
            { label: '📆 Monthly Attendance', path: '/attendance/monthly' },
            { label: '📊 Attendance Reports', path: '/attendance/reports' },
            { label: '📥 Bulk Import Attendance', path: '/attendance/bulk-import' },
          ]}
        />
      </div>

      {/* Format Switcher Card */}
      <div className="p-5 rounded-2xl card-3d space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-fg-primary">Select Attendance Format</h3>
            <p className="text-xs text-fg-muted mt-0.5">
              Switch separately between Old Format and Standard Format.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setImportMode('old')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                importMode === 'old'
                  ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                  : 'bg-bg-secondary text-fg-secondary border-border hover:text-fg-primary'
              }`}
            >
              Old Format (2026-11-07 MISBAH2 PRESENT)
            </button>
            <button
              onClick={() => setImportMode('standard')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                importMode === 'standard'
                  ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                  : 'bg-bg-secondary text-fg-secondary border-border hover:text-fg-primary'
              }`}
            >
              New / Standard Format
            </button>
          </div>
        </div>

        {/* Column Guide */}
        <div className="p-3.5 rounded-xl bg-bg-secondary border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-4 h-4 text-brand-500 shrink-0" />
            <div>
              <span className="font-semibold text-fg-primary">
                {importMode === 'old' ? 'Old Format Columns:' : 'Standard Format Columns:'}
              </span>
              <span className="ml-2 font-mono text-brand-600 dark:text-brand-400 font-medium">
                {importMode === 'old'
                  ? 'DATE | NAME | STATUS (PRESENT / ABSENT)'
                  : 'Date | Employee Code or Name | Status (Present/Absent) | Notes'}
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={
              importMode === 'old'
                ? generateOldAttendanceImportTemplate
                : generateStandardAttendanceImportTemplate
            }
            icon={<Download className="w-3.5 h-3.5 text-brand-500" />}
          >
            Download Sample Excel
          </Button>
        </div>

        <label className="flex items-center gap-2 text-xs cursor-pointer select-none pt-1">
          <input
            type="checkbox"
            checked={autoCreateMissingEmployees}
            onChange={(e) => setAutoCreateMissingEmployees(e.target.checked)}
            className="rounded border-border text-brand-500 focus:ring-brand-500"
          />
          <span className="text-fg-primary font-medium">
            Auto-create missing staff members if not found in database
          </span>
        </label>
      </div>

      {/* Upload & Paste Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 rounded-2xl card-3d border-2 border-dashed border-border hover:border-brand-500/50 transition-all flex flex-col items-center justify-center text-center space-y-3 relative">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-500">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-fg-primary">Upload Excel or CSV File</h4>
            <p className="text-xs text-fg-muted mt-0.5">
              Supports .xlsx, .xls, and .csv files
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

        <div className="p-5 rounded-2xl card-3d flex flex-col space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clipboard className="w-4 h-4 text-brand-500" />
              <h4 className="text-sm font-semibold text-fg-primary">Or Paste Attendance Rows</h4>
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
            placeholder={`Paste rows directly:\n2026-11-07\tMISBAH2\tPRESENT\n2026-11-07\tALI\tABSENT`}
            className="w-full text-xs font-mono p-3 rounded-xl bg-bg-secondary border border-border text-fg-primary focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
          />
        </div>
      </div>

      {/* 3D Import Progress */}
      {isImporting && (
        <ImportProgressLoader
          current={importProgress.current}
          total={importProgress.total}
          label="Updating Attendance Records..."
        />
      )}

      {/* Success Banner */}
      {importSuccessMessage && (
        <div className="p-4 rounded-xl bg-status-success/10 border border-status-success/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-status-success text-xs font-semibold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{importSuccessMessage}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/attendance/daily')}
            icon={<ArrowRight className="w-4 h-4" />}
          >
            View Daily Attendance
          </Button>
        </div>
      )}

      {/* Preview Table */}
      {parsedRows.length > 0 && !isImporting && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl card-3d">
              <span className="text-xs text-fg-muted block">Total Rows</span>
              <span className="text-lg font-bold text-fg-primary">{parsedRows.length}</span>
            </div>
            <div className="p-4 rounded-xl card-3d">
              <span className="text-xs text-fg-muted block">Present</span>
              <span className="text-lg font-bold text-status-success">{presentCount}</span>
            </div>
            <div className="p-4 rounded-xl card-3d">
              <span className="text-xs text-fg-muted block">Absent</span>
              <span className="text-lg font-bold text-status-danger">{absentCount}</span>
            </div>
            <div className="p-4 rounded-xl card-3d">
              <span className="text-xs text-fg-muted block">New Staff Detected</span>
              <span className="text-lg font-bold text-amber-500">{detectedNewEmployees.length}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl card-3d">
            <span className="text-xs text-fg-secondary">
              Ready to upsert <strong>{validCount}</strong> attendance records. Existing records for the same date & staff will be updated.
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
                Import {validCount} Records
              </Button>
            </div>
          </div>

          <div className="w-full rounded-xl border border-border bg-bg-surface overflow-hidden shadow-card">
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-bg-secondary border-b border-border text-[11px] font-semibold text-fg-muted uppercase">
                  <tr>
                    <th className="px-3 py-2.5">#</th>
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5">Employee</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Notes</th>
                    <th className="px-3 py-2.5 text-right">Validation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {parsedRows.map((row) => (
                    <tr
                      key={row.rowNumber}
                      className={row.isValid ? 'hover:bg-brand-500/[0.02]' : 'bg-status-danger/[0.04]'}
                    >
                      <td className="px-3 py-2.5 font-mono text-fg-muted">{row.rowNumber}</td>
                      <td className="px-3 py-2.5 font-mono">{row.date}</td>
                      <td className="px-3 py-2.5 font-semibold text-fg-primary">
                        {row.resolvedEmployeeName}
                        {!row.resolvedEmployeeId && autoCreateMissingEmployees && row.employeeIdentifier && (
                          <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500">
                            Auto-create
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant={row.isPresent ? 'completed' : 'issue'}>
                          {row.isPresent ? 'PRESENT' : 'ABSENT'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-fg-secondary truncate max-w-xs">
                        {row.notes || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {row.isValid ? (
                          <span className="inline-flex items-center gap-1 text-status-success font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-status-danger font-semibold"
                            title={row.errors.join(', ')}
                          >
                            <XCircle className="w-3.5 h-3.5" /> {row.errors[0]}
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
