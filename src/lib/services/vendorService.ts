import { apiClient } from '../api';
import { encodeId } from '../urlEncoder';

export interface Vendor {
  id: number;
  organization?: string | null;
  fullName: string;
  email: string;
  mobileNumber?: string | null;
  gstin?: string | null;
  pan?: string | null;
  isActive?: boolean;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface VendorCreateData {
  organization?: string;
  fullName: string;
  email: string;
  mobileNumber?: string;
  gstin?: string;
  pan?: string;
}

export interface VendorUpdateData {
  organization?: string;
  fullName?: string;
  email?: string;
  mobileNumber?: string;
  gstin?: string;
  pan?: string;
  isActive?: boolean;
}

interface VendorsResponse {
  success: boolean;
  message?: string;
  vendors: Vendor[];
  count?: number;
}

interface VendorResponse {
  success: boolean;
  message?: string;
  vendor: Vendor;
}

export const vendorService = {
  async getVendors(): Promise<Vendor[]> {
    try {
      const response = await apiClient.get<VendorsResponse>('/api/vendors');
      return response.vendors || [];
    } catch (error: any) {
      console.error('Error fetching vendors:', error);
      throw new Error(error.message || 'Failed to fetch vendors');
    }
  },

  async getVendorById(id: number): Promise<Vendor> {
    try {
      const response = await apiClient.get<VendorResponse>(`/api/vendors/${encodeId(id)}`);
      return response.vendor;
    } catch (error: any) {
      console.error('Error fetching vendor:', error);
      throw new Error(error.message || 'Failed to fetch vendor');
    }
  },

  async createVendor(data: VendorCreateData): Promise<Vendor> {
    try {
      const response = await apiClient.post<VendorResponse>('/api/vendors', data);
      return response.vendor;
    } catch (error: any) {
      console.error('Error creating vendor:', error);
      throw new Error(error.message || 'Failed to create vendor');
    }
  },

  async updateVendor(id: number, data: VendorUpdateData): Promise<Vendor> {
    try {
      const response = await apiClient.put<VendorResponse>(`/api/vendors/${encodeId(id)}`, data);
      return response.vendor;
    } catch (error: any) {
      console.error('Error updating vendor:', error);
      throw new Error(error.message || 'Failed to update vendor');
    }
  },

  async deleteVendor(id: number): Promise<void> {
    try {
      await apiClient.delete(`/api/vendors/${encodeId(id)}`);
    } catch (error: any) {
      console.error('Error deleting vendor:', error);
      throw new Error(error.message || 'Failed to delete vendor');
    }
  },
};


