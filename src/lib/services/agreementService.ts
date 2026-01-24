// Agreement API Service
import { apiClient } from '../api';
import { encodeId } from '../urlEncoder';

export interface AgreementDeliverable {
  id: number;
  description: string;
  order: number;
}

export interface AgreementPaymentMilestone {
  id: number;
  description: string;
  amount: number;
  order: number;
  date?: string;
}

export interface AgreementPaymentTerms {
  id: number;
  paymentStructure: '50-50' | '100-upfront' | '100-completion' | 'milestone-based';
  paymentMethod?: string;
  milestones?: AgreementPaymentMilestone[];
}

export interface AgreementSignature {
  id: number;
  signerType: 'service_provider' | 'client';
  clientId?: number;
  signerName: string;
  signatureImageName: string;
  signatureImagePath?: string;
  timestamp: Date;
}

export interface Agreement {
  id: number;
  projectId: number;
  userId: number;
  serviceProviderName: string;
  agreementDate: Date | string;
  serviceType: string;
  startDate?: Date | string;
  endDate?: Date | string;
  duration?: number;
  durationUnit?: 'days' | 'weeks' | 'months';
  numberOfRevisions: number;
  jurisdiction?: string;
  status: 'draft' | 'pending' | 'completed';
  deliverables: AgreementDeliverable[];
  paymentTerms: AgreementPaymentTerms;
  signatures: AgreementSignature[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AgreementCreateData {
  projectId: number;
  serviceProviderName: string;
  agreementDate: string | Date;
  serviceType: string;
  startDate?: string | Date;
  endDate?: string | Date;
  duration?: number;
  durationUnit?: 'days' | 'weeks' | 'months';
  numberOfRevisions: number;
  jurisdiction?: string;
  deliverables: string[];
  paymentStructure: '50-50' | '100-upfront' | '100-completion' | 'milestone-based';
  paymentMethod?: string;
  paymentMilestones?: Array<{ description: string; amount: number; date?: string }>;
  serviceProviderSignature: {
    signerName: string;
    signatureImage: string; // base64
  };
}

export interface AgreementUpdateData {
  serviceProviderName?: string;
  agreementDate?: string | Date;
  serviceType?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  duration?: number;
  durationUnit?: 'days' | 'weeks' | 'months';
  numberOfRevisions?: number;
  jurisdiction?: string;
  deliverables?: string[];
  paymentStructure?: '50-50' | '100-upfront' | '100-completion' | 'milestone-based';
  paymentMethod?: string;
  paymentMilestones?: Array<{ description: string; amount: number; date?: string }>;
}

interface AgreementResponse {
  success: boolean;
  message?: string;
  agreement: Agreement;
}

interface AgreementByTokenResponse {
  success: boolean;
  message?: string;
  agreement: Agreement;
  link: {
    clientId: number;
    clientName?: string;
    clientOrganization?: string;
    expiresAt: string;
    status: string;
  };
  expired?: boolean;
}

export const agreementService = {
  /**
   * Create a new agreement
   */
  async createAgreement(data: AgreementCreateData): Promise<Agreement> {
    try {
      const response = await apiClient.post<AgreementResponse>('/api/agreements', data);
      return response.agreement;
    } catch (error: any) {
      console.error('Error creating agreement:', error);
      throw new Error(error.message || 'Failed to create agreement');
    }
  },

  /**
   * Get agreement by project ID
   */
  async getAgreementByProjectId(projectId: number): Promise<Agreement | null> {
    try {
      const response = await apiClient.get<AgreementResponse>(
        `/api/agreements/project/${encodeId(projectId)}`
      );
      return response.agreement;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error('Error fetching agreement:', error);
      throw new Error(error.message || 'Failed to fetch agreement');
    }
  },

  /**
   * Get agreement by ID
   */
  async getAgreementById(id: number): Promise<Agreement> {
    try {
      const response = await apiClient.get<AgreementResponse>(`/api/agreements/${encodeId(id)}`);
      return response.agreement;
    } catch (error: any) {
      console.error('Error fetching agreement:', error);
      throw new Error(error.message || 'Failed to fetch agreement');
    }
  },

  /**
   * Update an agreement
   */
  async updateAgreement(id: number, data: AgreementUpdateData): Promise<Agreement> {
    try {
      const response = await apiClient.put<AgreementResponse>(`/api/agreements/${encodeId(id)}`, data);
      return response.agreement;
    } catch (error: any) {
      console.error('Error updating agreement:', error);
      throw new Error(error.message || 'Failed to update agreement');
    }
  },

  /**
   * Delete an agreement
   */
  async deleteAgreement(id: number): Promise<void> {
    try {
      await apiClient.delete(`/api/agreements/${encodeId(id)}`);
    } catch (error: any) {
      console.error('Error deleting agreement:', error);
      throw new Error(error.message || 'Failed to delete agreement');
    }
  },

  /**
   * Send agreement to clients
   */
  async sendAgreementToClients(agreementId: number, clientIds: number[]): Promise<void> {
    try {
      await apiClient.post(`/api/agreements/${encodeId(agreementId)}/send`, {
        clientIds,
      });
    } catch (error: any) {
      console.error('Error sending agreement to clients:', error);
      throw new Error(error.message || 'Failed to send agreement to clients');
    }
  },

  /**
   * Get agreement by token (public endpoint)
   */
  async getAgreementByToken(token: string): Promise<AgreementByTokenResponse> {
    try {
      const response = await apiClient.get<AgreementByTokenResponse>(`/api/agreements/sign/${token}`);
      return response;
    } catch (error: any) {
      console.error('Error fetching agreement by token:', error);
      // Preserve the error structure so the caller can check for expired status
      const errorObj: any = new Error(error.message || 'Failed to fetch agreement');
      errorObj.expired = error.message?.includes('expired') || false;
      errorObj.response = error.response || { data: { message: error.message, expired: errorObj.expired } };
      throw errorObj;
    }
  },

  /**
   * Submit client signature (public endpoint)
   */
  async submitClientSignature(
    token: string,
    signatureData: {
      signerName: string;
      signatureImage: string; // base64
    }
  ): Promise<{ pdfUrl?: string }> {
    try {
      const response = await apiClient.post<{ success: boolean; message: string; pdfUrl?: string }>(`/api/agreements/sign/${token}`, signatureData);
      return { pdfUrl: response.pdfUrl };
    } catch (error: any) {
      console.error('Error submitting signature:', error);
      throw new Error(error.message || 'Failed to submit signature');
    }
  },

  /**
   * Update client signature (public endpoint, within 2 days)
   */
  async updateClientSignature(
    token: string,
    signatureData: {
      signerName: string;
      signatureImage: string; // base64
    }
  ): Promise<void> {
    try {
      await apiClient.put(`/api/agreements/sign/${token}`, signatureData);
    } catch (error: any) {
      console.error('Error updating signature:', error);
      throw new Error(error.message || 'Failed to update signature');
    }
  },
};
