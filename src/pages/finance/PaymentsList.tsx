import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  Download,
  Trash2,
  Edit2,
  Calendar,
  FileSpreadsheet,
  DollarSign,
  User,
  Users,
  CheckCircle2,
  Printer,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { getSupabaseClient } from '../../lib/supabase';
import { Payment, Employee, PaymentMode, EmployeeRole } from '../../lib/types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { exportToExcel } from '../../lib/exportUtils';
import { useCompanySettings } from '../../context/CompanySettingsContext';

const PAYMENT_MODES: PaymentMode[] = [
  'Cash',
  'Bank Transfer',
  'Easypaisa',
  'JazzCash',
  'Other',
];

export const PaymentsList: React.FC = () => {
  const { settings } = useCompanySettings();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [modeFilter, setModeFilter] = useState<string>('All');
  const [employeeFilter, setEmployeeFilter] = useState<string>('All');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [currentPayment, setCurrentPayment] = useState<Payment | null>(null);

  // Form State
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formAmount, setFormAmount] = useState<number | ''>('');
  const [formMode, setFormMode] = useState<PaymentMode>('Bank Transfer');
  const [formReference, setFormReference] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchPayments = async () => {
    setIsLoading(true);
    const client = getSupabaseClient();
    if (!client) {
      setIsLoading(false);
      return;
    }

    try {
      const { data: empData } = await client.from('employees').select('*');
      setEmployees(empData || []);

      const { data: payData, error } = await client
        .from('payments')
        .select(`
          *,
          employee:employees(*)
        `)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setPayments(payData || []);
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    if (!formEmployeeId) {
      setFormError('Please select an employee.');
      setFormSubmitting(false);
      return;
    }
    if (!formAmount || Number(formAmount) <= 0) {
      setFormError('Please enter a valid payment amount.');
      setFormSubmitting(false);
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      setFormError('Database not connected.');
      setFormSubmitting(false);
      return;
    }

    try {
      const { data, error } = await client
        .from('payments')
        .insert([
          {
            employee_id: formEmployeeId,
            payment_date: formDate,
            amount: Number(formAmount),
            payment_mode: formMode,
            reference_number: formReference.trim() || null,
            notes: formNotes.trim() || null,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Log in audit trail
      await client.from('audit_logs').insert([
        {
          entity_type: 'PAYMENT',
          entity_id: data.id,
          action: 'CREATE',
          details: { amount: formAmount, employeeId: formEmployeeId, mode: formMode },
        },
      ]);

      setIsAddOpen(false);
      resetForm();
      await fetchPayments();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save payment.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleUpdatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPayment) return;
    setFormSubmitting(true);
    setFormError(null);

    const client = getSupabaseClient();
    if (!client) return;

    try {
      const { error } = await client
        .from('payments')
        .update({
          employee_id: formEmployeeId,
          payment_date: formDate,
          amount: Number(formAmount),
          payment_mode: formMode,
          reference_number: formReference.trim() || null,
          notes: formNotes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentPayment.id);

      if (error) throw error;

      setIsEditOpen(false);
      setCurrentPayment(null);
      resetForm();
      await fetchPayments();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update payment.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeletePayment = async () => {
    if (!currentPayment) return;
    setFormSubmitting(true);

    const client = getSupabaseClient();
    if (!client) return;

    try {
      const { error } = await client.from('payments').delete().eq('id', currentPayment.id);
      if (error) throw error;

      setIsDeleteOpen(false);
      setCurrentPayment(null);
      await fetchPayments();
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    } finally {
      setFormSubmitting(false);
    }
  };

  const openEditModal = (pay: Payment) => {
    setCurrentPayment(pay);
    setFormEmployeeId(pay.employee_id);
    setFormDate(pay.payment_date);
    setFormAmount(pay.amount);
    setFormMode(pay.payment_mode);
    setFormReference(pay.reference_number || '');
    setFormNotes(pay.notes || '');
    setFormError(null);
    setIsEditOpen(true);
  };

  const openDeleteModal = (pay: Payment) => {
    setCurrentPayment(pay);
    setIsDeleteOpen(true);
  };

  const resetForm = () => {
    setFormEmployeeId(employees[0]?.id || '');
    setFormDate(format(new Date(), 'yyyy-MM-dd'));
    setFormAmount('');
    setFormMode('Bank Transfer');
    setFormReference('');
    setFormNotes('');
    setFormError(null);
  };

  // Filter logic
  const filteredPayments = payments.filter((p) => {
    const emp = p.employee;
    const matchesSearch =
      (emp?.name && emp.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (emp?.employee_code && emp.employee_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.reference_number && p.reference_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.notes && p.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = roleFilter === 'All' || emp?.role === roleFilter;
    const matchesMode = modeFilter === 'All' || p.payment_mode === modeFilter;
    const matchesEmp = employeeFilter === 'All' || p.employee_id === employeeFilter;

    return matchesSearch && matchesRole && matchesMode && matchesEmp;
  });

  // Calculate totals
  const totalPaidAmount = filteredPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalPaymentCount = filteredPayments.length;

  const handleExportExcel = () => {
    const exportData = filteredPayments.map((p) => ({
      'Payment ID': p.id,
      'Employee Code': p.employee?.employee_code || '—',
      'Employee Name': p.employee?.name || '—',
      'Employee Role': p.employee?.role || '—',
      'Payment Date': p.payment_date,
      'Amount (PKR)': p.amount,
      'Payment Mode': p.payment_mode,
      'Reference / Transaction #': p.reference_number || '—',
      Notes: p.notes || '—',
    }));
    exportToExcel(exportData, `OrderFlow_Payments_${format(new Date(), 'yyyy-MM-dd')}`, 'Payments');
  };

  const columns: Column<Payment>[] = [
    {
      key: 'payment_date',
      header: 'Date',
      render: (row) => <span className="font-medium text-xs">{row.payment_date}</span>,
    },
    {
      key: 'employee',
      header: 'Employee',
      render: (row) => (
        <div>
          <span className="font-semibold text-fg-primary block">{row.employee?.name || '—'}</span>
          <span className="font-mono text-[11px] text-brand-500">
            {row.employee?.employee_code || '—'}
          </span>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => <Badge variant="role">{row.employee?.role || '—'}</Badge>,
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row) => (
        <span className="font-bold text-fg-primary">
          {settings.currency || 'PKR'} {Number(row.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'payment_mode',
      header: 'Payment Mode',
      render: (row) => (
        <span className="text-xs font-medium text-fg-secondary bg-bg-secondary px-2.5 py-1 rounded-md border border-border">
          {row.payment_mode}
        </span>
      ),
    },
    {
      key: 'reference_number',
      header: 'Reference #',
      render: (row) => (
        <span className="font-mono text-xs text-fg-muted">{row.reference_number || '—'}</span>
      ),
    },
    {
      key: 'notes',
      header: 'Notes',
      render: (row) => (
        <span className="text-xs text-fg-secondary truncate max-w-xs block" title={row.notes || ''}>
          {row.notes || '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      headerClassName: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditModal(row)}
            title="Edit Payment"
            icon={<Edit2 className="w-4 h-4 text-fg-secondary" />}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openDeleteModal(row)}
            title="Delete Payment"
            icon={<Trash2 className="w-4 h-4 text-status-danger" />}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-page-title text-fg-primary">Payments Management</h1>
          <p className="text-sm text-fg-secondary mt-0.5">
            Record employee disbursements, salaries, bonuses, and payment history.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleExportExcel}
            icon={<Download className="w-4 h-4" />}
          >
            Export Excel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              resetForm();
              setIsAddOpen(true);
            }}
            icon={<Plus className="w-4 h-4" />}
          >
            Record Payment
          </Button>
        </div>
      </div>

      {/* KPI Cards: Total Paid & Payment Count */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-bg-surface border border-border shadow-card">
          <div className="flex items-center justify-between text-fg-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Disbursed</span>
            <DollarSign className="w-5 h-5 text-brand-500" />
          </div>
          <div className="text-kpi text-fg-primary">
            {settings.currency || 'PKR'} {totalPaidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="text-xs text-fg-secondary mt-1 block">
            Across {totalPaymentCount} recorded payments
          </span>
        </div>

        <div className="p-5 rounded-xl bg-bg-surface border border-border shadow-card">
          <div className="flex items-center justify-between text-fg-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Payment Count</span>
            <CreditCard className="w-5 h-5 text-status-success" />
          </div>
          <div className="text-kpi text-fg-primary">{totalPaymentCount}</div>
          <span className="text-xs text-fg-secondary mt-1 block">Filtered disbursement records</span>
        </div>

        <div className="p-5 rounded-xl bg-bg-surface border border-border shadow-card">
          <div className="flex items-center justify-between text-fg-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Payment</span>
            <Users className="w-5 h-5 text-status-info" />
          </div>
          <div className="text-kpi text-fg-primary">
            {settings.currency || 'PKR'}{' '}
            {totalPaymentCount > 0
              ? (totalPaidAmount / totalPaymentCount).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : '0.00'}
          </div>
          <span className="text-xs text-fg-secondary mt-1 block">Per transaction average</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-bg-surface border border-border shadow-card space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Input
            placeholder="Search employee, reference, notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />

          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            options={[
              { value: 'All', label: 'All Roles' },
              { value: 'Order Taker', label: 'Order Takers' },
              { value: 'Editor', label: 'Editors' },
              { value: 'Manager', label: 'Managers' },
            ]}
          />

          <Select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            options={[
              { value: 'All', label: 'All Payment Modes' },
              ...PAYMENT_MODES.map((m) => ({ value: m, label: m })),
            ]}
          />

          <Select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            options={[
              { value: 'All', label: 'All Employees' },
              ...employees.map((e) => ({ value: e.id, label: `${e.name} (${e.employee_code})` })),
            ]}
          />
        </div>
      </div>

      {/* Payments Table */}
      <DataTable
        columns={columns}
        data={filteredPayments}
        keyExtractor={(p) => p.id}
        isLoading={isLoading}
        emptyTitle="No Payments Recorded"
        emptyDescription={
          searchQuery
            ? 'No payments match your filter criteria.'
            : 'Start recording salary and incentive payments for your team.'
        }
        emptyActionLabel="+ Record First Payment"
        onEmptyAction={() => {
          resetForm();
          setIsAddOpen(true);
        }}
      />

      {/* RECORD PAYMENT MODAL */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Record Employee Payment"
        description="Add a new disbursement or salary transaction."
        maxWidth="lg"
      >
        <form onSubmit={handleAddPayment} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-status-danger/10 border border-status-danger/30 text-xs text-status-danger">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Select Employee"
              required
              value={formEmployeeId}
              onChange={(e) => setFormEmployeeId(e.target.value)}
              options={[
                { value: '', label: 'Select Employee' },
                ...employees.map((e) => ({
                  value: e.id,
                  label: `${e.name} (${e.role} - ${e.employee_code})`,
                })),
              ]}
            />

            <Input
              label="Payment Date"
              type="date"
              required
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={`Amount (${settings.currency || 'PKR'})`}
              type="number"
              step="any"
              required
              placeholder="e.g. 50000"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
            />

            <Select
              label="Payment Mode"
              required
              value={formMode}
              onChange={(e) => setFormMode(e.target.value as PaymentMode)}
              options={PAYMENT_MODES.map((m) => ({ value: m, label: m }))}
            />
          </div>

          <Input
            label="Reference / Transaction Number (Optional)"
            placeholder="e.g. TRX-98234827"
            value={formReference}
            onChange={(e) => setFormReference(e.target.value)}
          />

          <Textarea
            label="Payment Notes"
            placeholder="e.g. Monthly salary for January + performance bonus"
            value={formNotes}
            onChange={(e) => setFormNotes(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" type="button" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={formSubmitting}>
              Save Payment
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT PAYMENT MODAL */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Payment Record"
        maxWidth="lg"
      >
        <form onSubmit={handleUpdatePayment} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-status-danger/10 border border-status-danger/30 text-xs text-status-danger">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Select Employee"
              required
              value={formEmployeeId}
              onChange={(e) => setFormEmployeeId(e.target.value)}
              options={employees.map((e) => ({
                value: e.id,
                label: `${e.name} (${e.role})`,
              }))}
            />

            <Input
              label="Payment Date"
              type="date"
              required
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={`Amount (${settings.currency || 'PKR'})`}
              type="number"
              step="any"
              required
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
            />

            <Select
              label="Payment Mode"
              required
              value={formMode}
              onChange={(e) => setFormMode(e.target.value as PaymentMode)}
              options={PAYMENT_MODES.map((m) => ({ value: m, label: m }))}
            />
          </div>

          <Input
            label="Reference Number"
            value={formReference}
            onChange={(e) => setFormReference(e.target.value)}
          />

          <Textarea
            label="Notes"
            value={formNotes}
            onChange={(e) => setFormNotes(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" type="button" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={formSubmitting}>
              Update Payment
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete Payment Record"
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <p className="text-fg-secondary">
            Are you sure you want to delete this payment of{' '}
            <strong className="text-fg-primary">
              {settings.currency || 'PKR'} {currentPayment?.amount.toLocaleString()}
            </strong>{' '}
            for <strong className="text-fg-primary">{currentPayment?.employee?.name}</strong>?
          </p>
          <p className="text-status-danger font-medium">This action cannot be undone.</p>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeletePayment}
              isLoading={formSubmitting}
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
