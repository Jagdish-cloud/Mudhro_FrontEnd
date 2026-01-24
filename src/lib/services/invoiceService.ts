// Invoice API Service
import { apiClient } from '../api';
import { encodeId } from '../urlEncoder';

export interface InvoiceItem {
  id?: number;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  invoiceDate: string | Date;
  dueDate: string | Date;
  subTotalAmount: number;
  gst: number; // GST percentage
  totalAmount: number;
  currency?: string;
  invoiceFileName?: string | null;
  totalInstallments?: number;
  currentInstallment?: number;
  additionalNotes?: string;
  paymentReminderRepetition?: string[] | null; // Array of: '3', '7', 'Only on Due date', or null
  clientId: number;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
  // Computed/display fields
  status: 'paid' | 'pending' | 'overdue';
  clientName?: string;
  // Payment terms fields
  paymentTerms?: 'full' | 'advance_balance';
  advanceAmount?: number | null;
  balanceDue?: number | null;
  balanceDueDate?: string | Date | null;
}

export interface InvoiceCreateData {
  invoiceNumber?: string;
  invoiceDate: string | Date;
  dueDate: string | Date;
  subTotalAmount?: number;
  gst?: number; // GST percentage (e.g., 18 for 18%)
  totalAmount?: number;
  currency?: string;
  totalInstallments?: number;
  currentInstallment?: number;
  additionalNotes?: string;
  paymentReminderRepetition?: string[] | null; // Array of: '3', '7', 'Only on Due date', or null
  paymentTerms?: 'full' | 'advance_balance';
  advanceAmount?: number | null;
  balanceDue?: number | null;
  balanceDueDate?: string | Date | null;
  clientId: number;
  items?: Array<{
    itemsId: number;
    quantity: number;
    unitPrice: number;
  }>;
}

export interface InvoiceUpdateData {
  invoiceNumber?: string;
  invoiceDate?: string | Date;
  dueDate?: string | Date;
  subTotalAmount?: number;
  gst?: number;
  totalAmount?: number;
  currency?: string;
  totalInstallments?: number;
  currentInstallment?: number;
  additionalNotes?: string;
  paymentReminderRepetition?: string[] | null; // Array of: '3', '7', 'Only on Due date', or null
  status?: 'paid' | 'pending' | 'overdue';
  paymentTerms?: 'full' | 'advance_balance';
  advanceAmount?: number | null;
  balanceDue?: number | null;
  balanceDueDate?: string | Date | null;
  clientId?: number;
}

interface InvoicesResponse {
  success: boolean;
  message?: string;
  invoices: Invoice[];
  count?: number;
}

interface InvoiceResponse {
  success: boolean;
  message?: string;
  invoice: Invoice;
}

export const invoiceService = {
  /**
   * Get all invoices for the authenticated user
   */
  async getInvoices(): Promise<Invoice[]> {
    try {
      const response = await apiClient.get<InvoicesResponse>('/api/invoices');
      return response.invoices || [];
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
      throw new Error(error.message || 'Failed to fetch invoices');
    }
  },

  /**
   * Get a specific invoice by ID
   */
  async getInvoiceById(id: number): Promise<Invoice> {
    try {
      const encodedId = encodeId(id);
      console.log('[InvoiceService] Fetching invoice:', { id, encodedId, url: `/api/invoices/${encodedId}` });
      const response = await apiClient.get<InvoiceResponse>(`/api/invoices/${encodedId}`);
      console.log('[InvoiceService] Invoice response received:', response);
      if (!response.invoice) {
        throw new Error('Invoice not found in response');
      }
      return response.invoice;
    } catch (error: any) {
      console.error('[InvoiceService] Error fetching invoice:', {
        id,
        encodedId: encodeId(id),
        error: error.message || error,
        status: error.status
      });
      throw new Error(error.message || 'Failed to fetch invoice');
    }
  },

  /**
   * Create a new invoice
   */
  async createInvoice(data: InvoiceCreateData): Promise<Invoice> {
    try {
      const response = await apiClient.post<InvoiceResponse>('/api/invoices', data);
      return response.invoice;
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      throw new Error(error.message || 'Failed to create invoice');
    }
  },

  /**
   * Update an existing invoice
   */
  async updateInvoice(id: number, data: InvoiceUpdateData): Promise<Invoice> {
    try {
      const response = await apiClient.put<InvoiceResponse>(`/api/invoices/${encodeId(id)}`, data);
      return response.invoice;
    } catch (error: any) {
      console.error('Error updating invoice:', error);
      throw new Error(error.message || 'Failed to update invoice');
    }
  },

  /**
   * Upload invoice PDF
   */
  async uploadInvoicePdf(id: number, file: Blob, fileName: string): Promise<void> {
    try {
      const formData = new FormData();
      formData.append('invoicePdf', file, fileName);
      await apiClient.post(`/api/invoices/${encodeId(id)}/pdf`, formData);
    } catch (error: any) {
      console.error('Error uploading invoice PDF:', error);
      throw new Error(error.message || 'Failed to upload invoice PDF');
    }
  },

  /**
   * Send invoice email (initial send or reminder)
   */
  async sendInvoiceEmail(id: number, type: 'invoice' | 'reminder' | 'update'): Promise<void> {
    try {
      await apiClient.post(`/api/invoices/${encodeId(id)}/email`, { type });
    } catch (error: any) {
      console.error('Error sending invoice email:', error);
      throw new Error(error.message || 'Failed to send invoice email');
    }
  },

  /**
   * Delete an invoice
   */
  async deleteInvoice(id: number): Promise<void> {
    try {
      await apiClient.delete(`/api/invoices/${encodeId(id)}`);
    } catch (error: any) {
      console.error('Error deleting invoice:', error);
      throw new Error(error.message || 'Failed to delete invoice');
    }
  },
};

