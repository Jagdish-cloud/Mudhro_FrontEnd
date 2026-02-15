import { apiClient, API_BASE_URL } from '../api';
import { encodeId } from '../urlEncoder';

export interface ClientDocument {
  id: number;
  clientId: number;
  fileName: string;
  filePath: string;
  fileSize?: number;
  mimeType?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const clientDocumentService = {
  /**
   * Get all documents for a client
   */
  async getClientDocuments(clientId: number): Promise<ClientDocument[]> {
    try {
      const response = await apiClient.get<{ success: boolean; documents: ClientDocument[] }>(
        `/api/master-clients/${encodeId(clientId)}/documents`
      );
      return response.documents;
    } catch (error: any) {
      console.error('Error fetching client documents:', error);
      throw new Error(error.message || 'Failed to fetch client documents');
    }
  },

  /**
   * Upload a document for a client
   */
  async uploadClientDocument(clientId: number, file: File): Promise<ClientDocument> {
    try {
      const formData = new FormData();
      formData.append('document', file);

      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/api/master-clients/${encodeId(clientId)}/documents`, {
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
      console.error('Error uploading client document:', error);
      throw new Error(error.message || 'Failed to upload document');
    }
  },

  /**
   * Download a client document
   */
  async downloadClientDocument(clientId: number, documentId: number, fileName: string): Promise<void> {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${API_BASE_URL}/api/master-clients/${encodeId(clientId)}/documents/${documentId}/download`,
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
      console.error('Error downloading client document:', error);
      throw new Error(error.message || 'Failed to download document');
    }
  },

  /**
   * Delete a client document
   */
  async deleteClientDocument(clientId: number, documentId: number): Promise<void> {
    try {
      await apiClient.delete(`/api/master-clients/${encodeId(clientId)}/documents/${documentId}`);
    } catch (error: any) {
      console.error('Error deleting client document:', error);
      throw new Error(error.message || 'Failed to delete document');
    }
  },
};

