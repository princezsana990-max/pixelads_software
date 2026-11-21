import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  Sparkles,
  UserCheck,
  Check,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { format, parseISO } from 'date-fns';
import { getSupabaseClient } from '../../lib/supabase';
import { Employee, OrderStatus } from '../../lib/types';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import {
  generateEmptyOrderImportTemplate,
  generateLegacyOrderImportTemplate,
} from '../../lib/exportUtils';

interface ParsedRow {
  rowNumber: number;
  orderNumber: string;
  orderTakerIdentifier: string;
  projectName: string;
  pcNumber: string;
  orderDate: string;
  deliveryDate: string;
  status: OrderStatus;
  editorIdentifier?: string;
  mistakeCategory?: string;
  mistakeDetails?: string;
  notes?: string;

  // Validation
  isValid: boolean;
  errors: string[];
  resolvedOrderTakerId?: string;
  resolvedEditorId?: string;
  resolvedEditorName?: string;
}

export const BulkImport: React.FC = () => {
  const navigate = useNavigate();

  // Mode: 'legacy' (DATE, TIME, PROJECT NAME, PC NO, DELIVERY TIME, STATUS, MISTAKE, EDITOR) or 'standard'
  const [importMode, setImportMode] = useState<'legacy' | 'standard'>('legacy');

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [existingOrderNumbers, setExistingOrderNumbers] = useState<Set<string>>(new Set());
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);

  // Fallback / Batch Settings
  const [batchOrderTakerId, setBatchOrderTakerId] = useState('');
  const [autoCreateMissingEditors, setAutoCreateMissingEditors] = useState(true);

  // Parsed file state
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedNewEditors, setDetectedNewEditors] = useState<string[]>([]);
  const [importSummary, setImportSummary] = useState<{
    total: number;
    valid: number;
    invalid: number;
  } | null>(null);

  const [importStatus, setImportStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    setIsLoadingMeta(true);
    const client = getSupabaseClient();
    if (!client) {
      setIsLoadingMeta(false);
      return;
    }

    try {
      const { data: emps } = await client.from('employees').select('*').order('name');
      setEmployees(emps || []);

      const activeOTs = (emps || []).filter((e) => e.role === 'Order Taker' && e.is_active);
      if (activeOTs.length > 0 && !batchOrderTakerId) {
        setBatchOrderTakerId(activeOTs[0].id);
      }

      const { data: orders } = await client.from('orders').select('order_number');
      const numbers = new Set<string>((orders || []).map((o) => o.order_number.toLowerCase()));
      setExistingOrderNumbers(numbers);
    } catch (err) {
      console.error('Failed to load import metadata:', err);
    } finally {
      setIsLoadingMeta(false);
    }
  };

  // Helper to normalize status case-insensitively
  const normalizeStatus = (rawStatus: any): OrderStatus => {
    if (!rawStatus) return 'Completed';
    const s = String(rawStatus).trim().toLowerCase();
    if (s.includes('complete') || s === 'done' || s === 'finished') return 'Completed';
    if (s.includes('progress') || s.includes('process') || s === 'working') return 'In Progress';
    if (s.includes('issue') || s.includes('problem') || s.includes('error')) return 'Issue';
    if (s.includes('pending') || s === 'waiting') return 'Pending';
    return 'Completed'; // Safe default for past batch records
  };

  // Helper to categorize mistakes
  const categorizeMistake = (text: string): string => {
    const lower = text.toLowerCase();
    if (lower.includes('caption') || lower.includes('title') || lower.includes('thumb')) {
      return 'Thumbnail Mistake';
    }
    if (lower.includes('spell') || lower.includes('typo')) {
      return 'Spelling Mistake';
    }
    if (lower.includes('word') || lower.includes('grammar')) {
      return 'Wording Mistake';
    }
    if (lower.includes('demand') || lower.includes('require') || lower.includes('custmr') || lower.includes('client')) {
      return 'Customer Requirement Mistake';
    }
    if (lower.includes('audio') || lower.includes('voice') || lower.includes('sound')) {
      return 'Voiceover Mistake';
    }
    if (lower.includes('data') || lower.includes('stat') || lower.includes('number')) {
      return 'Incorrect Data';
    }
    return 'Editing Mistake';
  };

  // Helper to parse date string (DD/MM/YYYY or YYYY-MM-DD) + time string (12:47, 9:37)
  const parseDateTime = (
    dateInput: any,
    timeInput: any
  ): { dateObj: Date; year: number; month: number; day: number } => {
    let year = new Date().getFullYear();
    let month = new Date().getMonth(); // 0-based
    let day = new Date().getDate();

    if (dateInput) {
      if (typeof dateInput === 'number') {
        // Excel serial date number
        const excelDate = XLSX.SSF.parse_date_code(dateInput);
        if (excelDate) {
          year = excelDate.y;
          month = excelDate.m - 1;
          day = excelDate.d;
        }
      } else {
        const str = String(dateInput).trim();
        // Check DD/MM/YYYY or DD-MM-YYYY
        const dmyMatch = str.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})/);
        if (dmyMatch) {
          day = parseInt(dmyMatch[1], 10);
          month = parseInt(dmyMatch[2], 10) - 1;
          year = parseInt(dmyMatch[3], 10);
        } else {
          // Try standard date parsing
          const parsed = new Date(str);
          if (!isNaN(parsed.getTime())) {
            year = parsed.getFullYear();
            month = parsed.getMonth();
            day = parsed.getDate();
          }
        }
      }
    }

    let hours = 12;
    let minutes = 0;
    if (timeInput) {
      if (typeof timeInput === 'number') {
        // Excel time fraction
        const totalMinutes = Math.round(timeInput * 24 * 60);
        hours = Math.floor(totalMinutes / 60) % 24;
        minutes = totalMinutes % 60;
      } else {
        const timeStr = String(timeInput).trim();
        const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})/);
        if (timeMatch) {
          hours = parseInt(timeMatch[1], 10);
          minutes = parseInt(timeMatch[2], 10);
        }
      }
    }

    const dateObj = new Date(year, month, day, hours, minutes, 0);
    return { dateObj, year, month, day };
  };

  // Helper to parse DELIVERY TIME (e.g. "12/5:17" or "14/10:22" or standard datetime)
  const parseDeliveryTime = (deliveryInput: any, orderYear: number, orderMonth: number): string => {
    if (!deliveryInput) {
      // Default to +24 hours
      return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    }

    const str = String(deliveryInput).trim();

    // Check custom pattern: "14/10:22" or "14/1:19" or "12/5:17" -> [Day]/[Hour]:[Minute]
    const customMatch = str.match(/^(\d{1,2})\/(\d{1,2}):(\d{2})/);
    if (customMatch) {
      const day = parseInt(customMatch[1], 10);
      let hours = parseInt(customMatch[2], 10);
      const minutes = parseInt(customMatch[3], 10);

      // In Pakistan office hours (12 PM to 12 AM), single-digit hours like 1, 3, 5 are usually PM
      if (hours >= 1 && hours <= 6) {
        hours += 12; // e.g. 5:17 becomes 17:17
      }

      const d = new Date(orderYear, orderMonth, day, hours, minutes, 0);
      return d.toISOString();
    }

    // Try standard datetime
    const standardParsed = new Date(str);
    if (!isNaN(standardParsed.getTime())) {
      return standardParsed.toISOString();
    }

    // Fallback: order date + 24 hours
    return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportSummary(null);
    setImportStatus(null);
    setDetectedNewEditors([]);

    const isCsv = file.name.endsWith('.csv');
    const reader = new FileReader();

    if (isCsv) {
      reader.onload = (event) => {
        const text = event.target?.result as string;
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            processParsedData(results.data as any[]);
          },
        });
      };
      reader.readAsText(file);
    } else {
      // XLSX / XLS
      reader.onload = (event) => {
        const buffer = event.target?.result;
        const wb = XLSX.read(buffer, { type: 'binary', cellDates: true });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(ws);
        processParsedData(json);
      };
      reader.readAsBinaryString(file);
    }
  };

  const processParsedData = (rawData: any[]) => {
    if (!rawData || rawData.length === 0) {
      alert('The uploaded file contains no data rows.');
      return;
    }

    // Auto-detect mode if headers contain DATE, PROJECT NAME, PC NO, etc.
    const firstRow = rawData[0];
    const keys = Object.keys(firstRow).map((k) => k.trim().toUpperCase());
    const isLegacyDetected =
      keys.includes('DATE') &&
      keys.includes('PROJECT NAME') &&
      (keys.includes('PC NO') || keys.includes('PC NO.') || keys.includes('PC'));

    const effectiveMode = isLegacyDetected ? 'legacy' : importMode;
    if (isLegacyDetected && importMode !== 'legacy') {
      setImportMode('legacy');
    }

    const rows: ParsedRow[] = [];
    const seenOrderNumbersInFile = new Set<string>();
    const missingEditorSet = new Set<string>();

    // Calculate starting order sequence number
    let nextSeqNumber = 1;
    const existingNums = Array.from(existingOrderNumbers)
      .map((n) => {
        const match = n.match(/ord-\d{4}-(\d+)/i);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => !isNaN(n));
    if (existingNums.length > 0) {
      nextSeqNumber = Math.max(...existingNums) + 1;
    }

    const year = new Date().getFullYear();

    rawData.forEach((item, index) => {
      const rowNumber = index + 2;
      const errors: string[] = [];

      let orderNumber = '';
      let projectName = '';
      let pcNumber = '';
      let orderDateISO = '';
      let deliveryDateISO = '';
      let status: OrderStatus = 'Completed';
      let editorIdentifier = '';
      let mistakeCategory = '';
      let mistakeDetails = '';
      let orderTakerIden = '';

      if (effectiveMode === 'legacy') {
        // --- 1. LEGACY AGENCY SPREADSHEET (Screenshot Layout) ---
        // DATE, TIME, PROJECT NAME, PC NO, DELIVERY TIME, STATUS, MISTAKE, EDITOR
        const rawDate = item['DATE'] || item['Date'] || item['date'] || '';
        const rawTime = item['TIME'] || item['Time'] || item['time'] || '';
        projectName = String(item['PROJECT NAME'] || item['Project Name'] || item['project name'] || '').trim();
        pcNumber = String(item['PC NO'] || item['PC NO.'] || item['PC No'] || item['PC'] || '').trim();
        const rawDelivery = item['DELIVERY TIME'] || item['Delivery Time'] || item['delivery time'] || '';
        const rawStatus = item['STATUS'] || item['Status'] || item['status'] || 'COMPLETED';
        const rawMistake = String(item['MISTAKE'] || item['Mistake'] || item['mistake'] || '').trim();
        editorIdentifier = String(item['EDITOR'] || item['Editor'] || item['editor'] || '').trim();

        // 1. Auto-generate Order Number
        orderNumber = `ORD-${year}-${String(nextSeqNumber).padStart(4, '0')}`;
        nextSeqNumber++;

        // 2. Parse Date & Time
        const { dateObj, year: parsedYear, month: parsedMonth } = parseDateTime(rawDate, rawTime);
        orderDateISO = dateObj.toISOString();

        // 3. Parse Delivery Time (e.g. 14/10:22)
        deliveryDateISO = parseDeliveryTime(rawDelivery, parsedYear, parsedMonth);

        // 4. Status
        status = normalizeStatus(rawStatus);

        // 5. Mistake
        if (rawMistake) {
          mistakeDetails = rawMistake;
          mistakeCategory = categorizeMistake(rawMistake);
        }
      } else {
        // --- 2. STANDARD ENTERPRISE TEMPLATE ---
        orderNumber = String(
          item['Order Number'] || item['order_number'] || item['OrderID'] || ''
        ).trim();
        if (!orderNumber) {
          orderNumber = `ORD-${year}-${String(nextSeqNumber).padStart(4, '0')}`;
          nextSeqNumber++;
        }
        orderTakerIden = String(
          item['Order Taker (Code or Name)'] || item['Order Taker'] || ''
        ).trim();
        projectName = String(item['Project Name'] || item['project_name'] || '').trim();
        pcNumber = String(item['PC Number'] || item['pc_number'] || '').trim();
        const rawOrderDate = item['Order Date (YYYY-MM-DD HH:mm)'] || item['Order Date'] || '';
        const rawDelivDate = item['Delivery Date (YYYY-MM-DD HH:mm)'] || item['Delivery Date'] || '';
        const rawStatus = item['Status (Pending/In Progress/Completed/Issue)'] || item['Status'] || 'Pending';
        editorIdentifier = String(item['Assigned Editor (Code or Name)'] || item['Assigned Editor'] || '').trim();
        mistakeCategory = String(item['Mistake Category (Optional)'] || '').trim();
        mistakeDetails = String(item['Mistake Details (Optional)'] || '').trim();

        orderDateISO = rawOrderDate ? new Date(rawOrderDate).toISOString() : new Date().toISOString();
        deliveryDateISO = rawDelivDate
          ? new Date(rawDelivDate).toISOString()
          : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        status = normalizeStatus(rawStatus);
      }

      // Validations
      if (!projectName) {
        errors.push('Project Name is required.');
      }
      if (!pcNumber) {
        errors.push('PC Number is required.');
      }

      if (existingOrderNumbers.has(orderNumber.toLowerCase())) {
        errors.push(`Order number "${orderNumber}" already exists.`);
      } else if (seenOrderNumbersInFile.has(orderNumber.toLowerCase())) {
        errors.push(`Duplicate order number "${orderNumber}" in file.`);
      } else {
        seenOrderNumbersInFile.add(orderNumber.toLowerCase());
      }

      // Resolve Editor
      let resolvedEdId: string | undefined;
      let resolvedEdName = editorIdentifier;
      if (editorIdentifier) {
        const foundEd = employees.find(
          (e) =>
            e.role === 'Editor' &&
            (e.name.toLowerCase() === editorIdentifier.toLowerCase() ||
              e.employee_code.toLowerCase() === editorIdentifier.toLowerCase())
        );
        if (foundEd) {
          resolvedEdId = foundEd.id;
          resolvedEdName = foundEd.name;
        } else {
          missingEditorSet.add(editorIdentifier.trim());
        }
      }

      // Resolve Order Taker
      let resolvedOTId = batchOrderTakerId;
      if (orderTakerIden) {
        const foundOT = employees.find(
          (e) =>
            e.role === 'Order Taker' &&
            (e.name.toLowerCase() === orderTakerIden.toLowerCase() ||
              e.employee_code.toLowerCase() === orderTakerIden.toLowerCase())
        );
        if (foundOT) {
          resolvedOTId = foundOT.id;
        }
      }

      rows.push({
        rowNumber,
        orderNumber,
        orderTakerIdentifier: orderTakerIden || 'Batch Order Taker',
        projectName,
        pcNumber,
        orderDate: orderDateISO,
        deliveryDate: deliveryDateISO,
        status,
        editorIdentifier,
        mistakeCategory: mistakeCategory || undefined,
        mistakeDetails: mistakeDetails || undefined,
        isValid: errors.length === 0,
        errors,
        resolvedOrderTakerId: resolvedOTId,
        resolvedEditorId: resolvedEdId,
        resolvedEditorName: resolvedEdName,
      });
    });

    setParsedRows(rows);
    setDetectedNewEditors(Array.from(missingEditorSet));
    setImportSummary({
      total: rows.length,
      valid: rows.filter((r) => r.isValid).length,
      invalid: rows.filter((r) => !r.isValid).length,
    });
  };

  // One-click quick creation of default Order Taker if none exists
  const handleQuickCreateOrderTaker = async () => {
    const client = getSupabaseClient();
    if (!client) return;

    try {
      const { data, error } = await client
        .from('employees')
        .insert([
          {
            employee_code: 'EMP-001',
            name: 'Primary Order Taker',
            role: 'Order Taker',
            is_active: true,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      setEmployees((prev) => [...prev, data]);
      setBatchOrderTakerId(data.id);
      // Re-assign in parsed rows
      setParsedRows((prev) =>
        prev.map((r) => ({
          ...r,
          resolvedOrderTakerId: r.resolvedOrderTakerId || data.id,
        }))
      );
    } catch (err: any) {
      alert(`Could not create order taker: ${err.message}`);
    }
  };

  const handleExecuteImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) return;

    setIsProcessing(true);
    setImportStatus('Preparing import and resolving editors...');

    const client = getSupabaseClient();
    if (!client) {
      alert('Database not connected.');
      setIsProcessing(false);
      return;
    }

    try {
      // Step A: Ensure Order Taker exists
      let finalOTId = batchOrderTakerId;
      if (!finalOTId) {
        // Find any active order taker or create one
        const activeOT = employees.find((e) => e.role === 'Order Taker' && e.is_active);
        if (activeOT) {
          finalOTId = activeOT.id;
        } else {
          // Auto-create initial Order Taker
          const { data: newOT, error: otErr } = await client
            .from('employees')
            .insert([
              {
                employee_code: 'EMP-001',
                name: 'Primary Order Taker',
                role: 'Order Taker',
                is_active: true,
              },
            ])
            .select()
            .single();
          if (otErr) throw otErr;
          finalOTId = newOT.id;
        }
      }

      // Step B: Auto-create missing Editors on the fly
      const editorNameToIdMap = new Map<string, string>();
      employees
        .filter((e) => e.role === 'Editor')
        .forEach((e) => {
          editorNameToIdMap.set(e.name.toLowerCase(), e.id);
        });

      if (autoCreateMissingEditors && detectedNewEditors.length > 0) {
        setImportStatus(`Auto-creating ${detectedNewEditors.length} new Editor accounts...`);

        // Determine starting EMP code
        const empCodes = employees
          .map((e) => {
            const m = e.employee_code.match(/EMP-(\d+)/);
            return m ? parseInt(m[1], 10) : 0;
          })
          .filter((n) => !isNaN(n));
        let nextEmpNum = empCodes.length > 0 ? Math.max(...empCodes) + 1 : 1;

        const newEditorPayloads = detectedNewEditors.map((name) => {
          const code = `EMP-${String(nextEmpNum).padStart(3, '0')}`;
          nextEmpNum++;
          return {
            employee_code: code,
            name: name.trim(),
            role: 'Editor',
            is_active: true,
            notes: 'Auto-created during bulk import',
          };
        });

        const { data: createdEditors, error: createEdError } = await client
          .from('employees')
          .insert(newEditorPayloads)
          .select();

        if (createEdError) throw createEdError;

        (createdEditors || []).forEach((ed) => {
          editorNameToIdMap.set(ed.name.toLowerCase(), ed.id);
        });
      }

      // Step C: Insert Orders
      setImportStatus(`Saving ${validRows.length} orders into PostgreSQL...`);

      const ordersPayload = validRows.map((r) => {
        let editorId = r.resolvedEditorId;
        if (!editorId && r.editorIdentifier) {
          editorId = editorNameToIdMap.get(r.editorIdentifier.toLowerCase());
        }

        return {
          order_number: r.orderNumber,
          order_taker_id: r.resolvedOrderTakerId || finalOTId,
          order_date: r.orderDate,
          project_name: r.projectName,
          pc_number: r.pcNumber,
          delivery_date: r.deliveryDate,
          status: r.status,
          assigned_editor_id: editorId || null,
          completed_at: r.status === 'Completed' ? r.deliveryDate : null,
          notes: effectiveNotes(r),
        };
      });

      const { data: insertedOrders, error: orderError } = await client
        .from('orders')
        .insert(ordersPayload)
        .select();

      if (orderError) throw orderError;

      // Step D: Insert assignments, status histories, and mistakes
      const assignmentPayloads: any[] = [];
      const statusPayloads: any[] = [];
      const mistakePayloads: any[] = [];

      (insertedOrders || []).forEach((order, idx) => {
        const sourceRow = validRows[idx];

        // Status history
        statusPayloads.push({
          order_id: order.id,
          new_status: order.status,
          reason: 'Bulk import from Excel spreadsheet',
        });

        // Assignment
        if (order.assigned_editor_id) {
          assignmentPayloads.push({
            order_id: order.id,
            editor_id: order.assigned_editor_id,
            is_current: true,
            notes: 'Assigned during bulk import',
          });
        }

        // Mistakes
        if (sourceRow.mistakeDetails) {
          mistakePayloads.push({
            order_id: order.id,
            category_name: sourceRow.mistakeCategory || 'Editing Mistake',
            details: sourceRow.mistakeDetails,
          });
        }
      });

      if (statusPayloads.length > 0) {
        await client.from('order_status_history').insert(statusPayloads);
      }
      if (assignmentPayloads.length > 0) {
        await client.from('order_assignments').insert(assignmentPayloads);
      }
      if (mistakePayloads.length > 0) {
        await client.from('order_mistakes').insert(mistakePayloads);
      }

      // Log in audit trail
      await client.from('audit_logs').insert([
        {
          entity_type: 'ORDER_IMPORT',
          entity_id: 'BULK',
          action: 'IMPORT',
          details: {
            fileName,
            mode: importMode,
            importedCount: validRows.length,
          },
        },
      ]);

      setImportStatus(
        `Successfully imported all ${validRows.length} orders into OrderFlow Pro!`
      );
      setTimeout(() => {
        navigate('/orders');
      }, 1500);
    } catch (err: any) {
      alert(`Import error: ${err.message}`);
      setImportStatus(`Import failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const effectiveNotes = (row: ParsedRow) => {
    const parts: string[] = [];
    if (row.notes) parts.push(row.notes);
    if (importMode === 'legacy') {
      parts.push('Imported from Agency Old Format Sheet');
    }
    return parts.join(' | ') || null;
  };

  const activeOTs = employees.filter((e) => e.role === 'Order Taker' && e.is_active);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-page-title text-fg-primary">Bulk Order Import</h1>
          <p className="text-sm text-fg-secondary mt-0.5">
            Support for both your <strong>Existing Agency Sheet Format</strong> and the <strong>Standard Template</strong>.
          </p>
        </div>

        {/* Download Template Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={generateLegacyOrderImportTemplate}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Download Old Format Template (8 Columns)
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={generateEmptyOrderImportTemplate}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Download Standard Template
          </Button>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center gap-3 p-1.5 rounded-xl bg-bg-surface border border-border shadow-xs w-full sm:w-fit">
        <button
          onClick={() => setImportMode('legacy')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            importMode === 'legacy'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-fg-secondary hover:text-fg-primary'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Existing Agency Format (DATE, TIME, PROJECT, PC, DELIVERY, STATUS, MISTAKE, EDITOR)
        </button>

        <button
          onClick={() => setImportMode('standard')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            importMode === 'standard'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-fg-secondary hover:text-fg-primary'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Standard Template (Custom Order IDs & Details)
        </button>
      </div>

      {/* Upload & Settings Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Upload Dropzone */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>
              {importMode === 'legacy'
                ? 'Upload Existing Agency Excel (.xlsx / .csv)'
                : 'Upload Standard Template File'}
            </CardTitle>
            <p className="text-xs text-fg-secondary mt-0.5">
              {importMode === 'legacy'
                ? 'Order numbers will be automatically generated. Statuses, delivery times, mistakes, and editors are auto-resolved.'
                : 'Upload files formatted according to the standard OrderFlow template.'}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-border hover:border-brand-500/50 bg-bg-secondary/40 cursor-pointer transition-colors group">
              <Upload className="w-10 h-10 text-fg-muted group-hover:text-brand-500 transition-colors mb-2" />
              <span className="text-sm font-semibold text-fg-primary">
                Click to browse or drop your Excel / CSV file
              </span>
              <span className="text-xs text-fg-muted mt-1 font-mono">
                {importMode === 'legacy'
                  ? 'DATE | TIME | PROJECT NAME | PC NO | DELIVERY TIME | STATUS | MISTAKE | EDITOR'
                  : 'Order Number | Order Taker | Project Name | PC Number | Delivery Date...'}
              </span>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {fileName && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-brand-500/10 text-xs text-fg-primary border border-brand-500/20">
                <span className="font-medium font-mono truncate">{fileName}</span>
                <span className="text-brand-600 dark:text-brand-400 font-semibold">Loaded</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Batch Settings & Auto-Editor Creation */}
        <Card>
          <CardHeader>
            <CardTitle>Batch Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Select
                label="Assign to Order Taker"
                value={batchOrderTakerId}
                onChange={(e) => {
                  setBatchOrderTakerId(e.target.value);
                  setParsedRows((prev) =>
                    prev.map((r) => ({ ...r, resolvedOrderTakerId: e.target.value }))
                  );
                }}
                options={[
                  {
                    value: '',
                    label: activeOTs.length > 0 ? 'Select Order Taker' : 'No Order Takers Created Yet',
                  },
                  ...activeOTs.map((ot) => ({
                    value: ot.id,
                    label: `${ot.name} (${ot.employee_code})`,
                  })),
                ]}
                helperText="All imported orders will be associated with this Order Taker"
              />

              {activeOTs.length === 0 && (
                <div className="mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={handleQuickCreateOrderTaker}
                    icon={<UserCheck className="w-3.5 h-3.5 text-brand-500" />}
                  >
                    + Auto-Create Default Order Taker
                  </Button>
                </div>
              )}
            </div>

            {/* Auto-create missing editors toggle */}
            <div className="p-3 rounded-lg bg-bg-secondary border border-border space-y-2">
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="auto_editors"
                  checked={autoCreateMissingEditors}
                  onChange={(e) => setAutoCreateMissingEditors(e.target.checked)}
                  className="rounded border-border text-brand-500 focus:ring-brand-500 mt-0.5"
                />
                <label htmlFor="auto_editors" className="text-xs text-fg-primary font-medium cursor-pointer">
                  Auto-create missing Editors found in file
                </label>
              </div>
              <p className="text-[11px] text-fg-muted pl-5">
                New names in the EDITOR column (e.g. Amina, Waqas) will automatically be registered as active Editors.
              </p>
            </div>

            {detectedNewEditors.length > 0 && (
              <div className="text-xs p-3 rounded-lg bg-status-info/10 border border-status-info/20 text-fg-primary">
                <span className="font-semibold text-status-info block mb-1">
                  New Editors Detected ({detectedNewEditors.length}):
                </span>
                <div className="flex flex-wrap gap-1">
                  {detectedNewEditors.map((name) => (
                    <span
                      key={name}
                      className="px-1.5 py-0.5 rounded bg-bg-surface border border-border text-[11px] font-medium"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Validation & Execute Banner */}
      {importSummary && (
        <div className="p-5 rounded-2xl bg-bg-surface border border-border shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-fg-muted">Total Rows:</span>
              <span className="text-sm font-bold text-fg-primary">{importSummary.total}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-status-success font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>{importSummary.valid} Ready to Import</span>
            </div>
            {importSummary.invalid > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-status-danger font-semibold">
                <XCircle className="w-4 h-4" />
                <span>{importSummary.invalid} Invalid Rows</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              variant="primary"
              size="md"
              disabled={importSummary.valid === 0}
              isLoading={isProcessing}
              onClick={handleExecuteImport}
              icon={<ArrowRight className="w-4 h-4" />}
              className="w-full sm:w-auto"
            >
              Import {importSummary.valid} Orders Into Database
            </Button>
          </div>
        </div>
      )}

      {importStatus && (
        <div className="p-4 rounded-xl bg-brand-500/10 border border-brand-500/20 text-xs font-semibold text-brand-600 dark:text-brand-400">
          {importStatus}
        </div>
      )}

      {/* Preview Table */}
      {parsedRows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-section-title text-fg-primary">
              Data Preview & Auto-Resolved Fields ({parsedRows.length} Rows)
            </h3>
            <span className="text-xs text-fg-secondary">
              Review generated Order IDs, normalized status, and assigned editors before committing.
            </span>
          </div>

          <div className="rounded-xl border border-border bg-bg-surface overflow-x-auto shadow-card">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-bg-secondary text-[11px] font-semibold text-fg-secondary uppercase tracking-wider">
                  <th className="px-3 py-3">#</th>
                  <th className="px-3 py-3">Auto Order ID</th>
                  <th className="px-3 py-3">Order Date</th>
                  <th className="px-3 py-3">Project Name</th>
                  <th className="px-3 py-3">PC #</th>
                  <th className="px-3 py-3">Delivery Time</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Mistake</th>
                  <th className="px-3 py-3">Editor</th>
                  <th className="px-3 py-3">Validation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {parsedRows.map((r) => (
                  <tr
                    key={r.rowNumber}
                    className={`hover:bg-bg-secondary/40 ${
                      !r.isValid ? 'bg-status-danger/[0.04]' : ''
                    }`}
                  >
                    <td className="px-3 py-2.5 font-mono text-fg-muted">{r.rowNumber}</td>
                    <td className="px-3 py-2.5 font-mono font-semibold text-brand-600 dark:text-brand-400">
                      {r.orderNumber}
                    </td>
                    <td className="px-3 py-2.5 text-fg-secondary">
                      {format(new Date(r.orderDate), 'yyyy-MM-dd HH:mm')}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-fg-primary max-w-xs truncate" title={r.projectName}>
                      {r.projectName || '—'}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-fg-secondary">{r.pcNumber || '—'}</td>
                    <td className="px-3 py-2.5 text-fg-secondary">
                      {format(new Date(r.deliveryDate), 'yyyy-MM-dd HH:mm')}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-semibold text-fg-primary">{r.status}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      {r.mistakeDetails ? (
                        <div className="max-w-[150px] truncate text-status-danger font-medium" title={r.mistakeDetails}>
                          {r.mistakeDetails}
                        </div>
                      ) : (
                        <span className="text-fg-muted">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-fg-primary">
                      {r.resolvedEditorName || r.editorIdentifier || <span className="text-fg-muted italic">Unassigned</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      {r.isValid ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-status-success bg-status-success/10 px-2 py-0.5 rounded-full">
                          <Check className="w-3 h-3" /> Ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-status-danger bg-status-danger/10 px-2 py-0.5 rounded-full" title={r.errors.join(', ')}>
                          Failed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
