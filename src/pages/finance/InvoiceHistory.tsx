import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  Download,
  Trash2,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabase';
import { Invoice } from '../../lib/types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Modal } from '../../components/ui/Modal';
import { useCompanySettings } from '../../context/CompanySettingsContext';
import { generateInvoicePDF } from '../../lib/exportUtils';

export const InvoiceHistory: React.FC = () => {
  const navigate = useNavigate();
  const { settings } = useCompanySettings();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchInvoices = async () => {
    setIsLoading(true);
    const client = getSupabaseClient();
    if (!client) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await client
        .from('invoices')
        .select(`
          *,
          items:invoice_items(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleDownloadInvoice = (inv: Invoice) => {
    generateInvoicePDF(inv, settings);
  };

  const handleDeleteInvoice = async () => {
    if (!selectedInvoice) return;
    setIsDeleting(true);

    const client = getSupabaseClient();
    if (!client) return;

    try {
      const { error } = await client.from('invoices').delete().eq('id', selectedInvoice.id);
      if (error) throw error;

      setIsDeleteOpen(false);
      setSelectedInvoice(null);
      await fetchInvoices();
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customer_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns: Column<Invoice>[] = [
    {
      key: 'invoice_number',
      header: 'Invoice #',
      render: (row) => (
        <span className="font-mono font-semibold text-brand-600 dark:text-brand-400">
          {row.invoice_number}
        </span>
      ),
    },
    {
      key: 'customer_name',
      header: 'Customer',
      render: (row) => (
        <div>
          <span className="font-semibold text-fg-primary block">{row.customer_name}</span>
          {row.customer_contact && (
            <span className="text-[11px] text-fg-muted">{row.customer_contact}</span>
          )}
        </div>
      ),
    },
    {
      key: 'invoice_date',
      header: 'Invoice Date',
      render: (row) => <span className="text-xs text-fg-secondary">{row.invoice_date}</span>,
    },
    {
      key: 'due_date',
      header: 'Due Date',
      render: (row) => <span className="text-xs text-fg-secondary">{row.due_date}</span>,
    },
    {
      key: 'grand_total',
      header: 'Total Amount',
      render: (row) => (
        <span className="font-bold text-fg-primary">
          {row.currency} {Number(row.grand_total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'balance_due',
      header: 'Balance Due',
      render: (row) => (
        <span
          className={`font-semibold text-xs ${
            row.balance_due > 0 ? 'text-status-danger' : 'text-status-success'
          }`}
        >
          {row.currency} {Number(row.balance_due).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const variantMap: any = {
          Paid: 'completed',
          'Partially Paid': 'pending',
          Unpaid: 'issue',
          Overdue: 'issue',
          Cancelled: 'inactive',
        };
        return <Badge variant={variantMap[row.status] || 'secondary'}>{row.status}</Badge>;
      },
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
            onClick={() => handleDownloadInvoice(row)}
            title="Download PDF"
            icon={<Download className="w-4 h-4 text-brand-500" />}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedInvoice(row);
              setIsDeleteOpen(true);
            }}
            title="Delete Invoice"
            icon={<Trash2 className="w-4 h-4 text-status-danger" />}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-page-title text-fg-primary">Invoice History</h1>
          <p className="text-sm text-fg-secondary mt-0.5">
            View, search, reprint, and manage all generated client invoices.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            onClick={() => navigate('/finance/invoices/new')}
            icon={<Plus className="w-4 h-4" />}
          >
            Create New Invoice
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-bg-surface border border-border shadow-card flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search invoice # or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="w-full sm:w-48">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'All', label: 'All Statuses' },
              { value: 'Paid', label: 'Paid' },
              { value: 'Partially Paid', label: 'Partially Paid' },
              { value: 'Unpaid', label: 'Unpaid' },
              { value: 'Overdue', label: 'Overdue' },
            ]}
          />
        </div>
      </div>

      {/* Invoices Table */}
      <DataTable
        columns={columns}
        data={filteredInvoices}
        keyExtractor={(i) => i.id}
        isLoading={isLoading}
        emptyTitle="No Invoices Found"
        emptyDescription="Create your first client invoice using the invoice generator."
        emptyActionLabel="+ Create First Invoice"
        onEmptyAction={() => navigate('/finance/invoices/new')}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete Invoice"
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <p className="text-fg-secondary">
            Are you sure you want to delete invoice{' '}
            <strong className="text-fg-primary">{selectedInvoice?.invoice_number}</strong> for{' '}
            <strong className="text-fg-primary">{selectedInvoice?.customer_name}</strong>?
          </p>
          <p className="text-status-danger font-medium">This record will be permanently deleted.</p>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteInvoice} isLoading={isDeleting}>
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
