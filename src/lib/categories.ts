// ==============================================================================
// OrderFlow Pro: Order & Payment Categories Management
// Persistent local storage cache with initial defaults & synchronization
// ==============================================================================

export const DEFAULT_ORDER_CATEGORIES = [
  'Video Editing',
  'Graphic Design',
  'Thumbnail Design',
  'Social Media Post',
  '3D Animation',
  'Banner / Poster',
  'Logo Design',
  'General',
];

export const DEFAULT_PAYMENT_CATEGORIES = [
  'Salary',
  'Advance Salary',
  'Bonus',
  'Overtime',
  'Commission',
  'Allowance',
  'Office Expense',
  'Equipment / Software',
  'Freelancer Fee',
  'Other',
];

const ORDER_CATEGORIES_KEY = 'orderflow_order_categories';
const PAYMENT_CATEGORIES_KEY = 'orderflow_payment_categories';

// ------------------------------------------------------------------------------
// ORDER CATEGORIES
// ------------------------------------------------------------------------------

export function getOrderCategories(): string[] {
  if (typeof window === 'undefined') return DEFAULT_ORDER_CATEGORIES;
  try {
    const raw = localStorage.getItem(ORDER_CATEGORIES_KEY);
    if (!raw) {
      localStorage.setItem(ORDER_CATEGORIES_KEY, JSON.stringify(DEFAULT_ORDER_CATEGORIES));
      return DEFAULT_ORDER_CATEGORIES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Merge with defaults so user always has standard options
      const combined = Array.from(new Set([...parsed, ...DEFAULT_ORDER_CATEGORIES]));
      return combined;
    }
  } catch (err) {
    console.error('Error reading order categories:', err);
  }
  return DEFAULT_ORDER_CATEGORIES;
}

export function addOrderCategory(newCategory: string): string[] {
  const trimmed = newCategory.trim();
  if (!trimmed) return getOrderCategories();

  const current = getOrderCategories();
  const exists = current.some((c) => c.toLowerCase() === trimmed.toLowerCase());
  if (exists) return current;

  const updated = [trimmed, ...current];
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(ORDER_CATEGORIES_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('Error saving order categories:', err);
    }
  }
  return updated;
}

export function deleteOrderCategory(categoryToDelete: string): string[] {
  const current = getOrderCategories();
  const updated = current.filter((c) => c.toLowerCase() !== categoryToDelete.toLowerCase().trim());
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(ORDER_CATEGORIES_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('Error deleting order category:', err);
    }
  }
  return updated;
}

// ------------------------------------------------------------------------------
// PAYMENT CATEGORIES
// ------------------------------------------------------------------------------

export function getPaymentCategories(): string[] {
  if (typeof window === 'undefined') return DEFAULT_PAYMENT_CATEGORIES;
  try {
    const raw = localStorage.getItem(PAYMENT_CATEGORIES_KEY);
    if (!raw) {
      localStorage.setItem(PAYMENT_CATEGORIES_KEY, JSON.stringify(DEFAULT_PAYMENT_CATEGORIES));
      return DEFAULT_PAYMENT_CATEGORIES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const combined = Array.from(new Set([...parsed, ...DEFAULT_PAYMENT_CATEGORIES]));
      return combined;
    }
  } catch (err) {
    console.error('Error reading payment categories:', err);
  }
  return DEFAULT_PAYMENT_CATEGORIES;
}

export function addPaymentCategory(newCategory: string): string[] {
  const trimmed = newCategory.trim();
  if (!trimmed) return getPaymentCategories();

  const current = getPaymentCategories();
  const exists = current.some((c) => c.toLowerCase() === trimmed.toLowerCase());
  if (exists) return current;

  const updated = [trimmed, ...current];
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(PAYMENT_CATEGORIES_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('Error saving payment categories:', err);
    }
  }
  return updated;
}

export function deletePaymentCategory(categoryToDelete: string): string[] {
  const current = getPaymentCategories();
  const updated = current.filter((c) => c.toLowerCase() !== categoryToDelete.toLowerCase().trim());
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(PAYMENT_CATEGORIES_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('Error deleting payment category:', err);
    }
  }
  return updated;
}
