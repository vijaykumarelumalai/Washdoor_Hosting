// src/services/exportService.js
// Washdoor Multi-Format Export Service (Excel, PDF, CSV)
// Integrated with Immutable Audit Logging for Report Downloads

import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { logAuditEvent } from './auditService';

/**
 * Helper to trigger a browser file download from a Blob
 */
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

/**
 * 1. Export Data to CSV with UTF-8 BOM and Audit Logging
 */
export function exportToCsv({
  filename = `Washdoor_Report_${new Date().toISOString().slice(0, 10)}.csv`,
  data = [],
  columns = [],
  title = 'Washdoor Business Report',
  module = 'Smart Business Dashboard',
  tenant = 'Ranipet Store #1',
  actor = 'Store Staff (Live Counter Active)',
} = {}) {
  try {
    if (!data || data.length === 0) {
      throw new Error('No data records available to export.');
    }

    // Determine headers and accessors
    const cols = columns.length > 0
      ? columns
      : Object.keys(data[0] || {}).map((k) => ({ header: k, key: k }));

    // Header row
    const headers = cols.map((c) => `"${String(c.header).replace(/"/g, '""')}"`).join(',');

    // Data rows
    const rows = data.map((item) =>
      cols
        .map((c) => {
          let val = typeof c.accessor === 'function' ? c.accessor(item) : item[c.key];
          if (val === null || val === undefined) val = '';
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(',')
    );

    // Prepend UTF-8 BOM so Excel opens INR symbols and characters correctly
    const bom = '\uFEFF';
    const csvContent = [headers, ...rows].join('\r\n');
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });

    triggerDownload(blob, filename);

    // Record Audit Log Entry
    const auditRecord = logAuditEvent({
      action: `Report Exported (CSV)`,
      module,
      tenant,
      format: 'CSV',
      actor,
      recordCount: data.length,
      details: `Exported ${data.length} records to ${filename}. Module: ${module}. Tenant: ${tenant}.`,
      meta: { filename, title, recordCount: data.length },
    });

    return { success: true, count: data.length, filename, auditRecord };
  } catch (err) {
    console.error('exportToCsv failed:', err);
    throw err;
  }
}

/**
 * 2. Export Data to Excel (.xlsx) with Executive Summary & Audit Logging
 */
export function exportToExcel({
  filename = `Washdoor_Report_${new Date().toISOString().slice(0, 10)}.xlsx`,
  sheetName = 'Business Report',
  data = [],
  columns = [],
  title = 'Washdoor Business Report',
  summaryMetrics = null,
  module = 'Smart Business Dashboard',
  tenant = 'Ranipet Store #1',
  actor = 'Store Staff (Live Counter Active)',
} = {}) {
  try {
    if (!data || data.length === 0) {
      throw new Error('No data records available to export.');
    }

    const cols = columns.length > 0
      ? columns
      : Object.keys(data[0] || {}).map((k) => ({ header: k, key: k }));

    // Build worksheet arrays (AOA)
    const aoa = [];

    // Title & Audit Metadata Header
    aoa.push([`WASHOOR SMART BUSINESS REPORT - ${title.toUpperCase()}`]);
    aoa.push([`Tenant: ${tenant}`, `Generated: ${new Date().toLocaleString('en-IN')}`, `Operator: ${actor}`]);
    aoa.push([`Module: ${module}`, `Format: Microsoft Excel (.xlsx)`, `Audit Status: Verified & Logged`]);
    aoa.push([]);

    // Executive Summary Metrics (if provided)
    if (summaryMetrics) {
      aoa.push(['--- EXECUTIVE KPI SUMMARY ---']);
      if (summaryMetrics.todayRevenue !== undefined) {
        aoa.push(['Today Revenue', summaryMetrics.todayRevenue, 'Collected Today', summaryMetrics.todayCollected || 0]);
      }
      if (summaryMetrics.totalRevenue !== undefined) {
        aoa.push(['Total Lifetime Revenue', summaryMetrics.totalRevenue, 'Outstanding Balance', summaryMetrics.balanceDue || 0]);
      }
      if (summaryMetrics.efficiency !== undefined) {
        aoa.push(['Collection Efficiency', `${summaryMetrics.efficiency}%`, 'Active In-Shop Orders', summaryMetrics.activeOrders || 0]);
      }
      aoa.push([]);
    }

    // Column Headers
    aoa.push(cols.map((c) => c.header));

    // Data Rows
    data.forEach((item) => {
      const row = cols.map((c) => {
        let val = typeof c.accessor === 'function' ? c.accessor(item) : item[c.key];
        if (val === null || val === undefined) val = '';
        return val;
      });
      aoa.push(row);
    });

    // Create Worksheet
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Auto-fit column widths
    const colWidths = cols.map((c) => ({
      wch: Math.max(String(c.header).length + 4, 15),
    }));
    ws['!cols'] = [{ wch: 25 }, ...colWidths];

    // Create Workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));

    // Write binary buffer
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    triggerDownload(blob, filename);

    // Record Audit Log Entry
    const auditRecord = logAuditEvent({
      action: `Report Exported (Excel)`,
      module,
      tenant,
      format: 'EXCEL',
      actor,
      recordCount: data.length,
      details: `Generated and downloaded Excel workbook "${filename}" with ${data.length} records. Module: ${module}. Tenant: ${tenant}.`,
      meta: { filename, title, recordCount: data.length },
    });

    return { success: true, count: data.length, filename, auditRecord };
  } catch (err) {
    console.error('exportToExcel failed:', err);
    throw err;
  }
}

/**
 * 3. Export Data to Executive Business PDF (.pdf) with KPIs & Audit Logging
 */
export function exportToPdf({
  filename = `Washdoor_Report_${new Date().toISOString().slice(0, 10)}.pdf`,
  title = 'Washdoor Smart Business Dashboard Report',
  subtitle = 'Executive Management & Operational Summary',
  data = [],
  columns = [],
  summaryMetrics = null,
  module = 'Smart Business Dashboard',
  tenant = 'Ranipet Store #1',
  actor = 'Store Staff (Live Counter Active)',
  currencySymbol = '₹',
} = {}) {
  try {
    if (!data || data.length === 0) {
      throw new Error('No data records available to export.');
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;

    // Helper: Draw Header Bar
    const drawHeader = (pageNum) => {
      // Primary banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, pageWidth, 28, 'F');

      // Accent stripe
      doc.setFillColor(59, 130, 246); // blue-500
      doc.rect(0, 28, pageWidth, 2, 'F');

      // Brand Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text('WASHOOR • SMART BUSINESS MANAGEMENT DASHBOARD', margin, 12);

      // Subtitle & Tenant Info
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(
        `Tenant: ${tenant}  |  Module: ${module}  |  Generated: ${new Date().toLocaleString('en-IN')}`,
        margin,
        20
      );
    };

    // Helper: Draw Footer
    const drawFooter = (pageNum, totalPages) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Washdoor POS • Audit Trail Verified • Confidential Business Report • Operator: ${actor}`,
        margin,
        pageHeight - 8
      );
      doc.text(
        `Page ${pageNum} of ${totalPages}`,
        pageWidth - margin - 18,
        pageHeight - 8
      );
    };

    // Page 1: Header
    drawHeader(1);

    let currentY = 36;

    // Report Title & Badge
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(title, margin, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(subtitle, margin, currentY + 5);

    currentY += 12;

    // KPI Summary Cards (if summaryMetrics present)
    if (summaryMetrics) {
      const cardWidth = (contentWidth - 9) / 4;
      const cardHeight = 16;

      const kpis = [
        {
          label: "Today's Revenue",
          value: `${currencySymbol}${Number(summaryMetrics.todayRevenue || 0).toLocaleString()}`,
          color: [37, 99, 235], // Blue
        },
        {
          label: 'Collected Today',
          value: `${currencySymbol}${Number(summaryMetrics.todayCollected || 0).toLocaleString()}`,
          color: [22, 163, 74], // Green
        },
        {
          label: 'Outstanding Due',
          value: `${currencySymbol}${Number(summaryMetrics.balanceDue || 0).toLocaleString()}`,
          color: [220, 38, 38], // Red
        },
        {
          label: 'Efficiency Rate',
          value: `${summaryMetrics.efficiency || 95}%`,
          color: [147, 51, 234], // Purple
        },
      ];

      kpis.forEach((kpi, idx) => {
        const x = margin + idx * (cardWidth + 3);
        // Background card
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x, currentY, cardWidth, cardHeight, 2, 2, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(x, currentY, cardWidth, cardHeight, 2, 2, 'S');

        // Top accent line
        doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
        doc.rect(x + 2, currentY, cardWidth - 4, 1.2, 'F');

        // Label
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(kpi.label, x + 3, currentY + 6);

        // Value
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(kpi.value, x + 3, currentY + 12.5);
      });

      currentY += cardHeight + 8;
    }

    // Table Section
    const cols = columns.length > 0
      ? columns
      : [
          { header: 'Order ID', key: 'order_number', width: 28 },
          { header: 'Customer', key: 'customer_name', width: 38 },
          { header: 'Service', key: 'service', width: 34 },
          { header: 'Status', key: 'status', width: 24 },
          { header: 'Pieces', key: 'pieces', width: 16 },
          { header: 'Total', key: 'total', width: 22 },
          { header: 'Balance', key: 'balance', width: 20 },
        ];

    // Compute column widths proportionally to fit contentWidth
    const totalCustomWidth = cols.reduce((sum, c) => sum + (c.width || 25), 0);
    const colDefs = cols.map((c) => ({
      ...c,
      actualWidth: ((c.width || 25) / totalCustomWidth) * contentWidth,
    }));

    // Draw Table Header
    const drawTableHeader = (y) => {
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y, contentWidth, 7, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.line(margin, y + 7, margin + contentWidth, y + 7);

      let x = margin + 2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);

      colDefs.forEach((c) => {
        doc.text(String(c.header).toUpperCase(), x, y + 5);
        x += c.actualWidth;
      });
      return y + 7;
    };

    currentY = drawTableHeader(currentY);

    let pageNumber = 1;
    const rowHeight = 6.5;

    data.forEach((item, index) => {
      // Check for page overflow
      if (currentY + rowHeight > pageHeight - 16) {
        doc.addPage();
        pageNumber++;
        drawHeader(pageNumber);
        currentY = 34;
        currentY = drawTableHeader(currentY);
      }

      // Alternating row background
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, currentY, contentWidth, rowHeight, 'F');
      }

      doc.setDrawColor(241, 245, 249);
      doc.line(margin, currentY + rowHeight, margin + contentWidth, currentY + rowHeight);

      let x = margin + 2;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);

      colDefs.forEach((c) => {
        let val = typeof c.accessor === 'function' ? c.accessor(item) : item[c.key];
        if (val === null || val === undefined) val = '';
        // Truncate long strings to fit cell
        let strVal = String(val);
        if (strVal.length > 22 && c.actualWidth < 30) {
          strVal = strVal.slice(0, 19) + '...';
        }
        doc.text(strVal, x, currentY + 4.5);
        x += c.actualWidth;
      });

      currentY += rowHeight;
    });

    // Add footers across all generated pages
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      drawFooter(p, totalPages);
    }

    doc.save(filename);

    // Record Audit Log Entry
    const auditRecord = logAuditEvent({
      action: `Report Exported (PDF)`,
      module,
      tenant,
      format: 'PDF',
      actor,
      recordCount: data.length,
      details: `Generated and downloaded executive PDF report "${filename}" with ${data.length} records. Module: ${module}. Tenant: ${tenant}.`,
      meta: { filename, title, recordCount: data.length },
    });

    return { success: true, count: data.length, filename, auditRecord };
  } catch (err) {
    console.error('exportToPdf failed:', err);
    throw err;
  }
}
