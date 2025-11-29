import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { clusterApi, roleApi, Cluster, Role, UserDetail, GroupDetail, ClientDetail } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, User, Users, Building2, Key, Plus, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function KeycloakManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedClusterId, setSelectedClusterId] = useState<number | null>(null);
  const [users, setUsers] = useState<UserDetail[]>([]);
  const [groups, setGroups] = useState<GroupDetail[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [clientRolesMap, setClientRolesMap] = useState<Record<string, any[]>>({});
  const [loadingClientRoles, setLoadingClientRoles] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Dialog states
  const [assignUserRoleDialog, setAssignUserRoleDialog] = useState(false);
  const [addUserToGroupDialog, setAddUserToGroupDialog] = useState(false);
  const [assignGroupRoleDialog, setAssignGroupRoleDialog] = useState(false);
  const [createClientDialog, setCreateClientDialog] = useState(false);
  const [createUserDialog, setCreateUserDialog] = useState(false);
  const [createGroupDialog, setCreateGroupDialog] = useState(false);
  const [createRoleDialog, setCreateRoleDialog] = useState(false);

  // Form states
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<GroupDetail | null>(null);
  const [selectedRealmRoles, setSelectedRealmRoles] = useState<Set<string>>(new Set());
  const [selectedClientRoles, setSelectedClientRoles] = useState<Record<string, Set<string>>>({});
  const [newClient, setNewClient] = useState<Partial<ClientDetail>>({
    clientId: '',
    name: '',
    protocol: 'openid-connect',
    enabled: true,
    publicClient: false,
    directAccessGrantsEnabled: true,
    serviceAccountsEnabled: false,
  });
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

  useEffect(() => {
    loadClusters();
  }, []);

  useEffect(() => {
    if (selectedClusterId) {
      loadData();
    }
  }, [selectedClusterId]);

  const loadClusters = async () => {
    try {
      const data = await clusterApi.getAll();
      setClusters(data);
      
      // Check for clusterId in URL params after clusters are loaded
      const clusterIdParam = searchParams.get('clusterId');
      if (clusterIdParam && !selectedClusterId) {
        const clusterId = parseInt(clusterIdParam, 10);
        if (!isNaN(clusterId) && data.some(c => c.id === clusterId)) {
          setSelectedClusterId(clusterId);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load clusters');
    }
  };

  const loadData = async () => {
    if (!selectedClusterId) return;
    
    setLoading(true);
    setError('');
    try {
      const [usersData, groupsData, rolesData, clientsData] = await Promise.all([
        clusterApi.getUserDetails(selectedClusterId),
        clusterApi.getGroupDetails(selectedClusterId),
        roleApi.getRoles(selectedClusterId),
        clusterApi.getClients(selectedClusterId),
      ]);
      
      setUsers(usersData || []);
      setGroups(groupsData || []);
      setRoles(rolesData || []);
      setClients(clientsData || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
      setUsers([]);
      setGroups([]);
      setRoles([]);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignUserRoles = async () => {
    if (!selectedClusterId || !selectedUser) return;
    
    setLoading(true);
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
        await clusterApi.assignRealmRolesToUser(selectedClusterId, selectedUser.id, realmRoleNames);
      }

      if (Object.keys(clientRoles).length > 0) {
        await clusterApi.assignClientRolesToUser(selectedClusterId, selectedUser.id, clientRoles);
      }

      setSuccess('Roles assigned successfully');
      setAssignUserRoleDialog(false);
      setSelectedUser(null);
      setSelectedRealmRoles(new Set());
      setSelectedClientRoles({});
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to assign roles');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUserToGroup = async () => {
    if (!selectedClusterId || !selectedUser || !selectedGroup) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await clusterApi.addUserToGroup(selectedClusterId, selectedUser.id, selectedGroup.id);
      setSuccess('User added to group successfully');
      setAddUserToGroupDialog(false);
      setSelectedUser(null);
      setSelectedGroup(null);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to add user to group');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignGroupRoles = async () => {
    if (!selectedClusterId || !selectedGroup) return;
    
    setLoading(true);
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
        await clusterApi.assignRealmRolesToGroup(selectedClusterId, selectedGroup.id, realmRoleNames);
      }

      if (Object.keys(clientRoles).length > 0) {
        await clusterApi.assignClientRolesToGroup(selectedClusterId, selectedGroup.id, clientRoles);
      }

      setSuccess('Roles assigned to group successfully');
      setAssignGroupRoleDialog(false);
      setSelectedGroup(null);
      setSelectedRealmRoles(new Set());
      setSelectedClientRoles({});
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to assign roles to group');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async () => {
    if (!selectedClusterId || !newClient.clientId) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await clusterApi.createClient(selectedClusterId, newClient as ClientDetail);
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
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create client');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!selectedClusterId || !newUser.username) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await clusterApi.createUser(selectedClusterId, newUser as UserDetail);
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
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!selectedClusterId || !newGroup.name) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await clusterApi.createGroup(selectedClusterId, newGroup as GroupDetail);
      setSuccess('Group created successfully');
      setCreateGroupDialog(false);
      setNewGroup({
        name: '',
        path: '',
      });
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    if (!selectedClusterId || !newRole.name) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await clusterApi.createRealmRole(selectedClusterId, newRole as Role);
      setSuccess('Realm role created successfully');
      setCreateRoleDialog(false);
      setNewRole({
        name: '',
        description: '',
        composite: false,
      });
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create realm role');
    } finally {
      setLoading(false);
    }
  };

  const loadClientRoles = async (clientId: string) => {
    if (!selectedClusterId || loadingClientRoles[clientId] || clientRolesMap[clientId]) return;
    
    setLoadingClientRoles(prev => ({ ...prev, [clientId]: true }));
    try {
      const roles = await clusterApi.getClientRoles(selectedClusterId, clientId);
      setClientRolesMap(prev => ({ ...prev, [clientId]: roles }));
    } catch (err: any) {
      console.error(`Failed to load client roles for ${clientId}:`, err);
      setClientRolesMap(prev => ({ ...prev, [clientId]: [] }));
    } finally {
      setLoadingClientRoles(prev => ({ ...prev, [clientId]: false }));
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Keycloak Management</h1>
        <p className="text-sm text-gray-600 mt-1">Manage users, groups, roles, and clients in Keycloak</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Cluster Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Cluster</CardTitle>
          <CardDescription>Choose a Keycloak cluster to manage</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedClusterId?.toString() || ''}
            onValueChange={(value) => setSelectedClusterId(value ? parseInt(value) : null)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a cluster" />
            </SelectTrigger>
            <SelectContent>
              {(clusters || []).map((cluster) => (
                <SelectItem key={cluster.id} value={cluster.id.toString()}>
                  {cluster.name} ({cluster.realm})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedClusterId && (
        <Tabs defaultValue="user-roles" className="space-y-4">
          <TabsList>
            <TabsTrigger value="user-roles">Assign User Roles</TabsTrigger>
            <TabsTrigger value="user-group">Add User to Group</TabsTrigger>
            <TabsTrigger value="group-roles">Assign Group Roles</TabsTrigger>
            <TabsTrigger value="create-user">Create User</TabsTrigger>
            <TabsTrigger value="create-group">Create Group</TabsTrigger>
            <TabsTrigger value="create-role">Create Role</TabsTrigger>
            <TabsTrigger value="create-client">Create Client</TabsTrigger>
          </TabsList>

          {/* Assign User Roles */}
          <TabsContent value="user-roles">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Assign Roles to User</CardTitle>
                <CardDescription>Assign realm roles and client roles to a user</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Select User</Label>
                  <Select
                    value={selectedUser?.id || ''}
                    onValueChange={(value) => {
                      const user = users.find(u => u.id === value);
                      setSelectedUser(user || null);
                      if (user) {
                        setSelectedRealmRoles(new Set(user.realmRoles || []));
                        // Initialize client roles from user's existing roles
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
                      {(users || []).map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.username} {user.email && `(${user.email})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedUser && (
                  <div className="space-y-4">
                    {/* Realm Roles */}
                    <div>
                      <Label className="text-sm font-semibold mb-2 block">Realm Roles</Label>
                      <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                        {(roles || []).map((role) => (
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
                        {(clients || []).map((client) => {
                          const clientId = client.clientId || client.id;
                          const roleSet = selectedClientRoles[clientId] || new Set<string>();
                          
                          return (
                            <div key={clientId} className="border rounded-lg p-3">
                              <Label className="text-sm font-medium mb-2 block">{clientId}</Label>
                              <div className="text-xs text-gray-500 mb-2">
                                Client roles will be loaded when needed
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <Button
                      onClick={() => setAssignUserRoleDialog(true)}
                      disabled={loading}
                      className="w-full h-10 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-sm hover:shadow-md transition-all duration-200 font-medium"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Key className="mr-2 h-4 w-4" />
                          Assign Roles
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Add User to Group */}
          <TabsContent value="user-group">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add User to Group</CardTitle>
                <CardDescription>Add a user to a group</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                      {(users || []).map((user) => (
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
                      {(groups || []).map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.path || group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={() => setAddUserToGroupDialog(true)}
                  disabled={loading || !selectedUser || !selectedGroup}
                  className="w-full h-10 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0 shadow-sm hover:shadow-md transition-all duration-200 font-medium disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Users className="mr-2 h-4 w-4" />
                      Add User to Group
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assign Group Roles */}
          <TabsContent value="group-roles">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Assign Roles to Group</CardTitle>
                <CardDescription>Assign realm roles and client roles to a group</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                      {(groups || []).map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.path || group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedGroup && (
                  <div className="space-y-4">
                    {/* Realm Roles */}
                    <div>
                      <Label className="text-sm font-semibold mb-2 block">Realm Roles</Label>
                      <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                        {(roles || []).map((role) => (
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
                        {(clients || []).map((client) => {
                          const clientId = client.clientId || client.id;
                          const roleSet = selectedClientRoles[clientId] || new Set<string>();
                          const clientRoles = clientRolesMap[clientId] || [];
                          const isLoading = loadingClientRoles[clientId];
                          
                          return (
                            <div key={clientId} className="border rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <Label className="text-sm font-medium">{clientId}</Label>
                                {!clientRolesMap[clientId] && (
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
                              {clientRoles.length > 0 && (
                                <div className="max-h-48 overflow-y-auto space-y-2">
                                  {clientRoles.map((role: any) => (
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
                              {!isLoading && clientRoles.length === 0 && clientRolesMap[clientId] && (
                                <div className="text-xs text-gray-500">No roles available</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <Button
                      onClick={() => setAssignGroupRoleDialog(true)}
                      disabled={loading}
                      className="w-full h-10 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white border-0 shadow-sm hover:shadow-md transition-all duration-200 font-medium"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Shield className="mr-2 h-4 w-4" />
                          Assign Roles to Group
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Create User */}
          <TabsContent value="create-user">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Create New User</CardTitle>
                <CardDescription>Create a new user in Keycloak</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                    onCheckedChange={(checked: boolean) => setNewUser({ ...newUser, enabled: checked })}
                  />
                  <Label htmlFor="userEnabled" className="cursor-pointer">Enabled</Label>
                </div>

                <Button
                  onClick={() => setCreateUserDialog(true)}
                  disabled={loading || !newUser.username}
                  className="w-full h-10 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0 shadow-sm hover:shadow-md transition-all duration-200 font-medium disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <User className="mr-2 h-4 w-4" />
                      Create User
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Create Group */}
          <TabsContent value="create-group">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Create New Group</CardTitle>
                <CardDescription>Create a new group in Keycloak</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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

                <Button
                  onClick={() => setCreateGroupDialog(true)}
                  disabled={loading || !newGroup.name}
                  className="w-full h-10 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-sm hover:shadow-md transition-all duration-200 font-medium disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Users className="mr-2 h-4 w-4" />
                      Create Group
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Create Role */}
          <TabsContent value="create-role">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Create New Realm Role</CardTitle>
                <CardDescription>Create a new realm role in Keycloak</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                    onCheckedChange={(checked: boolean) => setNewRole({ ...newRole, composite: checked })}
                  />
                  <Label htmlFor="composite" className="cursor-pointer">Composite Role</Label>
                </div>
                <p className="text-xs text-gray-500">Composite roles can contain other roles</p>

                <Button
                  onClick={() => setCreateRoleDialog(true)}
                  disabled={loading || !newRole.name}
                  className="w-full h-10 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white border-0 shadow-sm hover:shadow-md transition-all duration-200 font-medium disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Shield className="mr-2 h-4 w-4" />
                      Create Role
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Create Client */}
          <TabsContent value="create-client">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Create New Client</CardTitle>
                <CardDescription>Create a new client in Keycloak</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                    onCheckedChange={(checked: boolean) => setNewClient({ ...newClient, enabled: checked })}
                  />
                  <Label htmlFor="enabled" className="cursor-pointer">Enabled</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="publicClient"
                    checked={newClient.publicClient}
                    onCheckedChange={(checked: boolean) => setNewClient({ ...newClient, publicClient: checked })}
                  />
                  <Label htmlFor="publicClient" className="cursor-pointer">Public Client</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="directAccessGrants"
                    checked={newClient.directAccessGrantsEnabled}
                    onCheckedChange={(checked: boolean) => setNewClient({ ...newClient, directAccessGrantsEnabled: checked })}
                  />
                  <Label htmlFor="directAccessGrants" className="cursor-pointer">Direct Access Grants Enabled</Label>
                </div>

                <Button
                  onClick={() => setCreateClientDialog(true)}
                  disabled={loading || !newClient.clientId}
                  className="w-full h-10 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white border-0 shadow-sm hover:shadow-md transition-all duration-200 font-medium disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Client
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Confirmation Dialogs */}
      <Dialog open={assignUserRoleDialog} onOpenChange={setAssignUserRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Roles to User</DialogTitle>
            <DialogDescription>
              Are you sure you want to assign the selected roles to {selectedUser?.username}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignUserRoleDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssignUserRoles} 
              disabled={loading}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-sm hover:shadow-md transition-all duration-200 font-medium"
            >
              {loading ? (
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

      <Dialog open={addUserToGroupDialog} onOpenChange={setAddUserToGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User to Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to add {selectedUser?.username} to {selectedGroup?.path || selectedGroup?.name}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddUserToGroupDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddUserToGroup} 
              disabled={loading}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0 shadow-sm hover:shadow-md transition-all duration-200 font-medium"
            >
              {loading ? (
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

      <Dialog open={assignGroupRoleDialog} onOpenChange={setAssignGroupRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Roles to Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to assign the selected roles to {selectedGroup?.path || selectedGroup?.name}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignGroupRoleDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssignGroupRoles} 
              disabled={loading}
              className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white border-0 shadow-sm hover:shadow-md transition-all duration-200 font-medium"
            >
              {loading ? (
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

      <Dialog open={createClientDialog} onOpenChange={setCreateClientDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Client</DialogTitle>
            <DialogDescription>
              Are you sure you want to create the client "{newClient.clientId}"?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateClientDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateClient} 
              disabled={loading}
              className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white border-0 shadow-sm hover:shadow-md transition-all duration-200 font-medium"
            >
              {loading ? (
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

      <Dialog open={createUserDialog} onOpenChange={setCreateUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>
              Are you sure you want to create the user "{newUser.username}"?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateUserDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateUser} 
              disabled={loading}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0 shadow-sm hover:shadow-md transition-all duration-200 font-medium"
            >
              {loading ? (
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

      <Dialog open={createGroupDialog} onOpenChange={setCreateGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to create the group "{newGroup.name}"?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateGroupDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateGroup} 
              disabled={loading}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-sm hover:shadow-md transition-all duration-200 font-medium"
            >
              {loading ? (
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

      <Dialog open={createRoleDialog} onOpenChange={setCreateRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Realm Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to create the realm role "{newRole.name}"?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateRoleDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateRole} 
              disabled={loading}
              className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white border-0 shadow-sm hover:shadow-md transition-all duration-200 font-medium"
            >
              {loading ? (
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
    </div>
  );
}

