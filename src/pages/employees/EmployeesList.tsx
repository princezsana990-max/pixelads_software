import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users,
  Plus,
  Search,
  Filter,
  Edit2,
  Eye,
  Power,
  Phone,
  Mail,
  Calendar,
  Briefcase,
  DollarSign,
  UserCheck,
  Scissors,
  Shield,
  FileSpreadsheet,
} from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabase';
import { Employee, EmployeeRole } from '../../lib/types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Badge } from '../../components/ui/Badge';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Modal } from '../../components/ui/Modal';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';

export const EmployeesList: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const roleParam = searchParams.get('role') as EmployeeRole | null;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>(roleParam || 'All');

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    role: 'Order Taker' as EmployeeRole,
    contact_number: '',
    email: '',
    joining_date: new Date().toISOString().substring(0, 10),
    monthly_salary: 0,
    is_active: true,
    notes: '',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchEmployees = async () => {
    setIsLoading(true);
    const client = getSupabaseClient();
    if (!client) {
      setIsLoading(false);
      return;
    }

    try {
      let query = client.from('employees').select('*').order('created_at', { ascending: false });
      const { data, error } = await query;
      if (error) throw error;
      setEmployees(data || []);
    } catch (err: any) {
      console.error('Failed to load employees:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (roleParam) {
      setSelectedRole(roleParam);
    }
  }, [roleParam]);

  const handleRoleTabClick = (role: string) => {
    setSelectedRole(role);
    if (role === 'All') {
      searchParams.delete('role');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ role });
    }
  };

  // Generate sequential Employee Code: EMP-001, EMP-002, etc.
  const generateNextEmployeeCode = () => {
    if (employees.length === 0) return 'EMP-001';
    const codes = employees
      .map((e) => {
        const match = e.employee_code.match(/EMP-(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => !isNaN(n));

    const maxCode = codes.length > 0 ? Math.max(...codes) : 0;
    const nextNum = maxCode + 1;
    return `EMP-${nextNum.toString().padStart(3, '0')}`;
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    const client = getSupabaseClient();
    if (!client) {
      setFormError('Database not connected.');
      setFormSubmitting(false);
      return;
    }

    try {
      const nextCode = generateNextEmployeeCode();
      const { data, error } = await client
        .from('employees')
        .insert([
          {
            employee_code: nextCode,
            name: formData.name.trim(),
            role: formData.role,
            contact_number: formData.contact_number.trim() || null,
            email: formData.email.trim() || null,
            joining_date: formData.joining_date,
            monthly_salary: Number(formData.monthly_salary) || 0,
            is_active: formData.is_active,
            notes: formData.notes.trim() || null,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setIsCreateOpen(false);
      resetForm();
      await fetchEmployees();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create employee record.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEmployee) return;
    setFormSubmitting(true);
    setFormError(null);

    const client = getSupabaseClient();
    if (!client) {
      setFormError('Database not connected.');
      setFormSubmitting(false);
      return;
    }

    try {
      const { error } = await client
        .from('employees')
        .update({
          name: formData.name.trim(),
          role: formData.role,
          contact_number: formData.contact_number.trim() || null,
          email: formData.email.trim() || null,
          joining_date: formData.joining_date,
          monthly_salary: Number(formData.monthly_salary) || 0,
          is_active: formData.is_active,
          notes: formData.notes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentEmployee.id);

      if (error) throw error;

      setIsEditOpen(false);
      setCurrentEmployee(null);
      resetForm();
      await fetchEmployees();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update employee record.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleActive = async (emp: Employee) => {
    const client = getSupabaseClient();
    if (!client) return;

    try {
      const { error } = await client
        .from('employees')
        .update({
          is_active: !emp.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', emp.id);

      if (error) throw error;
      await fetchEmployees();
    } catch (err) {
      console.error('Failed to toggle active status:', err);
    }
  };

  const openEditModal = (emp: Employee) => {
    setCurrentEmployee(emp);
    setFormData({
      name: emp.name,
      role: emp.role,
      contact_number: emp.contact_number || '',
      email: emp.email || '',
      joining_date: emp.joining_date,
      monthly_salary: emp.monthly_salary || 0,
      is_active: emp.is_active,
      notes: emp.notes || '',
    });
    setFormError(null);
    setIsEditOpen(true);
  };

  const openProfileModal = (emp: Employee) => {
    setCurrentEmployee(emp);
    setIsProfileOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      role: 'Order Taker',
      contact_number: '',
      email: '',
      joining_date: new Date().toISOString().substring(0, 10),
      monthly_salary: 0,
      is_active: true,
      notes: '',
    });
    setFormError(null);
  };

  // Filtered employees
  const filteredEmployees = employees.filter((emp) => {
    const matchesRole = selectedRole === 'All' || emp.role === selectedRole;
    const matchesSearch =
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employee_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.email && emp.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (emp.contact_number && emp.contact_number.includes(searchQuery));
    return matchesRole && matchesSearch;
  });

  const columns: Column<Employee>[] = [
    {
      key: 'employee_code',
      header: 'EMP ID',
      render: (row) => (
        <span className="font-mono font-semibold text-brand-600 dark:text-brand-400">
          {row.employee_code}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Employee Name',
      render: (row) => (
        <div>
          <button
            onClick={() => openProfileModal(row)}
            className="font-medium text-fg-primary hover:text-brand-500 hover:underline text-left"
          >
            {row.name}
          </button>
          {row.email && <div className="text-xs text-fg-muted">{row.email}</div>}
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => {
        const roleIcons = {
          'Order Taker': <UserCheck className="w-3.5 h-3.5 mr-1" />,
          Editor: <Scissors className="w-3.5 h-3.5 mr-1" />,
          Manager: <Shield className="w-3.5 h-3.5 mr-1" />,
        };
        return (
          <Badge variant="role" className="inline-flex items-center">
            {roleIcons[row.role]}
            {row.role}
          </Badge>
        );
      },
    },
    {
      key: 'contact_number',
      header: 'Contact',
      render: (row) => (
        <span className="text-xs text-fg-secondary">{row.contact_number || '—'}</span>
      ),
    },
    {
      key: 'joining_date',
      header: 'Joining Date',
      render: (row) => <span className="text-xs text-fg-secondary">{row.joining_date}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.is_active ? 'active' : 'inactive'}>
          {row.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      headerClassName: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openProfileModal(row)}
            title="View Profile"
            icon={<Eye className="w-4 h-4 text-fg-secondary" />}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditModal(row)}
            title="Edit Employee"
            icon={<Edit2 className="w-4 h-4 text-fg-secondary" />}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleToggleActive(row)}
            title={row.is_active ? 'Deactivate Employee' : 'Activate Employee'}
            icon={
              <Power
                className={`w-4 h-4 ${
                  row.is_active ? 'text-status-success' : 'text-fg-muted'
                }`}
              />
            }
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
          <h1 className="text-page-title text-fg-primary">Employee Management</h1>
          <p className="text-sm text-fg-secondary mt-0.5">
            Manage your Order Takers, Editors, and Managers in one unified system.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            onClick={() => {
              resetForm();
              setIsCreateOpen(true);
            }}
            icon={<Plus className="w-4 h-4" />}
          >
            Create Employee
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-bg-surface border border-border shadow-card">
        {/* Role Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['All', 'Order Taker', 'Editor', 'Manager'].map((role) => (
            <button
              key={role}
              onClick={() => handleRoleTabClick(role)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedRole === role
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-fg-secondary hover:text-fg-primary hover:bg-bg-secondary'
              }`}
            >
              {role === 'All' ? 'All Roles' : `${role}s`}
              {role !== 'All' && (
                <span className="ml-1.5 opacity-80">
                  ({employees.filter((e) => e.role === role).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search by name, ID, contact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredEmployees}
        keyExtractor={(e) => e.id}
        isLoading={isLoading}
        emptyTitle="No Employees Found"
        emptyDescription={
          searchQuery
            ? 'No employees match your search query.'
            : 'Start by creating your first employee (Order Taker, Editor, or Manager).'
        }
        emptyActionLabel="+ Add First Employee"
        onEmptyAction={() => {
          resetForm();
          setIsCreateOpen(true);
        }}
      />

      {/* CREATE EMPLOYEE MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add New Employee"
        description="Create an Order Taker, Editor, or Manager account."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateEmployee} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-status-danger/10 border border-status-danger/30 text-xs text-status-danger">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              required
              placeholder="e.g. Nimra Tariq"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />

            <Select
              label="Role"
              required
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as EmployeeRole })}
              options={[
                { value: 'Order Taker', label: 'Order Taker' },
                { value: 'Editor', label: 'Editor' },
                { value: 'Manager', label: 'Manager' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contact Number"
              placeholder="+92 300 1234567"
              value={formData.contact_number}
              onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="employee@pixelads.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Joining Date"
              type="date"
              required
              value={formData.joining_date}
              onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
            />

            <Input
              label="Monthly Salary (Optional)"
              type="number"
              step="any"
              placeholder="0.00"
              value={formData.monthly_salary || ''}
              onChange={(e) => setFormData({ ...formData, monthly_salary: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <Textarea
            label="Internal Notes (Optional)"
            placeholder="Add relevant notes about skills, experience, or shift timings..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_active_create"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded border-border text-brand-500 focus:ring-brand-500"
            />
            <label htmlFor="is_active_create" className="text-xs text-fg-primary font-medium cursor-pointer">
              Active status (Available in assignment dropdowns)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={formSubmitting}>
              Save Employee
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT EMPLOYEE MODAL */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit Employee (${currentEmployee?.employee_code})`}
        maxWidth="lg"
      >
        <form onSubmit={handleUpdateEmployee} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-status-danger/10 border border-status-danger/30 text-xs text-status-danger">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />

            <Select
              label="Role"
              required
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as EmployeeRole })}
              options={[
                { value: 'Order Taker', label: 'Order Taker' },
                { value: 'Editor', label: 'Editor' },
                { value: 'Manager', label: 'Manager' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contact Number"
              value={formData.contact_number}
              onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
            />

            <Input
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Joining Date"
              type="date"
              required
              value={formData.joining_date}
              onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
            />

            <Input
              label="Monthly Salary (Optional)"
              type="number"
              step="any"
              value={formData.monthly_salary || ''}
              onChange={(e) => setFormData({ ...formData, monthly_salary: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <Textarea
            label="Internal Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_active_edit"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded border-border text-brand-500 focus:ring-brand-500"
            />
            <label htmlFor="is_active_edit" className="text-xs text-fg-primary font-medium cursor-pointer">
              Active status
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" type="button" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={formSubmitting}>
              Update Employee
            </Button>
          </div>
        </form>
      </Modal>

      {/* VIEW PROFILE MODAL */}
      <Modal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        title="Employee Profile"
        maxWidth="md"
      >
        {currentEmployee && (
          <div className="space-y-5">
            <div className="flex items-center gap-4 pb-4 border-b border-border">
              <div className="w-14 h-14 rounded-2xl bg-brand-500/10 text-brand-600 flex items-center justify-center font-bold text-xl">
                {currentEmployee.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-lg font-bold text-fg-primary">{currentEmployee.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-xs font-semibold text-brand-500">
                    {currentEmployee.employee_code}
                  </span>
                  <Badge variant="role">{currentEmployee.role}</Badge>
                  <Badge variant={currentEmployee.is_active ? 'active' : 'inactive'}>
                    {currentEmployee.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-fg-muted block">Contact Number</span>
                <span className="text-fg-primary font-medium mt-0.5 block">
                  {currentEmployee.contact_number || 'Not provided'}
                </span>
              </div>
              <div>
                <span className="text-fg-muted block">Email Address</span>
                <span className="text-fg-primary font-medium mt-0.5 block">
                  {currentEmployee.email || 'Not provided'}
                </span>
              </div>
              <div>
                <span className="text-fg-muted block">Joining Date</span>
                <span className="text-fg-primary font-medium mt-0.5 block">
                  {currentEmployee.joining_date}
                </span>
              </div>
              <div>
                <span className="text-fg-muted block">Monthly Salary</span>
                <span className="text-fg-primary font-medium mt-0.5 block">
                  {currentEmployee.monthly_salary ? `PKR ${currentEmployee.monthly_salary.toLocaleString()}` : '—'}
                </span>
              </div>
            </div>

            {currentEmployee.notes && (
              <div className="p-3 rounded-lg bg-bg-secondary text-xs border border-border">
                <span className="text-fg-muted block font-medium mb-1">Notes:</span>
                <p className="text-fg-primary whitespace-pre-wrap">{currentEmployee.notes}</p>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setIsProfileOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
