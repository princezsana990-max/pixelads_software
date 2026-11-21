import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Trash2,
  Download,
  Save,
  CheckCircle2,
  DollarSign,
  Calendar,
  Building,
  User,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';
import { format } from 'date-fns';
import { getSupabaseClient } from '../../lib/supabase';
import { Invoice, InvoiceItem, InvoiceStatus } from '../../lib/types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { useCompanySettings } from '../../context/CompanySettingsContext';
import { generateInvoicePDF } from '../../lib/exportUtils';

interface ItemRow {
  id: string;
  item_description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
}

export const InvoiceGenerator: React.FC = () => {
  const navigate = useNavigate();
  const { settings } = useCompanySettings();

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dueDate, setDueDate] = useState(
    format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
  );
  const [currency, setCurrency] = useState(settings.currency || 'PKR');

  // Customer info
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerContact, setCustomerContact] = useState('');

  // Dynamic items
  const [items, setItems] = useState<ItemRow[]>([
    {
      id: '1',
      item_description: 'Video Editing & Post-Production Service',
      quantity: 1,
      unit_price: 25000,
      discount: 0,
      total: 25000,
    },
  ]);

  // Tax & payments
  const [taxRate, setTaxRate] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [status, setStatus] = useState<InvoiceStatus>('Unpaid');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState(
    'Payment is due within 14 days of invoice date. Thank you for your partnership!'
  );

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    // Generate invoice number preview
    const rand = Math.floor(1000 + Math.random() * 9000);
    const year = new Date().getFullYear();
    setInvoiceNumber(`INV-${year}-${rand}`);
    setCurrency(settings.currency || 'PKR');
  }, [settings.currency]);

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const totalItemDiscount = items.reduce((sum, item) => sum + Number(item.discount || 0), 0);
  const discountedSubtotal = Math.max(0, subtotal - totalItemDiscount);
  const taxAmount = (discountedSubtotal * taxRate) / 100;
  const grandTotal = discountedSubtotal + taxAmount;
  const balanceDue = Math.max(0, grandTotal - amountPaid);

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(7),
        item_description: '',
        quantity: 1,
        unit_price: 0,
        discount: 0,
        total: 0,
      },
    ]);
  };

  const removeItemRow = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateItemRow = (id: string, field: keyof ItemRow, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        const qty = Number(updated.quantity) || 0;
        const price = Number(updated.unit_price) || 0;
        const disc = Number(updated.discount) || 0;
        updated.total = Math.max(0, qty * price - disc);
        return updated;
      })
    );
  };

  const buildInvoiceObject = (): Invoice => {
    return {
      id: '',
      invoice_number: invoiceNumber.trim(),
      invoice_date: invoiceDate,
      due_date: dueDate,
      customer_name: customerName.trim(),
      customer_address: customerAddress.trim() || null,
      customer_contact: customerContact.trim() || null,
      currency,
      subtotal,
      discount: totalItemDiscount,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      grand_total: grandTotal,
      amount_paid: amountPaid,
      balance_due: balanceDue,
      status: balanceDue === 0 ? 'Paid' : amountPaid > 0 ? 'Partially Paid' : status,
      notes: notes.trim() || null,
      terms: terms.trim() || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: items.map((i, idx) => ({
        id: '',
        invoice_id: '',
        item_description: i.item_description,
        quantity: i.quantity,
        unit_price: i.unit_price,
        discount: i.discount,
        total: i.total,
        sort_order: idx,
      })),
    };
  };

  const handleDownloadPDF = () => {
    if (!customerName.trim()) {
      alert('Please enter a Customer Name before generating PDF.');
      return;
    }
    const inv = buildInvoiceObject();
    generateInvoicePDF(inv, settings);
  };

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    if (!customerName.trim()) {
      setSaveError('Customer Name is required.');
      setIsSaving(false);
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      setSaveError('Database not connected.');
      setIsSaving(false);
      return;
    }

    try {
      const inv = buildInvoiceObject();

      // 1. Insert invoice header
      const { data: insertedInv, error: invError } = await client
        .from('invoices')
        .insert([
          {
            invoice_number: inv.invoice_number,
            invoice_date: inv.invoice_date,
            due_date: inv.due_date,
            customer_name: inv.customer_name,
            customer_address: inv.customer_address,
            customer_contact: inv.customer_contact,
            currency: inv.currency,
            subtotal: inv.subtotal,
            discount: inv.discount,
            tax_rate: inv.tax_rate,
            tax_amount: inv.tax_amount,
            grand_total: inv.grand_total,
            amount_paid: inv.amount_paid,
            balance_due: inv.balance_due,
            status: inv.status,
            notes: inv.notes,
            terms: inv.terms,
          },
        ])
        .select()
        .single();

      if (invError) throw invError;

      // 2. Insert items
      const itemPayloads = items.map((item, idx) => ({
        invoice_id: insertedInv.id,
        item_description: item.item_description.trim() || 'Service Item',
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.unit_price) || 0,
        discount: Number(item.discount) || 0,
        total: item.total,
        sort_order: idx,
      }));

      const { error: itemsError } = await client.from('invoice_items').insert(itemPayloads);
      if (itemsError) throw itemsError;

      // Download the PDF automatically
      generateInvoicePDF({ ...inv, id: insertedInv.id }, settings);

      navigate('/finance/invoices');
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save invoice.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/finance/invoices')}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Invoices List
          </Button>
          <div>
            <h1 className="text-page-title text-fg-primary">Invoice Generator</h1>
            <p className="text-xs text-fg-secondary mt-0.5">
              Create and export print-ready A4 invoices with company branding.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            icon={<Download className="w-4 h-4" />}
          >
            Preview PDF
          </Button>
        </div>
      </div>

      {saveError && (
        <div className="p-4 rounded-xl bg-status-danger/10 border border-status-danger/30 text-xs text-status-danger flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      <form onSubmit={handleSaveInvoice} className="space-y-6">
        {/* Meta & Customer Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Invoice Information */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                label="Invoice Number"
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Invoice Date"
                  type="date"
                  required
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
                <Input
                  label="Due Date"
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Currency"
                  required
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                />
                <Select
                  label="Initial Status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
                  options={[
                    { value: 'Unpaid', label: 'Unpaid' },
                    { value: 'Partially Paid', label: 'Partially Paid' },
                    { value: 'Paid', label: 'Paid' },
                  ]}
                />
              </div>
            </CardContent>
          </Card>

          {/* Customer Details */}
          <Card>
            <CardHeader>
              <CardTitle>Billed To (Customer Details)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                label="Customer / Client Name"
                required
                placeholder="e.g. Apex Media Group"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />

              <Input
                label="Contact Number / Email"
                placeholder="e.g. billing@apexmedia.com / +92 300 0000000"
                value={customerContact}
                onChange={(e) => setCustomerContact(e.target.value)}
              />

              <Textarea
                label="Billing Address"
                placeholder="Building 12, Tech District, City..."
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                rows={2}
              />
            </CardContent>
          </Card>
        </div>

        {/* Dynamic Line Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Invoice Line Items</CardTitle>
              <p className="text-xs text-fg-secondary mt-0.5">
                Add unlimited items with quantity, unit prices, and discounts.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addItemRow}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-bg-secondary border border-border grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                >
                  <div className="sm:col-span-5">
                    <Input
                      label={`Item #${index + 1} Description`}
                      required
                      placeholder="Service or product description"
                      value={item.item_description}
                      onChange={(e) => updateItemRow(item.id, 'item_description', e.target.value)}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Input
                      label="Qty"
                      type="number"
                      min="0.1"
                      step="any"
                      required
                      value={item.quantity}
                      onChange={(e) =>
                        updateItemRow(item.id, 'quantity', parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Input
                      label={`Price (${currency})`}
                      type="number"
                      step="any"
                      min="0"
                      required
                      value={item.unit_price}
                      onChange={(e) =>
                        updateItemRow(item.id, 'unit_price', parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Input
                      label="Discount"
                      type="number"
                      step="any"
                      min="0"
                      value={item.discount}
                      onChange={(e) =>
                        updateItemRow(item.id, 'discount', parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>

                  <div className="sm:col-span-1 flex items-center justify-end pt-5">
                    <button
                      type="button"
                      onClick={() => removeItemRow(item.id)}
                      disabled={items.length <= 1}
                      className="p-2 text-status-danger hover:bg-status-danger/10 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                      title="Remove item"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations Breakdown */}
            <div className="pt-4 border-t border-border flex flex-col items-end space-y-2 text-xs">
              <div className="flex justify-between w-64 text-fg-secondary">
                <span>Subtotal:</span>
                <span className="font-semibold text-fg-primary">
                  {currency} {subtotal.toFixed(2)}
                </span>
              </div>

              {totalItemDiscount > 0 && (
                <div className="flex justify-between w-64 text-status-danger">
                  <span>Discount:</span>
                  <span>
                    -{currency} {totalItemDiscount.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between w-64 gap-2">
                <span className="text-fg-secondary">Tax Rate (%):</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-20 px-2 py-1 text-right text-xs rounded border border-border bg-bg-surface text-fg-primary font-medium"
                />
              </div>

              {taxAmount > 0 && (
                <div className="flex justify-between w-64 text-fg-secondary">
                  <span>Tax Amount:</span>
                  <span className="font-semibold text-fg-primary">
                    {currency} {taxAmount.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex justify-between w-64 text-sm font-bold text-fg-primary pt-2 border-t border-border">
                <span>Grand Total:</span>
                <span>
                  {currency} {grandTotal.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between w-64 gap-2 pt-1">
                <span className="text-fg-secondary">Amount Paid:</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                  className="w-24 px-2 py-1 text-right text-xs rounded border border-border bg-bg-surface text-fg-primary font-medium"
                />
              </div>

              <div className="flex justify-between w-64 text-sm font-bold text-brand-600 dark:text-brand-400 pt-1">
                <span>Balance Due:</span>
                <span>
                  {currency} {balanceDue.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes & Terms */}
        <Card>
          <CardHeader>
            <CardTitle>Terms & Footer Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              label="Payment Terms"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              rows={2}
            />

            <Textarea
              label="Additional Notes / Bank Account Details"
              placeholder="e.g. Bank: Meezan Bank | Title: Pixelads | Account: 010203040506"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </CardContent>
        </Card>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Button variant="outline" type="button" onClick={() => navigate('/finance/invoices')}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            size="lg"
            isLoading={isSaving}
            icon={<Save className="w-4 h-4" />}
          >
            Save & Export PDF
          </Button>
        </div>
      </form>
    </div>
  );
};
