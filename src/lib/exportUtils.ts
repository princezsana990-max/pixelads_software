// ==============================================================================
// OrderFlow Pro: Export, PDF Generation & Excel Processing Utilities
// A4 Print-ready documents with professional enterprise styling
// ==============================================================================

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Invoice, CompanySettings, Employee, Attendance, Payment, Order } from './types';
import { format, parseISO } from 'date-fns';

// ------------------------------------------------------------------------------
// 1. BLANK EXCEL IMPORT TEMPLATE GENERATOR
// ------------------------------------------------------------------------------

export function generateEmptyOrderImportTemplate(): void {
  const headers = [
    [
      'Order Number',
      'Order Taker (Code or Name)',
      'Project Name',
      'PC Number',
      'Order Date (YYYY-MM-DD HH:mm)',
      'Delivery Date (YYYY-MM-DD HH:mm)',
      'Status (Pending/In Progress/Completed/Issue)',
      'Assigned Editor (Code or Name)',
      'Mistake Category (Optional)',
      'Mistake Details (Optional)',
      'Notes (Optional)',
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(headers);

  // Set column widths
  ws['!cols'] = [
    { wch: 18 },
    { wch: 28 },
    { wch: 24 },
    { wch: 14 },
    { wch: 24 },
    { wch: 24 },
    { wch: 16 },
    { wch: 28 },
    { wch: 24 },
    { wch: 30 },
    { wch: 24 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Standard Template');
  XLSX.writeFile(wb, 'OrderFlow_Standard_Import_Template.xlsx');
}

export function generateLegacyOrderImportTemplate(): void {
  const headers = [
    [
      'DATE',
      'TIME',
      'PROJECT NAME',
      'PC NO',
      'DELIVERY TIME',
      'STATUS',
      'MISTAKE',
      'EDITOR',
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(headers);

  ws['!cols'] = [
    { wch: 14 },
    { wch: 10 },
    { wch: 30 },
    { wch: 10 },
    { wch: 16 },
    { wch: 14 },
    { wch: 24 },
    { wch: 18 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Agency Old Format');
  XLSX.writeFile(wb, 'Agency_Old_Format_Template.xlsx');
}

// ------------------------------------------------------------------------------
// 2. EXCEL EXPORT HELPERS
// ------------------------------------------------------------------------------

export function exportToExcel(data: Record<string, any>[], filename: string, sheetName: string = 'Sheet1') {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ------------------------------------------------------------------------------
// 3. PROFESSIONAL A4 INVOICE PDF GENERATOR
// ------------------------------------------------------------------------------

export function generateInvoicePDF(invoice: Invoice, company: Partial<CompanySettings>) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  let currentY = margin;

  // Header Background Accent bar
  doc.setFillColor(118, 102, 200); // Brand primary #7666C8
  doc.rect(margin, currentY, pageWidth - margin * 2, 3, 'F');
  currentY += 8;

  // Company Name & Invoice Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(36, 35, 51); // #242333
  doc.text(company.company_name || 'Pixelads / OrderFlow Pro', margin, currentY);

  doc.setFontSize(20);
  doc.setTextColor(118, 102, 200);
  doc.text('INVOICE', pageWidth - margin, currentY, { align: 'right' });
  currentY += 7;

  // Company details & Invoice Meta
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(119, 117, 138); // #77758A

  const companyDetails = [
    company.address || '',
    company.contact_number ? `Phone: ${company.contact_number}` : '',
    company.email ? `Email: ${company.email}` : '',
    company.website ? `Web: ${company.website}` : '',
  ].filter(Boolean);

  let compY = currentY;
  companyDetails.forEach((line) => {
    doc.text(line, margin, compY);
    compY += 4.5;
  });

  // Invoice Number, Date, Due Date Box
  const metaX = pageWidth - margin;
  let metaY = currentY;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(36, 35, 51);
  doc.text(`Invoice No: ${invoice.invoice_number}`, metaX, metaY, { align: 'right' });
  metaY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(119, 117, 138);
  doc.text(`Invoice Date: ${invoice.invoice_date}`, metaX, metaY, { align: 'right' });
  metaY += 4.5;
  doc.text(`Due Date: ${invoice.due_date}`, metaX, metaY, { align: 'right' });
  metaY += 4.5;
  doc.text(`Status: ${invoice.status.toUpperCase()}`, metaX, metaY, { align: 'right' });

  currentY = Math.max(compY, metaY) + 6;

  // Divider Line
  doc.setDrawColor(231, 229, 239);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 6;

  // Bill To Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(118, 102, 200);
  doc.text('BILLED TO:', margin, currentY);
  currentY += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(36, 35, 51);
  doc.text(invoice.customer_name, margin, currentY);
  currentY += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(119, 117, 138);
  if (invoice.customer_address) {
    doc.text(invoice.customer_address, margin, currentY);
    currentY += 4.5;
  }
  if (invoice.customer_contact) {
    doc.text(`Contact: ${invoice.customer_contact}`, margin, currentY);
    currentY += 4.5;
  }
  currentY += 4;

  // Table of Items
  const tableData = (invoice.items || []).map((item, index) => [
    (index + 1).toString(),
    item.item_description,
    item.quantity.toString(),
    `${invoice.currency} ${item.unit_price.toFixed(2)}`,
    item.discount > 0 ? `${invoice.currency} ${item.discount.toFixed(2)}` : '—',
    `${invoice.currency} ${item.total.toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Item Description', 'Qty', 'Unit Price', 'Discount', 'Total']],
    body: tableData.length > 0 ? tableData : [['1', 'Service / Products Rendered', '1', '0.00', '0.00', '0.00']],
    theme: 'grid',
    headStyles: {
      fillColor: [118, 102, 200],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      textColor: [36, 35, 51],
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [248, 247, 252],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 26, halign: 'right' },
      4: { cellWidth: 22, halign: 'right' },
      5: { cellWidth: 28, halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;
  currentY = finalY;

  // Totals Section on the Right
  const totalsX = pageWidth - margin - 75;
  const totalsValX = pageWidth - margin;

  const renderTotalRow = (label: string, value: string, isBold: boolean = false) => {
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(isBold ? 11 : 9);
    doc.setTextColor(36, 35, 51);
    doc.text(label, totalsX, currentY);
    doc.text(value, totalsValX, currentY, { align: 'right' });
    currentY += 5.5;
  };

  renderTotalRow('Subtotal:', `${invoice.currency} ${invoice.subtotal.toFixed(2)}`);
  if (invoice.discount > 0) {
    renderTotalRow('Discount:', `-${invoice.currency} ${invoice.discount.toFixed(2)}`);
  }
  if (invoice.tax_amount > 0) {
    renderTotalRow(`Tax (${invoice.tax_rate}%):`, `${invoice.currency} ${invoice.tax_amount.toFixed(2)}`);
  }
  currentY += 1;
  doc.setDrawColor(231, 229, 239);
  doc.line(totalsX, currentY, pageWidth - margin, currentY);
  currentY += 5;

  renderTotalRow('Grand Total:', `${invoice.currency} ${invoice.grand_total.toFixed(2)}`, true);
  renderTotalRow('Amount Paid:', `${invoice.currency} ${invoice.amount_paid.toFixed(2)}`);
  renderTotalRow('Balance Due:', `${invoice.currency} ${invoice.balance_due.toFixed(2)}`, true);

  // Terms and Notes on the Left
  const bottomSectionY = finalY;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(118, 102, 200);
  doc.text('Terms & Notes:', margin, bottomSectionY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(119, 117, 138);
  const termsText = invoice.terms || 'Payment is due by the due date indicated. Thank you for your business!';
  doc.text(doc.splitTextToSize(termsText, 85), margin, bottomSectionY + 4.5);

  if (invoice.notes) {
    doc.text(doc.splitTextToSize(`Notes: ${invoice.notes}`, 85), margin, bottomSectionY + 18);
  }

  // Stamp and Signature designated boxes
  const signY = pageHeight - 40;
  doc.setDrawColor(200, 198, 210);
  doc.setLineDashPattern([2, 2], 0);

  // Signature box
  doc.line(margin + 5, signY, margin + 55, signY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(119, 117, 138);
  doc.text('Authorized Signature', margin + 30, signY + 4, { align: 'center' });

  // Stamp box
  doc.line(pageWidth - margin - 55, signY, pageWidth - margin - 5, signY);
  doc.text('Company Stamp', pageWidth - margin - 30, signY + 4, { align: 'center' });

  // PDF Footer
  doc.setFontSize(7.5);
  doc.setTextColor(160, 158, 175);
  const footerText = company.pdf_footer_text || 'Generated by OrderFlow Pro — Enterprise Order Management & Analytics';
  doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });

  doc.save(`${invoice.invoice_number}.pdf`);
}

// ------------------------------------------------------------------------------
// 4. MONTHLY ATTENDANCE SHEET PDF GENERATOR
// ------------------------------------------------------------------------------

export function generateAttendancePDF(
  employee: Employee,
  monthYearStr: string, // e.g. "February 2026"
  daysCount: number,
  attendanceRecords: Attendance[],
  company: Partial<CompanySettings>
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  let currentY = margin;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(36, 35, 51);
  doc.text(company.company_name || 'Pixelads / OrderFlow Pro', margin, currentY);
  currentY += 7;

  doc.setFontSize(14);
  doc.setTextColor(118, 102, 200);
  doc.text(`Monthly Attendance Sheet — ${monthYearStr}`, margin, currentY);
  currentY += 8;

  // Employee Info Card
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(36, 35, 51);
  doc.text(`Employee: ${employee.name} (${employee.employee_code})`, margin, currentY);
  doc.text(`Role: ${employee.role}`, pageWidth - margin, currentY, { align: 'right' });
  currentY += 6;

  // Attendance Statistics
  const presentCount = attendanceRecords.filter((a) => a.is_present).length;
  const absentCount = daysCount - presentCount;
  const attendanceRate = daysCount > 0 ? ((presentCount / daysCount) * 100).toFixed(1) : '0.0';

  doc.text(`Calendar Days: ${daysCount} | Present: ${presentCount} | Absent: ${absentCount} | Attendance Rate: ${attendanceRate}%`, margin, currentY);
  currentY += 8;

  // Days Grid
  const attendanceMap = new Map<string, boolean>();
  attendanceRecords.forEach((r) => attendanceMap.set(r.attendance_date, r.is_present));

  const tableData: any[] = [];
  for (let day = 1; day <= daysCount; day++) {
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    // Construct YYYY-MM-DD
    const dateStr = `${monthYearStr.split(' ')[1]}-${monthYearStr.startsWith('Jan') ? '01' : '02'}-${dayStr}`;
    const isPresent = attendanceMap.get(dateStr) ?? false;
    tableData.push([
      `Day ${day}`,
      isPresent ? 'PRESENT (ON)' : 'ABSENT (OFF)',
      isPresent ? 'Normal Working Day' : '—',
    ]);
  }

  autoTable(doc, {
    startY: currentY,
    head: [['Day', 'Attendance Status', 'Notes']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [118, 102, 200],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
    },
    margin: { left: margin, right: margin },
  });

  doc.save(`Attendance_${employee.employee_code}_${monthYearStr.replace(' ', '_')}.pdf`);
}
