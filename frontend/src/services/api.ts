const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

// Helper function to get auth token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

// Helper function to get auth headers
const getAuthHeaders = (): HeadersInit => {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export interface Cluster {
  id: number;
  name: string;
  base_url: string;
  realm: string;
  username: string;
  password: string;
  group_name?: string | null;
  metrics_endpoint?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateClusterRequest {
  name: string;
  base_url: string;
  realm?: string;
  username: string;
  password: string;
  group_name?: string;
  metrics_endpoint?: string;
}

export interface ClusterHealth {
  cluster_id: number;
  status: string;
  message?: string;
}

export interface ClusterMetrics {
  cluster_id: number;
  clients: number;
  roles: number;
  users: number;
  groups: number;
}

export interface PrometheusMetrics {
  cluster_id: number;
  available: boolean;
  
  // Health Row
  uptime?: number;
  active_sessions?: number;
  jvm_heap_percent?: number;
  db_pool_usage?: number;
  
  // Traffic Row
  logins_1min?: number;
  failed_logins_1min?: number;
  token_requests?: number;
  token_errors?: number;
  
  // Performance Row
  avg_request_duration?: number;
  token_endpoint_latency?: number;
  http_request_count?: number;
  gc_pauses_5min?: number;
  
  // Cache Row
  cache_hit_rate?: number;
  cache_misses?: number;
  infinispan_metrics?: Record<string, number>;
  
  error?: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  composite: boolean;
  clientRole: boolean;
  containerId?: string;
}

export interface RoleDiff {
  role: Role;
  source: string;
  destination: string;
  status: string;
  side: string; // "source" or "destination"
}

export interface ClientDetail {
  id: string;
  clientId: string;
  name: string;
  description?: string;
  protocol: string;
  redirectUris: string[];
  webOrigins: string[];
  publicClient: boolean;
  bearerOnly: boolean;
  directAccessGrantsEnabled: boolean;
  serviceAccountsEnabled: boolean;
  defaultClientScopes: string[];
  optionalClientScopes: string[];
  enabled: boolean;
}

export interface ClientDiff {
  client: ClientDetail;
  source: string;
  destination: string;
  status: string;
  side: string; // "source", "destination", or "both"
  differences?: string[];
  sourceValue?: Record<string, any>;
  destinationValue?: Record<string, any>;
}

export interface GroupDetail {
  id: string;
  name: string;
  path: string;
  subGroups?: GroupDetail[];
  realmRoles: string[];
  clientRoles: Record<string, string[]>;
  attributes: Record<string, string[]>;
}

export interface GroupDiff {
  group: GroupDetail;
  source: string;
  destination: string;
  status: string;
  side: string; // "source", "destination", or "both"
  differences?: string[];
  sourceValue?: Record<string, any>;
  destinationValue?: Record<string, any>;
}

export interface UserDetail {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  enabled: boolean;
  realmRoles: string[];
  clientRoles: Record<string, string[]>;
  groups: string[];
  attributes: Record<string, string[]>;
  requiredActions: string[];
}

export interface UserDiff {
  user: UserDetail;
  source: string;
  destination: string;
  status: string;
  side: string; // "source", "destination", or "both"
  differences?: string[];
  sourceValue?: Record<string, any>;
  destinationValue?: Record<string, any>;
}

export interface AppUser {
  id: number;
  username: string;
  email: string;
  role: string; // "admin" or "user"
  created_at: string;
  updated_at: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  role: string;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  password?: string;
  role?: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: AppUser;
}

export const authApi = {
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to register');
    }
    return response.json();
  },

  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to login');
    }
    return response.json();
  },

  me: async (): Promise<AppUser> => {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to get user info');
    }
    return response.json();
  },
};

export const clusterApi = {
  getAll: async (): Promise<Cluster[]> => {
    const response = await fetch(`${API_URL}/clusters`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch clusters');
    }
    return response.json();
  },

  getById: async (id: number): Promise<Cluster> => {
    const response = await fetch(`${API_URL}/clusters/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch cluster' }));
      throw new Error(error.error || 'Failed to fetch cluster');
    }
    return response.json();
  },

  create: async (cluster: CreateClusterRequest): Promise<Cluster> => {
    const response = await fetch(`${API_URL}/clusters`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(cluster),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create cluster');
    }
    return response.json();
  },

  update: async (id: number, cluster: CreateClusterRequest): Promise<Cluster> => {
    const response = await fetch(`${API_URL}/clusters/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(cluster),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update cluster');
    }
    return response.json();
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetch(`${API_URL}/clusters/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to delete cluster');
    }
  },

  healthCheck: async (id: number): Promise<ClusterHealth> => {
    const response = await fetch(`${API_URL}/clusters/${id}/health`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to check cluster health' }));
      throw new Error(error.error || 'Failed to check cluster health');
    }
    return response.json();
  },

  getClients: async (id: number): Promise<any[]> => {
    const response = await fetch(`${API_URL}/clusters/${id}/clients`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch clients');
    }
    return response.json();
  },

  getUsers: async (id: number, max?: number): Promise<any[]> => {
    const url = max ? `${API_URL}/clusters/${id}/users?max=${max}` : `${API_URL}/clusters/${id}/users`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }
    return response.json();
  },

  getGroups: async (id: number, max?: number): Promise<any[]> => {
    const url = max ? `${API_URL}/clusters/${id}/groups?max=${max}` : `${API_URL}/clusters/${id}/groups`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch groups');
    }
    return response.json();
  },

  getMetrics: async (id: number): Promise<ClusterMetrics> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout
    
    try {
      const response = await fetch(`${API_URL}/clusters/${id}/metrics`, {
        signal: controller.signal,
        headers: getAuthHeaders(),
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch cluster metrics' }));
        throw new Error(error.error || 'Failed to fetch cluster metrics');
      }
      return response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout: Metrics took too long to load');
      }
      throw error;
    }
  },

  getRBACAnalysis: async (id: number, entityType: 'user' | 'role' | 'client', entityName: string): Promise<any> => {
    const response = await fetch(`${API_URL}/clusters/${id}/rbac-analysis?type=${entityType}&name=${encodeURIComponent(entityName)}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch RBAC analysis' }));
      throw new Error(error.error || 'Failed to fetch RBAC analysis');
    }
    return response.json();
  },

  getPrometheusMetrics: async (id: number): Promise<PrometheusMetrics> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${API_URL}/clusters/${id}/prometheus-metrics`, {
        signal: controller.signal,
        headers: getAuthHeaders(),
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch Prometheus metrics' }));
        throw new Error(error.error || 'Failed to fetch Prometheus metrics');
      }
      return response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout: Prometheus metrics took too long to load');
      }
      // Return unavailable metrics instead of throwing
      return {
        cluster_id: id,
        available: false,
        error: error.message || 'Failed to fetch Prometheus metrics',
      };
    }
  },

  getServerInfo: async (id: number): Promise<any> => {
    const response = await fetch(`${API_URL}/clusters/${id}/server-info`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch server info' }));
      throw new Error(error.error || 'Failed to fetch server info');
    }
    return response.json();
  },

  getUserToken: async (id: number, username: string, password: string, clientId?: string): Promise<any> => {
    const response = await fetch(`${API_URL}/clusters/${id}/user-token`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ username, password, client_id: clientId || 'admin-cli' }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to get user token' }));
      throw new Error(error.error || 'Failed to get user token');
    }
    return response.json();
  },

  getClientDetails: async (clusterId: number): Promise<ClientDetail[]> => {
    const response = await fetch(`${API_URL}/clusters/${clusterId}/clients/details`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch client details');
    }
    return response.json();
  },

  getGroupDetails: async (clusterId: number): Promise<GroupDetail[]> => {
    const response = await fetch(`${API_URL}/clusters/${clusterId}/groups/details`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch group details');
    }
    return response.json();
  },

  getUserDetails: async (clusterId: number): Promise<UserDetail[]> => {
    const response = await fetch(`${API_URL}/clusters/${clusterId}/users/details`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch user details');
    }
    return response.json();
  },
};

export const roleApi = {
  getRoles: async (clusterId: number): Promise<Role[]> => {
    const response = await fetch(`${API_URL}/roles/cluster/${clusterId}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch roles');
    }
    return response.json();
  },
};

export const diffApi = {
  getRoleDiff: async (sourceId: number, destinationId: number): Promise<RoleDiff[]> => {
    const response = await fetch(
      `${API_URL}/diff/roles?source=${sourceId}&destination=${destinationId}`,
      { headers: getAuthHeaders() }
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get role diff');
    }
    return response.json();
  },
  
  getClientDiff: async (sourceId: number, destinationId: number): Promise<ClientDiff[]> => {
    const response = await fetch(
      `${API_URL}/diff/clients?source=${sourceId}&destination=${destinationId}`,
      { headers: getAuthHeaders() }
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get client diff');
    }
    return response.json();
  },
  
  getGroupDiff: async (sourceId: number, destinationId: number): Promise<GroupDiff[]> => {
    const response = await fetch(
      `${API_URL}/diff/groups?source=${sourceId}&destination=${destinationId}`,
      { headers: getAuthHeaders() }
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get group diff');
    }
    return response.json();
  },
  
  getUserDiff: async (sourceId: number, destinationId: number): Promise<UserDiff[]> => {
    const response = await fetch(
      `${API_URL}/diff/users?source=${sourceId}&destination=${destinationId}`,
      { headers: getAuthHeaders() }
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get user diff');
    }
    return response.json();
  },
};

export const syncApi = {
  syncRole: async (sourceId: number, destinationId: number, roleName: string): Promise<void> => {
    const response = await fetch(
      `${API_URL}/sync/role?source=${sourceId}&destination=${destinationId}&roleName=${encodeURIComponent(roleName)}`,
      { method: 'POST', headers: getAuthHeaders() }
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to sync role');
    }
  },

  syncClient: async (sourceId: number, destinationId: number, clientId: string): Promise<void> => {
    const response = await fetch(
      `${API_URL}/sync/client?source=${sourceId}&destination=${destinationId}&clientId=${encodeURIComponent(clientId)}`,
      { method: 'POST', headers: getAuthHeaders() }
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to sync client');
    }
  },

  syncGroup: async (sourceId: number, destinationId: number, groupPath: string): Promise<void> => {
    const response = await fetch(
      `${API_URL}/sync/group?source=${sourceId}&destination=${destinationId}&groupPath=${encodeURIComponent(groupPath)}`,
      { method: 'POST', headers: getAuthHeaders() }
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to sync group');
    }
  },

  syncUser: async (sourceId: number, destinationId: number, username: string): Promise<void> => {
    const response = await fetch(
      `${API_URL}/sync/user?source=${sourceId}&destination=${destinationId}&username=${encodeURIComponent(username)}`,
      { method: 'POST', headers: getAuthHeaders() }
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to sync user');
    }
  },
};

export const userApi = {
  getAll: async (): Promise<AppUser[]> => {
    const response = await fetch(`${API_URL}/users`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch users');
    }
    return response.json();
  },

  create: async (user: CreateUserRequest): Promise<AppUser> => {
    const response = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(user),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create user');
    }
    return response.json();
  },

  update: async (id: number, user: UpdateUserRequest): Promise<AppUser> => {
    const response = await fetch(`${API_URL}/users/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(user),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update user');
    }
    return response.json();
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetch(`${API_URL}/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete user');
    }
  },
};

export interface Permission {
  id: number;
  name: string;
  description?: string;
  created_at: string;
}

export interface AppRole {
  id: number;
  name: string;
  description?: string;
  permissions?: Permission[];
  created_at: string;
  updated_at: string;
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
  permission_ids?: number[];
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permission_ids?: number[];
}

export interface AssignRoleRequest {
  role_ids: number[];
}

export const roleManagementApi = {
  getAllRoles: async (): Promise<AppRole[]> => {
    const response = await fetch(`${API_URL}/app-roles`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch roles');
    }
    return response.json();
  },

  getRoleById: async (id: number): Promise<AppRole> => {
    const response = await fetch(`${API_URL}/app-roles/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch role');
    }
    return response.json();
  },

  getAllPermissions: async (): Promise<Permission[]> => {
    const response = await fetch(`${API_URL}/app-roles/permissions`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch permissions');
    }
    return response.json();
  },

  createRole: async (role: CreateRoleRequest): Promise<AppRole> => {
    const response = await fetch(`${API_URL}/app-roles`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(role),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create role');
    }
    return response.json();
  },

  updateRole: async (id: number, role: UpdateRoleRequest): Promise<AppRole> => {
    const response = await fetch(`${API_URL}/app-roles/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(role),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update role');
    }
    return response.json();
  },

  deleteRole: async (id: number): Promise<void> => {
    const response = await fetch(`${API_URL}/app-roles/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete role');
    }
  },

  assignRolesToUser: async (userId: number, roleIds: number[]): Promise<void> => {
    const response = await fetch(`${API_URL}/app-roles/users/${userId}/assign`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ role_ids: roleIds }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to assign roles');
    }
  },

  getUserRoles: async (userId: number): Promise<AppRole[]> => {
    const response = await fetch(`${API_URL}/app-roles/users/${userId}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch user roles');
    }
    return response.json();
  },
};

export const exportImportApi = {
  exportRealm: async (clusterId: number): Promise<Blob> => {
    const response = await fetch(`${API_URL}/export-import/clusters/${clusterId}/realm/export`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to export realm');
    }
    return response.blob();
  },

  importRealm: async (clusterId: number, realmConfig: string): Promise<void> => {
    const response = await fetch(`${API_URL}/export-import/clusters/${clusterId}/realm/import`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ realmConfig }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to import realm');
    }
  },

  exportUsers: async (clusterId: number): Promise<Blob> => {
    const response = await fetch(`${API_URL}/export-import/clusters/${clusterId}/users/export`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to export users');
    }
    return response.blob();
  },

  importUsers: async (clusterId: number, users: string): Promise<void> => {
    const response = await fetch(`${API_URL}/export-import/clusters/${clusterId}/users/import`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ users }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to import users');
    }
  },

  exportClients: async (clusterId: number): Promise<Blob> => {
    const response = await fetch(`${API_URL}/export-import/clusters/${clusterId}/clients/export`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to export clients');
    }
    return response.blob();
  },

  importClients: async (clusterId: number, clients: string): Promise<void> => {
    const response = await fetch(`${API_URL}/export-import/clusters/${clusterId}/clients/import`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ clients }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to import clients');
    }
  },
};

