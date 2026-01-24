// Client (Master Client) API Service
import { apiClient } from '../api';
import { encodeId } from '../urlEncoder';

export interface Client {
  id: number;
  organization?: string;
  fullName: string;
  email: string;
  mobileNumber?: string;
  gstin?: string;
  pan?: string;
  isActive?: boolean;
  userId: number;
  projectId?: number; // Deprecated - kept for backward compatibility with backend response
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientCreateData {
  organization?: string;
  fullName: string;
  email: string;
  mobileNumber?: string;
  gstin?: string;
  pan?: string;
  // Note: projectId removed - use projectService.assignClientsToProject instead
}

export interface ClientUpdateData {
  organization?: string;
  fullName?: string;
  email?: string;
  mobileNumber?: string;
  gstin?: string;
  pan?: string;
  isActive?: boolean;
  // Note: projectId removed - use projectService.assignClientsToProject/removeClientFromProject instead
}

interface ClientsResponse {
  success: boolean;
  message?: string;
  clients: Client[];
  count?: number;
}

interface ClientResponse {
  success: boolean;
  message?: string;
  client: Client;
}

export const clientService = {
  /**
   * Get all clients for the authenticated user
   * Note: projectId parameter removed - use projectService.getClientsByProjectId to filter by project
   */
  async getClients(): Promise<Client[]> {
    try {
      const response = await apiClient.get<ClientsResponse>('/api/master-clients');
      return response.clients || [];
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      throw new Error(error.message || 'Failed to fetch clients');
    }
  },

  /**
   * Get a specific client by ID
   */
  async getClientById(id: number): Promise<Client> {
    try {
      const response = await apiClient.get<ClientResponse>(`/api/master-clients/${encodeId(id)}`);
      return response.client;
    } catch (error: any) {
      console.error('Error fetching client:', error);
      throw new Error(error.message || 'Failed to fetch client');
    }
  },

  /**
   * Create a new client
   */
  async createClient(data: ClientCreateData): Promise<Client> {
    try {
      const response = await apiClient.post<ClientResponse>('/api/master-clients', data);
      return response.client;
    } catch (error: any) {
      console.error('Error creating client:', error);
      throw new Error(error.message || 'Failed to create client');
    }
  },

  /**
   * Update an existing client
   */
  async updateClient(id: number, data: ClientUpdateData): Promise<Client> {
    try {
      const response = await apiClient.put<ClientResponse>(`/api/master-clients/${encodeId(id)}`, data);
      return response.client;
    } catch (error: any) {
      console.error('Error updating client:', error);
      throw new Error(error.message || 'Failed to update client');
    }
  },

  /**
   * Delete a client
   */
  async deleteClient(id: number): Promise<void> {
    try {
      await apiClient.delete(`/api/master-clients/${encodeId(id)}`);
    } catch (error: any) {
      console.error('Error deleting client:', error);
      throw new Error(error.message || 'Failed to delete client');
    }
  },
};

