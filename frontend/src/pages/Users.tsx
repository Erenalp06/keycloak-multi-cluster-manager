import { useState, useEffect } from 'react';
import { userApi, roleManagementApi, AppUser, AppRole, CreateUserRequest, UpdateUserRequest } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Edit, User, Shield, AlertCircle, X, UserCog } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function Users() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editDialog, setEditDialog] = useState<{ open: boolean; user: AppUser | null }>({
    open: false,
    user: null,
  });
  const [roleAssignDialog, setRoleAssignDialog] = useState<{ open: boolean; user: AppUser | null; userRoles: AppRole[] }>({
    open: false,
    user: null,
    userRoles: [],
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [createFormData, setCreateFormData] = useState<CreateUserRequest>({
    username: '',
    email: '',
    password: '',
    role: 'user',
  });

  const [editFormData, setEditFormData] = useState<UpdateUserRequest>({
    username: '',
    email: '',
    password: '',
    role: '',
  });

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
      loadRoles();
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await userApi.getAll();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const data = await roleManagementApi.getAllRoles();
      setRoles(data);
    } catch (err: any) {
      console.error('Failed to load roles:', err);
    }
  };

  const handleCreate = async () => {
    try {
      setError('');
      setSuccess('');
      await userApi.create(createFormData);
      setSuccess('User created successfully');
      setIsCreateDialogOpen(false);
      setCreateFormData({ username: '', email: '', password: '', role: 'user' });
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    }
  };

  const handleEdit = (user: AppUser) => {
    setEditFormData({
      username: user.username,
      email: user.email,
      role: user.role,
      password: '',
    });
    setEditDialog({ open: true, user });
    setError('');
    setSuccess('');
  };

  const handleUpdate = async () => {
    if (!editDialog.user) return;
    try {
      setError('');
      setSuccess('');
      const updateData: UpdateUserRequest = {
        username: editFormData.username,
        email: editFormData.email,
        role: editFormData.role,
      };
      if (editFormData.password) {
        updateData.password = editFormData.password;
      }
      await userApi.update(editDialog.user.id, updateData);
      setSuccess('User updated successfully');
      setEditDialog({ open: false, user: null });
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }
    try {
      setError('');
      setSuccess('');
      await userApi.delete(id);
      setSuccess('User deleted successfully');
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
    }
  };

  const handleAssignRoles = async (user: AppUser) => {
    try {
      const userRoles = await roleManagementApi.getUserRoles(user.id);
      setRoleAssignDialog({ open: true, user, userRoles });
      setError('');
      setSuccess('');
    } catch (err: any) {
      setError(err.message || 'Failed to load user roles');
    }
  };

  const handleSaveRoles = async () => {
    if (!roleAssignDialog.user) return;
    try {
      setError('');
      setSuccess('');
      const selectedRoleIds = roles
        .filter(role => {
          const checkbox = document.getElementById(`role-${role.id}`) as HTMLInputElement;
          return checkbox?.checked;
        })
        .map(role => role.id);
      
      await roleManagementApi.assignRolesToUser(roleAssignDialog.user.id, selectedRoleIds);
      setSuccess('Roles assigned successfully');
      setRoleAssignDialog({ open: false, user: null, userRoles: [] });
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to assign roles');
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>You need admin privileges to access this page.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Users</h1>
          <p className="text-sm text-gray-600">Manage application users</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#4a5568] hover:bg-[#374151] text-white text-sm h-9">
              <Plus className="mr-1.5 h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-base">Create New User</DialogTitle>
              <DialogDescription>Add a new user to the system</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="create-username">Username</Label>
                <Input
                  id="create-username"
                  value={createFormData.username}
                  onChange={(e) => setCreateFormData({ ...createFormData, username: e.target.value })}
                  placeholder="Enter username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-email">Email</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={createFormData.email}
                  onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                  placeholder="Enter email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-password">Password</Label>
                <Input
                  id="create-password"
                  type="password"
                  value={createFormData.password}
                  onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
                  placeholder="Enter password (min 6 characters)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-role">Role</Label>
                <Select
                  value={createFormData.role}
                  onValueChange={(value) => setCreateFormData({ ...createFormData, role: value })}
                >
                  <SelectTrigger id="create-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} className="bg-[#4a5568] hover:bg-[#374151] text-white text-sm h-9">
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Alert className="mb-4 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-4 border-green-200 bg-green-50">
          <AlertCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading users...</div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-gray-100 p-4 mb-4">
              <User className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">No users found</p>
            <p className="text-xs text-gray-500 mb-4">Create your first user to get started</p>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-[#4a5568] hover:bg-[#374151] text-white text-sm h-9"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add User
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {users.map((user) => (
            <Card key={user.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="rounded-full bg-[#0066cc] p-2">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{user.username}</h3>
                        {user.role === 'admin' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                            <Shield className="h-3 w-3" />
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{user.email}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Created: {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAssignRoles(user)}
                      className="text-xs h-8"
                      title="Assign Roles"
                    >
                      <UserCog className="h-3 w-3 mr-1" />
                      Roles
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(user)}
                      className="text-xs h-8"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(user.id)}
                      className="text-xs h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, user: editDialog.user })}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-base">Edit User</DialogTitle>
            <DialogDescription>Update user information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-username">Username</Label>
              <Input
                id="edit-username"
                value={editFormData.username}
                onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                placeholder="Enter username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                placeholder="Enter email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password">New Password (leave empty to keep current)</Label>
              <Input
                id="edit-password"
                type="password"
                value={editFormData.password}
                onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                placeholder="Enter new password (min 6 characters)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select
                value={editFormData.role}
                onValueChange={(value) => setEditFormData({ ...editFormData, role: value })}
              >
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialog({ open: false, user: null })}
              className="text-sm h-9"
            >
              Cancel
            </Button>
            <Button onClick={handleUpdate} className="bg-[#4a5568] hover:bg-[#374151] text-white text-sm h-9">
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Assignment Dialog */}
      <Dialog open={roleAssignDialog.open} onOpenChange={(open) => setRoleAssignDialog({ open, user: roleAssignDialog.user, userRoles: roleAssignDialog.userRoles })}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-base">Assign Roles to {roleAssignDialog.user?.username}</DialogTitle>
            <DialogDescription>Select roles to assign to this user</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-4">
              {roles.map(role => {
                const isAssigned = roleAssignDialog.userRoles.some(ur => ur.id === role.id);
                return (
                  <label key={role.id} className="flex items-center space-x-2 cursor-pointer hover:bg-muted p-2 rounded">
                    <input
                      type="checkbox"
                      id={`role-${role.id}`}
                      defaultChecked={isAssigned}
                      className="rounded"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{role.name}</div>
                      {role.description && (
                        <div className="text-sm text-muted-foreground">{role.description}</div>
                      )}
                      {role.permissions && role.permissions.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {role.permissions.length} permission(s)
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRoleAssignDialog({ open: false, user: null, userRoles: [] })}
              className="text-sm h-9"
            >
              Cancel
            </Button>
            <Button onClick={handleSaveRoles} className="bg-[#4a5568] hover:bg-[#374151] text-white text-sm h-9">
              Save Roles
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

