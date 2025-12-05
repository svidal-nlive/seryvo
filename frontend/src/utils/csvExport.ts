/**
 * CSV Export Utility
 * Provides functions to export data to CSV format and trigger downloads.
 */

type CsvValue = string | number | boolean | null | undefined;

interface ExportColumn<T> {
  key: keyof T | string;
  header: string;
  formatter?: (value: any, row: T) => string;
}

/**
 * Escapes a value for CSV output
 */
function escapeCsvValue(value: CsvValue): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  // If the value contains quotes, commas, or newlines, wrap in quotes and escape internal quotes
  if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

/**
 * Converts an array of objects to CSV format
 */
export function convertToCSV<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn<T>[]
): string {
  if (data.length === 0) {
    return columns.map((col) => escapeCsvValue(col.header)).join(',');
  }

  // Header row
  const headerRow = columns.map((col) => escapeCsvValue(col.header)).join(',');

  // Data rows
  const dataRows = data.map((row) => {
    return columns
      .map((col) => {
        const key = col.key as string;
        const rawValue = key.includes('.') 
          ? key.split('.').reduce((obj, k) => obj?.[k], row as any)
          : row[key];
        
        const value = col.formatter 
          ? col.formatter(rawValue, row) 
          : rawValue;
        
        return escapeCsvValue(value);
      })
      .join(',');
  });

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Triggers a download of CSV content
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Exports data to a CSV file and triggers download
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string
): void {
  const csvContent = convertToCSV(data, columns);
  downloadCSV(csvContent, filename);
}

// ---- Pre-configured export functions for common data types ----

export function exportBookingsToCSV(bookings: any[]): void {
  exportToCSV(
    bookings,
    [
      { key: 'booking_id', header: 'Booking ID' },
      { key: 'status', header: 'Status' },
      { key: 'client_id', header: 'Client ID' },
      { key: 'driver_id', header: 'Driver ID' },
      { key: 'service_type', header: 'Service Type' },
      { 
        key: 'pickup', 
        header: 'Pickup', 
        formatter: (_, row) => row.legs?.[0]?.pickup?.address_line || '' 
      },
      { 
        key: 'dropoff', 
        header: 'Dropoff', 
        formatter: (_, row) => row.legs?.[row.legs.length - 1]?.dropoff?.address_line || '' 
      },
      { key: 'passenger_count', header: 'Passengers' },
      { key: 'luggage_count', header: 'Luggage' },
      { 
        key: 'total', 
        header: 'Total ($)', 
        formatter: (_, row) => ((row.price_breakdown?.grand_total?.amount || 0) / 100).toFixed(2) 
      },
      { key: 'created_at', header: 'Created At' },
      { key: 'requested_pickup_at', header: 'Pickup Time' },
    ],
    `bookings_export_${new Date().toISOString().split('T')[0]}.csv`
  );
}

export function exportUsersToCSV(users: any[]): void {
  exportToCSV(
    users,
    [
      { key: 'id', header: 'User ID' },
      { key: 'full_name', header: 'Full Name' },
      { key: 'email', header: 'Email' },
      { key: 'phone', header: 'Phone' },
      { key: 'role', header: 'Role' },
      { 
        key: 'status', 
        header: 'Status', 
        formatter: (_, row) => row.core_status || row.status || 'active' 
      },
      { key: 'created_at', header: 'Created At' },
    ],
    `users_export_${new Date().toISOString().split('T')[0]}.csv`
  );
}

export function exportEarningsToCSV(earnings: any[]): void {
  exportToCSV(
    earnings,
    [
      { key: 'date', header: 'Date' },
      { key: 'booking_id', header: 'Booking ID' },
      { key: 'driver_id', header: 'Driver ID' },
      { 
        key: 'earnings', 
        header: 'Earnings ($)', 
        formatter: (val) => (val / 100).toFixed(2) 
      },
      { 
        key: 'platform_fee', 
        header: 'Platform Fee ($)', 
        formatter: (val) => (val / 100).toFixed(2) 
      },
      { key: 'status', header: 'Status' },
    ],
    `earnings_export_${new Date().toISOString().split('T')[0]}.csv`
  );
}

export function exportPromoCodestToCSV(promoCodes: any[]): void {
  exportToCSV(
    promoCodes,
    [
      { key: 'code', header: 'Code' },
      { key: 'discount_type', header: 'Discount Type' },
      { 
        key: 'discount_value', 
        header: 'Discount Value', 
        formatter: (val, row) => 
          row.discount_type === 'percentage' ? `${val}%` : `$${(val / 100).toFixed(2)}` 
      },
      { key: 'status', header: 'Status' },
      { key: 'usage_count', header: 'Times Used' },
      { key: 'usage_limit', header: 'Usage Limit' },
      { key: 'valid_from', header: 'Valid From' },
      { key: 'valid_until', header: 'Valid Until' },
    ],
    `promo_codes_export_${new Date().toISOString().split('T')[0]}.csv`
  );
}
