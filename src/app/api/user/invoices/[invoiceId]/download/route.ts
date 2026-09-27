import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { User, Invoice } from '@/models';
import InvoiceItem from '@/models/InvoiceItem';
import mongoose from 'mongoose';
import { mixedIdFilter } from '@/lib/utils/mixed-id';
import PolarService from '@/lib/payment/polar';

/**
 * Download invoice as PDF
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await getConnection();

    // Find user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const { invoiceId } = await params;
    let invoiceItems: any[] = [];
    const isObjectId = mongoose.isValidObjectId(invoiceId);

    // Find invoice
    let invoice = await Invoice.findOne({
      ...(isObjectId ? { _id: invoiceId } : { 'metadata.polarCheckoutId': invoiceId }),
      userId: mixedIdFilter(user._id)
    });

    if (!invoice) {
      // Try fetching from Polar orders directly
      try {
        const polarResult = await PolarService.listOrders({ customerEmail: user.email });
        if (polarResult.success && polarResult.orders) {
          const order = polarResult.orders.find((o: any) => o.id === invoiceId || o.checkout_id === invoiceId);
          if (order) {
            // Mock invoice object
            invoice = {
              invoiceNumber: order.id.substring(0, 8).toUpperCase(),
              invoiceDate: new Date(order.created_at),
              createdAt: new Date(order.created_at),
              subtotal: order.amount / 100,
              taxAmount: (order.tax_amount || 0) / 100,
              amount: order.amount / 100,
              currency: order.currency.toUpperCase(),
              planName: order.product?.name || 'Subscription',
              billingCycle: order.product?.recurring_interval || 'one-time',
            };
          }
        }
      } catch (polarError) {
        console.error('Failed to fetch Polar order for download fallback:', polarError);
      }
    } else {
      // Get invoice items
      invoiceItems = await InvoiceItem.find({
        invoiceId: invoice._id
      });
    }

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const formatCurrency = (amount: number, currencyCode: string) => {
      const symbols: Record<string, string> = {
        USD: '$',
        GBP: '£',
        EUR: '€',
        INR: '₹',
        CAD: 'C$',
        AUD: 'A$',
      };
      const symbol = symbols[currencyCode.toUpperCase()] || (currencyCode.toUpperCase() + ' ');
      return `${symbol}${amount.toFixed(2)}`;
    };

    // Draw lime-green accent bar at top
    doc.setFillColor(132, 204, 22);
    doc.rect(0, 0, 210, 4, 'F');

    // Logo / Brand
    doc.setFillColor(132, 204, 22);
    doc.circle(25, 23, 3, 'F');
    
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('CV', 31, 25);
    doc.setTextColor(132, 204, 22);
    doc.text('circle', 43, 25);

    // Title RECEIPT (top right)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(132, 204, 22);
    doc.text('RECEIPT', 190, 25, { align: 'right' });

    // Company info (left)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Morigrid Labs Ltd.', 20, 38);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('London, United Kingdom', 20, 43);
    doc.text('support@buildairesume.com', 20, 48);

    // Metadata (right)
    const invoiceDateStr = new Date(invoice.invoiceDate || invoice.createdAt || new Date()).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Invoice No: ${invoice.invoiceNumber}`, 190, 38, { align: 'right' });
    doc.text(`Date: ${invoiceDateStr}`, 190, 43, { align: 'right' });
    doc.text(`Status: PAID`, 190, 48, { align: 'right' });

    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(20, 55, 190, 55);

    // Billed To (left)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text('BILLED TO:', 20, 68);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    const customerName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Valued Customer';
    doc.text(customerName, 20, 74);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(user.email, 20, 79);

    // Items table header
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(20, 90, 170, 10, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text('Item Description', 24, 96.5);
    doc.text('Qty', 130, 96.5, { align: 'center' });
    doc.text('Unit Price', 155, 96.5, { align: 'right' });
    doc.text('Amount', 186, 96.5, { align: 'right' });

    // Render items
    const itemsToRender = invoiceItems && invoiceItems.length > 0 ? invoiceItems : [{
      description: `${invoice.planName || 'AIResume Subscription'} (${invoice.billingCycle || 'one-time'})`,
      quantity: 1,
      unitPrice: invoice.subtotal || invoice.amount,
      amount: invoice.amount
    }];

    let currentY = 105;
    itemsToRender.forEach((item) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      
      const desc = item.description;
      const lines = doc.splitTextToSize(desc, 90);
      doc.text(lines, 24, currentY);
      
      doc.text(String(item.quantity || 1), 130, currentY, { align: 'center' });
      doc.text(formatCurrency(item.unitPrice || item.amount, invoice.currency), 155, currentY, { align: 'right' });
      doc.text(formatCurrency(item.amount, invoice.currency), 186, currentY, { align: 'right' });

      currentY += (lines.length * 5) + 3;
      
      doc.setDrawColor(241, 245, 249);
      doc.line(20, currentY - 2, 190, currentY - 2);
      currentY += 5;
    });

    // Summary section
    currentY = Math.max(currentY, 140);
    doc.setDrawColor(226, 232, 240);
    doc.line(20, currentY, 190, currentY);
    currentY += 8;

    const labelX = 145;
    const valueX = 186;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    
    doc.text('Subtotal:', labelX, currentY, { align: 'right' });
    doc.setTextColor(15, 23, 42);
    doc.text(formatCurrency(invoice.subtotal || invoice.amount, invoice.currency), valueX, currentY, { align: 'right' });
    currentY += 6;

    if (invoice.discountAmount && invoice.discountAmount > 0) {
      doc.setTextColor(100, 116, 139);
      doc.text('Discount:', labelX, currentY, { align: 'right' });
      doc.setTextColor(220, 38, 38);
      doc.text(`-${formatCurrency(invoice.discountAmount, invoice.currency)}`, valueX, currentY, { align: 'right' });
      currentY += 6;
    }

    if (invoice.taxAmount && invoice.taxAmount > 0) {
      doc.setTextColor(100, 116, 139);
      doc.text('Tax:', labelX, currentY, { align: 'right' });
      doc.setTextColor(15, 23, 42);
      doc.text(formatCurrency(invoice.taxAmount, invoice.currency), valueX, currentY, { align: 'right' });
      currentY += 6;
    }

    currentY += 2;
    doc.setDrawColor(226, 232, 240);
    doc.line(120, currentY, 190, currentY);
    currentY += 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('Total Paid:', labelX, currentY, { align: 'right' });
    doc.setTextColor(132, 204, 22);
    doc.text(formatCurrency(invoice.amount, invoice.currency), valueX, currentY, { align: 'right' });

    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text('Thank you for choosing AIResume!', 105, 270, { align: 'center' });
    doc.text('© 2026 Morigrid Labs Ltd. All rights reserved.', 105, 275, { align: 'center' });

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    });
  } catch (error: any) {
    console.error('Error downloading invoice:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
