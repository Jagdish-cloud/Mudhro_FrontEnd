// Monthly Report API Service
import { apiClient } from '../api';
import { encodeId } from '../urlEncoder';

export interface MonthlyReportInvoice {
  id: number;
  invoiceNumber: string;
  invoiceDate: Date | string;
  dueDate: Date | string;
  clientName: string;
  clientOrganization?: string | null;
  totalAmount: number;
  subTotalAmount: number;
  gst: number;
  gstAmount: number;
  currency?: string;
  status: 'paid' | 'pending' | 'overdue';
}

export interface MonthlyReportExpense {
  id: number;
  billNumber: string;
  billDate: Date | string;
  vendorName: string;
  totalAmount: number;
  subTotalAmount: number;
  taxPercentage: number;
  taxAmount: number;
}

export interface MonthlyReportData {
  userId: number;
  userFullName: string;
  userEmail: string;
  userGSTIN?: string | null;
  userPAN?: string | null;
  userLogo?: string | null;
  userCountry?: string | null;
  userCurrency?: string | null;
  month: string;
  year: number;
  monthNumber: number;
  startDate: Date | string;
  endDate: Date | string;
  totalInvoices: number;
  totalInvoiceAmount: number;
  totalExpenses: number;
  totalExpenseAmount: number;
  gstCollected: number;
  taxOnExpenses: number;
  netTax: number;
  pendingPayments: number;
  overdueInvoices: number;
  invoices: MonthlyReportInvoice[];
  expenses: MonthlyReportExpense[];
  currencyBreakdown?: Array<{
    currency: string;
    invoiceCount: number;
    invoiceAmount: number;
    gstCollected: number;
    expenseCount: number;
    expenseAmount: number;
    taxOnExpenses: number;
    pendingPayments: number;
    overdueCount: number;
  }>;
}

interface MonthlyReportResponse {
  success: boolean;
  message?: string;
  data: MonthlyReportData;
}

export const monthlyReportService = {
  /**
   * Get monthly report data for a specific user
   * @param userId - User ID
   * @param month - Month number (1-12), optional, defaults to current month
   * @param year - Year (e.g., 2025), optional, defaults to current year
   */
  async getMonthlyReport(userId: number, month?: number, year?: number): Promise<MonthlyReportData> {
    try {
      const params = new URLSearchParams();
      if (month) params.append('month', month.toString());
      if (year) params.append('year', year.toString());
      
      const queryString = params.toString();
      const url = `/api/monthly-reports/${encodeId(userId)}${queryString ? `?${queryString}` : ''}`;
      
      const response = await apiClient.get<MonthlyReportResponse>(url);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching monthly report:', error);
      throw new Error(error.message || 'Failed to fetch monthly report');
    }
  },

  /**
   * Download monthly report PDF for a specific user
   * @param userId - User ID
   * @param month - Month number (1-12), optional, defaults to current month
   * @param year - Year (e.g., 2025), optional, defaults to current year
   */
  async downloadMonthlyReportPdf(userId: number, month?: number, year?: number): Promise<void> {
    try {
      const params = new URLSearchParams();
      if (month) params.append('month', month.toString());
      if (year) params.append('year', year.toString());
      
      const queryString = params.toString();
      const url = `/api/monthly-reports/${encodeId(userId)}/pdf${queryString ? `?${queryString}` : ''}`;
      
      const token = localStorage.getItem('accessToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/pdf',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${url}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to download PDF' }));
        throw new Error(errorData.message || 'Failed to download PDF');
      }

      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get('Content-Disposition');
      let fileName = `Monthly_Report_${month || new Date().getMonth() + 1}_${year || new Date().getFullYear()}_${userId}.pdf`;
      
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (fileNameMatch) {
          fileName = fileNameMatch[1];
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const url_blob = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url_blob;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url_blob);
    } catch (error: any) {
      console.error('Error downloading monthly report PDF:', error);
      throw new Error(error.message || 'Failed to download monthly report PDF');
    }
  },
};

