// API service layer with JWT token management
const API_BASE_URL = 'http://localhost:8080';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  getToken() {
    return localStorage.getItem('token');
  }

  getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  isAuthenticated() {
    const token = this.getToken();
    return token !== null;
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      
      if (response.status === 401) {
        this.logout();
        window.location.href = '/login';
        throw new Error('Unauthorized - please login again');
      }

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

  async get(endpoint, options = {}) {
    const response = await this.makeRequest(endpoint, {
      method: 'GET',
      ...options,
    });
    return response.json();
  }

  async post(endpoint, data = null, options = {}) {
    const response = await this.makeRequest(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : null,
      ...options,
    });
    return response.json();
  }

  async put(endpoint, data = null, options = {}) {
    const response = await this.makeRequest(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : null,
      ...options,
    });
    return response.json();
  }

  async delete(endpoint, options = {}) {
    const response = await this.makeRequest(endpoint, {
      method: 'DELETE',
      ...options,
    });
    return response.json();
  }

  async googleAuth(token) {
    return this.post('/api/auth/google', { token });
  }
  async getUserProfile() {
    return this.get('/api/user/profile');
  }

  async updateUserProfile(userData) {
    return this.put('/api/user/profile', userData);
  }

  async getUserPosts() {
    return this.get('/api/user/posts');
  }
  async createPost(postData) {
    return this.post('/api/posts', postData);
  }

  async createMeeting(meetingData) {
    return this.post('/api/meetings', meetingData);
  }

  async joinMeeting(roomId) {
    return this.get(`/api/meetings/${roomId}`);
  }

  async getUserMeetings() {
    return this.get('/api/meetings/user/list');
  }

  async endMeeting(roomId) {
    return this.delete(`/api/meetings/${roomId}`);
  }
}

const apiService = new ApiService();
export default apiService;
