import { useState, useEffect } from 'react';
import { clusterApi, diffApi, roleApi, syncApi, Cluster, RoleDiff as RoleDiffType, Role, ClientDiff, GroupDiff, UserDiff, ClientDetail, GroupDetail, UserDetail } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Search, CheckCircle2, XCircle, ArrowRight, Key, Building2, Users, Network, AlertCircle, ArrowLeftRight, ArrowRight as ArrowRightIcon, Folder, ToggleLeft, ToggleRight, ChevronDown, ChevronRight, ArrowDownToLine, Loader2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

type TabType = 'summary' | 'roles' | 'clients' | 'groups' | 'users';

export default function RoleDiff() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [sourceId, setSourceId] = useState<string>('');
  const [destinationId, setDestinationId] = useState<string>('');
  const [sourceGroup, setSourceGroup] = useState<string>('');
  const [destinationGroup, setDestinationGroup] = useState<string>('');
  const [twoWayComparison, setTwoWayComparison] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [loading, setLoading] = useState(true);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  const [syncConfirmDialog, setSyncConfirmDialog] = useState<{
    open: boolean;
    type: 'role' | 'client' | 'group' | 'user' | null;
    identifier: string;
    name: string;
  }>({
    open: false,
    type: null,
    identifier: '',
    name: '',
  });

  // Roles
  const [roleDiffs, setRoleDiffs] = useState<RoleDiffType[]>([]);
  const [sourceRoles, setSourceRoles] = useState<Role[]>([]);
  const [destinationRoles, setDestinationRoles] = useState<Role[]>([]);

  // Clients
  const [clientDiffs, setClientDiffs] = useState<ClientDiff[]>([]);
  const [sourceClients, setSourceClients] = useState<ClientDetail[]>([]);
  const [destinationClients, setDestinationClients] = useState<ClientDetail[]>([]);

  // Groups
  const [groupDiffs, setGroupDiffs] = useState<GroupDiff[]>([]);
  const [sourceGroups, setSourceGroups] = useState<GroupDetail[]>([]);
  const [destinationGroups, setDestinationGroups] = useState<GroupDetail[]>([]);

  // Users
  const [userDiffs, setUserDiffs] = useState<UserDiff[]>([]);
  const [sourceUsers, setSourceUsers] = useState<UserDetail[]>([]);
  const [destinationUsers, setDestinationUsers] = useState<UserDetail[]>([]);

  useEffect(() => {
    loadClusters();
  }, []);

  const loadClusters = async () => {
    try {
      setLoading(true);
      const data = await clusterApi.getAll();
      setClusters(data || []);
    } catch (error) {
      console.error('Failed to load clusters:', error);
      setClusters([]);
      alert('Failed to load clusters');
    } finally {
      setLoading(false);
    }
  };

  const handleDiff = async () => {
    if (!sourceId || !destinationId) {
      alert('Please select both source and destination clusters');
      return;
    }

    if (sourceId === destinationId) {
      alert('Source and destination clusters must be different');
      return;
    }

    try {
      setLoadingDiff(true);
      
      // Load all diffs in parallel
      const [roleDiffData, clientDiffData, groupDiffData, userDiffData] = await Promise.all([
        diffApi.getRoleDiff(Number(sourceId), Number(destinationId)).catch(() => []),
        diffApi.getClientDiff(Number(sourceId), Number(destinationId)).catch(() => []),
        diffApi.getGroupDiff(Number(sourceId), Number(destinationId)).catch(() => []),
        diffApi.getUserDiff(Number(sourceId), Number(destinationId)).catch(() => []),
      ]);

      setRoleDiffs(roleDiffData || []);
      setClientDiffs(clientDiffData || []);
      setGroupDiffs(groupDiffData || []);
      setUserDiffs(userDiffData || []);

      // Load source and destination data for comparison
      const [
        sourceRolesData, destRolesData,
        sourceClientsData, destClientsData,
        sourceGroupsData, destGroupsData,
        sourceUsersData, destUsersData,
      ] = await Promise.all([
        roleApi.getRoles(Number(sourceId)).catch(() => []),
        roleApi.getRoles(Number(destinationId)).catch(() => []),
        clusterApi.getClientDetails(Number(sourceId)).catch(() => []),
        clusterApi.getClientDetails(Number(destinationId)).catch(() => []),
        clusterApi.getGroupDetails(Number(sourceId)).catch(() => []),
        clusterApi.getGroupDetails(Number(destinationId)).catch(() => []),
        clusterApi.getUserDetails(Number(sourceId)).catch(() => []),
        clusterApi.getUserDetails(Number(destinationId)).catch(() => []),
      ]);
      
      setSourceRoles(sourceRolesData || []);
      setDestinationRoles(destRolesData || []);
      setSourceClients(sourceClientsData || []);
      setDestinationClients(destClientsData || []);
      setSourceGroups(sourceGroupsData || []);
      setDestinationGroups(destGroupsData || []);
      setSourceUsers(sourceUsersData || []);
      setDestinationUsers(destUsersData || []);

    } catch (error: any) {
      console.error('Failed to get diff:', error);
      alert(error.message || 'Failed to get diff');
    } finally {
      setLoadingDiff(false);
    }
  };

  const getSourceClusterName = () => {
    return clusters.find((c) => c.id === Number(sourceId))?.name || '';
  };

  const getDestinationClusterName = () => {
    return clusters.find((c) => c.id === Number(destinationId))?.name || '';
  };

  const getRoleStatus = (roleName: string) => {
    const safeSourceRoles = sourceRoles || [];
    const safeDestinationRoles = destinationRoles || [];
    const safeDiffs = roleDiffs || [];
    
    const inSource = safeSourceRoles.some(r => r && r.name === roleName);
    const inDestination = safeDestinationRoles.some(r => r && r.name === roleName);
    const diff = safeDiffs.find(d => d && d.role && d.role.name === roleName);
    
    if (inSource && inDestination) return 'match';
    if (inSource && !inDestination) return 'missing_in_destination';
    // Only show missing_in_source if two-way comparison is enabled
    if (twoWayComparison && !inSource && inDestination) return 'missing_in_source';
    return 'none';
  };

  const getClientStatus = (clientId: string) => {
    const safeSourceClients = sourceClients || [];
    const safeDestinationClients = destinationClients || [];
    const safeDiffs = clientDiffs || [];
    
    const inSource = safeSourceClients.some(c => c && c.clientId === clientId);
    const inDestination = safeDestinationClients.some(c => c && c.clientId === clientId);
    const diff = safeDiffs.find(d => d && d.client && d.client.clientId === clientId);
    
    // Only show missing_in_source if two-way comparison is enabled
    if (twoWayComparison && !inSource && inDestination) return 'missing_in_source';
    if (inSource && !inDestination) return 'missing_in_destination';
    if (diff && diff.status === 'different_config') return 'different';
    if (inSource && inDestination) return 'match';
    return 'none';
  };

  const getGroupStatus = (groupPath: string) => {
    const safeSourceGroups = sourceGroups || [];
    const safeDestinationGroups = destinationGroups || [];
    const safeDiffs = groupDiffs || [];
    
    const inSource = safeSourceGroups.some(g => g && g.path === groupPath);
    const inDestination = safeDestinationGroups.some(g => g && g.path === groupPath);
    const diff = safeDiffs.find(d => d && d.group && d.group.path === groupPath);
    
    // Only show missing_in_source if two-way comparison is enabled
    if (twoWayComparison && !inSource && inDestination) return 'missing_in_source';
    if (inSource && !inDestination) return 'missing_in_destination';
    if (diff && diff.status === 'different_config') return 'different';
    if (inSource && inDestination) return 'match';
    return 'none';
  };

  const getUserStatus = (username: string) => {
    const safeSourceUsers = sourceUsers || [];
    const safeDestinationUsers = destinationUsers || [];
    const safeDiffs = userDiffs || [];
    
    const inSource = safeSourceUsers.some(u => u && u.username === username);
    const inDestination = safeDestinationUsers.some(u => u && u.username === username);
    const diff = safeDiffs.find(d => d && d.user && d.user.username === username);
    
    // Only show missing_in_source if two-way comparison is enabled
    if (twoWayComparison && !inSource && inDestination) return 'missing_in_source';
    if (inSource && !inDestination) return 'missing_in_destination';
    if (diff && diff.status === 'different_config') return 'different';
    if (inSource && inDestination) return 'match';
    return 'none';
  };

  // Group clusters
  const groupedClusters = () => {
    const groups: Record<string, Cluster[]> = {};
    const ungrouped: Cluster[] = [];

    clusters.forEach((cluster) => {
      if (cluster.group_name && cluster.group_name.trim() !== '') {
        if (!groups[cluster.group_name]) {
          groups[cluster.group_name] = [];
        }
        groups[cluster.group_name].push(cluster);
      } else {
        ungrouped.push(cluster);
      }
    });

    return { groups, ungrouped };
  };

  const getFilteredClusters = (groupName?: string): Cluster[] => {
    if (!groupName || groupName === '' || groupName === '__all__') {
      return clusters;
    }
    return clusters.filter(c => c.group_name === groupName);
  };

  const handleSyncClick = (type: 'role' | 'client' | 'group' | 'user', identifier: string, name: string) => {
    if (!sourceId || !destinationId) {
      alert('Please select both source and destination clusters');
      return;
    }
    setSyncConfirmDialog({
      open: true,
      type,
      identifier,
      name,
    });
  };

  const handleSyncConfirm = async () => {
    const { type, identifier } = syncConfirmDialog;
    if (!type || !sourceId || !destinationId) return;

    setSyncConfirmDialog({ open: false, type: null, identifier: '', name: '' });
    const syncKey = `${type}-${identifier}`;
    setSyncing(prev => ({ ...prev, [syncKey]: true }));

    try {
      switch (type) {
        case 'role':
          await syncApi.syncRole(Number(sourceId), Number(destinationId), identifier);
          break;
        case 'client':
          await syncApi.syncClient(Number(sourceId), Number(destinationId), identifier);
          break;
        case 'group':
          await syncApi.syncGroup(Number(sourceId), Number(destinationId), identifier);
          break;
        case 'user':
          await syncApi.syncUser(Number(sourceId), Number(destinationId), identifier);
          break;
      }
      
      // Refresh diff after sync
      await handleDiff();
      alert(`${type.charAt(0).toUpperCase() + type.slice(1)} synced successfully!`);
    } catch (error: any) {
      alert(`Failed to sync ${type}: ${error.message}`);
    } finally {
      setSyncing(prev => ({ ...prev, [syncKey]: false }));
    }
  };

  const tabs = [
    { id: 'summary' as TabType, label: 'Summary', icon: ArrowLeftRight, count: (roleDiffs || []).length + (clientDiffs || []).length + (groupDiffs || []).length + (userDiffs || []).length },
    { id: 'roles' as TabType, label: 'Roles', icon: Key, count: (roleDiffs || []).length },
    { id: 'clients' as TabType, label: 'Clients', icon: Building2, count: (clientDiffs || []).length },
    { id: 'groups' as TabType, label: 'Groups', icon: Network, count: (groupDiffs || []).length },
    { id: 'users' as TabType, label: 'Users', icon: Users, count: (userDiffs || []).length },
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-3"></div>
            <p className="text-sm text-gray-500">Loading clusters...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Cluster Comparison</h1>
        <p className="text-sm text-gray-600">
          Compare roles, clients, groups, and users between two clusters
        </p>
      </div>

      {/* Cluster Selection */}
      <Card className="border border-gray-200 shadow-sm mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900">Select Clusters</CardTitle>
          <CardDescription className="text-xs text-gray-500 mt-0.5">
            Choose source and destination clusters to compare. You can filter by group or select directly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 mb-4">
            {/* Source Selection */}
            <div className="space-y-3">
              <div className="grid gap-2">
                <Label htmlFor="source-group" className="text-sm">Source Group (Optional)</Label>
                <Select value={sourceGroup || '__all__'} onValueChange={(val) => {
                  setSourceGroup(val === '__all__' ? '' : val);
                  setSourceId(''); // Reset cluster selection when group changes
                }}>
                  <SelectTrigger id="source-group" className="h-9">
                    <SelectValue placeholder="All clusters" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All clusters</SelectItem>
                    {Object.keys(groupedClusters().groups).map((groupName) => (
                      <SelectItem key={groupName} value={groupName}>
                        <div className="flex items-center gap-2">
                          <Folder className="h-3 w-3" />
                          {groupName} ({groupedClusters().groups[groupName].length})
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="source" className="text-sm">Source Cluster</Label>
                <Select value={sourceId} onValueChange={setSourceId}>
                  <SelectTrigger id="source" className="h-9">
                    <SelectValue placeholder="Select source cluster" />
                  </SelectTrigger>
                          <SelectContent>
                            {getFilteredClusters(sourceGroup || undefined).map((cluster) => (
                              <SelectItem key={cluster.id} value={cluster.id.toString()}>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{cluster.name}</span>
                                  <span className="text-xs text-gray-500">• Realm: {cluster.realm}</span>
                                  {cluster.group_name && (
                                    <span className="text-xs text-blue-600">• Group: {cluster.group_name}</span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                </Select>
              </div>
            </div>

            {/* Destination Selection */}
            <div className="space-y-3">
              <div className="grid gap-2">
                <Label htmlFor="destination-group" className="text-sm">Destination Group (Optional)</Label>
                <Select value={destinationGroup || '__all__'} onValueChange={(val) => {
                  setDestinationGroup(val === '__all__' ? '' : val);
                  setDestinationId(''); // Reset cluster selection when group changes
                }}>
                  <SelectTrigger id="destination-group" className="h-9">
                    <SelectValue placeholder="All clusters" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All clusters</SelectItem>
                    {Object.keys(groupedClusters().groups).map((groupName) => (
                      <SelectItem key={groupName} value={groupName}>
                        <div className="flex items-center gap-2">
                          <Folder className="h-3 w-3" />
                          {groupName} ({groupedClusters().groups[groupName].length})
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="destination" className="text-sm">Destination Cluster</Label>
                <Select value={destinationId} onValueChange={setDestinationId}>
                  <SelectTrigger id="destination" className="h-9">
                    <SelectValue placeholder="Select destination cluster" />
                  </SelectTrigger>
                          <SelectContent>
                            {getFilteredClusters(destinationGroup || undefined).map((cluster) => (
                              <SelectItem key={cluster.id} value={cluster.id.toString()}>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{cluster.name}</span>
                                  <span className="text-xs text-gray-500">• Realm: {cluster.realm}</span>
                                  {cluster.group_name && (
                                    <span className="text-xs text-blue-600">• Group: {cluster.group_name}</span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Comparison Mode Toggle */}
          <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4 text-gray-600" />
              <Label htmlFor="two-way" className="text-sm font-medium text-gray-700 cursor-pointer">
                Two-way Comparison
              </Label>
            </div>
            <button
              type="button"
              onClick={() => setTwoWayComparison(!twoWayComparison)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
            >
              {twoWayComparison ? (
                <>
                  <ToggleRight className="h-5 w-5 text-blue-600" />
                  <span className="text-xs text-gray-600">Enabled</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="h-5 w-5 text-gray-400" />
                  <span className="text-xs text-gray-500">Disabled</span>
                </>
              )}
            </button>
          </div>

          <Button
            onClick={handleDiff}
            disabled={loadingDiff || !sourceId || !destinationId}
            className="bg-[#4a5568] hover:bg-[#374151] text-white text-sm h-9 w-full"
          >
            <Search className="mr-1.5 h-4 w-4" />
            {loadingDiff ? 'Comparing...' : 'Compare Clusters'}
          </Button>
        </CardContent>
      </Card>

      {/* Tabs */}
      {sourceId && destinationId && (
        <div className="mb-6">
          <div className="flex space-x-1 border-b border-gray-200">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
                    activeTab === tab.id
                      ? "border-[#0066cc] text-[#0066cc]"
                      : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={cn(
                      "ml-1 px-1.5 py-0.5 text-xs rounded-full",
                      activeTab === tab.id
                        ? "bg-[#0066cc]/10 text-[#0066cc]"
                        : "bg-gray-100 text-gray-600"
                    )}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab Content */}
      {loadingDiff ? (
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-3"></div>
            <p className="text-sm text-gray-500">Comparing clusters...</p>
          </CardContent>
        </Card>
      ) : activeTab === 'summary' ? (
        <SummaryView
          roleDiffs={roleDiffs}
          clientDiffs={clientDiffs}
          groupDiffs={groupDiffs}
          userDiffs={userDiffs}
          sourceName={getSourceClusterName()}
          destinationName={getDestinationClusterName()}
          onTabChange={setActiveTab}
          twoWay={twoWayComparison}
        />
      ) : activeTab === 'roles' ? (
        <RolesDiffView
          sourceRoles={sourceRoles}
          destinationRoles={destinationRoles}
          diffs={roleDiffs}
          sourceName={getSourceClusterName()}
          destinationName={getDestinationClusterName()}
          getRoleStatus={getRoleStatus}
          twoWay={twoWayComparison}
          handleSync={handleSyncClick}
          syncing={syncing}
        />
      ) : activeTab === 'clients' ? (
        <ClientsDiffView
          sourceClients={sourceClients}
          destinationClients={destinationClients}
          diffs={clientDiffs}
          sourceName={getSourceClusterName()}
          destinationName={getDestinationClusterName()}
          getClientStatus={getClientStatus}
          twoWay={twoWayComparison}
          handleSync={handleSyncClick}
          syncing={syncing}
        />
      ) : activeTab === 'groups' ? (
        <GroupsDiffView
          sourceGroups={sourceGroups}
          destinationGroups={destinationGroups}
          diffs={groupDiffs}
          sourceName={getSourceClusterName()}
          destinationName={getDestinationClusterName()}
          getGroupStatus={getGroupStatus}
          twoWay={twoWayComparison}
          handleSync={handleSyncClick}
          syncing={syncing}
        />
      ) : activeTab === 'users' ? (
        <UsersDiffView
          sourceUsers={sourceUsers}
          destinationUsers={destinationUsers}
          diffs={userDiffs}
          sourceName={getSourceClusterName()}
          destinationName={getDestinationClusterName()}
          getUserStatus={getUserStatus}
          twoWay={twoWayComparison}
          handleSync={handleSyncClick}
          syncing={syncing}
        />
      ) : null}

      {/* Sync Confirmation Dialog */}
      <Dialog open={syncConfirmDialog.open} onOpenChange={(open) => {
        if (!open) {
          setSyncConfirmDialog({ open: false, type: null, identifier: '', name: '' });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-blue-600" />
              Confirm Sync Operation
            </DialogTitle>
            <DialogDescription className="pt-2">
              You are about to sync a {syncConfirmDialog.type} from <strong>{getSourceClusterName()}</strong> to <strong>{getDestinationClusterName()}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-semibold text-blue-900">
                    {syncConfirmDialog.type === 'role' && 'Role'}
                    {syncConfirmDialog.type === 'client' && 'Client'}
                    {syncConfirmDialog.type === 'group' && 'Group'}
                    {syncConfirmDialog.type === 'user' && 'User'}: <span className="font-mono">{syncConfirmDialog.name}</span>
                  </p>
                  <div className="text-xs text-blue-800 space-y-1">
                    {syncConfirmDialog.type === 'role' && (
                      <>
                        <p>• The role will be created in the destination cluster with the same name and description.</p>
                        <p>• Role attributes and composite roles will be preserved.</p>
                      </>
                    )}
                    {syncConfirmDialog.type === 'client' && (
                      <>
                        <p>• The client will be exported from the source cluster and imported to the destination cluster.</p>
                        <p>• All client settings, redirect URIs, scopes, and configurations will be preserved.</p>
                        <p>• If a client with the same ID already exists, it will be updated.</p>
                      </>
                    )}
                    {syncConfirmDialog.type === 'group' && (
                      <>
                        <p>• The group will be created in the destination cluster with the same path and attributes.</p>
                        <p>• Group members and roles will be preserved.</p>
                      </>
                    )}
                    {syncConfirmDialog.type === 'user' && (
                      <>
                        <p>• The user will be created in the destination cluster with the same username and attributes.</p>
                        <p>• User credentials, roles, and group memberships will be preserved.</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSyncConfirmDialog({ open: false, type: null, identifier: '', name: '' })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSyncConfirm}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <ArrowLeftRight className="h-4 w-4 mr-2" />
              Confirm Sync
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Roles Diff View Component
// Summary View Component
function SummaryView({
  roleDiffs,
  clientDiffs,
  groupDiffs,
  userDiffs,
  sourceName,
  destinationName,
  onTabChange,
  twoWay = true,
}: {
  roleDiffs: RoleDiffType[];
  clientDiffs: ClientDiff[];
  groupDiffs: GroupDiff[];
  userDiffs: UserDiff[];
  sourceName: string;
  destinationName: string;
  onTabChange: (tab: TabType) => void;
  twoWay?: boolean;
}) {
  const [expandedCategories, setExpandedCategories] = useState<Set<TabType>>(new Set());
  
  const safeRoleDiffs = roleDiffs || [];
  const safeClientDiffs = clientDiffs || [];
  const safeGroupDiffs = groupDiffs || [];
  const safeUserDiffs = userDiffs || [];

  const toggleCategory = (categoryId: TabType, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const getDiffStats = (diffs: any[], type: string) => {
    const missingInDest = diffs.filter(d => d.status === 'missing_in_destination').length;
    const missingInSource = twoWay ? diffs.filter(d => d.status === 'missing_in_source').length : 0;
    const different = diffs.filter(d => d.status === 'different_config').length;
    const total = twoWay ? diffs.length : missingInDest + different;
    return { missingInDest, missingInSource, different, total };
  };

  const roleStats = getDiffStats(safeRoleDiffs, 'role');
  const clientStats = getDiffStats(safeClientDiffs, 'client');
  const groupStats = getDiffStats(safeGroupDiffs, 'group');
  const userStats = getDiffStats(safeUserDiffs, 'user');

  const summaryCards = [
    {
      id: 'roles' as TabType,
      label: 'Roles',
      icon: Key,
      stats: roleStats,
      color: 'blue',
    },
    {
      id: 'clients' as TabType,
      label: 'Clients',
      icon: Building2,
      stats: clientStats,
      color: 'purple',
    },
    {
      id: 'groups' as TabType,
      label: 'Groups',
      icon: Network,
      stats: groupStats,
      color: 'green',
    },
    {
      id: 'users' as TabType,
      label: 'Users',
      icon: Users,
      stats: userStats,
      color: 'orange',
    },
  ];

  const totalMissingInDest = roleStats.missingInDest + clientStats.missingInDest + groupStats.missingInDest + userStats.missingInDest;
  const totalMissingInSource = roleStats.missingInSource + clientStats.missingInSource + groupStats.missingInSource + userStats.missingInSource;
  const totalDifferent = roleStats.different + clientStats.different + groupStats.different + userStats.different;
  const totalIssues = totalMissingInDest + totalMissingInSource + totalDifferent;

  return (
    <div className="space-y-6">
      {/* Header with Overall Stats */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900 mb-1">Comparison Summary</CardTitle>
              <CardDescription className="text-sm text-gray-600">
                {sourceName} <ArrowRight className="h-4 w-4 inline mx-2" /> {destinationName}
              </CardDescription>
            </div>
            {totalIssues > 0 && (
              <div className="text-right">
                <div className="text-3xl font-bold text-red-600">{totalIssues}</div>
                <div className="text-xs text-gray-600 font-medium">Total Issues</div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Overall Stats Bar */}
          <div className={`grid gap-4 mb-6 ${twoWay ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <div className="text-center p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-2xl font-bold text-red-600 mb-1">{totalMissingInDest}</div>
              <div className="text-xs text-red-700 font-medium">Missing in Destination</div>
            </div>
            {twoWay && (
              <div className="text-center p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="text-2xl font-bold text-orange-600 mb-1">{totalMissingInSource}</div>
                <div className="text-xs text-orange-700 font-medium">Missing in Source</div>
              </div>
            )}
            <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600 mb-1">{totalDifferent}</div>
              <div className="text-xs text-yellow-700 font-medium">Different Config</div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Breakdown by Category</h3>
            <div className="space-y-2">
              {summaryCards.map((card) => {
                if (card.stats.total === 0) return null;
                
                const isExpanded = expandedCategories.has(card.id);
                const diffs: any[] = card.id === 'roles' ? safeRoleDiffs :
                             card.id === 'clients' ? safeClientDiffs :
                             card.id === 'groups' ? safeGroupDiffs :
                             safeUserDiffs;
                
                return (
                  <div
                    key={card.id}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    <div
                      onClick={() => onTabChange(card.id)}
                      className="flex items-center justify-between p-4 hover:bg-gray-50 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => toggleCategory(card.id, e)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-gray-600" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-600" />
                          )}
                        </button>
                        {card.color === 'blue' && <card.icon className="h-5 w-5 text-blue-600" />}
                        {card.color === 'purple' && <card.icon className="h-5 w-5 text-purple-600" />}
                        {card.color === 'green' && <card.icon className="h-5 w-5 text-green-600" />}
                        {card.color === 'orange' && <card.icon className="h-5 w-5 text-orange-600" />}
                        <span className="font-medium text-gray-900">{card.label}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        {card.stats.missingInDest > 0 && (
                          <div className="flex items-center gap-1.5">
                            <XCircle className="h-4 w-4 text-red-600" />
                            <span className="text-sm font-semibold text-red-600">{card.stats.missingInDest}</span>
                            <span className="text-xs text-gray-500">in Dest</span>
                          </div>
                        )}
                        {twoWay && card.stats.missingInSource > 0 && (
                          <div className="flex items-center gap-1.5">
                            <XCircle className="h-4 w-4 text-orange-600" />
                            <span className="text-sm font-semibold text-orange-600">{card.stats.missingInSource}</span>
                            <span className="text-xs text-gray-500">in Source</span>
                          </div>
                        )}
                        {card.stats.different > 0 && (
                          <div className="flex items-center gap-1.5">
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                            <span className="text-sm font-semibold text-yellow-600">{card.stats.different}</span>
                            <span className="text-xs text-gray-500">different</span>
                          </div>
                        )}
                        <div className="ml-2 px-3 py-1 bg-gray-100 rounded-full">
                          <span className="text-sm font-bold text-gray-900">{card.stats.total}</span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                      </div>
                    </div>
                    
                    {/* Collapsible Details */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 bg-gray-50">
                        <div className="p-4 space-y-3">
                          {/* Missing in Destination */}
                          {card.stats.missingInDest > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <XCircle className="h-4 w-4 text-red-600" />
                                <span className="text-sm font-semibold text-red-700">Missing in Destination ({card.stats.missingInDest})</span>
                              </div>
                              <div className="ml-6 space-y-1">
                                {diffs.filter((d: any) => d.status === 'missing_in_destination').slice(0, 10).map((diff: any, idx: number) => (
                                  <div key={idx} className="text-xs text-gray-700 py-1 px-2 bg-white rounded border border-gray-200">
                                    {diff.role?.name || diff.client?.clientId || diff.group?.name || diff.user?.username || 'N/A'}
                                  </div>
                                ))}
                                {card.stats.missingInDest > 10 && (
                                  <div className="text-xs text-gray-500 italic">... and {card.stats.missingInDest - 10} more</div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Missing in Source - Only show if two-way */}
                          {twoWay && card.stats.missingInSource > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <XCircle className="h-4 w-4 text-orange-600" />
                                <span className="text-sm font-semibold text-orange-700">Missing in Source ({card.stats.missingInSource})</span>
                              </div>
                              <div className="ml-6 space-y-1">
                                {diffs.filter((d: any) => d.status === 'missing_in_source').slice(0, 10).map((diff: any, idx: number) => (
                                  <div key={idx} className="text-xs text-gray-700 py-1 px-2 bg-white rounded border border-gray-200">
                                    {diff.role?.name || diff.client?.clientId || diff.group?.name || diff.user?.username || 'N/A'}
                                  </div>
                                ))}
                                {card.stats.missingInSource > 10 && (
                                  <div className="text-xs text-gray-500 italic">... and {card.stats.missingInSource - 10} more</div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Different Config */}
                          {card.stats.different > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <AlertCircle className="h-4 w-4 text-yellow-600" />
                                <span className="text-sm font-semibold text-yellow-700">Different Configuration ({card.stats.different})</span>
                              </div>
                              <div className="ml-6 space-y-1">
                                {diffs.filter((d: any) => d.status === 'different_config').slice(0, 10).map((diff: any, idx: number) => (
                                  <div key={idx} className="text-xs text-gray-700 py-1 px-2 bg-white rounded border border-gray-200">
                                    <div className="font-medium">
                                      {diff.role?.name || diff.client?.clientId || diff.group?.name || diff.user?.username || 'N/A'}
                                    </div>
                                    {diff.differences && diff.differences.length > 0 && (
                                      <div className="text-[10px] text-gray-500 mt-0.5">
                                        Differences: {diff.differences.join(', ')}
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {card.stats.different > 10 && (
                                  <div className="text-xs text-gray-500 italic">... and {card.stats.different - 10} more</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {totalIssues === 0 && (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-900 mb-1">No Differences Found</p>
                  <p className="text-xs text-gray-500">Both clusters are identical</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RolesDiffView({
  sourceRoles,
  destinationRoles,
  diffs,
  sourceName,
  destinationName,
  getRoleStatus,
  twoWay = true,
  handleSync,
  syncing,
}: {
  sourceRoles: Role[];
  destinationRoles: Role[];
  diffs: RoleDiffType[];
  sourceName: string;
  destinationName: string;
  getRoleStatus: (name: string) => string;
  twoWay?: boolean;
  handleSync: (type: 'role' | 'client' | 'group' | 'user', identifier: string, name: string) => void;
  syncing: Record<string, boolean>;
}) {
  const safeSourceRoles = sourceRoles || [];
  const safeDestinationRoles = destinationRoles || [];
  const safeDiffs = diffs || [];
  
  if (safeSourceRoles.length === 0 && safeDestinationRoles.length === 0) {
    return (
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="py-12 text-center">
          <Key className="h-10 w-10 text-gray-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-900 mb-1">No roles to compare</p>
          <p className="text-xs text-gray-500">Select clusters and click Compare to see differences</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-5">
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="bg-gray-50 border-b pb-3">
            <CardTitle className="text-sm font-semibold text-gray-900">Source: {sourceName}</CardTitle>
            <CardDescription className="text-xs text-gray-600 mt-0.5">{safeSourceRoles.length} roles</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto">
              {safeSourceRoles.map((role) => {
                const status = getRoleStatus(role.name);
                return (
                  <div
                    key={role.id}
                    className={cn(
                      "px-4 py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors",
                      status === 'missing_in_destination' && "bg-red-100 border-l-4 border-red-500"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate">{role.name}</span>
                          {status === 'missing_in_destination' && <span title="Missing in destination"><XCircle className="h-3.5 w-3.5 text-red-600 flex-shrink-0" /></span>}
                        </div>
                        {role.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{role.description}</p>
                        )}
                      </div>
                      {status === 'missing_in_destination' && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                onClick={() => handleSync('role', role.name, role.name)}
                                disabled={syncing[`role-${role.name}`]}
                              >
                                {syncing[`role-${role.name}`] ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <ArrowLeftRight className="h-3 w-3" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs font-medium">Sync Role</p>
                              <p className="text-xs mt-1 opacity-90">Sync this role to destination cluster</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="col-span-2 flex flex-col items-center justify-center">
        <div className="text-center">
          <ArrowRight className="h-5 w-5 text-gray-400 mx-auto mb-2" />
          <div className="text-xs text-gray-500 mb-3">Comparison</div>
          {safeDiffs.length > 0 && (
            <div className="bg-gray-100 border border-gray-300 rounded p-2.5">
              <div className="text-xs font-semibold text-gray-900 mb-0.5">
                {safeDiffs.filter(d => d.status === 'missing_in_destination').length} Missing in Dest
              </div>
              {twoWay && (
                <div className="text-xs font-semibold text-gray-900 mb-0.5">
                  {safeDiffs.filter(d => d.status === 'missing_in_source').length} Missing in Source
                </div>
              )}
              <div className="text-[10px] text-gray-600">{twoWay ? 'Two-way' : 'One-way'} comparison</div>
            </div>
          )}
        </div>
      </div>

      <div className="col-span-5">
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="bg-gray-50 border-b pb-3">
            <CardTitle className="text-sm font-semibold text-gray-900">Destination: {destinationName}</CardTitle>
            <CardDescription className="text-xs text-gray-600 mt-0.5">{safeDestinationRoles.length} roles</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto">
              {safeDestinationRoles.map((role) => {
                const status = getRoleStatus(role.name);
                return (
                  <div
                    key={role.id}
                    className={cn(
                      "px-4 py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors",
                      status === 'match' && "bg-gray-50",
                      twoWay && status === 'missing_in_source' && "bg-orange-100 border-l-4 border-orange-500"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate">{role.name}</span>
                          {status === 'match' && <span title="Match"><CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0" /></span>}
                          {twoWay && status === 'missing_in_source' && <span title="Missing in source"><XCircle className="h-3.5 w-3.5 text-orange-600 flex-shrink-0" /></span>}
                        </div>
                        {role.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{role.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Clients Diff View Component
function ClientsDiffView({
  sourceClients,
  destinationClients,
  diffs,
  sourceName,
  destinationName,
  getClientStatus,
  twoWay = true,
  handleSync,
  syncing,
}: {
  sourceClients: ClientDetail[];
  destinationClients: ClientDetail[];
  diffs: ClientDiff[];
  sourceName: string;
  destinationName: string;
  getClientStatus: (clientId: string) => string;
  twoWay?: boolean;
  handleSync: (type: 'role' | 'client' | 'group' | 'user', identifier: string, name: string) => void;
  syncing: Record<string, boolean>;
}) {
  const safeSourceClients = sourceClients || [];
  const safeDestinationClients = destinationClients || [];
  const safeDiffs = diffs || [];
  
  if (safeSourceClients.length === 0 && safeDestinationClients.length === 0) {
    return (
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="py-12 text-center">
          <Building2 className="h-10 w-10 text-gray-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-900 mb-1">No clients to compare</p>
          <p className="text-xs text-gray-500">Select clusters and click Compare to see differences</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-5">
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="bg-gray-50 border-b pb-3">
            <CardTitle className="text-sm font-semibold text-gray-900">Source: {sourceName}</CardTitle>
            <CardDescription className="text-xs text-gray-600 mt-0.5">{safeSourceClients.length} clients</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto">
              {safeSourceClients.map((client) => {
                const status = getClientStatus(client.clientId);
                const diff = safeDiffs.find(d => d && d.client && d.client.clientId === client.clientId);
                return (
                  <div
                    key={client.id}
                    className={cn(
                      "px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors",
                      status === 'missing_in_destination' && "bg-red-100 border-l-4 border-red-500",
                      status === 'different' && "bg-yellow-100 border-l-4 border-yellow-500"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate">{client.clientId}</span>
                          {status === 'missing_in_destination' && <span title="Missing in destination"><XCircle className="h-3.5 w-3.5 text-red-600 flex-shrink-0" /></span>}
                          {status === 'different' && <span title="Different configuration"><AlertCircle className="h-4 w-4 text-yellow-700 flex-shrink-0 animate-pulse" /></span>}
                        </div>
                        {client.name && (
                          <p className="text-xs text-gray-500 mt-0.5">{client.name}</p>
                        )}
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded">{client.protocol || 'N/A'}</span>
                          {client.publicClient && <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">Public</span>}
                          {client.bearerOnly && <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">Bearer</span>}
                          {client.serviceAccountsEnabled && <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded">Service</span>}
                        </div>
                        {diff && diff.differences && diff.differences.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <div className="text-xs font-semibold text-yellow-800">Differences:</div>
                            <div className="text-[10px] text-yellow-700 space-y-0.5">
                              {diff.differences.map((field, idx) => {
                                const sourceVal = diff.sourceValue?.[field];
                                const destVal = diff.destinationValue?.[field];
                                return (
                                  <div key={idx} className="bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
                                    <div className="font-medium text-yellow-800">{field}:</div>
                                    <div className="grid grid-cols-2 gap-2 mt-0.5">
                                      <div>
                                        <div className="text-[9px] text-gray-500">Source:</div>
                                        <div className="text-[10px] text-red-700 font-mono break-words">
                                          {Array.isArray(sourceVal) ? sourceVal.join(', ') : String(sourceVal ?? 'N/A')}
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-[9px] text-gray-500">Destination:</div>
                                        <div className="text-[10px] text-blue-700 font-mono break-words">
                                          {Array.isArray(destVal) ? destVal.join(', ') : String(destVal ?? 'N/A')}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                      {(status === 'missing_in_destination' || status === 'different') && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                onClick={() => handleSync('client', client.clientId, client.clientId)}
                                disabled={syncing[`client-${client.clientId}`]}
                              >
                                {syncing[`client-${client.clientId}`] ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <ArrowLeftRight className="h-3 w-3" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs font-medium">Sync Client</p>
                              <p className="text-xs mt-1 opacity-90">Export and import this client to destination cluster</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="col-span-2 flex flex-col items-center justify-center">
        <div className="text-center">
          <ArrowRight className="h-5 w-5 text-gray-400 mx-auto mb-2" />
          <div className="text-xs text-gray-500 mb-3">Comparison</div>
          {safeDiffs.length > 0 && (
            <div className="bg-gray-100 border border-gray-300 rounded p-2.5">
              <div className="text-xs font-semibold text-gray-900 mb-0.5">
                {safeDiffs.filter(d => d.status === 'missing_in_destination').length} Missing in Dest
              </div>
              {twoWay && (
                <div className="text-xs font-semibold text-gray-900 mb-0.5">
                  {safeDiffs.filter(d => d.status === 'missing_in_source').length} Missing in Source
              </div>
              )}
              <div className="text-xs font-semibold text-yellow-700 mb-0.5">
                {safeDiffs.filter(d => d.status === 'different_config').length} Different Config
              </div>
              <div className="text-[10px] text-gray-600">{twoWay ? 'Two-way' : 'One-way'} comparison</div>
            </div>
          )}
        </div>
      </div>

      <div className="col-span-5">
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="bg-gray-50 border-b pb-3">
            <CardTitle className="text-sm font-semibold text-gray-900">Destination: {destinationName}</CardTitle>
            <CardDescription className="text-xs text-gray-600 mt-0.5">{safeDestinationClients.length} clients</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto">
              {safeDestinationClients.map((client) => {
                const status = getClientStatus(client.clientId);
                return (
                  <div
                    key={client.id}
                    className={cn(
                      "px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors",
                      status === 'match' && "bg-gray-50",
                      twoWay && status === 'missing_in_source' && "bg-orange-100 border-l-4 border-orange-500"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate">{client.clientId}</span>
                          {status === 'match' && <span title="Match"><CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0" /></span>}
                          {twoWay && status === 'missing_in_source' && <span title="Missing in source"><XCircle className="h-3.5 w-3.5 text-orange-600 flex-shrink-0" /></span>}
                        </div>
                        {client.name && (
                          <p className="text-xs text-gray-500 mt-0.5">{client.name}</p>
                        )}
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded">{client.protocol || 'N/A'}</span>
                          {client.publicClient && <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">Public</span>}
                          {client.bearerOnly && <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">Bearer</span>}
                          {client.serviceAccountsEnabled && <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded">Service</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Groups Diff View Component
function GroupsDiffView({
  sourceGroups,
  destinationGroups,
  diffs,
  sourceName,
  destinationName,
  getGroupStatus,
  twoWay = true,
  handleSync,
  syncing,
}: {
  sourceGroups: GroupDetail[];
  destinationGroups: GroupDetail[];
  diffs: GroupDiff[];
  sourceName: string;
  destinationName: string;
  getGroupStatus: (path: string) => string;
  twoWay?: boolean;
  handleSync: (type: 'role' | 'client' | 'group' | 'user', identifier: string, name: string) => void;
  syncing: Record<string, boolean>;
}) {
  const safeSourceGroups = sourceGroups || [];
  const safeDestinationGroups = destinationGroups || [];
  const safeDiffs = diffs || [];
  
  if (safeSourceGroups.length === 0 && safeDestinationGroups.length === 0) {
    return (
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="py-12 text-center">
          <Network className="h-10 w-10 text-gray-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-900 mb-1">No groups to compare</p>
          <p className="text-xs text-gray-500">Select clusters and click Compare to see differences</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-5">
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="bg-gray-50 border-b pb-3">
            <CardTitle className="text-sm font-semibold text-gray-900">Source: {sourceName}</CardTitle>
            <CardDescription className="text-xs text-gray-600 mt-0.5">{safeSourceGroups.length} groups</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto">
              {safeSourceGroups.map((group) => {
                const status = getGroupStatus(group.path);
                const diff = safeDiffs.find(d => d && d.group && d.group.path === group.path);
                return (
                  <div
                    key={group.id}
                    className={cn(
                      "px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors",
                      status === 'missing_in_destination' && "bg-red-100 border-l-4 border-red-500",
                      status === 'different' && "bg-yellow-100 border-l-4 border-yellow-500"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate">{group.name}</span>
                          {status === 'missing_in_destination' && <span title="Missing in destination"><XCircle className="h-3.5 w-3.5 text-red-600 flex-shrink-0" /></span>}
                          {status === 'different' && <span title="Different configuration"><AlertCircle className="h-4 w-4 text-yellow-700 flex-shrink-0 animate-pulse" /></span>}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{group.path}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {group.realmRoles && group.realmRoles.length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                              {group.realmRoles.length} roles
                            </span>
                          )}
                          {group.clientRoles && Object.keys(group.clientRoles).length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">
                              {Object.keys(group.clientRoles).length} client roles
                            </span>
                          )}
                        </div>
                        {diff && diff.differences && diff.differences.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <div className="text-xs font-semibold text-yellow-800">Differences:</div>
                            <div className="text-[10px] text-yellow-700 space-y-0.5">
                              {diff.differences.map((field, idx) => {
                                const sourceVal = diff.sourceValue?.[field];
                                const destVal = diff.destinationValue?.[field];
                                return (
                                  <div key={idx} className="bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
                                    <div className="font-medium text-yellow-800">{field}:</div>
                                    <div className="grid grid-cols-2 gap-2 mt-0.5">
                                      <div>
                                        <div className="text-[9px] text-gray-500">Source:</div>
                                        <div className="text-[10px] text-red-700 font-mono break-words">
                                          {Array.isArray(sourceVal) ? sourceVal.join(', ') : String(sourceVal ?? 'N/A')}
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-[9px] text-gray-500">Destination:</div>
                                        <div className="text-[10px] text-blue-700 font-mono break-words">
                                          {Array.isArray(destVal) ? destVal.join(', ') : String(destVal ?? 'N/A')}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                      {(status === 'missing_in_destination' || status === 'different') && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                onClick={() => handleSync('group', group.path, group.name || group.path)}
                                disabled={syncing[`group-${group.path}`]}
                              >
                                {syncing[`group-${group.path}`] ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <ArrowLeftRight className="h-3 w-3" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs font-medium">Sync Group</p>
                              <p className="text-xs mt-1 opacity-90">Sync this group to destination cluster</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="col-span-2 flex flex-col items-center justify-center">
        <div className="text-center">
          <ArrowRight className="h-5 w-5 text-gray-400 mx-auto mb-2" />
          <div className="text-xs text-gray-500 mb-3">Comparison</div>
          {safeDiffs.length > 0 && (
            <div className="bg-gray-100 border border-gray-300 rounded p-2.5">
              <div className="text-xs font-semibold text-gray-900 mb-0.5">
                {safeDiffs.filter(d => d.status === 'missing_in_destination').length} Missing in Dest
              </div>
              {twoWay && (
                <div className="text-xs font-semibold text-gray-900 mb-0.5">
                  {safeDiffs.filter(d => d.status === 'missing_in_source').length} Missing in Source
              </div>
              )}
              <div className="text-xs font-semibold text-yellow-700 mb-0.5">
                {safeDiffs.filter(d => d.status === 'different_config').length} Different Config
              </div>
              <div className="text-[10px] text-gray-600">{twoWay ? 'Two-way' : 'One-way'} comparison</div>
            </div>
          )}
        </div>
      </div>

      <div className="col-span-5">
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="bg-gray-50 border-b pb-3">
            <CardTitle className="text-sm font-semibold text-gray-900">Destination: {destinationName}</CardTitle>
            <CardDescription className="text-xs text-gray-600 mt-0.5">{safeDestinationGroups.length} groups</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto">
              {safeDestinationGroups.map((group) => {
                const status = getGroupStatus(group.path);
                return (
                  <div
                    key={group.id}
                    className={cn(
                      "px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors",
                      status === 'match' && "bg-gray-50",
                      twoWay && status === 'missing_in_source' && "bg-orange-100 border-l-4 border-orange-500"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate">{group.name}</span>
                          {status === 'match' && <span title="Match"><CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0" /></span>}
                          {twoWay && status === 'missing_in_source' && <span title="Missing in source"><XCircle className="h-3.5 w-3.5 text-orange-600 flex-shrink-0" /></span>}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{group.path}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {group.realmRoles && group.realmRoles.length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                              {group.realmRoles.length} roles
                            </span>
                          )}
                          {group.clientRoles && Object.keys(group.clientRoles).length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">
                              {Object.keys(group.clientRoles).length} client roles
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Users Diff View Component
function UsersDiffView({
  sourceUsers,
  destinationUsers,
  diffs,
  sourceName,
  destinationName,
  getUserStatus,
  twoWay = true,
  handleSync,
  syncing,
}: {
  sourceUsers: UserDetail[];
  destinationUsers: UserDetail[];
  diffs: UserDiff[];
  sourceName: string;
  destinationName: string;
  getUserStatus: (username: string) => string;
  twoWay?: boolean;
  handleSync: (type: 'role' | 'client' | 'group' | 'user', identifier: string, name: string) => void;
  syncing: Record<string, boolean>;
}) {
  const safeSourceUsers = sourceUsers || [];
  const safeDestinationUsers = destinationUsers || [];
  const safeDiffs = diffs || [];
  
  if (safeSourceUsers.length === 0 && safeDestinationUsers.length === 0) {
    return (
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="py-12 text-center">
          <Users className="h-10 w-10 text-gray-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-900 mb-1">No users to compare</p>
          <p className="text-xs text-gray-500">Select clusters and click Compare to see differences</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-5">
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="bg-gray-50 border-b pb-3">
            <CardTitle className="text-sm font-semibold text-gray-900">Source: {sourceName}</CardTitle>
            <CardDescription className="text-xs text-gray-600 mt-0.5">{safeSourceUsers.length} users</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto">
              {safeSourceUsers.map((user) => {
                const status = getUserStatus(user.username);
                const diff = safeDiffs.find(d => d && d.user && d.user.username === user.username);
                return (
                  <div
                    key={user.id}
                    className={cn(
                      "px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors",
                      status === 'missing_in_destination' && "bg-red-100 border-l-4 border-red-500",
                      status === 'different' && "bg-yellow-100 border-l-4 border-yellow-500"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate">{user.username}</span>
                          {status === 'missing_in_destination' && <span title="Missing in destination"><XCircle className="h-3.5 w-3.5 text-red-600 flex-shrink-0" /></span>}
                          {status === 'different' && <span title="Different configuration"><AlertCircle className="h-4 w-4 text-yellow-700 flex-shrink-0 animate-pulse" /></span>}
                        </div>
                        {user.email && (
                          <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
                        )}
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {user.realmRoles && user.realmRoles.length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                              {user.realmRoles.length} roles
                            </span>
                          )}
                          {user.groups && user.groups.length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                              {user.groups.length} groups
                            </span>
                          )}
                        </div>
                        {diff && diff.differences && diff.differences.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <div className="text-xs font-semibold text-yellow-800">Differences:</div>
                            <div className="text-[10px] text-yellow-700 space-y-0.5">
                              {diff.differences.map((field, idx) => {
                                const sourceVal = diff.sourceValue?.[field];
                                const destVal = diff.destinationValue?.[field];
                                return (
                                  <div key={idx} className="bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
                                    <div className="font-medium text-yellow-800">{field}:</div>
                                    <div className="grid grid-cols-2 gap-2 mt-0.5">
                                      <div>
                                        <div className="text-[9px] text-gray-500">Source:</div>
                                        <div className="text-[10px] text-red-700 font-mono break-words">
                                          {Array.isArray(sourceVal) ? sourceVal.join(', ') : String(sourceVal ?? 'N/A')}
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-[9px] text-gray-500">Destination:</div>
                                        <div className="text-[10px] text-blue-700 font-mono break-words">
                                          {Array.isArray(destVal) ? destVal.join(', ') : String(destVal ?? 'N/A')}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                      {(status === 'missing_in_destination' || status === 'different') && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                onClick={() => handleSync('user', user.username, user.username)}
                                disabled={syncing[`user-${user.username}`]}
                              >
                                {syncing[`user-${user.username}`] ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <ArrowLeftRight className="h-3 w-3" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs font-medium">Sync User</p>
                              <p className="text-xs mt-1 opacity-90">Sync this user to destination cluster</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="col-span-2 flex flex-col items-center justify-center">
        <div className="text-center">
          <ArrowRight className="h-5 w-5 text-gray-400 mx-auto mb-2" />
          <div className="text-xs text-gray-500 mb-3">Comparison</div>
          {safeDiffs.length > 0 && (
            <div className="bg-gray-100 border border-gray-300 rounded p-2.5">
              <div className="text-xs font-semibold text-gray-900 mb-0.5">
                {safeDiffs.filter(d => d.status === 'missing_in_destination').length} Missing in Dest
              </div>
              {twoWay && (
                <div className="text-xs font-semibold text-gray-900 mb-0.5">
                  {safeDiffs.filter(d => d.status === 'missing_in_source').length} Missing in Source
              </div>
              )}
              <div className="text-xs font-semibold text-yellow-700 mb-0.5">
                {safeDiffs.filter(d => d.status === 'different_config').length} Different Config
              </div>
              <div className="text-[10px] text-gray-600">{twoWay ? 'Two-way' : 'One-way'} comparison</div>
            </div>
          )}
        </div>
      </div>

      <div className="col-span-5">
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="bg-gray-50 border-b pb-3">
            <CardTitle className="text-sm font-semibold text-gray-900">Destination: {destinationName}</CardTitle>
            <CardDescription className="text-xs text-gray-600 mt-0.5">{safeDestinationUsers.length} users</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto">
              {safeDestinationUsers.map((user) => {
                const status = getUserStatus(user.username);
                return (
                  <div
                    key={user.id}
                    className={cn(
                      "px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors",
                      status === 'match' && "bg-gray-50",
                      twoWay && status === 'missing_in_source' && "bg-orange-100 border-l-4 border-orange-500"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate">{user.username}</span>
                          {status === 'match' && <span title="Match"><CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0" /></span>}
                          {twoWay && status === 'missing_in_source' && <span title="Missing in source"><XCircle className="h-3.5 w-3.5 text-orange-600 flex-shrink-0" /></span>}
                        </div>
                        {user.email && (
                          <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
                        )}
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {user.realmRoles && user.realmRoles.length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                              {user.realmRoles.length} roles
                            </span>
                          )}
                          {user.groups && user.groups.length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                              {user.groups.length} groups
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
