// ==============================================================================
// OrderFlow Pro: Core Analytics & Performance Calculation Engine
// Strictly follows mathematical definitions from Section 11 of the specification.
// Safe zero-division handling with descriptive metric explanations.
// ==============================================================================

import { differenceInCalendarDays, parseISO, format } from 'date-fns';
import {
  Order,
  Employee,
  OrderMistake,
  OrderTakerMetrics,
  EditorMetrics,
  MistakeCategoryStat,
} from './types';

export interface MetricValue {
  value: number;
  formatted: string;
  display: string;
  isZeroDenominator?: boolean;
}

export function formatMetric(value: number, decimals: number = 1, isPercentage: boolean = false): MetricValue {
  if (isNaN(value) || !isFinite(value)) {
    return { value: 0, formatted: '0.0', display: '—', isZeroDenominator: true };
  }
  const formatted = value.toFixed(decimals);
  return {
    value,
    formatted,
    display: isPercentage ? `${formatted}%` : formatted,
    isZeroDenominator: false,
  };
}

/**
 * Calculates calendar days between two dates inclusive.
 * Defaults to at least 1 calendar day to prevent divide-by-zero.
 */
export function getCalendarDays(startDateStr?: string, endDateStr?: string): number {
  if (!startDateStr || !endDateStr) return 1;
  try {
    const start = parseISO(startDateStr);
    const end = parseISO(endDateStr);
    const days = Math.abs(differenceInCalendarDays(end, start)) + 1;
    return Math.max(1, days);
  } catch {
    return 1;
  }
}

/**
 * Order Taker Performance Calculations
 */
export function calculateOrderTakerMetrics(
  orderTaker: Employee,
  orders: Order[],
  calendarDays: number
): OrderTakerMetrics {
  // Filter orders created by this Order Taker
  const userOrders = orders.filter((o) => o.order_taker_id === orderTaker.id);
  const totalOrders = userOrders.length;

  const completedOrders = userOrders.filter((o) => o.status === 'Completed').length;
  const pendingOrders = userOrders.filter((o) => o.status === 'Pending').length;
  const inProgressOrders = userOrders.filter((o) => o.status === 'In Progress').length;
  const issueOrders = userOrders.filter((o) => o.status === 'Issue').length;

  // Active Working Days: Number of distinct calendar dates on which this employee created at least one order
  const distinctOrderDates = new Set(
    userOrders.map((o) => {
      try {
        return format(parseISO(o.order_date), 'yyyy-MM-dd');
      } catch {
        return o.order_date.substring(0, 10);
      }
    })
  );
  const activeWorkingDays = distinctOrderDates.size;

  // Mistakes analysis: collect all mistakes recorded on orders created by this order taker
  const mistakeIncidents: string[] = [];
  let totalMistakeIncidents = 0;

  userOrders.forEach((o) => {
    if (o.mistakes && o.mistakes.length > 0) {
      o.mistakes.forEach((m) => {
        totalMistakeIncidents += 1;
        mistakeIncidents.push(`${m.category_name}: ${m.details}`);
      });
    }
  });

  // Editor assignments breakdown: which editors were assigned to this order taker's projects
  const editorAssignments: Record<string, number> = {};
  userOrders.forEach((o) => {
    const editorName = o.assigned_editor?.name || 'Unassigned';
    editorAssignments[editorName] = (editorAssignments[editorName] || 0) + 1;
  });

  // Safe mathematical formulas:
  // 1. Avg Orders Per Calendar Day = Total Orders ÷ Calendar Days
  const avgOrdersPerCalendarDay = calendarDays > 0 ? totalOrders / calendarDays : 0;

  // 2. Avg Orders Per Active Working Day = Total Orders ÷ Active Working Days
  const avgOrdersPerActiveWorkingDay = activeWorkingDays > 0 ? totalOrders / activeWorkingDays : 0;

  // 3. Avg Completed Orders Per Day = Completed Orders ÷ Calendar Days
  const avgCompletedOrdersPerDay = calendarDays > 0 ? completedOrders / calendarDays : 0;

  // 4. Completion Rate = Completed Orders ÷ Total Orders × 100
  const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

  // 5. Issue Rate = Issue Orders ÷ Total Orders × 100
  const issueRate = totalOrders > 0 ? (issueOrders / totalOrders) * 100 : 0;

  // 6. Mistakes Per 100 Orders = Total Mistakes ÷ Total Orders × 100
  const mistakesPer100Orders = totalOrders > 0 ? (totalMistakeIncidents / totalOrders) * 100 : 0;

  // 7. Average Mistakes Per Order = Total Mistakes ÷ Total Orders
  const avgMistakesPerOrder = totalOrders > 0 ? totalMistakeIncidents / totalOrders : 0;

  return {
    employeeId: orderTaker.id,
    employeeName: orderTaker.name,
    employeeCode: orderTaker.employee_code,
    totalOrders,
    completedOrders,
    pendingOrders,
    inProgressOrders,
    issueOrders,
    calendarDays,
    activeWorkingDays,
    avgOrdersPerCalendarDay,
    avgOrdersPerActiveWorkingDay,
    avgCompletedOrdersPerDay,
    completionRate,
    issueRate,
    totalMistakes: totalMistakeIncidents,
    mistakesPer100Orders,
    avgMistakesPerOrder,
    mistakeDetails: mistakeIncidents,
    editorAssignments,
  };
}

/**
 * Editor Performance Calculations
 * Calculates editor workload using actual assignment records, not the person who created the order.
 */
export function calculateEditorMetrics(
  editor: Employee,
  orders: Order[],
  calendarDays: number
): EditorMetrics {
  // Assigned to this editor
  const assignedOrders = orders.filter((o) => o.assigned_editor_id === editor.id);
  const totalAssignedOrders = assignedOrders.length;

  const completedOrders = assignedOrders.filter((o) => o.status === 'Completed').length;
  const pendingOrders = assignedOrders.filter((o) => o.status === 'Pending').length;
  const inProgressOrders = assignedOrders.filter((o) => o.status === 'In Progress').length;
  const issueOrders = assignedOrders.filter((o) => o.status === 'Issue').length;

  // Active Working Days: Distinct dates on which this editor had an order assigned or completed
  const activeDates = new Set<string>();
  assignedOrders.forEach((o) => {
    try {
      activeDates.add(format(parseISO(o.order_date), 'yyyy-MM-dd'));
      if (o.completed_at) {
        activeDates.add(format(parseISO(o.completed_at), 'yyyy-MM-dd'));
      }
    } catch {
      // Fallback
    }
  });
  const activeWorkingDays = activeDates.size;

  // Mistakes on orders handled by this editor
  const mistakeIncidents: string[] = [];
  let totalMistakes = 0;
  assignedOrders.forEach((o) => {
    if (o.mistakes && o.mistakes.length > 0) {
      o.mistakes.forEach((m) => {
        totalMistakes += 1;
        mistakeIncidents.push(`${m.category_name}: ${m.details}`);
      });
    }
  });

  // Order Takers breakdown: count of orders from each Order Taker handled by this editor
  const orderTakerAssignments: Record<string, number> = {};
  assignedOrders.forEach((o) => {
    const otName = o.order_taker?.name || 'Unknown';
    orderTakerAssignments[otName] = (orderTakerAssignments[otName] || 0) + 1;
  });

  // Calculate Average Completion Turnaround Time (hours)
  let totalCompletionHours = 0;
  let completedWithTimestamps = 0;
  assignedOrders.forEach((o) => {
    if (o.status === 'Completed' && o.completed_at && o.order_date) {
      try {
        const orderTime = parseISO(o.order_date).getTime();
        const finishTime = parseISO(o.completed_at).getTime();
        const diffHours = (finishTime - orderTime) / (1000 * 60 * 60);
        if (diffHours >= 0) {
          totalCompletionHours += diffHours;
          completedWithTimestamps += 1;
        }
      } catch {
        // ignore invalid dates
      }
    }
  });

  const avgCompletionTimeHours =
    completedWithTimestamps > 0 ? totalCompletionHours / completedWithTimestamps : null;

  const avgOrdersPerDay = calendarDays > 0 ? totalAssignedOrders / calendarDays : 0;
  const avgOrdersPerActiveDay = activeWorkingDays > 0 ? totalAssignedOrders / activeWorkingDays : 0;
  const completionRate = totalAssignedOrders > 0 ? (completedOrders / totalAssignedOrders) * 100 : 0;
  const mistakesPer100AssignedOrders =
    totalAssignedOrders > 0 ? (totalMistakes / totalAssignedOrders) * 100 : 0;

  return {
    editorId: editor.id,
    editorName: editor.name,
    editorCode: editor.employee_code,
    totalAssignedOrders,
    completedOrders,
    pendingOrders,
    inProgressOrders,
    issueOrders,
    calendarDays,
    activeWorkingDays,
    avgOrdersPerDay,
    avgOrdersPerActiveDay,
    completionRate,
    totalMistakes,
    mistakesPer100AssignedOrders,
    avgCompletionTimeHours,
    mistakeDetails: mistakeIncidents,
    orderTakerAssignments,
  };
}

/**
 * Top 5 and Top 10 Mistake Categories Analytics
 */
export function calculateMistakeAnalytics(orders: Order[]): {
  categoryStats: MistakeCategoryStat[];
  top5: MistakeCategoryStat[];
  top10: MistakeCategoryStat[];
  totalMistakesCount: number;
  ordersWithMistakesCount: number;
} {
  const categoryCounts: Record<string, { occurrences: number; orderIds: Set<string> }> = {};
  let totalMistakesCount = 0;
  const uniqueOrdersWithMistakes = new Set<string>();

  orders.forEach((o) => {
    if (o.mistakes && o.mistakes.length > 0) {
      uniqueOrdersWithMistakes.add(o.id);
      o.mistakes.forEach((m) => {
        totalMistakesCount += 1;
        const cat = m.category_name || 'Other';
        if (!categoryCounts[cat]) {
          categoryCounts[cat] = { occurrences: 0, orderIds: new Set() };
        }
        categoryCounts[cat].occurrences += 1;
        categoryCounts[cat].orderIds.add(o.id);
      });
    }
  });

  const categoryStats: MistakeCategoryStat[] = Object.keys(categoryCounts).map((cat) => {
    const data = categoryCounts[cat];
    const percentage = totalMistakesCount > 0 ? (data.occurrences / totalMistakesCount) * 100 : 0;
    return {
      category: cat,
      occurrences: data.occurrences,
      affectedOrdersCount: data.orderIds.size,
      percentageOfTotal: Number(percentage.toFixed(1)),
    };
  });

  // Sort descending by occurrences
  categoryStats.sort((a, b) => b.occurrences - a.occurrences);

  return {
    categoryStats,
    top5: categoryStats.slice(0, 5),
    top10: categoryStats.slice(0, 10),
    totalMistakesCount,
    ordersWithMistakesCount: uniqueOrdersWithMistakes.size,
  };
}

/**
 * Explanatory tooltips for the exact formulas used
 */
export const FORMULA_TOOLTIPS = {
  avgOrdersPerCalendarDay: 'Total Orders ÷ Number of calendar days in the selected date range.',
  avgOrdersPerActiveWorkingDay: 'Total Orders ÷ Distinct calendar dates on which this employee created at least one order.',
  avgCompletedOrdersPerDay: 'Completed Orders ÷ Number of calendar days in the selected range.',
  completionRate: 'Completed Orders ÷ Total Orders × 100.',
  issueRate: 'Issue Orders ÷ Total Orders × 100.',
  mistakesPer100Orders: 'Total recorded mistake incidents ÷ Total Orders × 100.',
  avgMistakesPerOrder: 'Total recorded mistake incidents ÷ Total Orders.',
  editorTurnaround: 'Average elapsed hours between order creation and marked completion.',
};
