import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  UserCheck,
  AlertTriangle,
  Scissors,
  CheckCircle2,
  Clock,
  Layers,
  Calendar,
  X,
  History,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { getSupabaseClient } from '../../lib/supabase';
import { Order, Employee, OrderStatus, OrderAssignment, OrderStatusHistory } from '../../lib/types';
import { getOrderCategories } from '../../lib/categories';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Modal } from '../../components/ui/Modal';
import { Textarea } from '../../components/ui/Textarea';

export const OrdersList: React.FC = () => {
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [orderTakerFilter, setOrderTakerFilter] = useState<string>('All');
  const [editorFilter, setEditorFilter] = useState<string>('All');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // Modals
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isReassignOpen, setIsReassignOpen] = useState(false);

  // Delete Modals
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [deleteAllConfirmText, setDeleteAllConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit / Status / Reassign forms
  const [newStatus, setNewStatus] = useState<OrderStatus>('Pending');
  const [statusReason, setStatusReason] = useState('');
  const [reassignEditorId, setReassignEditorId] = useState('');
  const [reassignNotes, setReassignNotes] = useState('');
  const [editFormData, setEditFormData] = useState({
    projectName: '',
    category: 'General',
    pcNumber: '',
    deliveryDate: '',
    notes: '',
  });
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // History states for view modal
  const [orderAssignments, setOrderAssignments] = useState<OrderAssignment[]>([]);
  const [orderHistory, setOrderStatusHistory] = useState<OrderStatusHistory[]>([]);

  const fetchOrdersAndEmployees = async () => {
    setIsLoading(true);
    const client = getSupabaseClient();
    if (!client) {
      setIsLoading(false);
      return;
    }

    try {
      // 1. Fetch employees
      const { data: empData } = await client.from('employees').select('*');
      setEmployees(empData || []);

      // 2. Fetch orders with relations
      const { data: orderData, error } = await client
        .from('orders')
        .select(`
          *,
          order_taker:employees!orders_order_taker_id_fkey(*),
          assigned_editor:employees!orders_assigned_editor_id_fkey(*),
          mistakes:order_mistakes(*)
        `)
        .order('order_date', { ascending: false });

      if (error) throw error;
      setOrders(orderData || []);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrdersAndEmployees();
  }, []);

  const openViewModal = async (order: Order) => {
    setSelectedOrder(order);
    setIsViewOpen(true);

    const client = getSupabaseClient();
    if (client) {
      const { data: assigns } = await client
        .from('order_assignments')
        .select('*, editor:employees(*)')
        .eq('order_id', order.id)
        .order('assigned_at', { ascending: false });
      setOrderAssignments(assigns || []);

      const { data: history } = await client
        .from('order_status_history')
        .select('*')
        .eq('order_id', order.id)
        .order('created_at', { ascending: false });
      setOrderStatusHistory(history || []);
    }
  };

  const openStatusModal = (order: Order) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setStatusReason('');
    setIsStatusOpen(true);
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setModalSubmitting(true);

    const client = getSupabaseClient();
    if (!client) {
      setModalSubmitting(false);
      return;
    }

    try {
      const isCompleted = newStatus === 'Completed';
      const { error: updateError } = await client
        .from('orders')
        .update({
          status: newStatus,
          completed_at: isCompleted ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedOrder.id);

      if (updateError) throw updateError;

      // Log status history
      await client.from('order_status_history').insert([
        {
          order_id: selectedOrder.id,
          old_status: selectedOrder.status,
          new_status: newStatus,
          reason: statusReason.trim() || 'Status changed in orders dashboard',
        },
      ]);

      setIsStatusOpen(false);
      await fetchOrdersAndEmployees();
    } catch (err: any) {
      alert(`Error updating status: ${err.message}`);
    } finally {
      setModalSubmitting(false);
    }
  };

  const openReassignModal = (order: Order) => {
    setSelectedOrder(order);
    setReassignEditorId(order.assigned_editor_id || '');
    setReassignNotes('');
    setIsReassignOpen(true);
  };

  const handleReassignEditor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setModalSubmitting(true);

    const client = getSupabaseClient();
    if (!client) {
      setModalSubmitting(false);
      return;
    }

    try {
      // 1. Mark previous active assignment as unassigned
      await client
        .from('order_assignments')
        .update({
          is_current: false,
          unassigned_at: new Date().toISOString(),
        })
        .eq('order_id', selectedOrder.id)
        .eq('is_current', true);

      // 2. Insert new assignment if editor selected
      if (reassignEditorId) {
        await client.from('order_assignments').insert([
          {
            order_id: selectedOrder.id,
            editor_id: reassignEditorId,
            is_current: true,
            notes: reassignNotes.trim() || 'Reassigned from order table',
          },
        ]);
      }

      // 3. Update order assigned_editor_id
      await client
        .from('orders')
        .update({
          assigned_editor_id: reassignEditorId || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedOrder.id);

      setIsReassignOpen(false);
      await fetchOrdersAndEmployees();
    } catch (err: any) {
      alert(`Error reassigning editor: ${err.message}`);
    } finally {
      setModalSubmitting(false);
    }
  };

  const openEditModal = (order: Order) => {
    setSelectedOrder(order);
    let delivFormatted = '';
    try {
      delivFormatted = format(parseISO(order.delivery_date), "yyyy-MM-dd'T'HH:mm");
    } catch {
      delivFormatted = order.delivery_date;
    }
    setEditFormData({
      projectName: order.project_name,
      category: order.category || 'General',
      pcNumber: order.pc_number,
      deliveryDate: delivFormatted,
      notes: order.notes || '',
    });
    setIsEditOpen(true);
  };

  const handleEditOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setModalSubmitting(true);

    const client = getSupabaseClient();
    if (!client) {
      setModalSubmitting(false);
      return;
    }

    try {
      const updatePayload: any = {
        project_name: editFormData.projectName.trim(),
        category: editFormData.category || 'General',
        pc_number: editFormData.pcNumber.trim(),
        delivery_date: new Date(editFormData.deliveryDate).toISOString(),
        notes: editFormData.notes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await client
        .from('orders')
        .update(updatePayload)
        .eq('id', selectedOrder.id);

      if (error) {
        if (
          error.message?.toLowerCase().includes('category') ||
          error.code === 'PGRST204' ||
          error.message?.includes('schema cache')
        ) {
          delete updatePayload.category;
          const { error: retryError } = await client
            .from('orders')
            .update(updatePayload)
            .eq('id', selectedOrder.id);
          if (retryError) throw retryError;
        } else {
          throw error;
        }
      }

      setIsEditOpen(false);
      await fetchOrdersAndEmployees();
    } catch (err: any) {
      alert(`Error updating order: ${err.message}`);
    } finally {
      setModalSubmitting(false);
    }
  };

  const openDeleteModal = (order: Order) => {
    setOrderToDelete(order);
    setIsDeleteOpen(true);
  };

  const handleDeleteSingleOrder = async () => {
    if (!orderToDelete) return;
    setIsDeleting(true);

    const client = getSupabaseClient();
    if (!client) {
      setIsDeleting(false);
      return;
    }

    try {
      // 1. Delete associated records first to prevent foreign key errors
      await client.from('order_mistakes').delete().eq('order_id', orderToDelete.id);
      await client.from('order_status_history').delete().eq('order_id', orderToDelete.id);
      await client.from('order_assignments').delete().eq('order_id', orderToDelete.id);

      // 2. Delete the order itself
      const { error } = await client.from('orders').delete().eq('id', orderToDelete.id);
      if (error) throw error;

      setIsDeleteOpen(false);
      setOrderToDelete(null);
      await fetchOrdersAndEmployees();
    } catch (err: any) {
      alert(`Error deleting order: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAllOrders = async () => {
    if (deleteAllConfirmText !== 'DELETE') return;
    setIsDeleting(true);

    const client = getSupabaseClient();
    if (!client) {
      setIsDeleting(false);
      return;
    }

    try {
      // 1. Clean up associated tables
      await client.from('order_mistakes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await client.from('order_status_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await client.from('order_assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // 2. Delete all orders
      const { error } = await client.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;

      setIsDeleteAllOpen(false);
      setDeleteAllConfirmText('');
      await fetchOrdersAndEmployees();
    } catch (err: any) {
      alert(`Error deleting all orders: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const categories = getOrderCategories();

  // Filter logic
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.pc_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.category && o.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.order_taker?.name && o.order_taker.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.assigned_editor?.name && o.assigned_editor.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'All' || o.status === statusFilter;
    const matchesCategory = categoryFilter === 'All' || (o.category || 'General') === categoryFilter;
    const matchesOT = orderTakerFilter === 'All' || o.order_taker_id === orderTakerFilter;
    const matchesEditor = editorFilter === 'All' || o.assigned_editor_id === editorFilter;

    let matchesDate = true;
    if (startDateFilter) {
      matchesDate = matchesDate && new Date(o.order_date) >= new Date(startDateFilter);
    }
    if (endDateFilter) {
      matchesDate = matchesDate && new Date(o.order_date) <= new Date(`${endDateFilter}T23:59:59`);
    }

    return matchesSearch && matchesStatus && matchesCategory && matchesOT && matchesEditor && matchesDate;
  });

  const columns: Column<Order>[] = [
    {
      key: 'order_number',
      header: 'Order ID',
      render: (row) => (
        <span className="font-mono font-semibold text-brand-600 dark:text-brand-400">
          {row.order_number}
        </span>
      ),
    },
    {
      key: 'order_date',
      header: 'Order Date',
      render: (row) => {
        try {
          return (
            <span className="text-xs text-fg-secondary">
              {format(parseISO(row.order_date), 'MMM dd, yyyy HH:mm')}
            </span>
          );
        } catch {
          return <span className="text-xs text-fg-secondary">{row.order_date}</span>;
        }
      },
    },
    {
      key: 'order_taker',
      header: 'Order Taker',
      render: (row) => (
        <span className="font-medium text-fg-primary">
          {row.order_taker?.name || '—'}
        </span>
      ),
    },
    {
      key: 'project_name',
      header: 'Project Name',
      render: (row) => (
        <div className="max-w-[180px] truncate font-medium text-fg-primary" title={row.project_name}>
          {row.project_name}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (row) => (
        <span className="inline-flex items-center text-xs font-medium text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/40 px-2 py-0.5 rounded-md border border-brand-200 dark:border-brand-800/40">
          {row.category || 'General'}
        </span>
      ),
    },
    {
      key: 'pc_number',
      header: 'PC #',
      render: (row) => (
        <span className="font-mono text-xs text-fg-secondary bg-bg-secondary px-2 py-0.5 rounded border border-border">
          {row.pc_number}
        </span>
      ),
    },
    {
      key: 'delivery_date',
      header: 'Delivery Time',
      render: (row) => {
        try {
          return (
            <span className="text-xs text-fg-secondary">
              {format(parseISO(row.delivery_date), 'MMM dd, HH:mm')}
            </span>
          );
        } catch {
          return <span className="text-xs text-fg-secondary">{row.delivery_date}</span>;
        }
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const variantMap: Record<OrderStatus, 'pending' | 'in-progress' | 'completed' | 'issue'> = {
          Pending: 'pending',
          'In Progress': 'in-progress',
          Completed: 'completed',
          Issue: 'issue',
        };
        return (
          <button
            onClick={() => openStatusModal(row)}
            className="cursor-pointer transition-transform hover:scale-105"
            title="Click to update status"
          >
            <Badge variant={variantMap[row.status]}>{row.status}</Badge>
          </button>
        );
      },
    },
    {
      key: 'editor',
      header: 'Editor',
      render: (row) => (
        <button
          onClick={() => openReassignModal(row)}
          className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
          title="Click to reassign editor"
        >
          <Scissors className="w-3 h-3 text-fg-muted" />
          {row.assigned_editor?.name || <span className="text-fg-muted italic">Unassigned</span>}
        </button>
      ),
    },
    {
      key: 'mistakes',
      header: 'Mistakes',
      render: (row) => {
        const count = row.mistakes?.length || 0;
        if (count === 0) return <span className="text-xs text-fg-muted">0</span>;
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-status-danger bg-status-danger/10 px-2 py-0.5 rounded-full border border-status-danger/20">
            <AlertTriangle className="w-3 h-3" />
            {count}
          </span>
        );
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
            onClick={() => openViewModal(row)}
            title="View Details"
            icon={<Eye className="w-4 h-4 text-fg-secondary" />}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditModal(row)}
            title="Edit Order"
            icon={<Edit2 className="w-4 h-4 text-fg-secondary" />}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openDeleteModal(row)}
            title="Delete Order"
            className="text-status-danger hover:bg-status-danger/10 hover:text-status-danger"
            icon={<Trash2 className="w-4 h-4" />}
          />
        </div>
      ),
    },
  ];

  const orderTakersList = employees.filter((e) => e.role === 'Order Taker');
  const editorsList = employees.filter((e) => e.role === 'Editor');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-page-title text-fg-primary">Orders Management</h1>
          <p className="text-sm text-fg-secondary mt-0.5">
            Search, filter, track status transitions, and manage editor assignments.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {orders.length > 0 && (
            <Button
              variant="outline"
              onClick={() => {
                setDeleteAllConfirmText('');
                setIsDeleteAllOpen(true);
              }}
              className="text-status-danger border-status-danger/30 hover:bg-status-danger/10 hover:border-status-danger"
              icon={<Trash2 className="w-4 h-4 text-status-danger" />}
            >
              Delete All Orders
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => navigate('/orders/bulk-import')}
            icon={<FileSpreadsheet className="w-4 h-4" />}
          >
            Bulk Import
          </Button>
          <Button
            variant="primary"
            onClick={() => navigate('/orders/add')}
            icon={<Plus className="w-4 h-4" />}
          >
            Add Order
          </Button>
        </div>
      </div>

      {/* Advanced Filter Toolbar */}
      <div className="p-4 rounded-xl bg-bg-surface border border-border shadow-card space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Input
            placeholder="Search Order ID, Project, PC..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />

          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            options={[
              { value: 'All', label: 'All Categories' },
              ...categories.map((c) => ({ value: c, label: c })),
            ]}
          />

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'All', label: 'All Statuses' },
              { value: 'Pending', label: 'Pending' },
              { value: 'In Progress', label: 'In Progress' },
              { value: 'Completed', label: 'Completed' },
              { value: 'Issue', label: 'Issue' },
            ]}
          />

          <Select
            value={orderTakerFilter}
            onChange={(e) => setOrderTakerFilter(e.target.value)}
            options={[
              { value: 'All', label: 'All Order Takers' },
              ...orderTakersList.map((ot) => ({ value: ot.id, label: ot.name })),
            ]}
          />

          <Select
            value={editorFilter}
            onChange={(e) => setEditorFilter(e.target.value)}
            options={[
              { value: 'All', label: 'All Editors' },
              ...editorsList.map((ed) => ({ value: ed.id, label: ed.name })),
            ]}
          />
        </div>

        {/* Date Filters Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-fg-muted font-medium">Filter by Order Date:</span>
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              className="px-2 py-1 rounded-md border border-border bg-bg-surface text-fg-primary text-xs"
            />
            <span className="text-fg-muted">to</span>
            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              className="px-2 py-1 rounded-md border border-border bg-bg-surface text-fg-primary text-xs"
            />
            {(startDateFilter || endDateFilter) && (
              <button
                onClick={() => {
                  setStartDateFilter('');
                  setEndDateFilter('');
                }}
                className="text-brand-500 hover:underline ml-1"
              >
                Clear Dates
              </button>
            )}
          </div>
          <span className="text-fg-secondary">
            Showing <strong className="text-fg-primary">{filteredOrders.length}</strong> of{' '}
            <strong className="text-fg-primary">{orders.length}</strong> total orders
          </span>
        </div>
      </div>

      {/* Orders Table */}
      <DataTable
        columns={columns}
        data={filteredOrders}
        keyExtractor={(o) => o.id}
        isLoading={isLoading}
        emptyTitle="No Orders Found"
        emptyDescription={
          searchQuery || statusFilter !== 'All'
            ? 'No orders match your filter criteria.'
            : 'Start creating orders or import them from Excel.'
        }
        emptyActionLabel="+ Add First Order"
        onEmptyAction={() => navigate('/orders/add')}
      />

      {/* VIEW ORDER DETAILS DRAWER / MODAL */}
      <Modal
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        title={`Order Details — ${selectedOrder?.order_number}`}
        maxWidth="2xl"
      >
        {selectedOrder && (
          <div className="space-y-6 text-xs">
            {/* Top Summary Info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-bg-secondary border border-border">
              <div>
                <span className="text-fg-muted block">Status</span>
                <Badge
                  variant={
                    selectedOrder.status === 'Completed'
                      ? 'completed'
                      : selectedOrder.status === 'Issue'
                      ? 'issue'
                      : selectedOrder.status === 'In Progress'
                      ? 'in-progress'
                      : 'pending'
                  }
                  className="mt-1"
                >
                  {selectedOrder.status}
                </Badge>
              </div>
              <div>
                <span className="text-fg-muted block">Order Taker</span>
                <span className="text-fg-primary font-semibold mt-1 block">
                  {selectedOrder.order_taker?.name || '—'}
                </span>
              </div>
              <div>
                <span className="text-fg-muted block">Assigned Editor</span>
                <span className="text-fg-primary font-semibold mt-1 block">
                  {selectedOrder.assigned_editor?.name || 'Unassigned'}
                </span>
              </div>
              <div>
                <span className="text-fg-muted block">PC Number</span>
                <span className="font-mono text-fg-primary font-semibold mt-1 block">
                  {selectedOrder.pc_number}
                </span>
              </div>
            </div>

            {/* Project Details & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-fg-muted block text-xs font-medium">Project Name:</span>
                <p className="text-sm font-semibold text-fg-primary bg-bg-surface p-2.5 rounded-lg border border-border">
                  {selectedOrder.project_name}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-fg-muted block text-xs font-medium">Order Category:</span>
                <div className="p-2.5 rounded-lg border border-border bg-bg-surface flex items-center">
                  <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 bg-brand-500/10 px-2.5 py-1 rounded-md">
                    {selectedOrder.category || 'General'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-fg-muted block font-medium">Order Creation Date:</span>
                <span className="text-fg-primary font-medium mt-0.5 block">
                  {selectedOrder.order_date}
                </span>
              </div>
              <div>
                <span className="text-fg-muted block font-medium">Delivery Deadline:</span>
                <span className="text-fg-primary font-medium mt-0.5 block">
                  {selectedOrder.delivery_date}
                </span>
              </div>
            </div>

            {/* Mistakes Breakdown */}
            <div className="space-y-2">
              <span className="text-fg-muted block font-medium uppercase tracking-wider">
                Recorded Mistakes ({selectedOrder.mistakes?.length || 0})
              </span>
              {selectedOrder.mistakes && selectedOrder.mistakes.length > 0 ? (
                <div className="space-y-2">
                  {selectedOrder.mistakes.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-lg bg-status-danger/5 border border-status-danger/20 text-fg-primary"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-status-danger" />
                        <span className="font-semibold text-status-danger">{m.category_name}</span>
                      </div>
                      <p className="text-fg-secondary">{m.details}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-fg-muted italic">No mistakes recorded for this order.</p>
              )}
            </div>

            {/* Status History Audit Trail */}
            <div className="space-y-2">
              <span className="text-fg-muted block font-medium uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" />
                Status Change Audit Trail
              </span>
              {orderHistory.length > 0 ? (
                <div className="divide-y divide-border border border-border rounded-xl bg-bg-surface overflow-hidden">
                  {orderHistory.map((h) => (
                    <div key={h.id} className="p-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-fg-primary">
                          {h.old_status ? `${h.old_status} → ` : ''}{h.new_status}
                        </span>
                        {h.reason && <p className="text-fg-muted text-[11px] mt-0.5">{h.reason}</p>}
                      </div>
                      <span className="text-[11px] text-fg-muted">
                        {format(parseISO(h.created_at), 'MMM dd, HH:mm')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-fg-muted italic">No historical changes logged.</p>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setIsViewOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* UPDATE STATUS MODAL */}
      <Modal
        isOpen={isStatusOpen}
        onClose={() => setIsStatusOpen(false)}
        title={`Update Status — ${selectedOrder?.order_number}`}
        maxWidth="md"
      >
        <form onSubmit={handleUpdateStatus} className="space-y-4">
          <Select
            label="New Status"
            required
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
            options={[
              { value: 'Pending', label: 'Pending' },
              { value: 'In Progress', label: 'In Progress' },
              { value: 'Completed', label: 'Completed' },
              { value: 'Issue', label: 'Issue' },
            ]}
          />

          <Textarea
            label="Reason / Notes for Status Change"
            placeholder="Explain reason for issue, delay, or completion details..."
            value={statusReason}
            onChange={(e) => setStatusReason(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" type="button" onClick={() => setIsStatusOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={modalSubmitting}>
              Save Status
            </Button>
          </div>
        </form>
      </Modal>

      {/* REASSIGN EDITOR MODAL */}
      <Modal
        isOpen={isReassignOpen}
        onClose={() => setIsReassignOpen(false)}
        title={`Assign / Reassign Editor — ${selectedOrder?.order_number}`}
        maxWidth="md"
      >
        <form onSubmit={handleReassignEditor} className="space-y-4">
          <Select
            label="Assigned Editor"
            value={reassignEditorId}
            onChange={(e) => setReassignEditorId(e.target.value)}
            options={[
              { value: '', label: 'Unassigned' },
              ...editorsList.map((ed) => ({
                value: ed.id,
                label: `${ed.name} (${ed.employee_code})`,
              })),
            ]}
          />

          <Textarea
            label="Assignment Notes / Instructions"
            placeholder="Specify reason for reassignment or notes to the editor..."
            value={reassignNotes}
            onChange={(e) => setReassignNotes(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" type="button" onClick={() => setIsReassignOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={modalSubmitting}>
              Update Assignment
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT ORDER MODAL */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit Order — ${selectedOrder?.order_number}`}
        maxWidth="lg"
      >
        <form onSubmit={handleEditOrder} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Project Name"
              required
              value={editFormData.projectName}
              onChange={(e) => setEditFormData({ ...editFormData, projectName: e.target.value })}
            />

            <Select
              label="Order Category"
              value={editFormData.category}
              onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
              options={categories.map((c) => ({ value: c, label: c }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="PC Number"
              required
              value={editFormData.pcNumber}
              onChange={(e) => setEditFormData({ ...editFormData, pcNumber: e.target.value })}
            />

            <Input
              label="Delivery Date & Time"
              type="datetime-local"
              required
              value={editFormData.deliveryDate}
              onChange={(e) => setEditFormData({ ...editFormData, deliveryDate: e.target.value })}
            />
          </div>

          <Textarea
            label="Notes"
            value={editFormData.notes}
            onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" type="button" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={modalSubmitting}>
              Update Order
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE SINGLE ORDER MODAL */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setOrderToDelete(null);
        }}
        title="Delete Order"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-status-danger/10 border border-status-danger/20 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-status-danger shrink-0 mt-0.5" />
            <div className="text-xs text-status-danger space-y-1">
              <p className="font-semibold text-sm">Are you sure you want to delete this order?</p>
              <p>
                Order ID: <span className="font-mono font-bold">{orderToDelete?.order_number}</span>
              </p>
              <p>
                Project: <span className="font-medium">{orderToDelete?.project_name}</span>
              </p>
              <p className="text-fg-secondary">
                This action is permanent and will delete associated mistakes, editor assignments, and status logs.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setIsDeleteOpen(false);
                setOrderToDelete(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="bg-status-danger hover:bg-status-danger/90 text-white border-transparent"
              onClick={handleDeleteSingleOrder}
              isLoading={isDeleting}
            >
              Delete Order
            </Button>
          </div>
        </div>
      </Modal>

      {/* DELETE ALL ORDERS MODAL */}
      <Modal
        isOpen={isDeleteAllOpen}
        onClose={() => {
          setIsDeleteAllOpen(false);
          setDeleteAllConfirmText('');
        }}
        title="Delete All Orders"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-status-danger/10 border border-status-danger/20 flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-status-danger shrink-0 mt-0.5" />
            <div className="text-xs text-status-danger space-y-1.5">
              <p className="font-bold text-sm text-status-danger">CRITICAL: Delete All Orders</p>
              <p>
                You are about to permanently delete <strong>ALL {orders.length} orders</strong> in the system.
                All assignment histories, status logs, and mistake tracking records will be completely removed.
              </p>
              <p className="font-semibold text-fg-primary">
                This action CANNOT be undone.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-fg-primary">
              Please type <span className="font-mono font-bold text-status-danger">DELETE</span> to confirm:
            </label>
            <Input
              value={deleteAllConfirmText}
              onChange={(e) => setDeleteAllConfirmText(e.target.value)}
              placeholder="Type DELETE"
              className="font-mono"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setIsDeleteAllOpen(false);
                setDeleteAllConfirmText('');
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="bg-status-danger hover:bg-status-danger/90 text-white border-transparent"
              disabled={deleteAllConfirmText !== 'DELETE' || isDeleting}
              onClick={handleDeleteAllOrders}
              isLoading={isDeleting}
            >
              Confirm Delete All Orders
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
