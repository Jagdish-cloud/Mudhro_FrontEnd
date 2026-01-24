import { apiClient, API_BASE_URL } from '../api';
import { FileType } from './types';

/**
 * Get a download URL for a file stored in Azure Blob Storage
 * Returns a SAS URL that can be used to display/download the file
 */
export const getFileUrl = async (
  fileType: 'Logos' | 'Invoices' | 'Expenses' | 'ClientDocuments' | 'VendorDocuments' | 'Signatures',
  relatedId: number,
  options?: {
    invoiceId?: number;
    expenseId?: number;
    documentId?: number;
    signaturePath?: string;
    expiresInMinutes?: number;
  }
): Promise<string> => {
  try {
    const params = new URLSearchParams();
    if (options?.invoiceId) params.append('invoiceId', options.invoiceId.toString());
    if (options?.expenseId) params.append('expenseId', options.expenseId.toString());
    if (options?.documentId) params.append('documentId', options.documentId.toString());
    if (options?.signaturePath) params.append('signaturePath', options.signaturePath);
    if (options?.expiresInMinutes) params.append('expiresInMinutes', options.expiresInMinutes.toString());

    const url = `/api/files/url/${fileType}/${relatedId}${params.toString() ? `?${params.toString()}` : ''}`;
    console.log('[fileStorageService] Calling API:', url);
    
    try {
      const response = await apiClient.get<{ success: boolean; url: string; message?: string }>(url);
      console.log('[fileStorageService] API response:', response);

      if (response && response.success && response.url) {
        console.log('[fileStorageService] Successfully got URL:', response.url.substring(0, 50) + '...');
        return response.url;
      }

      console.warn('[fileStorageService] Invalid response structure:', response);
      throw new Error(response?.message || 'Failed to get file URL: Invalid response');
    } catch (error: any) {
      // Check if it's a 404 (file not found) - this is expected if logo doesn't exist
      if (error?.message?.includes('404') || error?.message?.includes('not found') || error?.message?.includes('Logo not found')) {
        console.log('[fileStorageService] Logo not found (404) - this is expected if no logo is uploaded');
        throw error; // Re-throw so caller can handle it
      }
      console.error('[fileStorageService] API call failed:', error);
      throw error;
    }
  } catch (error) {
    console.error('[fileStorageService] Error getting file URL:', error);
    if (error instanceof Error) {
      console.error('[fileStorageService] Error message:', error.message);
    }
    throw error;
  }
};

/**
 * Get logo URL for a user
 * Returns a SAS URL that can be used to display the logo
 */
export const getLogoUrl = async (userId: number): Promise<string | null> => {
  try {
    console.log('[fileStorageService] Fetching logo URL for user:', userId);
    const url = await getFileUrl('Logos', userId, { expiresInMinutes: 60 });
    console.log('[fileStorageService] Logo URL received:', url ? 'Success' : 'Failed');
    return url;
  } catch (error) {
    console.error('[fileStorageService] Error getting logo URL:', error);
    if (error instanceof Error) {
      console.error('[fileStorageService] Error message:', error.message);
      console.error('[fileStorageService] Error stack:', error.stack);
    }
    return null;
  }
};

/**
 * Get logo URL synchronously from stored logo path
 * This is a fallback for when we have the logo path but need a URL immediately
 * For best results, use getLogoUrl() which fetches a fresh SAS URL
 */
export const getLogoUrlSync = (logoPath: string | null | undefined): string | null => {
  if (!logoPath) return null;
  
  // If it's already a full URL (SAS URL or http), return it
  if (logoPath.startsWith('http')) {
    return logoPath;
  }
  
  // If it's an Azure Blob path (starts with Logos/), we need to fetch a SAS URL
  // For now, return null and let the component fetch it asynchronously
  if (logoPath.startsWith('Logos/')) {
    return null; // Component should call getLogoUrl() instead
  }
  
  // Legacy local path (shouldn't happen with Azure Blob, but handle it)
  return `${API_BASE_URL}/${logoPath.replace(/^\//, '')}`;
};

