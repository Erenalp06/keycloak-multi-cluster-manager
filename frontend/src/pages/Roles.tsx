import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Plus, Edit, Trash2, Shield, CheckCircle2, XCircle } from 'lucide-react';
import { roleManagementApi, AppRole, Permission, CreateRoleRequest, UpdateRoleRequest } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function Roles() {
  const { isAdmin } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<AppRole | null>(null);
  
  const [formData, setFormData] = useState<CreateRoleRequest>({
    name: '',
    description: '',
    permission_ids: [],
  });

  useEffect(() => {
    if (!isAdmin) {
      setError('You do not have permission to access this page');
      setLoading(false);
      return;
    }
    loadData();
  }, [isAdmin]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesData, permissionsData] = await Promise.all([
        roleManagementApi.getAllRoles(),
        roleManagementApi.getAllPermissions(),
      ]);
      setRoles(rolesData);
      setPermissions(permissionsData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setError(null);
      setSuccess(null);
      await roleManagementApi.createRole(formData);
      setSuccess('Role created successfully');
      setIsCreateDialogOpen(false);
      resetForm();
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create role');
    }
  };

  const handleEdit = (role: AppRole) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      permission_ids: role.permissions?.map(p => p.id) || [],
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingRole) return;
    try {
      setError(null);
      setSuccess(null);
      await roleManagementApi.updateRole(editingRole.id, formData);
      setSuccess('Role updated successfully');
      setIsEditDialogOpen(false);
      setEditingRole(null);
      resetForm();
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update role');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete role "${name}"?`)) {
      return;
    }
    try {
      setError(null);
      setSuccess(null);
      await roleManagementApi.deleteRole(id);
      setSuccess('Role deleted successfully');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete role');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      permission_ids: [],
    });
  };

  const togglePermission = (permissionId: number) => {
    setFormData(prev => ({
      ...prev,
      permission_ids: prev.permission_ids?.includes(permissionId)
        ? prev.permission_ids.filter(id => id !== permissionId)
        : [...(prev.permission_ids || []), permissionId],
    }));
  };

  const getPermissionName = (permissionId: number): string => {
    return permissions.find(p => p.id === permissionId)?.name || '';
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Alert>
          <AlertDescription>You do not have permission to access this page.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Roles Management</h1>
          <p className="text-muted-foreground mt-1">Create and manage application roles and permissions</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
              <DialogDescription>Create a new role and assign permissions to it.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Role Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., viewer, editor"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Role description"
                />
              </div>
              <div>
                <Label>Permissions</Label>
                <div className="mt-2 space-y-2 max-h-60 overflow-y-auto border rounded-md p-4">
                  {permissions.map(permission => (
                    <label key={permission.id} className="flex items-center space-x-2 cursor-pointer hover:bg-muted p-2 rounded">
                      <input
                        type="checkbox"
                        checked={formData.permission_ids?.includes(permission.id) || false}
                        onChange={() => togglePermission(permission.id)}
                        className="rounded"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{permission.name}</div>
                        {permission.description && (
                          <div className="text-sm text-muted-foreground">{permission.description}</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={!formData.name}>Create</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Alert className="mb-4" variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-4">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {roles.map(role => (
          <Card key={role.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <CardTitle>{role.name}</CardTitle>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(role)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {role.name !== 'admin' && role.name !== 'user' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(role.id, role.name)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
              {role.description && (
                <CardDescription>{role.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-sm font-medium">Permissions ({role.permissions?.length || 0}):</div>
                <div className="text-sm text-muted-foreground space-y-1">
                  {role.permissions && role.permissions.length > 0 ? (
                    role.permissions.map(perm => (
                      <div key={perm.id} className="flex items-center space-x-1">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        <span>{perm.name}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-muted-foreground">No permissions assigned</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>Update role details and permissions.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Role Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., viewer, editor"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Role description"
              />
            </div>
            <div>
              <Label>Permissions</Label>
              <div className="mt-2 space-y-2 max-h-60 overflow-y-auto border rounded-md p-4">
                {permissions.map(permission => (
                  <label key={permission.id} className="flex items-center space-x-2 cursor-pointer hover:bg-muted p-2 rounded">
                    <input
                      type="checkbox"
                      checked={formData.permission_ids?.includes(permission.id) || false}
                      onChange={() => togglePermission(permission.id)}
                      className="rounded"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{permission.name}</div>
                      {permission.description && (
                        <div className="text-sm text-muted-foreground">{permission.description}</div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdate} disabled={!formData.name}>Update</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

