// API service layer with JWT token management
const API_BASE_URL = 'http://localhost:8080';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Get token from localStorage
  getToken() {
    return localStorage.getItem('token');
  }

  // Get user from localStorage
  getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  // Check if user is authenticated
  isAuthenticated() {
    const token = this.getToken();
    return token !== null;
  }

  // Clear authentication data
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  // Make authenticated API request
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getToken();

    // Default headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add Authorization header if token exists
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      
      // Handle unauthorized responses
      if (response.status === 401) {
        // Token might be expired, clear auth data
        this.logout();
        // Redirect to login or handle as needed
        window.location.href = '/login';
        throw new Error('Unauthorized - please login again');
      }

      // Handle other error responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return response;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // GET request
  async get(endpoint, options = {}) {
    const response = await this.makeRequest(endpoint, {
      method: 'GET',
      ...options,
    });
    return response.json();
  }

  // POST request
  async post(endpoint, data = null, options = {}) {
    const response = await this.makeRequest(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : null,
      ...options,
    });
    return response.json();
  }

  // PUT request
  async put(endpoint, data = null, options = {}) {
    const response = await this.makeRequest(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : null,
      ...options,
    });
    return response.json();
  }

  // DELETE request
  async delete(endpoint, options = {}) {
    const response = await this.makeRequest(endpoint, {
      method: 'DELETE',
      ...options,
    });
    return response.json();
  }

  // Auth-specific methods
  async googleAuth(token) {
    return this.post('/api/auth/google', { token });
  }

  // Example protected endpoints (add your actual endpoints here)
  async getUserProfile() {
    return this.get('/api/user/profile');
  }

  async updateUserProfile(userData) {
    return this.put('/api/user/profile', userData);
  }

  // Example: Get user posts
  async getUserPosts() {
    return this.get('/api/user/posts');
  }

  // Example: Create new post
  async createPost(postData) {
    return this.post('/api/posts', postData);
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;
