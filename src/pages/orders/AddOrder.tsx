import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Trash2,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Layers,
  ArrowLeft,
  FileSpreadsheet,
} from 'lucide-react';
import { format } from 'date-fns';
import { getSupabaseClient } from '../../lib/supabase';
import { Employee, MistakeCategory, OrderStatus } from '../../lib/types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';

interface MistakeEntry {
  categoryId?: string;
  categoryName: string;
  details: string;
}

const DEFAULT_MISTAKE_CATEGORIES = [
  'Editing Mistake',
  'Spelling Mistake',
  'Wording Mistake',
  'Thumbnail Mistake',
  'Voiceover Mistake',
  'Incorrect Data',
  'Incomplete Data',
  'Customer Requirement Mistake',
  'Other',
];

export const AddOrder: React.FC = () => {
  const navigate = useNavigate();

  // Active employees
  const [orderTakers, setOrderTakers] = useState<Employee[]>([]);
  const [editors, setEditors] = useState<Employee[]>([]);
  const [mistakeCategories, setMistakeCategories] = useState<MistakeCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form fields
  const [orderNumber, setOrderNumber] = useState('');
  const [orderTakerId, setOrderTakerId] = useState('');
  const [orderDateTime, setOrderDateTime] = useState('');
  const [projectName, setProjectName] = useState('');
  const [pcNumber, setPcNumber] = useState('');
  const [deliveryDateTime, setDeliveryDateTime] = useState('');
  const [status, setStatus] = useState<OrderStatus>('Pending');
  const [assignedEditorId, setAssignedEditorId] = useState('');
  const [notes, setNotes] = useState('');

  // Mistakes array
  const [mistakes, setMistakes] = useState<MistakeEntry[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize auto-populated fields
  useEffect(() => {
    const now = new Date();
    // Default format YYYY-MM-DDTHH:mm for datetime-local
    const nowFormatted = format(now, "yyyy-MM-dd'T'HH:mm");
    // Default delivery 24 hours later
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowFormatted = format(tomorrow, "yyyy-MM-dd'T'HH:mm");

    setOrderDateTime(nowFormatted);
    setDeliveryDateTime(tomorrowFormatted);

    // Generate Order ID preview
    const randPart = Math.floor(1000 + Math.random() * 9000);
    const year = now.getFullYear();
    setOrderNumber(`ORD-${year}-${randPart}`);

    fetchDropdownData();
  }, []);

  const fetchDropdownData = async () => {
    const client = getSupabaseClient();
    if (!client) {
      setIsLoading(false);
      return;
    }

    try {
      // Fetch only active Order Takers and active Editors
      const { data: empData, error: empError } = await client
        .from('employees')
        .select('*')
        .eq('is_active', true);

      if (empError) throw empError;

      const ots = (empData || []).filter((e) => e.role === 'Order Taker');
      const eds = (empData || []).filter((e) => e.role === 'Editor');
      setOrderTakers(ots);
      setEditors(eds);

      if (ots.length > 0) setOrderTakerId(ots[0].id);

      // Fetch mistake categories
      const { data: catData } = await client
        .from('mistake_categories')
        .select('*')
        .eq('is_active', true);

      if (catData && catData.length > 0) {
        setMistakeCategories(catData);
      }
    } catch (err: any) {
      console.error('Error fetching dropdown data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const addMistakeRow = () => {
    const defaultCat =
      mistakeCategories.length > 0
        ? mistakeCategories[0].name
        : DEFAULT_MISTAKE_CATEGORIES[0];
    setMistakes((prev) => [
      ...prev,
      {
        categoryId: mistakeCategories[0]?.id,
        categoryName: defaultCat,
        details: '',
      },
    ]);
  };

  const removeMistakeRow = (index: number) => {
    setMistakes((prev) => prev.filter((_, i) => i !== index));
  };

  const updateMistakeRow = (index: number, field: keyof MistakeEntry, value: string) => {
    setMistakes((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      if (field === 'categoryName') {
        const found = mistakeCategories.find((c) => c.name === value);
        copy[index].categoryId = found?.id;
      }
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    if (!orderTakerId) {
      setErrorMessage('Please select an active Order Taker.');
      setIsSubmitting(false);
      return;
    }

    if (!projectName.trim() || !pcNumber.trim()) {
      setErrorMessage('Project Name and PC Number are required.');
      setIsSubmitting(false);
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      setErrorMessage('Database is not connected.');
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. Insert Order
      const { data: newOrder, error: orderError } = await client
        .from('orders')
        .insert([
          {
            order_number: orderNumber.trim(),
            order_taker_id: orderTakerId,
            order_date: new Date(orderDateTime).toISOString(),
            project_name: projectName.trim(),
            pc_number: pcNumber.trim(),
            delivery_date: new Date(deliveryDateTime).toISOString(),
            status,
            assigned_editor_id: assignedEditorId || null,
            completed_at: status === 'Completed' ? new Date().toISOString() : null,
            notes: notes.trim() || null,
          },
        ])
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Insert initial status history
      await client.from('order_status_history').insert([
        {
          order_id: newOrder.id,
          new_status: status,
          reason: 'Initial order creation',
        },
      ]);

      // 3. Insert assignment record if editor assigned
      if (assignedEditorId) {
        await client.from('order_assignments').insert([
          {
            order_id: newOrder.id,
            editor_id: assignedEditorId,
            is_current: true,
            notes: 'Initial assignment upon creation',
          },
        ]);
      }

      // 4. Insert mistakes if provided
      const validMistakes = mistakes.filter((m) => m.details.trim().length > 0);
      if (validMistakes.length > 0) {
        const mistakePayloads = validMistakes.map((m) => ({
          order_id: newOrder.id,
          category_id: m.categoryId || null,
          category_name: m.categoryName,
          details: m.details.trim(),
        }));
        const { error: mistakeError } = await client
          .from('order_mistakes')
          .insert(mistakePayloads);
        if (mistakeError) console.warn('Could not insert mistakes:', mistakeError.message);
      }

      // Success -> navigate to all orders
      navigate('/orders');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryOptions =
    mistakeCategories.length > 0
      ? mistakeCategories.map((c) => ({ value: c.name, label: c.name }))
      : DEFAULT_MISTAKE_CATEGORIES.map((c) => ({ value: c, label: c }));

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/orders')}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Back
          </Button>
          <div>
            <h1 className="text-page-title text-fg-primary">Add New Order</h1>
            <p className="text-xs text-fg-secondary mt-0.5">
              Create an order with assignment, time stamps, and mistake tracking.
            </p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-status-danger/10 border border-status-danger/30 text-xs text-status-danger flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Order Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Order ID / Number"
                required
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                helperText="Auto-generated unique code"
              />

              <Select
                label="Order Taker"
                required
                value={orderTakerId}
                onChange={(e) => setOrderTakerId(e.target.value)}
                options={[
                  { value: '', label: orderTakers.length ? 'Select Order Taker' : 'No Active Order Takers' },
                  ...orderTakers.map((ot) => ({
                    value: ot.id,
                    label: `${ot.name} (${ot.employee_code})`,
                  })),
                ]}
                helperText="Active Order Takers only"
              />

              <Input
                label="Order Date & Time"
                type="datetime-local"
                required
                value={orderDateTime}
                onChange={(e) => setOrderDateTime(e.target.value)}
                helperText="Asia/Karachi display timezone"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Project Name"
                required
                placeholder="e.g. YouTube Video - Tech Review #42"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />

              <Input
                label="PC Number / Workstation"
                required
                placeholder="e.g. PC-04"
                value={pcNumber}
                onChange={(e) => setPcNumber(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Delivery Date & Time"
                type="datetime-local"
                required
                value={deliveryDateTime}
                onChange={(e) => setDeliveryDateTime(e.target.value)}
              />

              <Select
                label="Status"
                required
                value={status}
                onChange={(e) => setStatus(e.target.value as OrderStatus)}
                options={[
                  { value: 'Pending', label: 'Pending (Default)' },
                  { value: 'In Progress', label: 'In Progress' },
                  { value: 'Completed', label: 'Completed' },
                  { value: 'Issue', label: 'Issue' },
                ]}
              />

              <Select
                label="Assigned Editor (Optional)"
                value={assignedEditorId}
                onChange={(e) => setAssignedEditorId(e.target.value)}
                options={[
                  { value: '', label: 'Unassigned' },
                  ...editors.map((ed) => ({
                    value: ed.id,
                    label: `${ed.name} (${ed.employee_code})`,
                  })),
                ]}
                helperText="Active Editors only"
              />
            </div>

            <Textarea
              label="Order Notes / Brief"
              placeholder="Add client requirements, aspect ratios, or specific instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Mistakes Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Mistake Tracking (Optional)</CardTitle>
              <p className="text-xs text-fg-secondary mt-0.5">
                Record errors for employee analytics and performance scoring.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addMistakeRow}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Mistake Incident
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {mistakes.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-fg-muted">
                No mistakes attached to this order. Click "+ Add Mistake Incident" if an error occurred.
              </div>
            ) : (
              mistakes.map((m, index) => (
                <div
                  key={index}
                  className="p-3.5 rounded-xl bg-bg-secondary border border-border flex flex-col sm:flex-row items-start sm:items-center gap-3"
                >
                  <div className="w-full sm:w-1/3">
                    <Select
                      label={`Mistake #${index + 1} Category`}
                      value={m.categoryName}
                      onChange={(e) => updateMistakeRow(index, 'categoryName', e.target.value)}
                      options={categoryOptions}
                    />
                  </div>
                  <div className="flex-1 w-full">
                    <Input
                      label="Specific Mistake Details"
                      required
                      placeholder="e.g. Spelling error in thumbnail text at 02:14"
                      value={m.details}
                      onChange={(e) => updateMistakeRow(index, 'details', e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMistakeRow(index)}
                    className="p-2 text-status-danger hover:bg-status-danger/10 rounded-lg transition-colors sm:mt-5 self-end sm:self-auto"
                    title="Remove mistake"
                    aria-label="Remove mistake"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Actions Bar */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Button variant="outline" type="button" onClick={() => navigate('/orders')}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            size="lg"
            isLoading={isSubmitting}
            icon={<CheckCircle2 className="w-4 h-4" />}
          >
            Save & Publish Order
          </Button>
        </div>
      </form>
    </div>
  );
};
