import { apiClient } from '../api';
import { encodeId } from '../urlEncoder';
import { VendorNote, VendorNoteCreateData, VendorNoteUpdateData } from '../types/vendorNote';

interface VendorNotesResponse {
  success: boolean;
  message?: string;
  notes: VendorNote[];
  count?: number;
}

interface VendorNoteResponse {
  success: boolean;
  message?: string;
  note: VendorNote | null;
}

interface SingleVendorNoteResponse {
  success: boolean;
  message?: string;
  note: VendorNote;
}

export const vendorNoteService = {
  /**
   * Get all notes for a vendor
   */
  async getVendorNotes(vendorId: number): Promise<VendorNote[]> {
    try {
      const response = await apiClient.get<VendorNotesResponse>(
        `/api/vendors/${encodeId(vendorId)}/notes`
      );
      return response.notes || [];
    } catch (error: any) {
      console.error('Error fetching vendor notes:', error);
      throw new Error(error.message || 'Failed to fetch vendor notes');
    }
  },

  /**
   * Get latest note for a vendor
   */
  async getLatestVendorNote(vendorId: number): Promise<VendorNote | null> {
    try {
      const response = await apiClient.get<VendorNoteResponse>(
        `/api/vendors/${encodeId(vendorId)}/notes/latest`
      );
      return response.note || null;
    } catch (error: any) {
      console.error('Error fetching latest vendor note:', error);
      throw new Error(error.message || 'Failed to fetch latest vendor note');
    }
  },

  /**
   * Create a new note for a vendor
   */
  async createVendorNote(vendorId: number, data: VendorNoteCreateData): Promise<VendorNote> {
    try {
      const response = await apiClient.post<SingleVendorNoteResponse>(
        `/api/vendors/${encodeId(vendorId)}/notes`,
        data
      );
      return response.note;
    } catch (error: any) {
      console.error('Error creating vendor note:', error);
      throw new Error(error.message || 'Failed to create vendor note');
    }
  },

  /**
   * Update a vendor note
   */
  async updateVendorNote(
    vendorId: number,
    noteId: number,
    data: VendorNoteUpdateData
  ): Promise<VendorNote> {
    try {
      const response = await apiClient.put<SingleVendorNoteResponse>(
        `/api/vendors/${encodeId(vendorId)}/notes/${noteId}`,
        data
      );
      return response.note;
    } catch (error: any) {
      console.error('Error updating vendor note:', error);
      throw new Error(error.message || 'Failed to update vendor note');
    }
  },

  /**
   * Delete a vendor note
   */
  async deleteVendorNote(vendorId: number, noteId: number): Promise<void> {
    try {
      await apiClient.delete(`/api/vendors/${encodeId(vendorId)}/notes/${noteId}`);
    } catch (error: any) {
      console.error('Error deleting vendor note:', error);
      throw new Error(error.message || 'Failed to delete vendor note');
    }
  },
};

