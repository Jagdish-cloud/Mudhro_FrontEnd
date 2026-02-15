import { apiClient } from '../api';
import { encodeId } from '../urlEncoder';

export interface ExpenseServiceCatalogItem {
  id: number;
  name: string;
  description?: string | null;
  defaultRate: number;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpenseServiceCreatePayload {
  name: string;
  description?: string;
  defaultRate?: number;
}

export interface ExpenseServiceUpdatePayload {
  name?: string;
  description?: string | null;
  defaultRate?: number;
}

interface ExpenseServiceListResponse {
  success: boolean;
  services: ExpenseServiceCatalogItem[];
  count?: number;
}

interface ExpenseServiceResponse {
  success: boolean;
  service: ExpenseServiceCatalogItem;
}

export const expenseServiceCatalog = {
  async list(): Promise<ExpenseServiceCatalogItem[]> {
    try {
      const response = await apiClient.get<ExpenseServiceListResponse>('/api/expense-services');
      return response.services || [];
    } catch (error: any) {
      console.error('Error fetching expense services:', error);
      throw new Error(error.message || 'Failed to fetch expense services');
    }
  },

  async getById(id: number): Promise<ExpenseServiceCatalogItem> {
    try {
      const response = await apiClient.get<ExpenseServiceResponse>(`/api/expense-services/${encodeId(id)}`);
      return response.service;
    } catch (error: any) {
      console.error('Error fetching expense service:', error);
      throw new Error(error.message || 'Failed to fetch expense service');
    }
  },

  async create(payload: ExpenseServiceCreatePayload): Promise<ExpenseServiceCatalogItem> {
    try {
      const response = await apiClient.post<ExpenseServiceResponse>('/api/expense-services', payload);
      return response.service;
    } catch (error: any) {
      console.error('Error creating expense service:', error);
      throw new Error(error.message || 'Failed to create expense service');
    }
  },

  async update(id: number, payload: ExpenseServiceUpdatePayload): Promise<ExpenseServiceCatalogItem> {
    try {
      const response = await apiClient.put<ExpenseServiceResponse>(
        `/api/expense-services/${encodeId(id)}`,
        payload
      );
      return response.service;
    } catch (error: any) {
      console.error('Error updating expense service:', error);
      throw new Error(error.message || 'Failed to update expense service');
    }
  },

  async remove(id: number): Promise<void> {
    try {
      await apiClient.delete(`/api/expense-services/${encodeId(id)}`);
    } catch (error: any) {
      console.error('Error deleting expense service:', error);
      throw new Error(error.message || 'Failed to delete expense service');
    }
  },
};


