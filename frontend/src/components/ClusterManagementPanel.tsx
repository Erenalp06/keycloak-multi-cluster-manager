import { useState, useEffect } from 'react';
import { Cluster } from '@/services/api';
import { clusterApi, roleApi, exportImportApi, UserDetail, GroupDetail, Role, ClientDetail } from '@/services/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, Users, Key, Folder, Building2, Plus, Loader2, Search, Edit, Trash2, CheckCircle2, AlertCircle, ExternalLink, ChevronDown, ChevronRight, Download, Upload } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import UserTable from '@/components/UserTable';
import GroupTable from '@/components/GroupTable';
import ClientTable from '@/components/ClientTable';
import UserDetailSlideOver from '@/components/UserDetailSlideOver';
import GroupDetailSlideOver from '@/components/GroupDetailSlideOver';
import ClientDetailSlideOver from '@/components/ClientDetailSlideOver';
import UserFederationManagement from '@/components/UserFederationManagement';

interface ClusterManagementPanelProps {
  cluster: Cluster;
}

export default function ClusterManagementPanel({ cluster }: ClusterManagementPanelProps) {
  const [activeTab, setActiveTab] = useState<'realm' | 'users' | 'roles' | 'groups' | 'user-federation'>('realm');
  
  // Data states
  const [users, setUsers] = useState<UserDetail[]>([]);
  const [groups, setGroups] = useState<GroupDetail[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [clients, setClients] = useState<ClientDetail[]>([]);
  const [clientRoles, setClientRoles] = useState<Record<string, Role[]>>({});
  
  // Loading states
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingClientRoles, setLoadingClientRoles] = useState<Record<string, boolean>>({});
  const [creating, setCreating] = useState(false);
  
  // Error and success states
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  
  // Search states
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [groupSearchTerm, setGroupSearchTerm] = useState('');
  const [roleSearchTerm, setRoleSearchTerm] = useState('');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  
  // Slide-over states
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<UserDetail | null>(null);
  const [selectedGroupForDetail, setSelectedGroupForDetail] = useState<GroupDetail | null>(null);
  const [selectedClientForDetail, setSelectedClientForDetail] = useState<ClientDetail | null>(null);
  const [userDetailOpen, setUserDetailOpen] = useState(false);
  const [groupDetailOpen, setGroupDetailOpen] = useState(false);
  const [clientDetailOpen, setClientDetailOpen] = useState(false);
  
  // Group members (users in each group) - for selected group
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<UserDetail[]>([]);
  
  // Client roles for selected client
  const [selectedClientRolesList, setSelectedClientRolesList] = useState<Role[]>([]);
  const [loadingSelectedClientRoles, setLoadingSelectedClientRoles] = useState(false);
  
  // Dialog states
  const [createUserDialog, setCreateUserDialog] = useState(false);
  const [createGroupDialog, setCreateGroupDialog] = useState(false);
  const [createRoleDialog, setCreateRoleDialog] = useState(false);
  const [createClientDialog, setCreateClientDialog] = useState(false);
  const [assignUserRoleDialog, setAssignUserRoleDialog] = useState(false);
  const [assignGroupRoleDialog, setAssignGroupRoleDialog] = useState(false);
  const [addUserToGroupDialog, setAddUserToGroupDialog] = useState(false);
  const [exportImportDialog, setExportImportDialog] = useState<{ open: boolean; type: 'realm' | 'users' | 'clients' | null; action: 'export' | 'import' | null }>({
    open: false,
    type: null,
    action: null,
  });
  const [exportSelectionDialog, setExportSelectionDialog] = useState<{ open: boolean; type: 'users' | 'clients' | null }>({
    open: false,
    type: null,
  });
  const [exportItems, setExportItems] = useState<any[]>([]);
  const [selectedExportItems, setSelectedExportItems] = useState<Set<string>>(new Set());
  const [loadingExportItems, setLoadingExportItems] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Client role assignment
  const [assignClientRoleDialog, setAssignClientRoleDialog] = useState(false);
  const [selectedClientForRole, setSelectedClientForRole] = useState<ClientDetail | null>(null);
  const [selectedSourceClient, setSelectedSourceClient] = useState<string>('');
  const [selectedClientRoleNames, setSelectedClientRoleNames] = useState<Set<string>>(new Set());
  
  // Assignment states
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<GroupDetail | null>(null);
  const [selectedRealmRoles, setSelectedRealmRoles] = useState<Set<string>>(new Set());
  const [selectedClientRoles, setSelectedClientRoles] = useState<Record<string, Set<string>>>({});
  const [assigning, setAssigning] = useState(false);
  
  // Form states
  const [newUser, setNewUser] = useState<Partial<UserDetail>>({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    enabled: true,
    realmRoles: [],
    clientRoles: {},
    groups: [],
  });
  const [newGroup, setNewGroup] = useState<Partial<GroupDetail>>({
    name: '',
    path: '',
  });
  const [newRole, setNewRole] = useState<Partial<Role>>({
    name: '',
    description: '',
    composite: false,
  });
  const [newClient, setNewClient] = useState<Partial<ClientDetail>>({
    clientId: '',
    name: '',
    protocol: 'openid-connect',
    enabled: true,
    publicClient: false,
    directAccessGrantsEnabled: true,
    serviceAccountsEnabled: false,
  });

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === 'users' && users.length === 0 && !loadingUsers) {
      loadUsers();
    } else if (activeTab === 'groups' && groups.length === 0 && !loadingGroups) {
      loadGroups();
    } else if (activeTab === 'roles' && roles.length === 0 && !loadingRoles) {
      loadRoles();
    } else if (activeTab === 'realm' && clients.length === 0 && !loadingClients) {
      loadClients();
    }
  }, [activeTab]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    setError('');
    try {
      const data = await clusterApi.getUserDetails(cluster.id);
      setUsers(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadGroups = async () => {
    setLoadingGroups(true);
    setError('');
    try {
      const data = await clusterApi.getGroupDetails(cluster.id);
      setGroups(data || []);
      // Load users if not already loaded (needed for group members)
      if (users.length === 0 && !loadingUsers) {
        await loadUsers();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load groups');
      setGroups([]);
    } finally {
      setLoadingGroups(false);
    }
  };

  const loadRoles = async () => {
    setLoadingRoles(true);
    setError('');
    try {
      const data = await roleApi.getRoles(cluster.id);
      setRoles(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load roles');
      setRoles([]);
    } finally {
      setLoadingRoles(false);
    }
  };

  const loadClients = async () => {
    setLoadingClients(true);
    setError('');
    try {
      const data = await clusterApi.getClients(cluster.id);
      setClients(data || []);
      
      // Load roles for all clients in parallel
      if (data && data.length > 0) {
        const rolePromises = data.map(async (client) => {
          const clientId = client.clientId || client.id || '';
          if (clientId && !clientRoles[clientId]) {
            try {
              const roles = await clusterApi.getClientRoles(cluster.id, clientId);
              return { clientId, roles };
            } catch (err) {
              console.error(`Failed to load roles for client ${clientId}:`, err);
              return { clientId, roles: [] };
            }
          }
          return null;
        });
        
        const roleResults = await Promise.all(rolePromises);
        const newClientRoles: Record<string, any[]> = { ...clientRoles };
        roleResults.forEach((result) => {
          if (result) {
            newClientRoles[result.clientId] = result.roles;
          }
        });
        setClientRoles(newClientRoles);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load clients');
      setClients([]);
    } finally {
      setLoadingClients(false);
    }
  };

  const loadClientRoles = async (clientId: string) => {
    if (loadingClientRoles[clientId] || clientRoles[clientId]) return;
    
    setLoadingClientRoles(prev => ({ ...prev, [clientId]: true }));
    try {
      const roles = await clusterApi.getClientRoles(cluster.id, clientId);
      setClientRoles(prev => ({ ...prev, [clientId]: roles }));
    } catch (err: any) {
      console.error(`Failed to load client roles for ${clientId}:`, err);
      setClientRoles(prev => ({ ...prev, [clientId]: [] }));
    } finally {
      setLoadingClientRoles(prev => ({ ...prev, [clientId]: false }));
    }
  };


  const handleCreateUser = async () => {
    if (!newUser.username) return;
    
    setCreating(true);
    setError('');
    setSuccess('');
    
    try {
      await clusterApi.createUser(cluster.id, newUser as UserDetail);
      setSuccess('User created successfully');
      setCreateUserDialog(false);
      setNewUser({
        username: '',
        email: '',
        firstName: '',
        lastName: '',
        enabled: true,
        realmRoles: [],
        clientRoles: {},
        groups: [],
      });
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroup.name) return;
    
    setCreating(true);
    setError('');
    setSuccess('');
    
    try {
      await clusterApi.createGroup(cluster.id, newGroup as GroupDetail);
      setSuccess('Group created successfully');
      setCreateGroupDialog(false);
      setNewGroup({
        name: '',
        path: '',
      });
      loadGroups();
    } catch (err: any) {
      setError(err.message || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRole.name) return;
    
    setCreating(true);
    setError('');
    setSuccess('');
    
    try {
      await clusterApi.createRealmRole(cluster.id, newRole as Role);
      setSuccess('Role created successfully');
      setCreateRoleDialog(false);
      setNewRole({
        name: '',
        description: '',
        composite: false,
      });
      loadRoles();
    } catch (err: any) {
      setError(err.message || 'Failed to create role');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateClient = async () => {
    if (!newClient.clientId) return;
    
    setCreating(true);
    setError('');
    setSuccess('');
    
    try {
      await clusterApi.createClient(cluster.id, newClient as ClientDetail);
      setSuccess('Client created successfully');
      setCreateClientDialog(false);
      setNewClient({
        clientId: '',
        name: '',
        protocol: 'openid-connect',
        enabled: true,
        publicClient: false,
        directAccessGrantsEnabled: true,
        serviceAccountsEnabled: false,
      });
      loadClients();
    } catch (err: any) {
      setError(err.message || 'Failed to create client');
    } finally {
      setCreating(false);
    }
  };

  const handleAssignUserRoles = async () => {
    if (!selectedUser) return;
    
    setAssigning(true);
    setError('');
    setSuccess('');
    
    try {
      const realmRoleNames = Array.from(selectedRealmRoles);
      const clientRoles: Record<string, string[]> = {};
      
      Object.entries(selectedClientRoles).forEach(([clientId, roleSet]) => {
        if (roleSet.size > 0) {
          clientRoles[clientId] = Array.from(roleSet);
        }
      });

      if (realmRoleNames.length > 0) {
        await clusterApi.assignRealmRolesToUser(cluster.id, selectedUser.id, realmRoleNames);
      }

      if (Object.keys(clientRoles).length > 0) {
        await clusterApi.assignClientRolesToUser(cluster.id, selectedUser.id, clientRoles);
      }

      setSuccess('Roles assigned successfully');
      setAssignUserRoleDialog(false);
      setSelectedUser(null);
      setSelectedRealmRoles(new Set());
      setSelectedClientRoles({});
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to assign roles');
    } finally {
      setAssigning(false);
    }
  };

  const handleAssignGroupRoles = async () => {
    if (!selectedGroup) return;
    
    setAssigning(true);
    setError('');
    setSuccess('');
    
    try {
      const realmRoleNames = Array.from(selectedRealmRoles);
      const clientRoles: Record<string, string[]> = {};
      
      Object.entries(selectedClientRoles).forEach(([clientId, roleSet]) => {
        if (roleSet.size > 0) {
          clientRoles[clientId] = Array.from(roleSet);
        }
      });

      if (realmRoleNames.length > 0) {
        await clusterApi.assignRealmRolesToGroup(cluster.id, selectedGroup.id, realmRoleNames);
      }

      if (Object.keys(clientRoles).length > 0) {
        await clusterApi.assignClientRolesToGroup(cluster.id, selectedGroup.id, clientRoles);
      }

      setSuccess('Roles assigned to group successfully');
      setAssignGroupRoleDialog(false);
      setSelectedGroup(null);
      setSelectedRealmRoles(new Set());
      setSelectedClientRoles({});
      loadGroups();
    } catch (err: any) {
      setError(err.message || 'Failed to assign roles to group');
    } finally {
      setAssigning(false);
    }
  };

  const handleAddUserToGroup = async () => {
    if (!selectedUser || !selectedGroup) return;
    
    setAssigning(true);
    setError('');
    setSuccess('');
    
    try {
      await clusterApi.addUserToGroup(cluster.id, selectedUser.id, selectedGroup.id);
      setSuccess('User added to group successfully');
      setAddUserToGroupDialog(false);
      setSelectedUser(null);
      setSelectedGroup(null);
      loadUsers();
      loadGroups();
    } catch (err: any) {
      setError(err.message || 'Failed to add user to group');
    } finally {
      setAssigning(false);
    }
  };

  const openExportSelectionDialog = async (type: 'users' | 'clients') => {
    setExportSelectionDialog({ open: true, type });
    setLoadingExportItems(true);
    setSelectedExportItems(new Set());
    
    try {
      let items: any[] = [];
      
      switch (type) {
        case 'users':
          items = await clusterApi.getUsers(cluster.id, 0);
          setExportItems(items.map((u: any) => ({ id: u.id || u.username, name: u.username || u.email || u.id })));
          // Select all by default
          setSelectedExportItems(new Set(items.map((u: any) => u.id || u.username)));
          break;
        case 'clients':
          items = await clusterApi.getClients(cluster.id);
          setExportItems(items.map((c: any) => ({ id: c.id || c.clientId, name: c.clientId || c.name || c.id })));
          // Select all by default
          setSelectedExportItems(new Set(items.map((c: any) => c.id || c.clientId)));
          break;
      }
    } catch (error: any) {
      console.error(`Failed to load ${type} for export:`, error);
      setError(`Failed to load ${type}: ${error.message}`);
    } finally {
      setLoadingExportItems(false);
    }
  };

  const handleExport = async () => {
    const exportType = exportImportDialog.type || exportSelectionDialog.type;
    if (!exportType) return;
    
    setExporting(true);
    setError('');
    setSuccess('');
    
    try {
      let blob: Blob;
      let filename: string;
      
      switch (exportType) {
        case 'realm':
          blob = await exportImportApi.exportRealm(cluster.id);
          filename = `realm-export-${cluster.name || cluster.id}-${Date.now()}.json`;
          break;
        case 'users':
          const allUsers = await clusterApi.getUsers(cluster.id, 0);
          const selectedUsers = allUsers.filter((u: any) => selectedExportItems.has(u.id || u.username));
          const usersJson = JSON.stringify(selectedUsers, null, 2);
          blob = new Blob([usersJson], { type: 'application/json' });
          filename = `users-export-${cluster.name || cluster.id}-${Date.now()}.json`;
          break;
        case 'clients':
          const allClients = await clusterApi.getClients(cluster.id);
          const selectedClients = allClients.filter((c: any) => selectedExportItems.has(c.id || c.clientId));
          const clientsJson = JSON.stringify(selectedClients, null, 2);
          blob = new Blob([clientsJson], { type: 'application/json' });
          filename = `clients-export-${cluster.name || cluster.id}-${Date.now()}.json`;
          break;
        default:
          throw new Error('Invalid export type');
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setSuccess(`${exportType} exported successfully`);
      if (exportImportDialog.type) {
        setExportImportDialog({ open: false, type: null, action: null });
      }
      if (exportSelectionDialog.type) {
        setExportSelectionDialog({ open: false, type: null });
      }
      setSelectedExportItems(new Set());
    } catch (err: any) {
      const exportType = exportImportDialog.type || exportSelectionDialog.type;
      setError(err.message || `Failed to export ${exportType || 'items'}`);
    } finally {
      setExporting(false);
    }
  };

  const handleAssignClientRole = async () => {
    if (!selectedClientForRole || !selectedSourceClient) return;
    
    setAssigning(true);
    setError('');
    setSuccess('');
    
    try {
      const targetClientId = selectedClientForRole.clientId || selectedClientForRole.id;
      if (!targetClientId) throw new Error('Target client ID not found');
      
      const roleNames = Array.from(selectedClientRoleNames);
      if (roleNames.length === 0) {
        throw new Error('Please select at least one role');
      }
      
      await clusterApi.assignClientRolesToClient(cluster.id, targetClientId, selectedSourceClient, roleNames);
      
      setSuccess('Client roles assigned successfully');
      setAssignClientRoleDialog(false);
      setSelectedClientForRole(null);
      setSelectedSourceClient('');
      setSelectedClientRoleNames(new Set());
    } catch (err: any) {
      setError(err.message || 'Failed to assign client roles');
    } finally {
      setAssigning(false);
    }
  };

  const handleImport = async () => {
    if (!exportImportDialog.type || !importFile) return;
    
    setImporting(true);
    setError('');
    setSuccess('');
    
    try {
      const text = await importFile.text();
      
      switch (exportImportDialog.type) {
        case 'realm':
          await exportImportApi.importRealm(cluster.id, text);
          break;
        case 'users':
          await exportImportApi.importUsers(cluster.id, text);
          loadUsers();
          break;
        case 'clients':
          await exportImportApi.importClients(cluster.id, text);
          loadClients();
          break;
        default:
          throw new Error('Invalid import type');
      }
      
      setSuccess(`${exportImportDialog.type} imported successfully`);
      setExportImportDialog({ open: false, type: null, action: null });
      setImportFile(null);
    } catch (err: any) {
      setError(err.message || `Failed to import ${exportImportDialog.type}`);
    } finally {
      setImporting(false);
    }
  };


  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-4 bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="realm" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Clients
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="groups" className="flex items-center gap-2">
            <Folder className="h-4 w-4" />
            Groups
          </TabsTrigger>
          <TabsTrigger value="user-federation" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            User Federation
          </TabsTrigger>
        </TabsList>

        {/* Realm Tab */}
        <TabsContent value="realm" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Clients</CardTitle>
                  <CardDescription>Keycloak clients in {cluster.realm || 'master'} realm</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      setExportImportDialog({ open: true, type: 'realm', action: 'export' });
                    }}
                    disabled={exporting}
                    className="text-xs h-8"
                  >
                    {exporting ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Export
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setExportImportDialog({ open: true, type: 'realm', action: 'import' })}
                    disabled={importing}
                    className="text-xs h-8"
                  >
                    {importing ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Import
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setCreateClientDialog(true)}
                    className="text-xs h-8"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Create Client
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Realm Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Realm Name</div>
                  <div className="text-sm font-semibold text-gray-900">{cluster.realm || 'master'}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Base URL</div>
                  <div className="text-sm font-semibold text-gray-900 truncate" title={cluster.base_url}>
                    {cluster.base_url}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Client ID</div>
                  <div className="text-sm font-semibold text-gray-900">{cluster.client_id || '-'}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Cluster Name</div>
                  <div className="text-sm font-semibold text-gray-900">{cluster.name}</div>
                </div>
              </div>

              {/* Clients Section */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Clients ({clients.length})
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                      <Input
                        placeholder="Search clients..."
                        value={clientSearchTerm}
                        onChange={(e) => setClientSearchTerm(e.target.value)}
                        className="h-8 w-48 pl-8 text-xs"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={loadClients}
                      disabled={loadingClients}
                      className="text-xs h-8"
                    >
                      {loadingClients ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        'Refresh'
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openExportSelectionDialog('clients')}
                      disabled={exporting}
                      className="text-xs h-8"
                    >
                      {exporting ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Export
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setExportImportDialog({ open: true, type: 'clients', action: 'import' })}
                      disabled={importing}
                      className="text-xs h-8"
                    >
                      {importing ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Import
                    </Button>
                  </div>
                </div>

                <ClientTable
                  clients={clients}
                  loading={loadingClients}
                  searchTerm={clientSearchTerm}
                  onSearchChange={setClientSearchTerm}
                  clientRoles={clientRoles}
                  onClientClick={async (client) => {
                    setSelectedClientForDetail(client);
                    const clientId = client.clientId || client.id || '';
                    if (!clientRoles[clientId]) {
                      setLoadingSelectedClientRoles(true);
                      try {
                        const roles = await clusterApi.getClientRoles(cluster.id, clientId);
                        setSelectedClientRolesList(roles);
                        setClientRoles(prev => ({ ...prev, [clientId]: roles }));
                      } catch (err) {
                        console.error('Failed to load client roles:', err);
                        setSelectedClientRolesList([]);
                      } finally {
                        setLoadingSelectedClientRoles(false);
                      }
                    } else {
                      setSelectedClientRolesList(clientRoles[clientId]);
                    }
                    setClientDetailOpen(true);
                  }}
                  onAssignRoleClick={(client) => {
                    setSelectedClientForRole(client);
                    setSelectedSourceClient('');
                    setSelectedClientRoleNames(new Set());
                    setAssignClientRoleDialog(true);
                  }}
                  clusterBaseUrl={cluster.base_url}
                  realm={cluster.realm || 'master'}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Users</CardTitle>
                  <CardDescription>Manage users in this realm</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={loadUsers}
                    disabled={loadingUsers}
                    className="text-xs h-8"
                  >
                    {loadingUsers ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      'Refresh'
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedUser(null);
                      setSelectedRealmRoles(new Set());
                      setSelectedClientRoles({});
                      setAssignUserRoleDialog(true);
                    }}
                    className="text-xs h-8"
                  >
                    <Key className="h-3.5 w-3.5 mr-1.5" />
                    Assign Roles
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openExportSelectionDialog('users')}
                    disabled={exporting}
                    className="text-xs h-8"
                  >
                    {exporting ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Export
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setExportImportDialog({ open: true, type: 'users', action: 'import' })}
                    disabled={importing}
                    className="text-xs h-8"
                  >
                    {importing ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Import
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setCreateUserDialog(true)}
                    className="text-xs h-8"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Create
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <UserTable
                users={users}
                loading={loadingUsers}
                searchTerm={userSearchTerm}
                onSearchChange={setUserSearchTerm}
                onUserClick={(user) => {
                  setSelectedUserForDetail(user);
                  setUserDetailOpen(true);
                }}
                clusterBaseUrl={cluster.base_url}
                realm={cluster.realm || 'master'}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Roles</CardTitle>
                  <CardDescription>Manage realm roles</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <Input
                      placeholder="Search roles..."
                      value={roleSearchTerm}
                      onChange={(e) => setRoleSearchTerm(e.target.value)}
                      className="h-8 w-48 pl-8 text-xs"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={loadRoles}
                    disabled={loadingRoles}
                    className="text-xs h-8"
                  >
                    {loadingRoles ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      'Refresh'
                    )}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setCreateRoleDialog(true)}
                    className="text-xs h-8"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Create
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingRoles ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : roles.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500">
                  No roles found
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {roles.filter(role =>
                    role.name?.toLowerCase().includes(roleSearchTerm.toLowerCase()) ||
                    role.description?.toLowerCase().includes(roleSearchTerm.toLowerCase())
                  ).map((role) => (
                    <div
                      key={role.id || role.name}
                      className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{role.name}</span>
                          {role.composite && (
                            <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                              Composite
                            </span>
                          )}
                        </div>
                        {role.description && (
                          <div className="text-xs text-gray-500 mt-1">{role.description}</div>
                        )}
                      </div>
                      <a
                        href={`${cluster.base_url}/admin/${cluster.realm || 'master'}/console/#/${cluster.realm || 'master'}/roles/${role.name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Groups Tab */}
        <TabsContent value="groups" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Groups</CardTitle>
                  <CardDescription>Manage groups in this realm</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={loadGroups}
                    disabled={loadingGroups}
                    className="text-xs h-8"
                  >
                    {loadingGroups ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      'Refresh'
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedGroup(null);
                      setSelectedRealmRoles(new Set());
                      setSelectedClientRoles({});
                      setAssignGroupRoleDialog(true);
                    }}
                    className="text-xs h-8"
                  >
                    <Key className="h-3.5 w-3.5 mr-1.5" />
                    Assign Roles
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedUser(null);
                      setSelectedGroup(null);
                      setAddUserToGroupDialog(true);
                    }}
                    className="text-xs h-8"
                  >
                    <Users className="h-3.5 w-3.5 mr-1.5" />
                    Add User
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setCreateGroupDialog(true)}
                    className="text-xs h-8"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Create
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <GroupTable
                groups={groups}
                loading={loadingGroups}
                searchTerm={groupSearchTerm}
                onSearchChange={setGroupSearchTerm}
                onGroupClick={async (group) => {
                  setSelectedGroupForDetail(group);
                  // Load members for this group
                  if (users.length === 0 && !loadingUsers) {
                    await loadUsers();
                  }
                  const members = users.filter(user => {
                    return user.groups?.some(userGroup => 
                      userGroup === group.path || 
                      userGroup === group.name ||
                      userGroup === group.id
                    );
                  });
                  setSelectedGroupMembers(members);
                  setGroupDetailOpen(true);
                }}
                clusterBaseUrl={cluster.base_url}
                realm={cluster.realm || 'master'}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Federation Tab */}
        <TabsContent value="user-federation" className="mt-4">
          <UserFederationManagement cluster={cluster} realm={cluster.realm} />
        </TabsContent>
      </Tabs>

      {/* Create User Dialog */}
      <Dialog open={createUserDialog} onOpenChange={setCreateUserDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>Create a new user in Keycloak</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={newUser.username || ''}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                placeholder="johndoe"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email || ''}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="john.doe@example.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={newUser.firstName || ''}
                  onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                  placeholder="John"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={newUser.lastName || ''}
                  onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                  placeholder="Doe"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="userEnabled"
                checked={newUser.enabled}
                onCheckedChange={(checked: boolean) => setNewUser({ ...newUser, enabled: checked as boolean })}
              />
              <Label htmlFor="userEnabled" className="cursor-pointer">Enabled</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateUserDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser} disabled={creating || !newUser.username}>
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create User'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Group Dialog */}
      <Dialog open={createGroupDialog} onOpenChange={setCreateGroupDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
            <DialogDescription>Create a new group in Keycloak</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="groupName">Group Name *</Label>
              <Input
                id="groupName"
                value={newGroup.name || ''}
                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                placeholder="my-group"
              />
            </div>
            <div>
              <Label htmlFor="groupPath">Group Path</Label>
              <Input
                id="groupPath"
                value={newGroup.path || ''}
                onChange={(e) => setNewGroup({ ...newGroup, path: e.target.value })}
                placeholder="/my-group (optional)"
              />
              <p className="text-xs text-gray-500 mt-1.5">Leave empty to use group name as path</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateGroupDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateGroup} disabled={creating || !newGroup.name}>
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Group'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Role Dialog */}
      <Dialog open={createRoleDialog} onOpenChange={setCreateRoleDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Realm Role</DialogTitle>
            <DialogDescription>Create a new realm role in Keycloak</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="roleName">Role Name *</Label>
              <Input
                id="roleName"
                value={newRole.name || ''}
                onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                placeholder="my-role"
              />
            </div>
            <div>
              <Label htmlFor="roleDescription">Description</Label>
              <Input
                id="roleDescription"
                value={newRole.description || ''}
                onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                placeholder="Role description (optional)"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="composite"
                checked={newRole.composite}
                onCheckedChange={(checked: boolean) => setNewRole({ ...newRole, composite: checked as boolean })}
              />
              <Label htmlFor="composite" className="cursor-pointer">Composite Role</Label>
            </div>
            <p className="text-xs text-gray-500">Composite roles can contain other roles</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateRoleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRole} disabled={creating || !newRole.name}>
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Role'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Client Dialog */}
      <Dialog open={createClientDialog} onOpenChange={setCreateClientDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Client</DialogTitle>
            <DialogDescription>Create a new client in Keycloak</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="clientId">Client ID *</Label>
              <Input
                id="clientId"
                value={newClient.clientId || ''}
                onChange={(e) => setNewClient({ ...newClient, clientId: e.target.value })}
                placeholder="my-client"
              />
            </div>
            <div>
              <Label htmlFor="clientName">Client Name</Label>
              <Input
                id="clientName"
                value={newClient.name || ''}
                onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                placeholder="My Client"
              />
            </div>
            <div>
              <Label htmlFor="protocol">Protocol</Label>
              <Select
                value={newClient.protocol || 'openid-connect'}
                onValueChange={(value) => setNewClient({ ...newClient, protocol: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openid-connect">OpenID Connect</SelectItem>
                  <SelectItem value="saml">SAML</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="enabled"
                checked={newClient.enabled}
                onCheckedChange={(checked: boolean) => setNewClient({ ...newClient, enabled: checked as boolean })}
              />
              <Label htmlFor="enabled" className="cursor-pointer">Enabled</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="publicClient"
                checked={newClient.publicClient}
                onCheckedChange={(checked: boolean) => setNewClient({ ...newClient, publicClient: checked as boolean })}
              />
              <Label htmlFor="publicClient" className="cursor-pointer">Public Client</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="directAccessGrants"
                checked={newClient.directAccessGrantsEnabled}
                onCheckedChange={(checked: boolean) => setNewClient({ ...newClient, directAccessGrantsEnabled: checked as boolean })}
              />
              <Label htmlFor="directAccessGrants" className="cursor-pointer">Direct Access Grants Enabled</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateClientDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateClient} disabled={creating || !newClient.clientId}>
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Client'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign User Roles Dialog */}
      <Dialog open={assignUserRoleDialog} onOpenChange={setAssignUserRoleDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Assign Roles to User</DialogTitle>
            <DialogDescription>Assign realm roles and client roles to a user</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            <div>
              <Label>Select User</Label>
              <Select
                value={selectedUser?.id || ''}
                onValueChange={(value) => {
                  const user = users.find(u => u.id === value);
                  setSelectedUser(user || null);
                  if (user) {
                    setSelectedRealmRoles(new Set(user.realmRoles || []));
                    const clientRolesMap: Record<string, Set<string>> = {};
                    Object.entries(user.clientRoles || {}).forEach(([clientId, roleNames]) => {
                      clientRolesMap[clientId] = new Set(roleNames);
                    });
                    setSelectedClientRoles(clientRolesMap);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.username} {user.email && `(${user.email})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedUser && (
              <>
                {/* Realm Roles */}
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Realm Roles</Label>
                  <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                    {roles.map((role) => (
                      <div key={role.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`realm-role-${role.id}`}
                          checked={selectedRealmRoles.has(role.name)}
                          onCheckedChange={(checked: boolean) => {
                            const newSet = new Set(selectedRealmRoles);
                            if (checked) {
                              newSet.add(role.name);
                            } else {
                              newSet.delete(role.name);
                            }
                            setSelectedRealmRoles(newSet);
                          }}
                        />
                        <Label htmlFor={`realm-role-${role.id}`} className="text-sm cursor-pointer">
                          {role.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Client Roles */}
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Client Roles</Label>
                  <div className="space-y-3">
                    {clients.map((client) => {
                      const clientId = client.clientId || client.id;
                      const roleSet = selectedClientRoles[clientId] || new Set<string>();
                      const clientRolesList = clientRoles[clientId] || [];
                      const isLoading = loadingClientRoles[clientId];
                      
                      return (
                        <div key={clientId} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm font-medium">{clientId}</Label>
                            {!clientRoles[clientId] && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => loadClientRoles(clientId)}
                                disabled={isLoading}
                              >
                                {isLoading ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  'Load Roles'
                                )}
                              </Button>
                            )}
                          </div>
                          {isLoading && (
                            <div className="text-xs text-gray-500 mb-2">Loading roles...</div>
                          )}
                          {clientRolesList.length > 0 && (
                            <div className="max-h-48 overflow-y-auto space-y-2">
                              {clientRolesList.map((role: any) => (
                                <div key={role.id || role.name} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`user-client-role-${clientId}-${role.id || role.name}`}
                                    checked={roleSet.has(role.name)}
                                    onCheckedChange={(checked: boolean) => {
                                      const newMap = { ...selectedClientRoles };
                                      if (!newMap[clientId]) {
                                        newMap[clientId] = new Set<string>();
                                      }
                                      if (checked) {
                                        newMap[clientId].add(role.name);
                                      } else {
                                        newMap[clientId].delete(role.name);
                                      }
                                      setSelectedClientRoles(newMap);
                                    }}
                                  />
                                  <Label 
                                    htmlFor={`user-client-role-${clientId}-${role.id || role.name}`} 
                                    className="text-sm cursor-pointer"
                                  >
                                    {role.name}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          )}
                          {!isLoading && clientRolesList.length === 0 && clientRoles[clientId] && (
                            <div className="text-xs text-gray-500">No roles available</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignUserRoleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignUserRoles} disabled={assigning || !selectedUser}>
              {assigning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                'Assign Roles'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Group Roles Dialog */}
      <Dialog open={assignGroupRoleDialog} onOpenChange={setAssignGroupRoleDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Assign Roles to Group</DialogTitle>
            <DialogDescription>Assign realm roles and client roles to a group</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            <div>
              <Label>Select Group</Label>
              <Select
                value={selectedGroup?.id || ''}
                onValueChange={(value) => {
                  const group = groups.find(g => g.id === value);
                  setSelectedGroup(group || null);
                  if (group) {
                    setSelectedRealmRoles(new Set(group.realmRoles || []));
                    const clientRolesMap: Record<string, Set<string>> = {};
                    Object.entries(group.clientRoles || {}).forEach(([clientId, roleNames]) => {
                      clientRolesMap[clientId] = new Set(roleNames);
                    });
                    setSelectedClientRoles(clientRolesMap);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.path || group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedGroup && (
              <>
                {/* Realm Roles */}
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Realm Roles</Label>
                  <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                    {roles.map((role) => (
                      <div key={role.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`group-realm-role-${role.id}`}
                          checked={selectedRealmRoles.has(role.name)}
                          onCheckedChange={(checked: boolean) => {
                            const newSet = new Set(selectedRealmRoles);
                            if (checked) {
                              newSet.add(role.name);
                            } else {
                              newSet.delete(role.name);
                            }
                            setSelectedRealmRoles(newSet);
                          }}
                        />
                        <Label htmlFor={`group-realm-role-${role.id}`} className="text-sm cursor-pointer">
                          {role.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Client Roles */}
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Client Roles</Label>
                  <div className="space-y-3">
                    {clients.map((client) => {
                      const clientId = client.clientId || client.id;
                      const roleSet = selectedClientRoles[clientId] || new Set<string>();
                      const clientRolesList = clientRoles[clientId] || [];
                      const isLoading = loadingClientRoles[clientId];
                      
                      return (
                        <div key={clientId} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm font-medium">{clientId}</Label>
                            {!clientRoles[clientId] && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => loadClientRoles(clientId)}
                                disabled={isLoading}
                              >
                                {isLoading ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  'Load Roles'
                                )}
                              </Button>
                            )}
                          </div>
                          {isLoading && (
                            <div className="text-xs text-gray-500 mb-2">Loading roles...</div>
                          )}
                          {clientRolesList.length > 0 && (
                            <div className="max-h-48 overflow-y-auto space-y-2">
                              {clientRolesList.map((role: any) => (
                                <div key={role.id || role.name} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`group-client-role-${clientId}-${role.id || role.name}`}
                                    checked={roleSet.has(role.name)}
                                    onCheckedChange={(checked: boolean) => {
                                      const newMap = { ...selectedClientRoles };
                                      if (!newMap[clientId]) {
                                        newMap[clientId] = new Set<string>();
                                      }
                                      if (checked) {
                                        newMap[clientId].add(role.name);
                                      } else {
                                        newMap[clientId].delete(role.name);
                                      }
                                      setSelectedClientRoles(newMap);
                                    }}
                                  />
                                  <Label 
                                    htmlFor={`group-client-role-${clientId}-${role.id || role.name}`} 
                                    className="text-sm cursor-pointer"
                                  >
                                    {role.name}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          )}
                          {!isLoading && clientRolesList.length === 0 && clientRoles[clientId] && (
                            <div className="text-xs text-gray-500">No roles available</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignGroupRoleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignGroupRoles} disabled={assigning || !selectedGroup}>
              {assigning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                'Assign Roles'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User to Group Dialog */}
      <Dialog open={addUserToGroupDialog} onOpenChange={setAddUserToGroupDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add User to Group</DialogTitle>
            <DialogDescription>Add a user to a group</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Select User</Label>
              <Select
                value={selectedUser?.id || ''}
                onValueChange={(value) => {
                  const user = users.find(u => u.id === value);
                  setSelectedUser(user || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.username} {user.email && `(${user.email})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Select Group</Label>
              <Select
                value={selectedGroup?.id || ''}
                onValueChange={(value) => {
                  const group = groups.find(g => g.id === value);
                  setSelectedGroup(group || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.path || group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddUserToGroupDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddUserToGroup} disabled={assigning || !selectedUser || !selectedGroup}>
              {assigning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add to Group'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export/Import Dialog */}
      <Dialog open={exportImportDialog.open} onOpenChange={(open) => {
        if (!open) {
          setExportImportDialog({ open: false, type: null, action: null });
          setImportFile(null);
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {exportImportDialog.action === 'export' ? 'Export' : 'Import'} {exportImportDialog.type}
            </DialogTitle>
            <DialogDescription>
              {exportImportDialog.action === 'export' 
                ? `Export ${exportImportDialog.type} configuration as JSON file`
                : `Import ${exportImportDialog.type} configuration from JSON file`
              }
            </DialogDescription>
          </DialogHeader>
          {exportImportDialog.action === 'export' ? (
            <div className="space-y-4 py-4">
              <p className="text-sm text-gray-600">
                Click the button below to download the {exportImportDialog.type} configuration as a JSON file.
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="importFile">Select JSON File</Label>
                <Input
                  id="importFile"
                  type="file"
                  accept=".json"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Select a JSON file containing {exportImportDialog.type} configuration
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setExportImportDialog({ open: false, type: null, action: null });
                setImportFile(null);
              }}
            >
              Cancel
            </Button>
            {exportImportDialog.action === 'export' ? (
              <Button onClick={handleExport} disabled={exporting}>
                {exporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={handleImport} disabled={importing || !importFile}>
                {importing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export/Import Dialog */}
      <Dialog open={exportImportDialog.open} onOpenChange={(open) => {
        if (!open) {
          setExportImportDialog({ open: false, type: null, action: null });
          setImportFile(null);
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {exportImportDialog.action === 'export' ? 'Export' : 'Import'} {exportImportDialog.type}
            </DialogTitle>
            <DialogDescription>
              {exportImportDialog.action === 'export' 
                ? `Export ${exportImportDialog.type} configuration as JSON file`
                : `Import ${exportImportDialog.type} configuration from JSON file`
              }
            </DialogDescription>
          </DialogHeader>
          {exportImportDialog.action === 'export' ? (
            <div className="space-y-4 py-4">
              <p className="text-sm text-gray-600">
                Click the button below to download the {exportImportDialog.type} configuration as a JSON file.
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="importFile">Select JSON File</Label>
                <Input
                  id="importFile"
                  type="file"
                  accept=".json"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Select a JSON file containing {exportImportDialog.type} configuration
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setExportImportDialog({ open: false, type: null, action: null });
                setImportFile(null);
              }}
            >
              Cancel
            </Button>
            {exportImportDialog.action === 'export' ? (
              <Button onClick={handleExport} disabled={exporting}>
                {exporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={handleImport} disabled={importing || !importFile}>
                {importing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Selection Dialog */}
      <Dialog open={exportSelectionDialog.open} onOpenChange={(open) => {
        if (!open) {
          setExportSelectionDialog({ open: false, type: null });
          setSelectedExportItems(new Set());
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              Select {exportSelectionDialog.type === 'users' ? 'Users' : 'Clients'} to Export
            </DialogTitle>
            <DialogDescription>
              Choose which {exportSelectionDialog.type === 'users' ? 'users' : 'clients'} you want to export.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {loadingExportItems ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2 border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3 pb-2 border-b">
                  <span className="text-sm font-medium text-gray-700">
                    {exportItems.length} {exportSelectionDialog.type} found
                  </span>
                  <button
                    onClick={() => {
                      if (selectedExportItems.size === exportItems.length) {
                        setSelectedExportItems(new Set());
                      } else {
                        setSelectedExportItems(new Set(exportItems.map(item => item.id)));
                      }
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    {selectedExportItems.size === exportItems.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                {exportItems.map((item) => (
                  <label key={item.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <Checkbox
                      checked={selectedExportItems.has(item.id)}
                      onCheckedChange={(checked: boolean) => {
                        const newSet = new Set(selectedExportItems);
                        if (checked) {
                          newSet.add(item.id);
                        } else {
                          newSet.delete(item.id);
                        }
                        setSelectedExportItems(newSet);
                      }}
                    />
                    <span className="text-sm text-gray-700 flex-1">{item.name}</span>
                  </label>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setExportSelectionDialog({ open: false, type: null });
                  setSelectedExportItems(new Set());
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleExport}
                disabled={selectedExportItems.size === 0 || exporting}
              >
                {exporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export {selectedExportItems.size} {exportSelectionDialog.type === 'users' ? 'User(s)' : 'Client(s)'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Client Role Dialog */}
      <Dialog open={assignClientRoleDialog} onOpenChange={setAssignClientRoleDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Assign Client Roles to Client</DialogTitle>
            <DialogDescription>
              Assign client roles from a source client to {selectedClientForRole?.clientId || selectedClientForRole?.name}'s service account
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {selectedClientForRole && (
              <>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="text-sm font-medium text-gray-900 mb-1">Target Client</div>
                  <div className="text-xs text-gray-600">{selectedClientForRole.clientId || selectedClientForRole.name}</div>
                </div>
                
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Source Client</Label>
                  <Select value={selectedSourceClient} onValueChange={(value) => {
                    setSelectedSourceClient(value);
                    setSelectedClientRoleNames(new Set());
                    if (value) {
                      loadClientRoles(value);
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => {
                        const clientId = client.clientId || client.id || '';
                        return (
                          <SelectItem key={clientId} value={clientId}>
                            {client.name || client.clientId || clientId}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedSourceClient && (
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Available Client Roles</Label>
                    <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                      {(() => {
                        const clientRolesList = clientRoles[selectedSourceClient] || [];
                        const isLoading = loadingClientRoles[selectedSourceClient];
                        
                        if (isLoading) {
                          return (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                            </div>
                          );
                        }
                        
                        if (clientRolesList.length === 0) {
                          return (
                            <div className="text-xs text-gray-500 text-center py-2">
                              No roles available for this client
                            </div>
                          );
                        }
                        
                        return clientRolesList.map((role: any) => (
                          <div key={role.id || role.name} className="flex items-center space-x-2">
                            <Checkbox
                              id={`client-role-${role.id || role.name}`}
                              checked={selectedClientRoleNames.has(role.name)}
                              onCheckedChange={(checked: boolean) => {
                                const newSet = new Set(selectedClientRoleNames);
                                if (checked) {
                                  newSet.add(role.name);
                                } else {
                                  newSet.delete(role.name);
                                }
                                setSelectedClientRoleNames(newSet);
                              }}
                            />
                            <Label htmlFor={`client-role-${role.id || role.name}`} className="text-sm cursor-pointer">
                              {role.name}
                              {role.description && (
                                <span className="text-xs text-gray-500 ml-2">- {role.description}</span>
                              )}
                            </Label>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setAssignClientRoleDialog(false);
              setSelectedClientForRole(null);
              setSelectedSourceClient('');
              setSelectedClientRoleNames(new Set());
            }}>
              Cancel
            </Button>
            <Button onClick={handleAssignClientRole} disabled={assigning || !selectedClientForRole || !selectedSourceClient || selectedClientRoleNames.size === 0}>
              {assigning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                'Assign Roles'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Slide-over Components */}
      <UserDetailSlideOver
        user={selectedUserForDetail}
        open={userDetailOpen}
        onOpenChange={setUserDetailOpen}
        roles={roles}
        clients={clients}
        onAssignRoles={(user) => {
          setSelectedUser(user);
          setSelectedRealmRoles(new Set(user.realmRoles || []));
          const clientRolesMap: Record<string, Set<string>> = {};
          if (user.clientRoles) {
            Object.entries(user.clientRoles).forEach(([clientId, roleNames]) => {
              clientRolesMap[clientId] = new Set(roleNames);
            });
          }
          setSelectedClientRoles(clientRolesMap);
          setAssignUserRoleDialog(true);
        }}
        onAddToGroup={(user) => {
          setSelectedUser(user);
          setSelectedGroup(null);
          setAddUserToGroupDialog(true);
        }}
      />

      <GroupDetailSlideOver
        group={selectedGroupForDetail}
        open={groupDetailOpen}
        onOpenChange={setGroupDetailOpen}
        members={selectedGroupMembers}
        roles={roles}
        clients={clients}
        onAssignRoles={(group) => {
          setSelectedGroup(group);
          setSelectedRealmRoles(new Set(group.realmRoles || []));
          const clientRolesMap: Record<string, Set<string>> = {};
          if (group.clientRoles) {
            Object.entries(group.clientRoles).forEach(([clientId, roleNames]) => {
              clientRolesMap[clientId] = new Set(roleNames);
            });
          }
          setSelectedClientRoles(clientRolesMap);
          setAssignGroupRoleDialog(true);
        }}
        onAddUser={(group) => {
          setSelectedUser(null);
          setSelectedGroup(group);
          setAddUserToGroupDialog(true);
        }}
      />

      <ClientDetailSlideOver
        client={selectedClientForDetail}
        open={clientDetailOpen}
        onOpenChange={setClientDetailOpen}
        clientRoles={selectedClientRolesList}
        loadingRoles={loadingSelectedClientRoles}
        clusterId={cluster.id}
        onLoadRoles={async () => {
          if (!selectedClientForDetail) return;
          const clientId = selectedClientForDetail.clientId || selectedClientForDetail.id || '';
          setLoadingSelectedClientRoles(true);
          try {
            const roles = await clusterApi.getClientRoles(cluster.id, clientId);
            setSelectedClientRolesList(roles);
            setClientRoles(prev => ({ ...prev, [clientId]: roles }));
          } catch (err) {
            console.error('Failed to load client roles:', err);
            setSelectedClientRolesList([]);
          } finally {
            setLoadingSelectedClientRoles(false);
          }
        }}
        onAssignRole={(client) => {
          setSelectedClientForRole(client);
          setSelectedSourceClient('');
          setSelectedClientRoleNames(new Set());
          setAssignClientRoleDialog(true);
        }}
        onRoleCreated={() => {
          // Reload client roles after creating a new role
          if (selectedClientForDetail) {
            const clientId = selectedClientForDetail.clientId || selectedClientForDetail.id || '';
            loadClientRoles(clientId);
          }
        }}
      />
    </div>
  );
}
