import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Download,
  Calendar,
  DollarSign,
  Users,
  Search,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { getSupabaseClient } from '../../lib/supabase';
import { Payment, EmployeeRole } from '../../lib/types';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { useDateRange } from '../../context/DateRangeContext';
import { useCompanySettings } from '../../context/CompanySettingsContext';
import { exportToExcel } from '../../lib/exportUtils';

interface RolePaymentSummary {
  role: EmployeeRole;
  employeeCount: number;
  paymentCount: number;
  totalAmount: number;
  averagePerPayment: number;
}

export const PaymentReports: React.FC = () => {
  const { dateRange } = useDateRange();
  const { settings } = useCompanySettings();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPayments = async () => {
    setIsLoading(true);
    const client = getSupabaseClient();
    if (!client) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await client
        .from('payments')
        .select(`
          *,
          employee:employees(*)
        `)
        .gte('payment_date', dateRange.startDate.substring(0, 10))
        .lte('payment_date', dateRange.endDate.substring(0, 10))
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (err) {
      console.error('Failed to load payment reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [dateRange.startDate, dateRange.endDate]);

  // Aggregate by Role
  const roleMap: Record<
    EmployeeRole,
    { total: number; count: number; empIds: Set<string> }
  > = {
    'Order Taker': { total: 0, count: 0, empIds: new Set() },
    Editor: { total: 0, count: 0, empIds: new Set() },
    Manager: { total: 0, count: 0, empIds: new Set() },
  };

  payments.forEach((p) => {
    const role = p.employee?.role || 'Order Taker';
    if (roleMap[role]) {
      roleMap[role].total += Number(p.amount);
      roleMap[role].count += 1;
      if (p.employee_id) roleMap[role].empIds.add(p.employee_id);
    }
  });

  const roleSummaries: RolePaymentSummary[] = (
    ['Order Taker', 'Editor', 'Manager'] as EmployeeRole[]
  ).map((role) => {
    const data = roleMap[role];
    const avg = data.count > 0 ? data.total / data.count : 0;
    return {
      role,
      employeeCount: data.empIds.size,
      paymentCount: data.count,
      totalAmount: data.total,
      averagePerPayment: avg,
    };
  });

  const totalDisbursed = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  const chartData = roleSummaries.map((s) => ({
    name: `${s.role}s`,
    Total: s.totalAmount,
    Count: s.paymentCount,
  }));

  const handleExportExcel = () => {
    const exportData = payments.map((p) => ({
      'Payment Date': p.payment_date,
      'Employee Code': p.employee?.employee_code || '—',
      'Employee Name': p.employee?.name || '—',
      Role: p.employee?.role || '—',
      Amount: p.amount,
      'Payment Mode': p.payment_mode,
      'Reference #': p.reference_number || '—',
      Notes: p.notes || '—',
    }));
    exportToExcel(exportData, `Payment_Report_${dateRange.preset}`, 'Payments');
  };

  const roleColumns: Column<RolePaymentSummary>[] = [
    {
      key: 'role',
      header: 'Employee Role',
      render: (row) => <Badge variant="role">{row.role}s</Badge>,
    },
    {
      key: 'employeeCount',
      header: 'Beneficiary Count',
      render: (row) => (
        <span className="font-medium text-xs text-fg-primary">{row.employeeCount} employees</span>
      ),
    },
    {
      key: 'paymentCount',
      header: 'Payment Transactions',
      render: (row) => (
        <span className="font-semibold text-xs text-fg-primary">{row.paymentCount}</span>
      ),
    },
    {
      key: 'averagePerPayment',
      header: 'Average Transaction',
      render: (row) => (
        <span className="font-medium text-xs text-fg-primary">
          {settings.currency || 'PKR'}{' '}
          {row.averagePerPayment.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Total Disbursed',
      render: (row) => (
        <span className="font-bold text-fg-primary">
          {settings.currency || 'PKR'}{' '}
          {row.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-page-title text-fg-primary">Payment Reports</h1>
          <p className="text-sm text-fg-secondary mt-0.5">
            Role-wise financial disbursement reports, transaction counts, and averages.
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
        </div>
      </div>

      {/* Top Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-bg-surface border border-border shadow-card">
          <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted block mb-1">
            Total Disbursed in Scope
          </span>
          <div className="text-kpi text-fg-primary">
            {settings.currency || 'PKR'}{' '}
            {totalDisbursed.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="text-xs text-fg-secondary mt-1 block">
            Across {payments.length} total transactions
          </span>
        </div>

        <div className="p-5 rounded-xl bg-bg-surface border border-border shadow-card">
          <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted block mb-1">
            Transactions Recorded
          </span>
          <div className="text-kpi text-status-success">{payments.length}</div>
          <span className="text-xs text-fg-secondary mt-1 block">Filtered payment vouchers</span>
        </div>

        <div className="p-5 rounded-xl bg-bg-surface border border-border shadow-card">
          <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted block mb-1">
            Active Scope
          </span>
          <div className="text-lg font-bold text-fg-primary truncate mt-1">
            {dateRange.formattedLabel}
          </div>
          <span className="text-xs text-fg-secondary mt-1 block">Applied date range filter</span>
        </div>
      </div>

      {/* Role Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Role-Wise Disbursement Volume</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          {chartData.some((d) => d.Total > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <RechartsTooltip />
                <Bar dataKey="Total" fill="#7666C8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-fg-muted">
              No payments disbursed within the selected date range.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Summary Table */}
      <div className="space-y-3">
        <h3 className="text-section-title text-fg-primary">Role Summary Breakdown</h3>
        <DataTable
          columns={roleColumns}
          data={roleSummaries}
          keyExtractor={(r) => r.role}
          isLoading={isLoading}
          emptyTitle="No Payment Records"
          emptyDescription="Zero payments recorded for the selected scope."
        />
      </div>
    </div>
  );
};
