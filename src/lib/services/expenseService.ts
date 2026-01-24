import { apiClient } from '../api';
import { encodeId } from '../urlEncoder';

export interface ExpenseItemPayload {
  serviceId: number;
  quantity: number;
  unitPrice: number;
}

export interface Expense {
  id: number;
  billNumber: string;
  billDate: string | Date;
  dueDate: string | Date;
  taxPercentage: number;
  subTotalAmount: number;
  totalAmount: number;
  attachmentFileName: string | null;
  expenseFileName: string | null;
  additionalNotes: string | null;
  vendorId: number;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
  vendorName?: string;
}

export interface ExpenseCreateData {
  billNumber?: string;
  billDate: string | Date;
  dueDate: string | Date;
  subTotalAmount?: number;
  taxPercentage?: number;
  totalAmount?: number;
  additionalNotes?: string;
  vendorId: number;
  items?: ExpenseItemPayload[];
}

export interface ExpenseUpdateData {
  billNumber?: string;
  billDate?: string | Date;
  dueDate?: string | Date;
  subTotalAmount?: number;
  taxPercentage?: number;
  totalAmount?: number;
  additionalNotes?: string | null;
  vendorId?: number;
}

interface ExpensesResponse {
  success: boolean;
  message?: string;
  expenses: Expense[];
  count?: number;
}

interface ExpenseResponse {
  success: boolean;
  message?: string;
  expense: Expense;
}

export const expenseService = {
  async getExpenses(): Promise<Expense[]> {
    try {
      const response = await apiClient.get<ExpensesResponse>('/api/expenses');
      return response.expenses || [];
    } catch (error: any) {
      console.error('Error fetching expenses:', error);
      throw new Error(error.message || 'Failed to fetch expenses');
    }
  },

  async getExpenseById(id: number): Promise<Expense> {
    try {
      const response = await apiClient.get<ExpenseResponse>(`/api/expenses/${encodeId(id)}`);
      return response.expense;
    } catch (error: any) {
      console.error('Error fetching expense:', error);
      throw new Error(error.message || 'Failed to fetch expense');
    }
  },

  async createExpense(data: ExpenseCreateData): Promise<Expense> {
    try {
      const response = await apiClient.post<ExpenseResponse>('/api/expenses', data);
      return response.expense;
    } catch (error: any) {
      console.error('Error creating expense:', error);
      throw new Error(error.message || 'Failed to create expense');
    }
  },

  async updateExpense(id: number, data: ExpenseUpdateData): Promise<Expense> {
    try {
      const response = await apiClient.put<ExpenseResponse>(`/api/expenses/${encodeId(id)}`, data);
      return response.expense;
    } catch (error: any) {
      console.error('Error updating expense:', error);
      throw new Error(error.message || 'Failed to update expense');
    }
  },

  async deleteExpense(id: number): Promise<void> {
    try {
      await apiClient.delete(`/api/expenses/${encodeId(id)}`);
    } catch (error: any) {
      console.error('Error deleting expense:', error);
      throw new Error(error.message || 'Failed to delete expense');
    }
  },

  /**
   * Upload expense PDF (generated from preview)
   */
  async uploadExpensePdf(id: number, file: Blob, fileName: string): Promise<void> {
    try {
      const formData = new FormData();
      formData.append('expensePdf', file, fileName);
      await apiClient.post(`/api/expenses/${encodeId(id)}/pdf`, formData);
    } catch (error: any) {
      console.error('Error uploading expense PDF:', error);
      throw new Error(error.message || 'Failed to upload expense PDF');
    }
  },
};


