import { useState, useEffect } from 'react';
import { ClientDetail, Role, clusterApi } from '@/services/api';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Key, Loader2, Eye, EyeOff, Copy, Check, Plus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface ClientDetailSlideOverProps {
  client: ClientDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientRoles: Role[];
  loadingRoles: boolean;
  onLoadRoles: () => void;
  onAssignRole: (client: ClientDetail) => void;
  clusterId: number;
  onRoleCreated?: () => void;
}

export default function ClientDetailSlideOver({
  client,
  open,
  onOpenChange,
  clientRoles,
  loadingRoles,
  onLoadRoles,
  onAssignRole,
  clusterId,
  onRoleCreated,
}: ClientDetailSlideOverProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingSecret, setLoadingSecret] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);
  const [createRoleDialog, setCreateRoleDialog] = useState(false);
  const [newRole, setNewRole] = useState<Partial<Role>>({
    name: '',
    description: '',
    composite: false,
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  useEffect(() => {
    if (open && client && !client.publicClient) {
      loadClientSecret();
    } else {
      setClientSecret(null);
      setShowSecret(false);
    }
  }, [open, client]);

  const loadClientSecret = async () => {
    if (!client || client.publicClient) return;
    
    setLoadingSecret(true);
    try {
      // Use clientId to get secret (backend will find the UUID)
      const result = await clusterApi.getClientSecret(clusterId, client.clientId || client.id || '');
      setClientSecret(result.secret);
    } catch (err: any) {
      console.error('Failed to load client secret:', err);
      setClientSecret(null);
    } finally {
      setLoadingSecret(false);
    }
  };

  const copySecret = async () => {
    if (clientSecret) {
      await navigator.clipboard.writeText(clientSecret);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    }
  };

  const handleCreateRole = async () => {
    if (!newRole.name || !client) return;
    
    setCreating(true);
    setError('');
    setSuccess('');
    
    try {
      await clusterApi.createClientRole(clusterId, client.clientId || client.id || '', newRole as Role);
      setSuccess('Client role created successfully');
      setCreateRoleDialog(false);
      setNewRole({
        name: '',
        description: '',
        composite: false,
      });
      // Reload roles
      onLoadRoles();
      if (onRoleCreated) {
        onRoleCreated();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create client role');
    } finally {
      setCreating(false);
    }
  };

  if (!client) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{client.clientId || client.name || 'Client Details'}</SheetTitle>
          <SheetDescription>
            View and manage client details and roles
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="roles">Roles</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Client ID</div>
                  <div className="text-sm font-medium text-gray-900">{client.clientId || '-'}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Protocol</div>
                  <div className="text-sm font-medium text-gray-900">{client.protocol || '-'}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Public Client</div>
                  <div className="text-sm font-medium text-gray-900">{client.publicClient ? 'Yes' : 'No'}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Service Account</div>
                  <div className="text-sm font-medium text-gray-900">{client.serviceAccountsEnabled ? 'Enabled' : 'Disabled'}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Direct Access Grants</div>
                  <div className="text-sm font-medium text-gray-900">{client.directAccessGrantsEnabled ? 'Enabled' : 'Disabled'}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Bearer Only</div>
                  <div className="text-sm font-medium text-gray-900">{client.bearerOnly ? 'Yes' : 'No'}</div>
                </div>
              </div>

              {!client.publicClient && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-gray-500">Client Secret</div>
                    <div className="flex items-center gap-2">
                      {clientSecret && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowSecret(!showSecret)}
                            className="h-6 px-2"
                          >
                            {showSecret ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={copySecret}
                            className="h-6 px-2"
                          >
                            {secretCopied ? (
                              <Check className="h-3.5 w-3.5 text-green-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </>
                      )}
                      {loadingSecret ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={loadClientSecret}
                          className="h-6 px-2 text-xs"
                        >
                          Load Secret
                        </Button>
                      )}
                    </div>
                  </div>
                  {loadingSecret ? (
                    <div className="text-sm text-gray-500">Loading secret...</div>
                  ) : clientSecret ? (
                    <div className="text-sm font-mono bg-white rounded p-2 border border-gray-300">
                      {showSecret ? clientSecret : '••••••••••••••••••••••••••••••••'}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">Click "Load Secret" to view the client secret</div>
                  )}
                </div>
              )}

              {client.description && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Description</div>
                  <div className="text-sm text-gray-900">{client.description}</div>
                </div>
              )}

              {client.redirectUris && client.redirectUris.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-2">Redirect URIs</div>
                  <div className="space-y-1">
                    {client.redirectUris.map((uri, idx) => (
                      <div key={idx} className="text-sm text-gray-900 font-mono">{uri}</div>
                    ))}
                  </div>
                </div>
              )}

              {client.webOrigins && client.webOrigins.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-2">Web Origins</div>
                  <div className="space-y-1">
                    {client.webOrigins.map((origin, idx) => (
                      <div key={idx} className="text-sm text-gray-900 font-mono">{origin}</div>
                    ))}
                  </div>
                </div>
              )}

              {client.defaultClientScopes && client.defaultClientScopes.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-2">Default Client Scopes</div>
                  <div className="flex flex-wrap gap-1">
                    {client.defaultClientScopes.map((scope, idx) => (
                      <span key={idx} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">{scope}</span>
                    ))}
                  </div>
                </div>
              )}

              {client.optionalClientScopes && client.optionalClientScopes.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-2">Optional Client Scopes</div>
                  <div className="flex flex-wrap gap-1">
                    {client.optionalClientScopes.map((scope, idx) => (
                      <span key={idx} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">{scope}</span>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="roles" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Client Roles ({clientRoles.length})</h3>
                <div className="flex items-center gap-2">
                  {clientRoles.length === 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onLoadRoles}
                      disabled={loadingRoles}
                    >
                      {loadingRoles ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        'Load Roles'
                      )}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCreateRoleDialog(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Role
                  </Button>
                </div>
              </div>

              {loadingRoles ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : clientRoles.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-4 bg-white rounded border border-gray-200">
                  No roles found
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {clientRoles.map((role) => (
                    <div key={role.id || role.name} className="p-2 bg-white rounded border border-gray-200 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{role.name}</span>
                        {role.composite && (
                          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs">
                            Composite
                          </span>
                        )}
                      </div>
                      {role.description && (
                        <div className="text-xs text-gray-500 mt-1">{role.description}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>

      {/* Create Client Role Dialog */}
      <Dialog open={createRoleDialog} onOpenChange={setCreateRoleDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Client Role</DialogTitle>
            <DialogDescription>
              Create a new role for client: {client.clientId || client.name}
            </DialogDescription>
          </DialogHeader>
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="roleName">Role Name *</Label>
              <Input
                id="roleName"
                value={newRole.name || ''}
                onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                placeholder="my-client-role"
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
            <Button variant="outline" onClick={() => {
              setCreateRoleDialog(false);
              setError('');
              setSuccess('');
              setNewRole({
                name: '',
                description: '',
                composite: false,
              });
            }}>
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
    </Sheet>
  );
}

