import { jsPDF } from 'jspdf';
import type { Booking } from '../types';

export function generateReceiptPDF(booking: Booking): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Helper functions
  const formatMoney = (cents: number): string => `$${(cents / 100).toFixed(2)}`;
  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };
  const formatTime = (dateStr: string): string => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  let y = 20;
  const leftMargin = 20;
  const rightMargin = pageWidth - 20;
  const lineHeight = 7;

  // Company Header
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(34, 139, 34); // Green
  doc.text('SERYVO', pageWidth / 2, y, { align: 'center' });
  y += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('Premium Transportation Services', pageWidth / 2, y, { align: 'center' });
  y += 15;

  // Receipt Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Trip Receipt', pageWidth / 2, y, { align: 'center' });
  y += 15;

  // Horizontal line
  doc.setDrawColor(200);
  doc.line(leftMargin, y, rightMargin, y);
  y += 10;

  // Booking Details Section
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('Booking ID:', leftMargin, y);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text(booking.booking_id, leftMargin + 35, y);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('Date:', rightMargin - 80, y);
  doc.setTextColor(0);
  const tripDate = booking.completed_at || booking.created_at;
  doc.text(formatDate(tripDate), rightMargin - 60, y);
  y += lineHeight;

  doc.setTextColor(100);
  doc.text('Status:', leftMargin, y);
  doc.setTextColor(34, 139, 34);
  doc.setFont('helvetica', 'bold');
  doc.text('COMPLETED', leftMargin + 35, y);

  if (booking.completed_at) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('Time:', rightMargin - 80, y);
    doc.setTextColor(0);
    doc.text(formatTime(booking.completed_at), rightMargin - 60, y);
  }
  y += 15;

  // Route Section
  doc.setDrawColor(200);
  doc.line(leftMargin, y, rightMargin, y);
  y += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Trip Route', leftMargin, y);
  y += 10;

  // Pickup
  doc.setFillColor(34, 139, 34);
  doc.circle(leftMargin + 3, y - 1, 3, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('PICKUP', leftMargin + 10, y);
  y += lineHeight;
  doc.setTextColor(0);
  const pickupAddress = booking.legs[0]?.pickup.address_line || 'N/A';
  doc.text(pickupAddress, leftMargin + 10, y);
  y += 12;

  // Dropoff
  doc.setFillColor(220, 53, 69);
  doc.circle(leftMargin + 3, y - 1, 3, 'F');
  doc.setTextColor(100);
  doc.text('DROPOFF', leftMargin + 10, y);
  y += lineHeight;
  doc.setTextColor(0);
  const dropoffAddress = booking.legs[booking.legs.length - 1]?.dropoff.address_line || 'N/A';
  doc.text(dropoffAddress, leftMargin + 10, y);
  y += 15;

  // Service Details
  doc.setDrawColor(200);
  doc.line(leftMargin, y, rightMargin, y);
  y += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Service Details', leftMargin, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const details = [
    ['Service Type:', booking.service_type.charAt(0).toUpperCase() + booking.service_type.slice(1)],
    ['Passengers:', String(booking.passenger_count || 1)],
    ['Luggage:', String(booking.luggage_count || 0)],
  ];

  details.forEach(([label, value]) => {
    doc.setTextColor(100);
    doc.text(label, leftMargin, y);
    doc.setTextColor(0);
    doc.text(value, leftMargin + 40, y);
    y += lineHeight;
  });

  y += 5;

  // Fare Breakdown Section
  doc.setDrawColor(200);
  doc.line(leftMargin, y, rightMargin, y);
  y += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Fare Breakdown', leftMargin, y);
  y += 10;

  if (booking.price_breakdown) {
    const pb = booking.price_breakdown;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const fareItems: [string, number][] = [
      ['Base Fare', pb.base_fare.amount],
    ];

    if (pb.distance_fare) {
      fareItems.push(['Distance Charge', pb.distance_fare.amount]);
    }
    if (pb.time_fare) {
      fareItems.push(['Time Charge', pb.time_fare.amount]);
    }
    if (pb.extras_total && pb.extras_total.amount > 0) {
      fareItems.push(['Extras', pb.extras_total.amount]);
    }
    if (pb.tax_total) {
      fareItems.push(['Tax', pb.tax_total.amount]);
    }

    fareItems.forEach(([label, amount]) => {
      doc.setTextColor(100);
      doc.text(label, leftMargin, y);
      doc.setTextColor(0);
      doc.text(formatMoney(amount), rightMargin, y, { align: 'right' });
      y += lineHeight;
    });

    if (pb.discount_total && pb.discount_total.amount > 0) {
      doc.setTextColor(34, 139, 34);
      doc.text('Discount', leftMargin, y);
      doc.text('-' + formatMoney(pb.discount_total.amount), rightMargin, y, { align: 'right' });
      y += lineHeight;
    }

    y += 3;
    doc.setDrawColor(0);
    doc.line(leftMargin, y, rightMargin, y);
    y += 8;

    // Total
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Total', leftMargin, y);
    doc.setTextColor(34, 139, 34);
    doc.text(formatMoney(pb.grand_total.amount), rightMargin, y, { align: 'right' });
    y += 15;
  }

  // Payment Method
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('Payment Method:', leftMargin, y);
  doc.setTextColor(0);
  doc.text('Card ending in ****4242', leftMargin + 45, y);
  y += 20;

  // Footer
  doc.setDrawColor(200);
  doc.line(leftMargin, y, rightMargin, y);
  y += 10;

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('Thank you for riding with Seryvo!', pageWidth / 2, y, { align: 'center' });
  y += lineHeight;
  doc.setFontSize(8);
  doc.text('For questions about this trip, contact support@seryvo.com', pageWidth / 2, y, { align: 'center' });
  y += lineHeight;
  doc.text('or call 1-800-SERYVO (737-986)', pageWidth / 2, y, { align: 'center' });

  // Save the PDF
  doc.save(`seryvo-receipt-${booking.booking_id}.pdf`);
}

export function generateInvoicePDF(booking: Booking): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  const formatMoney = (cents: number): string => `$${(cents / 100).toFixed(2)}`;
  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  let y = 20;
  const leftMargin = 20;
  const rightMargin = pageWidth - 20;
  const lineHeight = 7;

  // Header with Invoice branding
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(34, 139, 34);
  doc.text('SERYVO', leftMargin, y);

  doc.setFontSize(24);
  doc.setTextColor(0);
  doc.text('INVOICE', rightMargin, y, { align: 'right' });
  y += 15;

  // Company info
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('Seryvo Transportation Inc.', leftMargin, y);
  y += 5;
  doc.text('123 Transport Ave, Suite 100', leftMargin, y);
  y += 5;
  doc.text('New York, NY 10001', leftMargin, y);
  y += 15;

  // Invoice details box
  doc.setFillColor(245, 245, 245);
  doc.rect(rightMargin - 80, y - 20, 80, 35, 'F');
  
  doc.setTextColor(100);
  doc.text('Invoice #:', rightMargin - 75, y - 10);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text(`INV-${booking.booking_id.slice(0, 8)}`, rightMargin - 40, y - 10);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('Date:', rightMargin - 75, y - 3);
  doc.setTextColor(0);
  doc.text(formatDate(booking.completed_at || booking.created_at), rightMargin - 55, y - 3);

  doc.setTextColor(100);
  doc.text('Due:', rightMargin - 75, y + 4);
  doc.setTextColor(0);
  doc.text('Paid', rightMargin - 55, y + 4);

  y += 20;

  // Bill To section
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100);
  doc.text('BILL TO:', leftMargin, y);
  y += 7;
  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');
  doc.text('Customer Account', leftMargin, y);
  y += 5;
  doc.setTextColor(100);
  doc.text(`Booking: ${booking.booking_id}`, leftMargin, y);
  y += 15;

  // Service table header
  doc.setFillColor(34, 139, 34);
  doc.rect(leftMargin, y, rightMargin - leftMargin, 8, 'F');
  doc.setTextColor(255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('DESCRIPTION', leftMargin + 3, y + 5.5);
  doc.text('AMOUNT', rightMargin - 3, y + 5.5, { align: 'right' });
  y += 12;

  // Service rows
  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');

  if (booking.price_breakdown) {
    const pb = booking.price_breakdown;
    const pickupAddr = booking.legs[0]?.pickup.address_line || 'Pickup';
    const dropoffAddr = booking.legs[booking.legs.length - 1]?.dropoff.address_line || 'Dropoff';

    // Main service line
    doc.text(`${booking.service_type.charAt(0).toUpperCase() + booking.service_type.slice(1)} Transportation`, leftMargin + 3, y);
    y += 5;
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`From: ${pickupAddr.substring(0, 50)}`, leftMargin + 3, y);
    y += 4;
    doc.text(`To: ${dropoffAddr.substring(0, 50)}`, leftMargin + 3, y);
    doc.setFontSize(9);
    doc.setTextColor(0);
    doc.text(formatMoney(pb.base_fare.amount + (pb.distance_fare?.amount || 0) + (pb.time_fare?.amount || 0)), rightMargin - 3, y - 2, { align: 'right' });
    y += 10;

    // Extras
    if (pb.extras_total && pb.extras_total.amount > 0) {
      doc.text('Additional Services & Extras', leftMargin + 3, y);
      doc.text(formatMoney(pb.extras_total.amount), rightMargin - 3, y, { align: 'right' });
      y += 8;
    }

    // Tax
    if (pb.tax_total) {
      doc.text('Tax', leftMargin + 3, y);
      doc.text(formatMoney(pb.tax_total.amount), rightMargin - 3, y, { align: 'right' });
      y += 8;
    }

    // Discount
    if (pb.discount_total && pb.discount_total.amount > 0) {
      doc.setTextColor(34, 139, 34);
      doc.text('Promotional Discount', leftMargin + 3, y);
      doc.text('-' + formatMoney(pb.discount_total.amount), rightMargin - 3, y, { align: 'right' });
      doc.setTextColor(0);
      y += 8;
    }

    y += 5;
    doc.setDrawColor(200);
    doc.line(leftMargin, y, rightMargin, y);
    y += 8;

    // Subtotal, Total
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL', leftMargin + 3, y);
    doc.setFontSize(12);
    doc.setTextColor(34, 139, 34);
    doc.text(formatMoney(pb.grand_total.amount), rightMargin - 3, y, { align: 'right' });
    y += 10;

    // Payment status
    doc.setFillColor(34, 139, 34);
    doc.rect(rightMargin - 40, y, 40, 10, 'F');
    doc.setTextColor(255);
    doc.setFontSize(10);
    doc.text('PAID', rightMargin - 20, y + 7, { align: 'center' });
  }

  y = 250;

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.setFont('helvetica', 'normal');
  doc.text('This invoice was generated automatically. For billing inquiries, contact billing@seryvo.com', pageWidth / 2, y, { align: 'center' });

  doc.save(`seryvo-invoice-${booking.booking_id}.pdf`);
}
