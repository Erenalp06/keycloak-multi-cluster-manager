import { GroupDetail, UserDetail, Role, ClientDetail } from '@/services/api';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Key, Users } from 'lucide-react';

interface GroupDetailSlideOverProps {
  group: GroupDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: UserDetail[];
  roles: Role[];
  clients: ClientDetail[];
  onAssignRoles: (group: GroupDetail) => void;
  onAddUser: (group: GroupDetail) => void;
}

export default function GroupDetailSlideOver({
  group,
  open,
  onOpenChange,
  members,
  roles,
  clients,
  onAssignRoles,
  onAddUser,
}: GroupDetailSlideOverProps) {
  if (!group) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{group.name || group.path || 'Group Details'}</SheetTitle>
          <SheetDescription>
            View and manage group details, roles, and members
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="roles">Roles</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Name</div>
                  <div className="text-sm font-medium text-gray-900">{group.name || '-'}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Path</div>
                  <div className="text-sm font-medium text-gray-900">{group.path || '-'}</div>
                </div>
              </div>

              {group.attributes && Object.keys(group.attributes).length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-2">Attributes</div>
                  <div className="space-y-1">
                    {Object.entries(group.attributes).map(([key, values]) => (
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
                  onClick={() => onAssignRoles(group)}
                >
                  <Key className="h-4 w-4 mr-2" />
                  Assign Roles
                </Button>
              </div>

              <div>
                <h4 className="text-xs font-medium text-gray-600 mb-2">Realm Roles</h4>
                {group.realmRoles && group.realmRoles.length > 0 ? (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {group.realmRoles.map((roleName) => (
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

              {group.clientRoles && Object.keys(group.clientRoles).length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-600 mb-2">Client Roles</h4>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {Object.entries(group.clientRoles).map(([clientId, roleNames]) => (
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

            <TabsContent value="members" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Members ({members.length})</h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAddUser(group)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </div>

              <div>
                {members.length === 0 ? (
                  <div className="text-sm text-gray-500 text-center py-4 bg-white rounded border border-gray-200">
                    No members in this group
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {members.map((user) => (
                      <div key={user.id} className="p-2 bg-white rounded border border-gray-200 text-sm">
                        <div className="font-medium text-gray-900">
                          {user.username || user.email || 'N/A'}
                        </div>
                        {user.email && (
                          <div className="text-xs text-gray-500 mt-1">{user.email}</div>
                        )}
                      </div>
                    ))}
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

