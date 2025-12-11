import { useState, useEffect } from 'react';
import { Cluster, userFederationApi, UserFederationProvider, CreateUserFederationProviderRequest, UpdateUserFederationProviderRequest } from '@/services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, TestTube, RefreshCw, Loader2, CheckCircle2, AlertCircle, Settings } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UserFederationManagementProps {
  cluster: Cluster;
  realm?: string;
}

// Common LDAP suggestions
const CONNECTION_URL_SUGGESTIONS = [
  'ldap://ldap.example.com:389',
  'ldaps://ldap.example.com:636',
  'ldap://localhost:389',
  'ldaps://ldap.company.com:636',
  'ldap://ad.company.com:389',
  'ldaps://ad.company.com:636',
];

const BIND_DN_SUGGESTIONS = [
  'cn=admin,dc=example,dc=com',
  'cn=Administrator,cn=Users,dc=example,dc=com',
  'uid=admin,ou=system,dc=example,dc=com',
  'CN=Service Account,OU=Service Accounts,DC=company,DC=com',
  'cn=ldapadmin,ou=admins,dc=example,dc=com',
];

const USERS_DN_SUGGESTIONS = [
  'ou=users,dc=example,dc=com',
  'cn=Users,dc=example,dc=com',
  'ou=People,dc=example,dc=com',
  'OU=Users,DC=company,DC=com',
  'ou=employees,dc=example,dc=com',
  'cn=Users,DC=company,DC=com',
];

export default function UserFederationManagement({ cluster, realm }: UserFederationManagementProps) {
  const [providers, setProviders] = useState<UserFederationProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  
  // Selected provider
  const [selectedProvider, setSelectedProvider] = useState<UserFederationProvider | null>(null);
  
  // Form states
  const [formData, setFormData] = useState<CreateUserFederationProviderRequest>({
    name: '',
    provider_id: 'ldap',
    enabled: true,
    config: {
      connectionUrl: '',
      bindDn: '',
      bindCredential: '',
      usersDn: '',
      usernameLDAPAttribute: 'cn',
      rdnLDAPAttribute: 'cn',
      uuidLDAPAttribute: 'entryUUID',
      userObjectClasses: 'person,organizationalPerson,user',
      connectionTimeout: '5000',
      readTimeout: '60000',
      pagination: 'true',
      editMode: 'READ_ONLY',
      searchScope: '1', // UI format: "1" = ONE_LEVEL, "2" = SUBTREE
    },
  });
  
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testingAuthentication, setTestingAuthentication] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<any>(null);
  const [authenticationTestResult, setAuthenticationTestResult] = useState<any>(null);

  const targetRealm = realm || cluster.realm;

  useEffect(() => {
    loadProviders();
  }, [cluster.id, targetRealm]);

  const loadProviders = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await userFederationApi.getAll(cluster.id, targetRealm);
      setProviders(data);
      // Debug: log the loaded providers
      console.log('Loaded providers for realm:', targetRealm, data);
    } catch (err: any) {
      setError(err.message || 'Failed to load user federation providers');
      console.error('Failed to load providers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setError('');
    setSuccess('');
    try {
      // Convert searchScope from UI format ("1"/"2") to Keycloak format ("ONE_LEVEL"/"SUBTREE")
      const requestData: CreateUserFederationProviderRequest = {
        ...formData,
        config: {
          ...formData.config,
          searchScope: formData.config.searchScope === '1' ? 'ONE_LEVEL' : 
                      formData.config.searchScope === '2' ? 'SUBTREE' : 
                      formData.config.searchScope || 'ONE_LEVEL',
        },
      };
      
      console.log('Creating provider for realm:', targetRealm, requestData);
      const createdProvider = await userFederationApi.create(cluster.id, requestData, targetRealm);
      console.log('Created provider:', createdProvider);
      setSuccess('User federation provider created successfully');
      setCreateDialogOpen(false);
      resetForm();
      
      // Add the created provider to the list immediately
      setProviders(prev => {
        const updated = [...prev, createdProvider];
        console.log('Updated providers list:', updated);
        return updated;
      });
      
      // Also reload after a short delay to ensure consistency
      setTimeout(() => {
        loadProviders();
      }, 1000);
    } catch (err: any) {
      console.error('Failed to create provider:', err);
      setError(err.message || 'Failed to create user federation provider');
    }
  };

  const handleUpdate = async () => {
    if (!selectedProvider) return;
    
    setError('');
    setSuccess('');
    try {
      // Convert searchScope from UI format ("1"/"2") to Keycloak format ("ONE_LEVEL"/"SUBTREE")
      const updateData: UpdateUserFederationProviderRequest = {
        name: formData.name,
        enabled: formData.enabled,
        config: {
          ...formData.config,
          searchScope: formData.config.searchScope === '1' ? 'ONE_LEVEL' : 
                      formData.config.searchScope === '2' ? 'SUBTREE' : 
                      formData.config.searchScope || 'ONE_LEVEL',
        },
      };
      await userFederationApi.update(cluster.id, selectedProvider.id, updateData, targetRealm);
      setSuccess('User federation provider updated successfully');
      setEditDialogOpen(false);
      resetForm();
      loadProviders();
    } catch (err: any) {
      setError(err.message || 'Failed to update user federation provider');
    }
  };

  const handleDelete = async () => {
    if (!selectedProvider) return;
    
    setError('');
    setSuccess('');
    try {
      await userFederationApi.delete(cluster.id, selectedProvider.id, targetRealm);
      setSuccess('User federation provider deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedProvider(null);
      loadProviders();
    } catch (err: any) {
      setError(err.message || 'Failed to delete user federation provider');
    }
  };

  const handleTestConnection = async () => {
    if (!selectedProvider) return;
    
    setTesting(true);
    setTestResult(null);
    setError('');
    try {
      const result = await userFederationApi.testConnection(cluster.id, selectedProvider.id, targetRealm);
      setTestResult(result);
      setTestDialogOpen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to test connection');
      setTestDialogOpen(true);
    } finally {
      setTesting(false);
    }
  };

  const handleSync = async (action: 'triggerFullSync' | 'triggerChangedUsersSync' | 'triggerLdapKeyCache') => {
    if (!selectedProvider) return;
    
    setSyncing(true);
    setError('');
    setSuccess('');
    try {
      await userFederationApi.sync(cluster.id, selectedProvider.id, action, targetRealm);
      setSuccess(`Sync started successfully: ${action}`);
      setSyncDialogOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to sync user federation');
    } finally {
      setSyncing(false);
    }
  };

  const openEditDialog = (provider: UserFederationProvider) => {
    setSelectedProvider(provider);
    // Convert config from Record<string, string[]> to Record<string, string>
    const config: Record<string, string> = {};
    Object.entries(provider.config).forEach(([key, value]) => {
      let configValue = Array.isArray(value) ? value[0] || '' : value;
      
      // Convert searchScope from Keycloak format ("ONE_LEVEL"/"SUBTREE") to UI format ("1"/"2")
      if (key === 'searchScope') {
        if (configValue === 'ONE_LEVEL') {
          configValue = '1';
        } else if (configValue === 'SUBTREE') {
          configValue = '2';
        }
      }
      
      config[key] = configValue;
    });
    
    // Check enabled status
    const enabled = config.enabled === 'true' || provider.enabled;
    
    setFormData({
      name: provider.name,
      provider_id: provider.provider_id,
      enabled,
      config,
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (provider: UserFederationProvider) => {
    setSelectedProvider(provider);
    setDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      provider_id: 'ldap',
      enabled: true,
      config: {
        connectionUrl: '',
        bindDn: '',
        bindCredential: '',
        usersDn: '',
        usernameLDAPAttribute: 'cn',
        rdnLDAPAttribute: 'cn',
        uuidLDAPAttribute: 'objectGUID',
        userObjectClasses: 'person,organizationalPerson,user',
      connectionTimeout: '5000',
      readTimeout: '60000',
      pagination: 'true',
      editMode: 'READ_ONLY',
      searchScope: '1', // UI format: "1" = ONE_LEVEL, "2" = SUBTREE
    },
  });
  };

  const updateConfigField = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [key]: value,
      },
    }));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Federation</CardTitle>
              <CardDescription>
                Manage LDAP/AD user federation providers for realm: <strong>{targetRealm}</strong>
              </CardDescription>
            </div>
            <Button onClick={() => { resetForm(); setCreateDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Provider
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="mb-4">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : providers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No user federation providers found. Click "Add Provider" to create one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Connection URL</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((provider) => {
                  const connectionUrl = provider.config.connectionUrl?.[0] || 'N/A';
                  const enabled = provider.config.enabled?.[0] === 'true' || provider.enabled;
                  
                  return (
                    <TableRow key={provider.id}>
                      <TableCell className="font-medium">{provider.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{provider.provider_id}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={enabled ? 'default' : 'secondary'}>
                          {enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{connectionUrl}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setSelectedProvider(provider); handleTestConnection(); }}
                            disabled={testing}
                          >
                            <TestTube className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(provider)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setSelectedProvider(provider); setSyncDialogOpen(true); }}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(provider)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create User Federation Provider</DialogTitle>
            <DialogDescription>
              Configure a new LDAP/AD user federation provider for realm: <strong>{targetRealm}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="my-ldap-provider"
              />
            </div>
            <div>
              <Label htmlFor="provider_id">Provider ID</Label>
              <Input
                id="provider_id"
                value={formData.provider_id}
                onChange={(e) => setFormData(prev => ({ ...prev, provider_id: e.target.value }))}
                placeholder="ldap"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="enabled"
                checked={formData.enabled}
                onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="enabled">Enabled</Label>
            </div>
            <div>
              <Label htmlFor="connectionUrl">Connection URL *</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="connectionUrl"
                      list="connectionUrl-suggestions"
                      value={formData.config.connectionUrl || ''}
                      onChange={(e) => {
                        updateConfigField('connectionUrl', e.target.value);
                        // Clear test result when URL changes
                        setConnectionTestResult(null);
                      }}
                      placeholder="ldap://ldap.example.com:389"
                      className="pr-8"
                    />
                    <datalist id="connectionUrl-suggestions">
                      {CONNECTION_URL_SUGGESTIONS.map((suggestion, idx) => (
                        <option key={idx} value={suggestion} />
                      ))}
                    </datalist>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={async () => {
                      if (!formData.config.connectionUrl) {
                        setError('Please enter a connection URL first');
                        return;
                      }
                      setTestingConnection(true);
                      setConnectionTestResult(null);
                      setError('');
                      setSuccess('');
                      try {
                        const result = await userFederationApi.testLDAPConnection(cluster.id, formData.config.connectionUrl);
                        setConnectionTestResult(result);
                        if (result.success) {
                          setSuccess('Connection test successful!');
                        } else {
                          setError(result.error || 'Connection test failed');
                        }
                      } catch (err: any) {
                        setError(err.message || 'Failed to test connection');
                        setConnectionTestResult({ success: false, error: err.message });
                      } finally {
                        setTestingConnection(false);
                      }
                    }}
                    disabled={testingConnection || !formData.config.connectionUrl}
                    className="whitespace-nowrap"
                  >
                    {testingConnection ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <TestTube className="mr-2 h-4 w-4" />
                        Test Connection
                      </>
                    )}
                  </Button>
                </div>
                {connectionTestResult && (
                  <Alert className={connectionTestResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                    {connectionTestResult.success ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                          <strong>Connection successful!</strong> {connectionTestResult.message || 'Successfully connected to LDAP server'}
                        </AlertDescription>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                          <strong>Connection failed:</strong> {connectionTestResult.error || 'Failed to connect to LDAP server'}
                        </AlertDescription>
                      </>
                    )}
                  </Alert>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="bindDn">Bind DN *</Label>
              <div className="relative">
                <Input
                  id="bindDn"
                  list="bindDn-suggestions"
                  value={formData.config.bindDn || ''}
                  onChange={(e) => updateConfigField('bindDn', e.target.value)}
                  placeholder="cn=admin,dc=example,dc=com"
                  className="pr-8"
                />
                <datalist id="bindDn-suggestions">
                  {BIND_DN_SUGGESTIONS.map((suggestion, idx) => (
                    <option key={idx} value={suggestion} />
                  ))}
                </datalist>
              </div>
            </div>
            <div>
              <Label htmlFor="bindCredential">Bind Credential *</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    id="bindCredential"
                    type="password"
                    value={formData.config.bindCredential || ''}
                    onChange={(e) => {
                      updateConfigField('bindCredential', e.target.value);
                      // Clear test result when credential changes
                      setAuthenticationTestResult(null);
                    }}
                    placeholder="password"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={async () => {
                      if (!formData.config.connectionUrl || !formData.config.bindDn || !formData.config.bindCredential) {
                        setError('Please enter connection URL, Bind DN, and Bind Credential first');
                        return;
                      }
                      setTestingAuthentication(true);
                      setAuthenticationTestResult(null);
                      setError('');
                      setSuccess('');
                      try {
                        const result = await userFederationApi.testLDAPAuthentication(
                          cluster.id,
                          formData.config.connectionUrl,
                          formData.config.bindDn,
                          formData.config.bindCredential
                        );
                        setAuthenticationTestResult(result);
                        if (result.success) {
                          setSuccess('Authentication test successful!');
                        } else {
                          setError(result.error || 'Authentication test failed');
                        }
                      } catch (err: any) {
                        setError(err.message || 'Failed to test authentication');
                        setAuthenticationTestResult({ success: false, error: err.message });
                      } finally {
                        setTestingAuthentication(false);
                      }
                    }}
                    disabled={testingAuthentication || !formData.config.connectionUrl || !formData.config.bindDn || !formData.config.bindCredential}
                    className="whitespace-nowrap"
                  >
                    {testingAuthentication ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <TestTube className="mr-2 h-4 w-4" />
                        Test Authentication
                      </>
                    )}
                  </Button>
                </div>
                {authenticationTestResult && (
                  <Alert className={authenticationTestResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                    {authenticationTestResult.success ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                          <strong>Authentication successful!</strong> {authenticationTestResult.message || 'Successfully authenticated with LDAP server'}
                        </AlertDescription>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                          <strong>Authentication failed:</strong> {authenticationTestResult.error || 'Failed to authenticate with LDAP server'}
                        </AlertDescription>
                      </>
                    )}
                  </Alert>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="usersDn">Users DN *</Label>
              <div className="relative">
                <Input
                  id="usersDn"
                  list="usersDn-suggestions"
                  value={formData.config.usersDn || ''}
                  onChange={(e) => updateConfigField('usersDn', e.target.value)}
                  placeholder="ou=users,dc=example,dc=com"
                  className="pr-8"
                />
                <datalist id="usersDn-suggestions">
                  {USERS_DN_SUGGESTIONS.map((suggestion, idx) => (
                    <option key={idx} value={suggestion} />
                  ))}
                </datalist>
              </div>
            </div>
            <div>
              <Label htmlFor="usernameLDAPAttribute">Username LDAP Attribute</Label>
              <Input
                id="usernameLDAPAttribute"
                value={formData.config.usernameLDAPAttribute || ''}
                onChange={(e) => updateConfigField('usernameLDAPAttribute', e.target.value)}
                placeholder="uid"
              />
            </div>
            <div>
              <Label htmlFor="rdnLDAPAttribute">RDN LDAP Attribute</Label>
              <Input
                id="rdnLDAPAttribute"
                value={formData.config.rdnLDAPAttribute || ''}
                onChange={(e) => updateConfigField('rdnLDAPAttribute', e.target.value)}
                placeholder="uid"
              />
            </div>
            <div>
              <Label htmlFor="uuidLDAPAttribute">UUID LDAP Attribute</Label>
              <Input
                id="uuidLDAPAttribute"
                value={formData.config.uuidLDAPAttribute || ''}
                onChange={(e) => updateConfigField('uuidLDAPAttribute', e.target.value)}
                placeholder="entryUUID"
              />
            </div>
            <div>
              <Label htmlFor="userObjectClasses">User Object Classes</Label>
              <Input
                id="userObjectClasses"
                value={formData.config.userObjectClasses || ''}
                onChange={(e) => updateConfigField('userObjectClasses', e.target.value)}
                placeholder="person,organizationalPerson,user"
              />
            </div>
            <div>
              <Label htmlFor="editMode">Edit Mode *</Label>
              <Select
                value={formData.config.editMode || 'READ_ONLY'}
                onValueChange={(value) => updateConfigField('editMode', value)}
              >
                <SelectTrigger id="editMode">
                  <SelectValue placeholder="Select edit mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="READ_ONLY">READ_ONLY - Users are read-only</SelectItem>
                  <SelectItem value="UNSYNCED">UNSYNCED - Users are read-only and unmanaged</SelectItem>
                  <SelectItem value="WRITABLE">WRITABLE - Users can be synced and updated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="searchScope">Search Scope *</Label>
              <Select
                value={formData.config.searchScope || '1'}
                onValueChange={(value) => updateConfigField('searchScope', value)}
              >
                <SelectTrigger id="searchScope">
                  <SelectValue placeholder="Select search scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - ONE_LEVEL (Search only in the base DN)</SelectItem>
                  <SelectItem value="2">2 - SUBTREE (Search in base DN and all subtrees)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User Federation Provider</DialogTitle>
            <DialogDescription>
              Update the LDAP/AD user federation provider configuration
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-enabled"
                checked={formData.enabled}
                onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="edit-enabled">Enabled</Label>
            </div>
            {Object.entries(formData.config).map(([key, value]) => {
              const isConnectionUrl = key === 'connectionUrl';
              const isBindDn = key === 'bindDn';
              const isUsersDn = key === 'usersDn';
              const isEditMode = key === 'editMode';
              const isSearchScope = key === 'searchScope';
              const showSuggestions = isConnectionUrl || isBindDn || isUsersDn;
              
              return (
                <div key={key}>
                  <Label htmlFor={`edit-${key}`}>{key}</Label>
                  {isEditMode ? (
                    <Select
                      value={value || 'READ_ONLY'}
                      onValueChange={(val) => updateConfigField(key, val)}
                    >
                      <SelectTrigger id={`edit-${key}`}>
                        <SelectValue placeholder="Select edit mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="READ_ONLY">READ_ONLY - Users are read-only</SelectItem>
                        <SelectItem value="UNSYNCED">UNSYNCED - Users are read-only and unmanaged</SelectItem>
                        <SelectItem value="WRITABLE">WRITABLE - Users can be synced and updated</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : isSearchScope ? (
                    <Select
                      value={value || '1'}
                      onValueChange={(val) => updateConfigField(key, val)}
                    >
                      <SelectTrigger id={`edit-${key}`}>
                        <SelectValue placeholder="Select search scope" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 - ONE_LEVEL (Search only in the base DN)</SelectItem>
                        <SelectItem value="2">2 - SUBTREE (Search in base DN and all subtrees)</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : showSuggestions ? (
                    <div className="relative">
                      <Input
                        id={`edit-${key}`}
                        type={key.includes('Credential') || key.includes('Password') ? 'password' : 'text'}
                        list={`edit-${key}-suggestions`}
                        value={value}
                        onChange={(e) => updateConfigField(key, e.target.value)}
                        className="pr-8"
                      />
                      <datalist id={`edit-${key}-suggestions`}>
                        {(isConnectionUrl ? CONNECTION_URL_SUGGESTIONS : 
                          isBindDn ? BIND_DN_SUGGESTIONS : 
                          USERS_DN_SUGGESTIONS).map((suggestion, idx) => (
                          <option key={idx} value={suggestion} />
                        ))}
                      </datalist>
                    </div>
                  ) : (
                    <Input
                      id={`edit-${key}`}
                      type={key.includes('Credential') || key.includes('Password') ? 'password' : 'text'}
                      value={value}
                      onChange={(e) => updateConfigField(key, e.target.value)}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User Federation Provider</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedProvider?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Connection Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Connection Result</DialogTitle>
          </DialogHeader>
          {testResult ? (
            <div className="space-y-2">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Connection test completed. Check the result below.
                </AlertDescription>
              </Alert>
              <pre className="bg-muted p-4 rounded text-sm overflow-auto max-h-64">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error || 'Connection test failed'}
              </AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button onClick={() => setTestDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sync Dialog */}
      <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sync User Federation</DialogTitle>
            <DialogDescription>
              Choose a sync action for "{selectedProvider?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleSync('triggerFullSync')}
              disabled={syncing}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Full Sync
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleSync('triggerChangedUsersSync')}
              disabled={syncing}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Changed Users Sync
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleSync('triggerLdapKeyCache')}
              disabled={syncing}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              LDAP Key Cache
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSyncDialogOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

