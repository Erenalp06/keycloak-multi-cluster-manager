const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

export interface Cluster {
  id: number;
  name: string;
  base_url: string;
  realm: string;
  username: string;
  password: string;
  group_name?: string | null;
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

export const clusterApi = {
  getAll: async (): Promise<Cluster[]> => {
    const response = await fetch(`${API_URL}/clusters`);
    if (!response.ok) {
      throw new Error('Failed to fetch clusters');
    }
    return response.json();
  },

  getById: async (id: number): Promise<Cluster> => {
    const response = await fetch(`${API_URL}/clusters/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch cluster');
    }
    return response.json();
  },

  create: async (cluster: CreateClusterRequest): Promise<Cluster> => {
    const response = await fetch(`${API_URL}/clusters`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
      headers: {
        'Content-Type': 'application/json',
      },
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
    });
    if (!response.ok) {
      throw new Error('Failed to delete cluster');
    }
  },

  healthCheck: async (id: number): Promise<ClusterHealth> => {
    const response = await fetch(`${API_URL}/clusters/${id}/health`);
    if (!response.ok) {
      throw new Error('Failed to check cluster health');
    }
    return response.json();
  },

  getClients: async (id: number): Promise<any[]> => {
    const response = await fetch(`${API_URL}/clusters/${id}/clients`);
    if (!response.ok) {
      throw new Error('Failed to fetch clients');
    }
    return response.json();
  },

  getUsers: async (id: number, max?: number): Promise<any[]> => {
    const url = max ? `${API_URL}/clusters/${id}/users?max=${max}` : `${API_URL}/clusters/${id}/users`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }
    return response.json();
  },

  getGroups: async (id: number, max?: number): Promise<any[]> => {
    const url = max ? `${API_URL}/clusters/${id}/groups?max=${max}` : `${API_URL}/clusters/${id}/groups`;
    const response = await fetch(url);
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
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error('Failed to fetch cluster metrics');
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

  getClientDetails: async (clusterId: number): Promise<ClientDetail[]> => {
    const response = await fetch(`${API_URL}/clusters/${clusterId}/clients/details`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch client details');
    }
    return response.json();
  },

  getGroupDetails: async (clusterId: number): Promise<GroupDetail[]> => {
    const response = await fetch(`${API_URL}/clusters/${clusterId}/groups/details`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch group details');
    }
    return response.json();
  },

  getUserDetails: async (clusterId: number): Promise<UserDetail[]> => {
    const response = await fetch(`${API_URL}/clusters/${clusterId}/users/details`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch user details');
    }
    return response.json();
  },
};

export const roleApi = {
  getRoles: async (clusterId: number): Promise<Role[]> => {
    const response = await fetch(`${API_URL}/roles/cluster/${clusterId}`);
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
      `${API_URL}/diff/roles?source=${sourceId}&destination=${destinationId}`
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get role diff');
    }
    return response.json();
  },
  
  getClientDiff: async (sourceId: number, destinationId: number): Promise<ClientDiff[]> => {
    const response = await fetch(
      `${API_URL}/diff/clients?source=${sourceId}&destination=${destinationId}`
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get client diff');
    }
    return response.json();
  },
  
  getGroupDiff: async (sourceId: number, destinationId: number): Promise<GroupDiff[]> => {
    const response = await fetch(
      `${API_URL}/diff/groups?source=${sourceId}&destination=${destinationId}`
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get group diff');
    }
    return response.json();
  },
  
  getUserDiff: async (sourceId: number, destinationId: number): Promise<UserDiff[]> => {
    const response = await fetch(
      `${API_URL}/diff/users?source=${sourceId}&destination=${destinationId}`
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
      { method: 'POST' }
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to sync role');
    }
  },

  syncClient: async (sourceId: number, destinationId: number, clientId: string): Promise<void> => {
    const response = await fetch(
      `${API_URL}/sync/client?source=${sourceId}&destination=${destinationId}&clientId=${encodeURIComponent(clientId)}`,
      { method: 'POST' }
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to sync client');
    }
  },

  syncGroup: async (sourceId: number, destinationId: number, groupPath: string): Promise<void> => {
    const response = await fetch(
      `${API_URL}/sync/group?source=${sourceId}&destination=${destinationId}&groupPath=${encodeURIComponent(groupPath)}`,
      { method: 'POST' }
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to sync group');
    }
  },

  syncUser: async (sourceId: number, destinationId: number, username: string): Promise<void> => {
    const response = await fetch(
      `${API_URL}/sync/user?source=${sourceId}&destination=${destinationId}&username=${encodeURIComponent(username)}`,
      { method: 'POST' }
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to sync user');
    }
  },
};

