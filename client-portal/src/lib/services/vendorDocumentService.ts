import { apiClient, API_BASE_URL } from '../api';
import { encodeId } from '../urlEncoder';

export interface VendorDocument {
  id: number;
  vendorId: number;
  fileName: string;
  filePath: string;
  fileSize?: number;
  mimeType?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const vendorDocumentService = {
  /**
   * Get all documents for a vendor
   */
  async getVendorDocuments(vendorId: number): Promise<VendorDocument[]> {
    try {
      const response = await apiClient.get<{ success: boolean; documents: VendorDocument[] }>(
        `/api/vendors/${encodeId(vendorId)}/documents`
      );
      return response.documents;
    } catch (error: any) {
      console.error('Error fetching vendor documents:', error);
      throw new Error(error.message || 'Failed to fetch vendor documents');
    }
  },

  /**
   * Upload a document for a vendor
   */
  async uploadVendorDocument(vendorId: number, file: File): Promise<VendorDocument> {
    try {
      const formData = new FormData();
      formData.append('document', file);

      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/api/vendors/${encodeId(vendorId)}/documents`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to upload document' }));
        throw new Error(errorData.message || 'Failed to upload document');
      }

      const data = await response.json();
      return data.document;
    } catch (error: any) {
      console.error('Error uploading vendor document:', error);
      throw new Error(error.message || 'Failed to upload document');
    }
  },

  /**
   * Download a vendor document
   */
  async downloadVendorDocument(vendorId: number, documentId: number, fileName: string): Promise<void> {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${API_BASE_URL}/api/vendors/${encodeId(vendorId)}/documents/${documentId}/download`,
        {
          method: 'GET',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to download document' }));
        throw new Error(errorData.message || 'Failed to download document');
      }

      // Get the blob from the response
      const blob = await response.blob();
      
      // Create a temporary URL and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error downloading vendor document:', error);
      throw new Error(error.message || 'Failed to download document');
    }
  },

  /**
   * Delete a vendor document
   */
  async deleteVendorDocument(vendorId: number, documentId: number): Promise<void> {
    try {
      await apiClient.delete(`/api/vendors/${encodeId(vendorId)}/documents/${documentId}`);
    } catch (error: any) {
      console.error('Error deleting vendor document:', error);
      throw new Error(error.message || 'Failed to delete document');
    }
  },
};

