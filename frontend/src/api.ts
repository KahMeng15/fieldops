import axios from 'axios';
import { getExternalIpSync, fetchExternalIp } from './utils/clientIp';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use(async config => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const extIp = getExternalIpSync() || (await Promise.race([
    fetchExternalIp(),
    new Promise<string>(r => setTimeout(() => r(''), 150))
  ]));
  if (extIp) {
    config.headers['X-Client-External-IP'] = extIp;
    config.headers['X-Real-IP'] = extIp;
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

export interface CompanyLocation {
  id: string;
  company_id: string;
  name: string;
  address?: string;
  state?: string;
  district?: string;
  notes?: string;
  deployments_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CompanyContact {
  id: string;
  company_id: string;
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  description?: string;
  website?: string;
  contact_email?: string;
  contact_phone?: string;
  locations_count?: number;
  deployments_count?: number;
  locations?: CompanyLocation[];
  contacts?: CompanyContact[];
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

export const getCompanies = async (search?: string): Promise<Company[]> => {
  const { data } = await api.get('/companies', { params: { search } });
  return data;
};

export const getCompany = async (id: string): Promise<Company> => {
  const { data } = await api.get(`/companies/${id}`);
  return data;
};

export const createCompany = async (company: {
  name: string;
  description?: string;
  website?: string;
  contact_email?: string;
  contact_phone?: string;
}): Promise<Company> => {
  const { data } = await api.post('/companies', company);
  return data;
};

export const updateCompany = async (id: string, company: Partial<Company>): Promise<Company> => {
  const { data } = await api.patch(`/companies/${id}`, company);
  return data;
};

export const deleteCompany = async (id: string): Promise<void> => {
  await api.delete(`/companies/${id}`);
};

export const getCompanyContacts = async (companyId: string): Promise<CompanyContact[]> => {
  const { data } = await api.get(`/companies/${companyId}/contacts`);
  return data;
};

export const createCompanyContact = async (
  companyId: string,
  contact: {
    name: string;
    email?: string;
    phone?: string;
    position?: string;
    notes?: string;
  }
): Promise<CompanyContact> => {
  const { data } = await api.post(`/companies/${companyId}/contacts`, contact);
  return data;
};

export const updateCompanyContact = async (
  companyId: string,
  contactId: string,
  contact: Partial<CompanyContact>
): Promise<CompanyContact> => {
  const { data } = await api.patch(`/companies/${companyId}/contacts/${contactId}`, contact);
  return data;
};

export const deleteCompanyContact = async (
  companyId: string,
  contactId: string
): Promise<void> => {
  await api.delete(`/companies/${companyId}/contacts/${contactId}`);
};

export const getCompanyLocations = async (companyId: string): Promise<CompanyLocation[]> => {
  const { data } = await api.get(`/companies/${companyId}/locations`);
  return data;
};

export const createCompanyLocation = async (
  companyId: string,
  location: {
    name: string;
    address?: string;
    state?: string;
    district?: string;
    notes?: string;
  }
): Promise<CompanyLocation> => {
  const { data } = await api.post(`/companies/${companyId}/locations`, location);
  return data;
};

export const getLocations = async (params?: { company_id?: string; search?: string }): Promise<CompanyLocation[]> => {
  const { data } = await api.get('/locations', { params });
  return data;
};

export const getLocation = async (id: string): Promise<CompanyLocation> => {
  const { data } = await api.get(`/locations/${id}`);
  return data;
};

export const getLocationDeployments = async (locationId: string): Promise<DeploymentData[]> => {
  const { data } = await api.get(`/locations/${locationId}/deployments`);
  return data;
};

export const updateLocation = async (id: string, location: Partial<CompanyLocation>): Promise<CompanyLocation> => {
  const { data } = await api.patch(`/locations/${id}`, location);
  return data;
};

export const deleteLocation = async (id: string): Promise<void> => {
  await api.delete(`/locations/${id}`);
};

export interface DeploymentData {
  id?: string;
  company_id?: string;
  location_id?: string;
  customer_name: string;
  location: string;
  deployed_product?: string;
  deployment_date?: string;
  internal_group_name?: string;
  account_owner?: string;
  lead_engineer?: string;
  assisting_engineers?: string;
  deployment_type: 'Deployment' | 'POC';
  pre_poc_status?: string;
  poc_status?: string;
  post_poc_status?: string;
  status_updated_at?: string;
  status_updated_by_id?: string;
  status_updated_by_name?: string;
  deployment_folder?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export const getDeployments = async (params?: {
  customer?: string;
  company_id?: string;
  location_id?: string;
  product?: string;
  status?: string;
}) => {
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

export interface PhaseRemarkItem {
  id: string;
  deployment_id: string;
  phase: string;
  remark: string;
  author_id?: string;
  author_name?: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export const getPhaseRemarks = async (deploymentId: string, phase?: string): Promise<PhaseRemarkItem[]> => {
  const { data } = await api.get(`/deployments/${deploymentId}/phase-remarks`, {
    params: phase ? { phase } : undefined
  });
  return data;
};

export const createPhaseRemark = async (
  deploymentId: string, 
  remarkData: { phase: string; remark: string }
): Promise<PhaseRemarkItem> => {
  const { data } = await api.post(`/deployments/${deploymentId}/phase-remarks`, remarkData);
  return data;
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
  const { data } = await api.get('/credentials', {
    params: { deployment_id: deploymentId }
  });
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

export const updateCredential = async (
  credId: string,
  credential: {
    label?: string;
    credential_type?: string;
    payload: Record<string, any>;
  }
) => {
  const { data } = await api.put(`/credentials/${credId}`, credential);
  return data;
};

export const deleteCredential = async (credId: string) => {
  await api.delete(`/credentials/${credId}`);
};

export interface CredentialVersionItem {
  id: string;
  credential_id: string;
  deployment_id: string;
  version_number: number;
  credential_type: string;
  label: string;
  changed_by_name?: string;
  change_summary?: string;
  created_at: string;
  encrypted_payload?: string;
}

export const getCredentialVersions = async (credId: string): Promise<CredentialVersionItem[]> => {
  const { data } = await api.get(`/credentials/${credId}/versions`);
  return data;
};

export const revealCredentialVersion = async (versionId: string): Promise<{
  credential: Record<string, any>;
  version_number: number;
  label: string;
  credential_type: string;
}> => {
  const { data } = await api.post(`/credentials/versions/${versionId}/reveal`);
  return data;
};

export const restoreCredentialVersion = async (versionId: string): Promise<CredentialData> => {
  const { data } = await api.post(`/credentials/versions/${versionId}/restore`);
  return data;
};

export interface ActivityLogItem {
  id: string;
  timestamp: string | null;
  action: string;
  item_name: string;
  user_id: string | null;
  user_name: string;
  user_email: string | null;
  ip_address: string;
  device_info: string;
  browser_info: string;
  user_agent: string;
  changes?: Record<string, { old: any; new: any }>;
  old_value?: any;
  new_value?: any;
  notes?: string | null;
}

export interface CredentialAccessLogItem {
  id: string;
  timestamp: string | null;
  action: string;
  action_label: string;
  item_name: string;
  credential_type: string;
  user_id: string | null;
  user_name: string;
  user_email: string | null;
  ip_address: string;
  device_info: string;
  browser_info: string;
  user_agent: string;
  notes?: string | null;
}

export const getDeploymentActivity = async (id: string): Promise<ActivityLogItem[]> => {
  const { data } = await api.get(`/deployments/${id}/activity`);
  return data;
};

export const getDeploymentCredentialLogs = async (id: string): Promise<CredentialAccessLogItem[]> => {
  const { data } = await api.get(`/deployments/${id}/credential-access-logs`);
  return data;
};

export interface DeploymentFieldConfig {
  key: string;
  label: string;
  type: 'text' | 'select' | 'textarea' | 'date' | 'number';
  enabled: boolean;
  required: boolean;
  default_value: string;
  options?: string[];
  allow_other?: boolean;
  other_placeholder?: string;
  system_fixed?: boolean;
  description?: string;
}

export interface DeploymentFieldsSettings {
  fields: DeploymentFieldConfig[];
  custom_fields?: DeploymentFieldConfig[];
}

export const getDeploymentFieldSettings = async (): Promise<DeploymentFieldsSettings> => {
  const { data } = await api.get('/settings/deployment-fields');
  return data;
};

export const updateDeploymentFieldSettings = async (
  settings: DeploymentFieldsSettings
): Promise<DeploymentFieldsSettings> => {
  const { data } = await api.put('/settings/deployment-fields', settings);
  return data;
};

export const resetDeploymentFieldSettings = async (): Promise<DeploymentFieldsSettings> => {
  const { data } = await api.post('/settings/deployment-fields/reset');
  return data;
};

export interface CompanyFieldConfig {
  key: string;
  label: string;
  type: 'text' | 'select' | 'textarea' | 'date' | 'number';
  category?: 'profile' | 'location' | 'contact';
  enabled: boolean;
  required: boolean;
  default_value: string;
  options?: string[];
  allow_other?: boolean;
  other_placeholder?: string;
  system_fixed?: boolean;
  description?: string;
}

export interface CompanyFieldsSettings {
  fields: CompanyFieldConfig[];
  custom_fields?: CompanyFieldConfig[];
}

export const getCompanyFieldSettings = async (): Promise<CompanyFieldsSettings> => {
  const { data } = await api.get('/settings/company-fields');
  return data;
};

export const updateCompanyFieldSettings = async (
  settings: CompanyFieldsSettings
): Promise<CompanyFieldsSettings> => {
  const { data } = await api.put('/settings/company-fields', settings);
  return data;
};

export const resetCompanyFieldSettings = async (): Promise<CompanyFieldsSettings> => {
  const { data } = await api.post('/settings/company-fields/reset');
  return data;
};

export interface StateDistrictItem {
  state: string;
  districts: string[];
}

export const getStatesDistricts = async (): Promise<StateDistrictItem[]> => {
  const { data } = await api.get('/settings/states-districts');
  return data;
};

export const updateStatesDistricts = async (statesDistricts: StateDistrictItem[]): Promise<StateDistrictItem[]> => {
  const { data } = await api.put('/settings/states-districts', statesDistricts);
  return data;
};

export default api;
