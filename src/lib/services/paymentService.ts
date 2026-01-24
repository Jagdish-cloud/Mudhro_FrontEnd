// Payment API Service
import { apiClient } from '../api';
import { encodeId } from '../urlEncoder';

export interface Payment {
  id: number;
  invoiceId: number;
  userId: number;
  clientId: number;
  invoiceAmount: number;
  amountReceived: number;
  paymentGatewayFee: number;
  tdsDeducted: number;
  otherDeduction: number;
  finalAmount: number;
  paymentDate: Date | string;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface PaymentCreateData {
  invoiceId: number;
  amountReceived: number;
  paymentGatewayFee?: number;
  tdsDeducted?: number;
  otherDeduction?: number;
  notes?: string;
  paymentDate?: string | Date;
}

export interface PaymentUpdateData {
  amountReceived?: number;
  paymentGatewayFee?: number;
  tdsDeducted?: number;
  otherDeduction?: number;
  notes?: string;
  paymentDate?: string | Date;
}

interface PaymentResponse {
  success: boolean;
  message?: string;
  payment: Payment;
}

interface PaymentsResponse {
  success: boolean;
  payments: Payment[];
}

export const paymentService = {
  /**
   * Create a payment record (mark invoice as paid)
   */
  async createPayment(data: PaymentCreateData): Promise<Payment> {
    try {
      const response = await apiClient.post<PaymentResponse>('/api/payments', {
        ...data,
        invoiceId: encodeId(data.invoiceId),
      });
      return response.payment;
    } catch (error: any) {
      console.error('Error creating payment:', error);
      throw new Error(error.message || 'Failed to create payment');
    }
  },

  /**
   * Get all payments for a specific invoice
   */
  async getPaymentsByInvoiceId(invoiceId: number): Promise<Payment[]> {
    try {
      const response = await apiClient.get<PaymentsResponse>(
        `/api/payments/invoice/${encodeId(invoiceId)}`
      );
      return response.payments || [];
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      throw new Error(error.message || 'Failed to fetch payments');
    }
  },

  /**
   * Get all payments for the authenticated user
   */
  async getPayments(): Promise<Payment[]> {
    try {
      const response = await apiClient.get<PaymentsResponse>('/api/payments');
      return response.payments || [];
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      throw new Error(error.message || 'Failed to fetch payments');
    }
  },

  /**
   * Get a specific payment by ID
   */
  async getPaymentById(paymentId: number): Promise<Payment> {
    try {
      const response = await apiClient.get<PaymentResponse>(
        `/api/payments/${encodeId(paymentId)}`
      );
      return response.payment;
    } catch (error: any) {
      console.error('Error fetching payment:', error);
      throw new Error(error.message || 'Failed to fetch payment');
    }
  },

  /**
   * Update an existing payment record
   */
  async updatePayment(paymentId: number, data: PaymentUpdateData): Promise<Payment> {
    try {
      const response = await apiClient.put<PaymentResponse>(
        `/api/payments/${encodeId(paymentId)}`,
        data
      );
      return response.payment;
    } catch (error: any) {
      console.error('Error updating payment:', error);
      throw new Error(error.message || 'Failed to update payment');
    }
  },
};

