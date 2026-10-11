/**
 * SMART DIGITAL LOCKER - CENTRALIZED API CLIENT
 */

// Configurable API Base URL - defaults to backend at http://localhost:5000/api
const API_BASE_URL = window.API_BASE_URL || localStorage.getItem('API_BASE_URL') || 'http://localhost:5000/api';

const TOKEN_STORAGE_KEY = 'digilocker_jwt_token';
const USER_STORAGE_KEY = 'digilocker_user_profile';

// Auth Token & User Storage Helpers
function getAuthToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

function setAuthToken(token, user) {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }
  if (user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  }
}

function getStoredUser() {
  const userJson = localStorage.getItem(USER_STORAGE_KEY);
  try {
    return userJson ? JSON.parse(userJson) : null;
  } catch {
    return null;
  }
}

function clearAuthToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

function isLoggedIn() {
  return Boolean(getAuthToken());
}

/**
 * Generic Fetch Wrapper with Authorization header & error handling
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers = options.headers || {};
  const token = getAuthToken();

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(url, config);

    // Handle 401 Unauthorized (Expired or Invalid Token)
    if (response.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/register') {
      clearAuthToken();
      window.dispatchEvent(new CustomEvent('unauthorized-session'));
    }

    if (response.status === 204) {
      return { success: true };
    }

    const contentType = response.headers.get('content-type') || '';
    let data;

    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errorMessage = (data && data.error) || data || `Request failed with status ${response.status}`;
      const error = new Error(errorMessage);
      error.status = response.status;
      error.details = data && data.details;
      throw error;
    }

    return data;
  } catch (err) {
    if (!err.status) {
      err.message = 'Unable to connect to server. Please check your network connection.';
    }
    throw err;
  }
}

// API Service Methods
const Api = {
  // Health Check
  async health() {
    return request('/health');
  },

  // Auth Methods
  async register({ fullName, email, password }) {
    return request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, password })
    });
  },

  async login({ email, password }) {
    const data = await request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (data && data.token) {
      setAuthToken(data.token, data.user);
    }
    return data;
  },

  // User Methods
  async getCurrentUser() {
    const data = await request('/users/me');
    if (data && data.user) {
      const stored = getStoredUser() || {};
      setAuthToken(null, { ...stored, ...data.user });
    }
    return data;
  },

  async updateProfile({ fullName }) {
    const data = await request('/users/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName })
    });
    if (data && data.user) {
      const stored = getStoredUser() || {};
      setAuthToken(null, { ...stored, ...data.user });
    }
    return data;
  },

  async changePassword({ currentPassword, newPassword }) {
    return request('/users/change-password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword })
    });
  },

  // Document Management Methods
  async getDocuments({ page = 1, limit = 10, search = '', category = '' } = {}) {
    const queryParams = new URLSearchParams();
    if (page) queryParams.append('page', page);
    if (limit) queryParams.append('limit', limit);
    if (search) queryParams.append('search', search);
    if (category) queryParams.append('category', category);

    const queryString = queryParams.toString();
    const endpoint = `/documents${queryString ? '?' + queryString : ''}`;

    return request(endpoint);
  },

  async uploadDocument(formData) {
    // Note: Do NOT set Content-Type header when sending FormData! Browser handles boundary automatically.
    return request('/documents', {
      method: 'POST',
      body: formData
    });
  },

  async getDocumentById(id) {
    return request(`/documents/${id}`);
  },

  async updateDocument(id, updates) {
    return request(`/documents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
  },

  async downloadDocument(id) {
    const url = `${API_BASE_URL}/documents/${id}/download`;
    const token = getAuthToken();

    const response = await fetch(url, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearAuthToken();
        window.dispatchEvent(new CustomEvent('unauthorized-session'));
      }
      let errText;
      try {
        const errJson = await response.json();
        errText = errJson.error || 'Download failed.';
      } catch {
        errText = 'Download failed.';
      }
      throw new Error(errText);
    }

    // Extract filename from Content-Disposition header if available
    const disposition = response.headers.get('content-disposition');
    let filename = `document_${id}`;
    if (disposition && disposition.includes('filename=')) {
      const matches = disposition.match(/filename="?([^";]+)"?/);
      if (matches && matches[1]) {
        filename = matches[1].replace(/["']/g, '');
      }
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    
    // Trigger download
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);

    return { filename, size: blob.size };
  },

  async deleteDocument(id) {
    return request(`/documents/${id}`, {
      method: 'DELETE'
    });
  }
};
