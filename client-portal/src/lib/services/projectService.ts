// Project API Service
import { apiClient } from '../api';
import { encodeId } from '../urlEncoder';

export interface Project {
  id: number;
  name: string;
  description?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  status: 'active' | 'completed' | 'on-hold' | 'cancelled';
  budget?: number;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
  clientCount?: number;
}

export interface ProjectCreateData {
  name: string;
  description?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  status?: 'active' | 'completed' | 'on-hold' | 'cancelled';
  budget?: number;
}

export interface ProjectUpdateData {
  name?: string;
  description?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  status?: 'active' | 'completed' | 'on-hold' | 'cancelled';
  budget?: number;
}

interface ProjectsResponse {
  success: boolean;
  message?: string;
  projects: Project[];
  count?: number;
}

interface ProjectResponse {
  success: boolean;
  message?: string;
  project: Project;
}

interface ClientsResponse {
  success: boolean;
  message?: string;
  clients: any[];
  count?: number;
}

export const projectService = {
  /**
   * Get all projects for the authenticated user
   */
  async getProjects(): Promise<Project[]> {
    try {
      const response = await apiClient.get<ProjectsResponse>('/api/projects');
      return response.projects || [];
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      throw new Error(error.message || 'Failed to fetch projects');
    }
  },

  /**
   * Get a specific project by ID
   */
  async getProjectById(id: number): Promise<Project> {
    try {
      const response = await apiClient.get<ProjectResponse>(`/api/projects/${encodeId(id)}`);
      return response.project;
    } catch (error: any) {
      console.error('Error fetching project:', error);
      throw new Error(error.message || 'Failed to fetch project');
    }
  },

  /**
   * Create a new project
   */
  async createProject(data: ProjectCreateData): Promise<Project> {
    try {
      const response = await apiClient.post<ProjectResponse>('/api/projects', data);
      return response.project;
    } catch (error: any) {
      console.error('Error creating project:', error);
      throw new Error(error.message || 'Failed to create project');
    }
  },

  /**
   * Update an existing project
   */
  async updateProject(id: number, data: ProjectUpdateData): Promise<Project> {
    try {
      const response = await apiClient.put<ProjectResponse>(`/api/projects/${encodeId(id)}`, data);
      return response.project;
    } catch (error: any) {
      console.error('Error updating project:', error);
      throw new Error(error.message || 'Failed to update project');
    }
  },

  /**
   * Delete a project
   */
  async deleteProject(id: number): Promise<void> {
    try {
      await apiClient.delete(`/api/projects/${encodeId(id)}`);
    } catch (error: any) {
      console.error('Error deleting project:', error);
      throw new Error(error.message || 'Failed to delete project');
    }
  },

  /**
   * Get all clients for a project
   */
  async getClientsByProjectId(id: number): Promise<any[]> {
    try {
      const response = await apiClient.get<ClientsResponse>(`/api/projects/${encodeId(id)}/clients`);
      return response.clients || [];
    } catch (error: any) {
      console.error('Error fetching clients for project:', error);
      throw new Error(error.message || 'Failed to fetch clients for project');
    }
  },

  /**
   * Assign clients to a project (bulk assignment - replaces all existing assignments)
   */
  async assignClientsToProject(projectId: number, clientIds: number[]): Promise<void> {
    try {
      // Send numeric IDs - backend will decode if needed
      await apiClient.post(`/api/projects/${encodeId(projectId)}/clients`, {
        clientIds,
      });
    } catch (error: any) {
      console.error('Error assigning clients to project:', error);
      throw new Error(error.message || 'Failed to assign clients to project');
    }
  },

  /**
   * Remove a client from a project
   */
  async removeClientFromProject(projectId: number, clientId: number): Promise<void> {
    try {
      await apiClient.delete(`/api/projects/${encodeId(projectId)}/clients/${encodeId(clientId)}`);
    } catch (error: any) {
      console.error('Error removing client from project:', error);
      throw new Error(error.message || 'Failed to remove client from project');
    }
  },
};
