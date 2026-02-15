// Invoice Item API Service
import { apiClient } from '../api';
import { encodeId } from '../urlEncoder';

export interface InvoiceItem {
  id: number;
  invoiceId: number;
  itemsId: number;
  quantity: number;
  unitPrice: number;
  itemName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceItemCreateData {
  itemsId: number;
  quantity: number;
  unitPrice: number;
}

export interface InvoiceItemUpdateData {
  quantity?: number;
  unitPrice?: number;
}

interface InvoiceItemsResponse {
  success: boolean;
  message?: string;
  invoiceItems: InvoiceItem[];
  count?: number;
}

interface InvoiceItemResponse {
  success: boolean;
  message?: string;
  invoiceItem: InvoiceItem;
}

export const invoiceItemService = {
  /**
   * Get all invoice items for a specific invoice
   */
  async getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]> {
    try {
      const response = await apiClient.get<InvoiceItemsResponse>(`/api/invoices/${encodeId(invoiceId)}/items`);
      return response.invoiceItems || [];
    } catch (error: any) {
      console.error('Error fetching invoice items:', error);
      throw new Error(error.message || 'Failed to fetch invoice items');
    }
  },

  /**
   * Get a specific invoice item by ID
   */
  async getInvoiceItemById(id: number): Promise<InvoiceItem> {
    try {
      const response = await apiClient.get<InvoiceItemResponse>(`/api/invoice-items/${encodeId(id)}`);
      return response.invoiceItem;
    } catch (error: any) {
      console.error('Error fetching invoice item:', error);
      throw new Error(error.message || 'Failed to fetch invoice item');
    }
  },

  /**
   * Create a new invoice item
   */
  async createInvoiceItem(invoiceId: number, data: InvoiceItemCreateData): Promise<InvoiceItem> {
    try {
      const response = await apiClient.post<InvoiceItemResponse>(`/api/invoices/${encodeId(invoiceId)}/items`, data);
      return response.invoiceItem;
    } catch (error: any) {
      console.error('Error creating invoice item:', error);
      throw new Error(error.message || 'Failed to create invoice item');
    }
  },

  /**
   * Update an existing invoice item
   */
  async updateInvoiceItem(id: number, data: InvoiceItemUpdateData): Promise<InvoiceItem> {
    try {
      const response = await apiClient.put<InvoiceItemResponse>(`/api/invoice-items/${encodeId(id)}`, data);
      return response.invoiceItem;
    } catch (error: any) {
      console.error('Error updating invoice item:', error);
      throw new Error(error.message || 'Failed to update invoice item');
    }
  },

  /**
   * Delete an invoice item
   */
  async deleteInvoiceItem(id: number): Promise<void> {
    try {
      await apiClient.delete(`/api/invoice-items/${encodeId(id)}`);
    } catch (error: any) {
      console.error('Error deleting invoice item:', error);
      throw new Error(error.message || 'Failed to delete invoice item');
    }
  },
};

