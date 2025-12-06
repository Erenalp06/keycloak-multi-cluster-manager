import { UserDetail, Role, ClientDetail } from '@/services/api';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Key, Users } from 'lucide-react';

interface UserDetailSlideOverProps {
  user: UserDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: Role[];
  clients: ClientDetail[];
  onAssignRoles: (user: UserDetail) => void;
  onAddToGroup: (user: UserDetail) => void;
}

export default function UserDetailSlideOver({
  user,
  open,
  onOpenChange,
  roles,
  clients,
  onAssignRoles,
  onAddToGroup,
}: UserDetailSlideOverProps) {
  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{user.username || user.email || 'User Details'}</SheetTitle>
          <SheetDescription>
            View and manage user details, roles, and groups
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="roles">Roles</TabsTrigger>
              <TabsTrigger value="groups">Groups</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Username</div>
                  <div className="text-sm font-medium text-gray-900">{user.username || '-'}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Email</div>
                  <div className="text-sm font-medium text-gray-900">{user.email || '-'}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">First Name</div>
                  <div className="text-sm font-medium text-gray-900">{user.firstName || '-'}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Last Name</div>
                  <div className="text-sm font-medium text-gray-900">{user.lastName || '-'}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Status</div>
                  <div className="text-sm font-medium text-gray-900">
                    <span className={`px-2 py-1 rounded text-xs ${
                      user.enabled
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {user.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
                {user.requiredActions && user.requiredActions.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="text-xs text-gray-500 mb-1">Required Actions</div>
                    <div className="text-sm font-medium text-gray-900">{user.requiredActions.join(', ')}</div>
                  </div>
                )}
              </div>

              {user.attributes && Object.keys(user.attributes).length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-2">Attributes</div>
                  <div className="space-y-1">
                    {Object.entries(user.attributes).map(([key, values]) => (
                      <div key={key} className="text-sm text-gray-900">
                        <span className="font-medium">{key}:</span> {Array.isArray(values) ? values.join(', ') : values}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="roles" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Roles</h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAssignRoles(user)}
                >
                  <Key className="h-4 w-4 mr-2" />
                  Assign Roles
                </Button>
              </div>

              <div>
                <h4 className="text-xs font-medium text-gray-600 mb-2">Realm Roles</h4>
                {user.realmRoles && user.realmRoles.length > 0 ? (
                  <div className="space-y-2">
                    {user.realmRoles.map((roleName) => (
                      <div key={roleName} className="p-2 bg-white rounded border border-gray-200 text-sm">
                        <span className="font-medium text-gray-900">{roleName}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 text-center py-4 bg-white rounded border border-gray-200">
                    No realm roles assigned
                  </div>
                )}
              </div>

              {user.clientRoles && Object.keys(user.clientRoles).length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-600 mb-2">Client Roles</h4>
                  <div className="space-y-2">
                    {Object.entries(user.clientRoles).map(([clientId, roleNames]) => (
                      <div key={clientId} className="bg-white rounded border border-gray-200 p-3">
                        <div className="text-sm font-medium text-gray-700 mb-2">{clientId}</div>
                        <div className="space-y-1">
                          {roleNames.map((roleName) => (
                            <div key={roleName} className="text-sm text-gray-600 pl-2">
                              • {roleName}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="groups" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Groups</h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAddToGroup(user)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Add to Group
                </Button>
              </div>

              <div>
                {user.groups && user.groups.length > 0 ? (
                  <div className="space-y-2">
                    {user.groups.map((groupPath) => (
                      <div key={groupPath} className="p-2 bg-white rounded border border-gray-200 text-sm">
                        <span className="font-medium text-gray-900">{groupPath}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 text-center py-4 bg-white rounded border border-gray-200">
                    User is not a member of any groups
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

