import jsPDF from 'jspdf';

export interface InvoiceData {
  number: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  amountCents: number;
  client: {
    name: string;
    email?: string;
    company?: string;
    address?: string;
  };
  lineItems: Array<{
    description: string;
    qty: number;
    unitPriceCents: number;
    totalCents: number;
  }>;
  taxPercentage?: number;
  notes?: string;
  business?: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    logo?: string;
  };
}

// Apple-inspired color palette
const COLORS = {
  primary: '#0A84FF',      // iOS blue
  text: '#1D1D1F',         // Apple text
  secondary: '#6E6E73',    // Apple secondary text
  light: '#F5F5F7',        // Apple light background
  border: '#D2D2D7',       // Apple border
  accent: '#30D158',       // Success green
} as const;

/**
 * Generate PDF buffer for email attachments
 */
export function generateInvoicePDFBuffer(invoiceData: InvoiceData): Buffer {
  const pdf = generateInvoicePDF(invoiceData);
  const pdfOutput = pdf.output('arraybuffer');
  return Buffer.from(pdfOutput);
}

/**
 * Generate Apple-style PDF invoice
 */
export function generateInvoicePDF(invoiceData: InvoiceData): jsPDF {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Page dimensions
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

  let yPosition = margin;

  // Helper functions
  const addText = (text: string, x: number, y: number, options: {
    size?: number;
    style?: 'normal' | 'bold';
    align?: 'left' | 'center' | 'right';
    color?: string;
  } = {}) => {
    const { size = 10, style = 'normal', align = 'left', color = COLORS.text } = options;
    
    pdf.setFontSize(size);
    pdf.setFont('helvetica', style);
    pdf.setTextColor(color);
    
    pdf.text(text, x, y, { align });
  };

  const formatCurrency = (cents: number, currency: string): string => {
    const amount = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Apple-style header with subtle branding
  addText('INVOICE', margin, yPosition + 10, { 
    size: 28, 
    style: 'bold', 
    color: COLORS.primary 
  });
  
  addText(invoiceData.number, margin, yPosition + 20, { 
    size: 12, 
    color: COLORS.secondary 
  });

  // Business info (right side)
  const businessName = invoiceData.business?.name || 'ClientHandle';
  const businessEmail = invoiceData.business?.email || '';
  const businessPhone = invoiceData.business?.phone || '';
  
  addText(businessName, pageWidth - margin, yPosition + 10, { 
    size: 14, 
    style: 'bold', 
    align: 'right' 
  });
  addText('Professional Freelancer Tool', pageWidth - margin, yPosition + 18, { 
    size: 10, 
    color: COLORS.secondary, 
    align: 'right' 
  });
  
  if (businessEmail) {
    addText(businessEmail, pageWidth - margin, yPosition + 26, { 
      size: 9, 
      color: COLORS.secondary, 
      align: 'right' 
    });
  }

  yPosition += 50;

  // Subtle divider line
  pdf.setDrawColor(COLORS.border);
  pdf.setLineWidth(0.5);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 15;

  // Client details and dates in two columns
  // Left column - Bill To
  addText('Bill To:', margin, yPosition, { 
    size: 11, 
    style: 'bold', 
    color: COLORS.secondary 
  });
  yPosition += 8;
  
  addText(invoiceData.client.name, margin, yPosition, { 
    size: 12, 
    style: 'bold' 
  });
  yPosition += 6;
  
  if (invoiceData.client.company) {
    addText(invoiceData.client.company, margin, yPosition, { 
      size: 10, 
      color: COLORS.secondary 
    });
    yPosition += 6;
  }
  
  if (invoiceData.client.email) {
    addText(invoiceData.client.email, margin, yPosition, { 
      size: 10, 
      color: COLORS.secondary 
    });
    yPosition += 6;
  }

  // Right column - Dates
  const rightColumnX = pageWidth - margin - 80;
  let rightYPosition = yPosition - (invoiceData.client.company ? 26 : 20);
  
  addText('Issue Date:', rightColumnX, rightYPosition, { 
    size: 10, 
    color: COLORS.secondary 
  });
  addText(formatDate(invoiceData.issueDate), pageWidth - margin, rightYPosition, { 
    size: 10, 
    align: 'right' 
  });
  rightYPosition += 8;
  
  addText('Due Date:', rightColumnX, rightYPosition, { 
    size: 10, 
    color: COLORS.secondary 
  });
  addText(formatDate(invoiceData.dueDate), pageWidth - margin, rightYPosition, { 
    size: 10, 
    style: 'bold', 
    align: 'right' 
  });

  yPosition += 25;

  // Line items table with Apple-style spacing
  const tableStartY = yPosition;
  const colWidths = {
    description: contentWidth * 0.5,
    qty: contentWidth * 0.1,
    price: contentWidth * 0.2,
    total: contentWidth * 0.2,
  };

  // Table header with subtle background
  pdf.setFillColor(COLORS.light);
  pdf.rect(margin, yPosition - 3, contentWidth, 12, 'F');
  
  addText('Description', margin + 5, yPosition + 5, { 
    size: 10, 
    style: 'bold', 
    color: COLORS.secondary 
  });
  addText('Qty', margin + colWidths.description + 5, yPosition + 5, { 
    size: 10, 
    style: 'bold', 
    color: COLORS.secondary,
    align: 'right'
  });
  addText('Price', margin + colWidths.description + colWidths.qty + 5, yPosition + 5, { 
    size: 10, 
    style: 'bold', 
    color: COLORS.secondary,
    align: 'right'
  });
  addText('Total', pageWidth - margin - 5, yPosition + 5, { 
    size: 10, 
    style: 'bold', 
    color: COLORS.secondary,
    align: 'right'
  });

  yPosition += 15;

  // Table rows with alternating subtle backgrounds
  invoiceData.lineItems.forEach((item, index) => {
    // Subtle alternating row backgrounds
    if (index % 2 === 1) {
      pdf.setFillColor('#FAFAFC');
      pdf.rect(margin, yPosition - 3, contentWidth, 12, 'F');
    }

    addText(item.description, margin + 5, yPosition + 5, { size: 10 });
    addText(item.qty.toString(), margin + colWidths.description + 5, yPosition + 5, { 
      size: 10, 
      align: 'right' 
    });
    addText(formatCurrency(item.unitPriceCents, invoiceData.currency), 
      margin + colWidths.description + colWidths.qty + 5, yPosition + 5, { 
      size: 10, 
      align: 'right' 
    });
    addText(formatCurrency(item.totalCents, invoiceData.currency), 
      pageWidth - margin - 5, yPosition + 5, { 
      size: 10, 
      style: 'bold',
      align: 'right' 
    });

    yPosition += 12;
  });

  yPosition += 10;

  // Subtle divider
  pdf.setDrawColor(COLORS.border);
  pdf.line(margin + contentWidth * 0.6, yPosition, pageWidth - margin, yPosition);
  yPosition += 15;

  // Total section with Apple-style emphasis
  const totalSectionX = margin + contentWidth * 0.65;
  const subtotal = invoiceData.lineItems.reduce((sum, item) => sum + item.totalCents, 0);
  const taxAmount = invoiceData.taxPercentage ? (subtotal * invoiceData.taxPercentage) / 100 : 0;
  const total = subtotal + taxAmount;

  addText('Subtotal:', totalSectionX, yPosition, { 
    size: 11, 
    color: COLORS.secondary 
  });
  addText(formatCurrency(subtotal, invoiceData.currency), pageWidth - margin - 5, yPosition, { 
    size: 11, 
    align: 'right' 
  });
  yPosition += 10;

  // Tax line (only if tax percentage is set)
  if (invoiceData.taxPercentage && invoiceData.taxPercentage > 0) {
    addText(`Tax (${invoiceData.taxPercentage}%):`, totalSectionX, yPosition, { 
      size: 11, 
      color: COLORS.secondary 
    });
    addText(formatCurrency(taxAmount, invoiceData.currency), pageWidth - margin - 5, yPosition, { 
      size: 11, 
      align: 'right' 
    });
    yPosition += 10;
  }

  // Total with emphasis
  pdf.setDrawColor(COLORS.primary);
  pdf.setLineWidth(1);
  pdf.line(totalSectionX, yPosition - 2, pageWidth - margin, yPosition - 2);
  
  addText('Total:', totalSectionX, yPosition + 6, { 
    size: 14, 
    style: 'bold' 
  });
  addText(formatCurrency(total, invoiceData.currency), 
    pageWidth - margin - 5, yPosition + 6, { 
    size: 14, 
    style: 'bold', 
    color: COLORS.primary,
    align: 'right' 
  });

  yPosition += 25;

  // Notes section with Apple-style spacing
  if (invoiceData.notes) {
    addText('Notes:', margin, yPosition, { 
      size: 11, 
      style: 'bold', 
      color: COLORS.secondary 
    });
    yPosition += 8;
    
    // Split notes into lines for proper wrapping
    const noteLines = pdf.splitTextToSize(invoiceData.notes, contentWidth - 10);
    noteLines.forEach((line: string) => {
      addText(line, margin + 5, yPosition, { size: 10 });
      yPosition += 5;
    });
  }

  // Footer with subtle branding
  const footerY = pageHeight - 25;
  pdf.setDrawColor(COLORS.border);
  pdf.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
  
  addText('Generated with ClientHandle', pageWidth / 2, footerY, { 
    size: 8, 
    color: COLORS.secondary, 
    align: 'center' 
  });
  addText(`Created on ${new Date().toLocaleDateString()}`, pageWidth / 2, footerY + 5, { 
    size: 8, 
    color: COLORS.secondary, 
    align: 'center' 
  });

  return pdf;
}

/**
 * Download PDF invoice with Apple-style filename
 */
export function downloadInvoicePDF(invoiceData: InvoiceData): void {
  const pdf = generateInvoicePDF(invoiceData);
  const filename = `Invoice-${invoiceData.number}-${invoiceData.client.name.replace(/\s+/g, '-')}.pdf`;
  pdf.save(filename);
}

/**
 * Generate PDF as blob for upload/storage
 */
export function generateInvoicePDFBlob(invoiceData: InvoiceData): Blob {
  const pdf = generateInvoicePDF(invoiceData);
  return pdf.output('blob');
}

/**
 * Preview PDF in new tab
 */
export function previewInvoicePDF(invoiceData: InvoiceData): void {
  const pdf = generateInvoicePDF(invoiceData);
  const pdfUrl = pdf.output('bloburl');
  window.open(pdfUrl, '_blank');
}