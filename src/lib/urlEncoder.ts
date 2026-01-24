/**
 * Frontend URL Encoding Utilities
 * 
 * Note: For security, ID encoding/decoding is handled by the backend.
 * This utility provides helper functions for working with encoded IDs in URLs.
 * The backend middleware automatically decodes encoded IDs.
 */

/**
 * Encode a numeric ID to a URL-safe string
 * Uses base64url encoding for client-side encoding
 * Backend will handle Hashids encoding for responses
 */
export const encodeId = (id: number): string => {
  // Simple base64url encoding for client-side
  // Backend can decode this or we can use it as-is if backend accepts both formats
  const buffer = new TextEncoder().encode(id.toString());
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

/**
 * Decode a URL-encoded ID back to a number
 * Tries to decode, falls back to parsing as integer
 */
export const decodeId = (encoded: string): number | null => {
  if (!encoded || typeof encoded !== 'string' || encoded.trim() === '') {
    console.warn('[Frontend URL Encoder] decodeId: Invalid input:', encoded);
    return null;
  }

  const trimmed = encoded.trim();

  // First, try to parse as regular number (for backward compatibility)
  const numericId = parseInt(trimmed, 10);
  if (!isNaN(numericId) && numericId.toString() === trimmed && numericId > 0) {
    console.log('[Frontend URL Encoder] decodeId: Parsed as number:', numericId);
    return numericId;
  }

  // Try to decode base64url
  try {
    // Replace base64url characters with base64 characters
    let padded = trimmed.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    const padding = (4 - (padded.length % 4)) % 4;
    const base64 = padded + '='.repeat(padding);
    
    console.log('[Frontend URL Encoder] decodeId: Decoding base64url:', {
      original: trimmed,
      padded,
      base64
    });
    
    // Decode base64 to string
    const decoded = atob(base64);
    console.log('[Frontend URL Encoder] decodeId: Decoded string:', decoded);
    
    // Try to parse as number
    const id = parseInt(decoded, 10);
    if (!isNaN(id) && id > 0) {
      console.log('[Frontend URL Encoder] decodeId: Successfully decoded to number:', id);
      return id;
    }
    
    console.warn('[Frontend URL Encoder] decodeId: Decoded string is not a valid positive number:', decoded);
    return null;
  } catch (error) {
    // If decoding fails, return null
    // Backend middleware will handle Hashids decoding
    console.warn('[Frontend URL Encoder] decodeId: Failed to decode:', trimmed, error);
    return null;
  }
};

/**
 * Create a URL with encoded ID parameter
 */
export const createUrlWithId = (basePath: string, id: number, paramName: string = 'id'): string => {
  const encoded = encodeId(id);
  const separator = basePath.includes('?') ? '&' : '?';
  return `${basePath}${separator}${paramName}=${encoded}`;
};

/**
 * Extract and decode ID from URL search params
 */
export const getIdFromUrl = (searchParams: URLSearchParams, paramName: string = 'id'): number | null => {
  const encoded = searchParams.get(paramName);
  if (!encoded) {
    return null;
  }
  return decodeId(encoded);
};

/**
 * Sanitize URL to prevent XSS
 */
export const sanitizeUrl = (url: string): string => {
  // Remove dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:'];
  for (const protocol of dangerousProtocols) {
    if (url.toLowerCase().startsWith(protocol)) {
      return '#';
    }
  }
  return url;
};

