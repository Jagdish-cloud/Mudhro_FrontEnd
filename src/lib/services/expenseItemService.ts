import { apiClient } from '../api';
import { encodeId } from '../urlEncoder';

export interface ExpenseItem {
  id: number;
  expenseId: number;
  serviceId: number;
  quantity: number;
  unitPrice: number;
  serviceName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpenseItemCreateData {
  serviceId: number;
  quantity: number;
  unitPrice: number;
}

export interface ExpenseItemUpdateData {
  quantity?: number;
  unitPrice?: number;
}

interface ExpenseItemsResponse {
  success: boolean;
  message?: string;
  expenseItems: ExpenseItem[];
  count?: number;
}

interface ExpenseItemResponse {
  success: boolean;
  message?: string;
  expenseItem: ExpenseItem;
}

export const expenseItemService = {
  async getExpenseItems(expenseId: number): Promise<ExpenseItem[]> {
    try {
      const response = await apiClient.get<ExpenseItemsResponse>(`/api/expenses/${encodeId(expenseId)}/items`);
      return response.expenseItems || [];
    } catch (error: any) {
      console.error('Error fetching expense items:', error);
      throw new Error(error.message || 'Failed to fetch expense items');
    }
  },

  async getExpenseItemById(id: number): Promise<ExpenseItem> {
    try {
      const response = await apiClient.get<ExpenseItemResponse>(`/api/expense-items/${encodeId(id)}`);
      return response.expenseItem;
    } catch (error: any) {
      console.error('Error fetching expense item:', error);
      throw new Error(error.message || 'Failed to fetch expense item');
    }
  },

  async createExpenseItem(expenseId: number, data: ExpenseItemCreateData): Promise<ExpenseItem> {
    try {
      const response = await apiClient.post<ExpenseItemResponse>(`/api/expenses/${encodeId(expenseId)}/items`, data);
      return response.expenseItem;
    } catch (error: any) {
      console.error('Error creating expense item:', error);
      throw new Error(error.message || 'Failed to create expense item');
    }
  },

  async updateExpenseItem(id: number, data: ExpenseItemUpdateData): Promise<ExpenseItem> {
    try {
      const response = await apiClient.put<ExpenseItemResponse>(`/api/expense-items/${encodeId(id)}`, data);
      return response.expenseItem;
    } catch (error: any) {
      console.error('Error updating expense item:', error);
      throw new Error(error.message || 'Failed to update expense item');
    }
  },

  async deleteExpenseItem(id: number): Promise<void> {
    try {
      await apiClient.delete(`/api/expense-items/${encodeId(id)}`);
    } catch (error: any) {
      console.error('Error deleting expense item:', error);
      throw new Error(error.message || 'Failed to delete expense item');
    }
  },
};


