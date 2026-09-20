import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refresh_token = localStorage.getItem('refresh_token');
        if (!refresh_token) {
          throw new Error('No refresh token');
        }
        const { data } = await axios.post('/api/auth/refresh', {}, {
          headers: { Authorization: `Bearer ${refresh_token}` }
        });
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        api.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`;
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export const login = async (credentials: { username: string; password: string }) => {
  const { data } = await api.post('/auth/login', credentials);
  return data;
};

export const getMe = async () => {
  const { data } = await api.get('/auth/me');
  return data;
};

export const logout = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  window.location.href = '/login';
};

export const getHealth = async () => {
  const { data } = await api.get('/health');
  return data;
};

export interface DeploymentData {
  id?: string;
  customer_name: string;
  location: string;
  internal_group_name?: string;
  deployment_type: 'Deployment' | 'POC';
  pre_poc_status?: string;
  poc_status?: string;
  post_poc_status?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export const getDeployments = async (params?: { customer?: string; status?: string }) => {
  const { data } = await api.get('/deployments', { params });
  return data;
};

export const getDeployment = async (id: string) => {
  const { data } = await api.get(`/deployments/${id}`);
  return data;
};

export const createDeployment = async (deployment: Partial<DeploymentData>) => {
  const { data } = await api.post('/deployments', deployment);
  return data;
};

export const updateDeployment = async (id: string, deployment: Partial<DeploymentData>) => {
  const { data } = await api.patch(`/deployments/${id}`, deployment);
  return data;
};

export const deleteDeployment = async (id: string) => {
  await api.delete(`/deployments/${id}`);
};

export interface CredentialData {
  id?: string;
  deployment_id: string;
  credential_type: string;
  label: string;
  payload?: Record<string, any>;
  encrypted_payload?: string;
}

export const getCredentials = async (deploymentId: string) => {
  const { data } = await api.get(`/credentials?deployment_id=${deploymentId}`);
  return data;
};

export const createCredential = async (credential: {
  deployment_id: string;
  credential_type: string;
  label: string;
  payload: Record<string, any>;
}) => {
  const { data } = await api.post('/credentials', credential);
  return data;
};

export const revealCredential = async (credId: string) => {
  const { data } = await api.post(`/credentials/${credId}/reveal`);
  return data;
};

export default api;
