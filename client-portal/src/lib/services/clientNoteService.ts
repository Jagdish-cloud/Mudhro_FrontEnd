import { apiClient } from '../api';
import { encodeId } from '../urlEncoder';
import { ClientNote, ClientNoteCreateData, ClientNoteUpdateData } from '../types/clientNote';

interface ClientNotesResponse {
  success: boolean;
  message?: string;
  notes: ClientNote[];
  count?: number;
}

interface ClientNoteResponse {
  success: boolean;
  message?: string;
  note: ClientNote | null;
}

interface SingleClientNoteResponse {
  success: boolean;
  message?: string;
  note: ClientNote;
}

export const clientNoteService = {
  /**
   * Get all notes for a client
   */
  async getClientNotes(clientId: number): Promise<ClientNote[]> {
    try {
      const response = await apiClient.get<ClientNotesResponse>(
        `/api/master-clients/${encodeId(clientId)}/notes`
      );
      return response.notes || [];
    } catch (error: any) {
      console.error('Error fetching client notes:', error);
      throw new Error(error.message || 'Failed to fetch client notes');
    }
  },

  /**
   * Get latest note for a client
   */
  async getLatestClientNote(clientId: number): Promise<ClientNote | null> {
    try {
      const response = await apiClient.get<ClientNoteResponse>(
        `/api/master-clients/${encodeId(clientId)}/notes/latest`
      );
      return response.note || null;
    } catch (error: any) {
      console.error('Error fetching latest client note:', error);
      throw new Error(error.message || 'Failed to fetch latest client note');
    }
  },

  /**
   * Create a new note for a client
   */
  async createClientNote(clientId: number, data: ClientNoteCreateData): Promise<ClientNote> {
    try {
      const response = await apiClient.post<SingleClientNoteResponse>(
        `/api/master-clients/${encodeId(clientId)}/notes`,
        data
      );
      return response.note;
    } catch (error: any) {
      console.error('Error creating client note:', error);
      throw new Error(error.message || 'Failed to create client note');
    }
  },

  /**
   * Update a client note
   */
  async updateClientNote(
    clientId: number,
    noteId: number,
    data: ClientNoteUpdateData
  ): Promise<ClientNote> {
    try {
      const response = await apiClient.put<SingleClientNoteResponse>(
        `/api/master-clients/${encodeId(clientId)}/notes/${noteId}`,
        data
      );
      return response.note;
    } catch (error: any) {
      console.error('Error updating client note:', error);
      throw new Error(error.message || 'Failed to update client note');
    }
  },

  /**
   * Delete a client note
   */
  async deleteClientNote(clientId: number, noteId: number): Promise<void> {
    try {
      await apiClient.delete(`/api/master-clients/${encodeId(clientId)}/notes/${noteId}`);
    } catch (error: any) {
      console.error('Error deleting client note:', error);
      throw new Error(error.message || 'Failed to delete client note');
    }
  },
};

