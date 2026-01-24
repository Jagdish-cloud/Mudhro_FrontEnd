// Item API Service
import { apiClient } from '../api';
import { encodeId } from '../urlEncoder';

export interface Item {
  id: number;
  name: string;
  description?: string;
  unitPrice: number;
  unit: string;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ItemCreateData {
  name: string;
  description?: string;
  unitPrice: number;
  unit: string;
}

export interface ItemUpdateData {
  name?: string;
  description?: string;
  unitPrice?: number;
  unit?: string;
}

interface ItemsResponse {
  success: boolean;
  message?: string;
  items: Item[];
  count?: number;
}

interface ItemResponse {
  success: boolean;
  message?: string;
  item: Item;
}

export const itemService = {
  /**
   * Get all items for the authenticated user
   */
  async getItems(): Promise<Item[]> {
    try {
      const response = await apiClient.get<ItemsResponse>('/api/items');
      return response.items || [];
    } catch (error: any) {
      console.error('Error fetching items:', error);
      throw new Error(error.message || 'Failed to fetch items');
    }
  },

  /**
   * Get a specific item by ID
   */
  async getItemById(id: number): Promise<Item> {
    try {
      const response = await apiClient.get<ItemResponse>(`/api/items/${encodeId(id)}`);
      return response.item;
    } catch (error: any) {
      console.error('Error fetching item:', error);
      throw new Error(error.message || 'Failed to fetch item');
    }
  },

  /**
   * Create a new item
   */
  async createItem(data: ItemCreateData): Promise<Item> {
    try {
      const response = await apiClient.post<ItemResponse>('/api/items', data);
      return response.item;
    } catch (error: any) {
      console.error('Error creating item:', error);
      throw new Error(error.message || 'Failed to create item');
    }
  },

  /**
   * Update an existing item
   */
  async updateItem(id: number, data: ItemUpdateData): Promise<Item> {
    try {
      const response = await apiClient.put<ItemResponse>(`/api/items/${encodeId(id)}`, data);
      return response.item;
    } catch (error: any) {
      console.error('Error updating item:', error);
      throw new Error(error.message || 'Failed to update item');
    }
  },

  /**
   * Delete an item
   */
  async deleteItem(id: number): Promise<void> {
    try {
      await apiClient.delete(`/api/items/${encodeId(id)}`);
    } catch (error: any) {
      console.error('Error deleting item:', error);
      throw new Error(error.message || 'Failed to delete item');
    }
  },
};

