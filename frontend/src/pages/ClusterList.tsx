import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clusterApi, roleApi, Cluster, ClusterHealth, ClusterMetrics } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Activity, Eye, Shield, Users, Key, Building2, Network, Server, X, CheckCircle2, AlertCircle, Tag } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function ClusterList() {
  const navigate = useNavigate();
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [healthStatuses, setHealthStatuses] = useState<Record<number, ClusterHealth>>({});
  const [checkingHealth, setCheckingHealth] = useState<Record<number, boolean>>({});
  const [metrics, setMetrics] = useState<Record<number, ClusterMetrics>>({});
  const [loadingMetrics, setLoadingMetrics] = useState<Record<number, boolean>>({});
  const [detailDialog, setDetailDialog] = useState<{ open: boolean; type: 'clients' | 'users' | 'groups' | 'roles' | null; clusterId: number | null }>({
    open: false,
    type: null,
    clusterId: null,
  });
  const [detailData, setDetailData] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [groupDialog, setGroupDialog] = useState<{ open: boolean; clusterId: number | null; currentGroup: string }>({
    open: false,
    clusterId: null,
    currentGroup: '',
  });
  const [groupName, setGroupName] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    base_url: '',
    realm: 'master',
    username: '',
    password: '',
    group_name: '',
  });

  useEffect(() => {
    loadClusters();
  }, []);

  useEffect(() => {
    // Load metrics for all clusters
    if (clusters.length > 0) {
      clusters.forEach((cluster) => {
        if (!metrics[cluster.id] && !loadingMetrics[cluster.id]) {
          loadMetrics(cluster.id);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusters]);

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

  const handleCreate = async () => {
    try {
      const createData = {
        ...formData,
        group_name: formData.group_name.trim() === '' ? undefined : formData.group_name.trim(),
      };
      await clusterApi.create(createData);
      setIsDialogOpen(false);
      setFormData({
        name: '',
        base_url: '',
        realm: 'master',
        username: '',
        password: '',
        group_name: '',
      });
      loadClusters();
      
      // Notify sidebar to refresh
      window.dispatchEvent(new CustomEvent('clusterUpdated'));
    } catch (error: any) {
      alert(error.message || 'Failed to create cluster');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this cluster?')) {
      return;
    }
    try {
      await clusterApi.delete(id);
      loadClusters();
      delete healthStatuses[id];
      
      // Notify sidebar to refresh
      window.dispatchEvent(new CustomEvent('clusterUpdated'));
    } catch (error) {
      alert('Failed to delete cluster');
    }
  };

  const handleSetGroup = (clusterId: number, currentGroup?: string | null) => {
    setGroupDialog({
      open: true,
      clusterId,
      currentGroup: currentGroup || '',
    });
    setGroupName(currentGroup || '');
  };

  const handleUpdateGroup = async () => {
    if (!groupDialog.clusterId) return;
    
    const cluster = clusters.find(c => c.id === groupDialog.clusterId);
    if (!cluster) return;

    try {
      await clusterApi.update(groupDialog.clusterId, {
        name: cluster.name,
        base_url: cluster.base_url,
        realm: cluster.realm,
        username: cluster.username,
        password: cluster.password,
        group_name: groupName.trim() === '' ? undefined : groupName.trim(),
      });
      setGroupDialog({ open: false, clusterId: null, currentGroup: '' });
      setGroupName('');
      loadClusters();
      
      // Notify sidebar to refresh
      window.dispatchEvent(new CustomEvent('clusterUpdated'));
    } catch (error: any) {
      alert(error.message || 'Failed to update cluster group');
    }
  };

  const handleHealthCheck = async (id: number) => {
    setCheckingHealth({ ...checkingHealth, [id]: true });
    try {
      const health = await clusterApi.healthCheck(id);
      setHealthStatuses({ ...healthStatuses, [id]: health });
    } catch (error) {
      setHealthStatuses({
        ...healthStatuses,
        [id]: { cluster_id: id, status: 'error', message: 'Failed to check health' },
      });
    } finally {
      setCheckingHealth({ ...checkingHealth, [id]: false });
    }
  };

  const loadMetrics = async (clusterId: number) => {
    if (loadingMetrics[clusterId] || metrics[clusterId]) return;
    
    setLoadingMetrics((prev) => ({ ...prev, [clusterId]: true }));
    try {
      const data = await clusterApi.getMetrics(clusterId);
      setMetrics((prev) => ({ ...prev, [clusterId]: data }));
    } catch (error: any) {
      console.error(`Failed to load metrics for cluster ${clusterId}:`, error);
      // Set default values on error (show error state)
      setMetrics((prev) => ({
        ...prev,
        [clusterId]: {
          cluster_id: clusterId,
          clients: -1, // -1 means error
          roles: -1,
          users: -1,
          groups: -1,
        },
      }));
    } finally {
      setLoadingMetrics((prev) => ({ ...prev, [clusterId]: false }));
    }
  };

  const getClusterMetrics = (clusterId: number) => {
    if (metrics[clusterId]) {
      return metrics[clusterId];
    }
    // Return loading state
    return {
      clients: loadingMetrics[clusterId] ? -1 : 0,
      roles: loadingMetrics[clusterId] ? -1 : 0,
      users: loadingMetrics[clusterId] ? -1 : 0,
      groups: loadingMetrics[clusterId] ? -1 : 0,
    };
  };

  const handleMetricClick = async (type: 'clients' | 'users' | 'groups' | 'roles', clusterId: number) => {
    setDetailDialog({ open: true, type, clusterId });
    setLoadingDetail(true);
    setDetailData([]);
    
    try {
      let data: any[] = [];
      switch (type) {
        case 'clients':
          data = await clusterApi.getClients(clusterId);
          break;
        case 'users':
          data = await clusterApi.getUsers(clusterId, 100);
          break;
        case 'groups':
          data = await clusterApi.getGroups(clusterId, 100);
          break;
        case 'roles':
          data = await roleApi.getRoles(clusterId);
          break;
      }
      setDetailData(data);
    } catch (error: any) {
      console.error(`Failed to load ${type}:`, error);
      alert(`Failed to load ${type}: ${error.message}`);
    } finally {
      setLoadingDetail(false);
    }
  };

  const getDetailTitle = () => {
    const cluster = clusters.find(c => c.id === detailDialog.clusterId);
    const clusterName = cluster?.name || '';
    switch (detailDialog.type) {
      case 'clients':
        return `Clients - ${clusterName}`;
      case 'users':
        return `Users - ${clusterName}`;
      case 'groups':
        return `Groups - ${clusterName}`;
      case 'roles':
        return `Roles - ${clusterName}`;
      default:
        return 'Details';
    }
  };

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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Clusters</h1>
          <p className="text-sm text-gray-600">Manage your Keycloak environments</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#4a5568] hover:bg-[#374151] text-white text-sm h-9">
              <Plus className="mr-1.5 h-4 w-4" />
              Add Cluster
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-base">Add New Cluster</DialogTitle>
              <DialogDescription className="text-sm">
                Enter the details of your Keycloak cluster.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-sm">Name</Label>
                <Input
                  id="name"
                  className="h-9"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="dev-cluster"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="base_url" className="text-sm">Base URL</Label>
                <Input
                  id="base_url"
                  className="h-9"
                  value={formData.base_url}
                  onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                  placeholder="https://keycloak.example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="realm" className="text-sm">Realm</Label>
                <Input
                  id="realm"
                  className="h-9"
                  value={formData.realm}
                  onChange={(e) => setFormData({ ...formData, realm: e.target.value })}
                  placeholder="master"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="username" className="text-sm">Username</Label>
                <Input
                  id="username"
                  className="h-9"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="admin"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password" className="text-sm">Password</Label>
                <Input
                  id="password"
                  type="password"
                  className="h-9"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="password"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="group_name" className="text-sm">Group (Optional)</Label>
                <Input
                  id="group_name"
                  className="h-9"
                  value={formData.group_name}
                  onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
                  placeholder="dev, prod, test, etc."
                />
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

      {/* Clusters Grid */}
      {clusters && clusters.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clusters.map((cluster) => {
            const clusterMetrics = getClusterMetrics(cluster.id);
            return (
              <Card key={cluster.id} className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-[#4a5568] rounded flex items-center justify-center flex-shrink-0">
                      <Shield className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm font-semibold mb-0.5 truncate">{cluster.name}</CardTitle>
                      <CardDescription className="text-xs text-gray-500 truncate">{cluster.base_url}</CardDescription>
                    </div>
                    {healthStatuses[cluster.id] && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={`px-2 py-1 rounded text-xs font-semibold border ${
                              healthStatuses[cluster.id].status === 'healthy' 
                                ? 'bg-green-50 text-green-700 border-green-300' 
                                : healthStatuses[cluster.id].status === 'error'
                                ? 'bg-red-50 text-red-700 border-red-300'
                                : 'bg-yellow-50 text-yellow-700 border-yellow-300'
                            }`}>
                              {healthStatuses[cluster.id].status === 'healthy' ? (
                                <CheckCircle2 className="h-3.5 w-3.5 inline" />
                              ) : (
                                <AlertCircle className="h-3.5 w-3.5 inline" />
                              )}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-medium">
                              {healthStatuses[cluster.id].status === 'healthy' 
                                ? 'Cluster is healthy and accessible' 
                                : healthStatuses[cluster.id].status === 'error'
                                ? `Error: ${healthStatuses[cluster.id].message || 'Failed to connect'}`
                                : `Unhealthy: ${healthStatuses[cluster.id].message || 'Realm not accessible'}`
                              }
                            </p>
                            <p className="text-xs mt-1 opacity-90">
                              Last checked: {new Date().toLocaleTimeString()}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Mini Metrics */}
                  <div className="grid grid-cols-4 gap-2 mb-3 pb-3 border-b border-gray-100">
                    <div 
                      className="text-center p-1.5 rounded bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => !loadingMetrics[cluster.id] && clusterMetrics.clients !== -1 && handleMetricClick('clients', cluster.id)}
                      title="Click to view details"
                    >
                      <Building2 className="h-3.5 w-3.5 text-gray-600 mx-auto mb-1" />
                      <div className="text-sm font-bold text-gray-900">
                        {loadingMetrics[cluster.id] ? (
                          <span className="inline-block w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></span>
                        ) : clusterMetrics.clients === -1 ? (
                          <span className="text-gray-400" title="Failed to load">-</span>
                        ) : (
                          clusterMetrics.clients.toLocaleString()
                        )}
                      </div>
                      <div className="text-[10px] text-gray-500 font-medium">Clients</div>
                    </div>
                    <div 
                      className="text-center p-1.5 rounded bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => !loadingMetrics[cluster.id] && clusterMetrics.roles !== -1 && handleMetricClick('roles', cluster.id)}
                      title="Click to view details"
                    >
                      <Key className="h-3.5 w-3.5 text-gray-600 mx-auto mb-1" />
                      <div className="text-sm font-bold text-gray-900">
                        {loadingMetrics[cluster.id] ? (
                          <span className="inline-block w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></span>
                        ) : clusterMetrics.roles === -1 ? (
                          <span className="text-gray-400" title="Failed to load">-</span>
                        ) : (
                          clusterMetrics.roles.toLocaleString()
                        )}
                      </div>
                      <div className="text-[10px] text-gray-500 font-medium">Roles</div>
                    </div>
                    <div 
                      className="text-center p-1.5 rounded bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => !loadingMetrics[cluster.id] && clusterMetrics.users !== -1 && handleMetricClick('users', cluster.id)}
                      title="Click to view details"
                    >
                      <Users className="h-3.5 w-3.5 text-gray-600 mx-auto mb-1" />
                      <div className="text-sm font-bold text-gray-900">
                        {loadingMetrics[cluster.id] ? (
                          <span className="inline-block w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></span>
                        ) : clusterMetrics.users === -1 ? (
                          <span className="text-gray-400" title="Failed to load">-</span>
                        ) : (
                          clusterMetrics.users.toLocaleString()
                        )}
                      </div>
                      <div className="text-[10px] text-gray-500 font-medium">Users</div>
                    </div>
                    <div 
                      className="text-center p-1.5 rounded bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => !loadingMetrics[cluster.id] && clusterMetrics.groups !== -1 && handleMetricClick('groups', cluster.id)}
                      title="Click to view details"
                    >
                      <Network className="h-3.5 w-3.5 text-gray-600 mx-auto mb-1" />
                      <div className="text-sm font-bold text-gray-900">
                        {loadingMetrics[cluster.id] ? (
                          <span className="inline-block w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></span>
                        ) : clusterMetrics.groups === -1 ? (
                          <span className="text-gray-400" title="Failed to load">-</span>
                        ) : (
                          clusterMetrics.groups.toLocaleString()
                        )}
                      </div>
                      <div className="text-[10px] text-gray-500 font-medium">Groups</div>
                    </div>
                  </div>
                  
                  {/* Info */}
                  <div className="space-y-1.5 mb-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Realm:</span>
                      <span className="font-medium text-gray-900">{cluster.realm}</span>
                    </div>
                    {cluster.group_name && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Group:</span>
                        <span className="font-medium text-blue-600">{cluster.group_name}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      className="flex-1 text-xs h-8 bg-[#4a5568] hover:bg-[#374151] text-white font-medium"
                      onClick={() => navigate(`/clusters/${cluster.id}`)}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1.5" />
                      View Details
                    </Button>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-8 px-2 text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                            onClick={() => handleSetGroup(cluster.id, cluster.group_name || undefined)}
                            title="Set Group"
                          >
                            <Tag className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">Set Group</p>
                          <p className="text-xs mt-1 opacity-90">
                            Assign this cluster to a group (dev, prod, test, etc.)
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className={`text-xs h-8 px-3 ${
                              checkingHealth[cluster.id] 
                                ? 'opacity-50 cursor-not-allowed' 
                                : healthStatuses[cluster.id]?.status === 'healthy'
                                ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100'
                                : healthStatuses[cluster.id]?.status === 'error'
                                ? 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100'
                                : 'hover:bg-gray-50'
                            }`}
                            onClick={() => handleHealthCheck(cluster.id)}
                            disabled={checkingHealth[cluster.id]}
                          >
                            <Activity className={`h-3.5 w-3.5 ${checkingHealth[cluster.id] ? 'animate-spin' : ''}`} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">Health Check</p>
                          <p className="text-xs mt-1 opacity-90">
                            {checkingHealth[cluster.id] 
                              ? 'Checking cluster health...' 
                              : 'Click to verify if the Keycloak realm is accessible and responding'
                            }
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 px-2 text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                      onClick={() => handleDelete(cluster.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="text-center py-12">
            <div className="w-12 h-12 bg-[#4a5568] rounded-lg flex items-center justify-center mx-auto mb-3">
              <Server className="h-6 w-6 text-white" />
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">No clusters found</p>
            <p className="text-xs text-gray-500 mb-4">Add your first Keycloak cluster to get started</p>
            <Button 
              onClick={() => setIsDialogOpen(true)} 
              className="bg-[#4a5568] hover:bg-[#374151] text-white text-sm h-9"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add Cluster
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailDialog.open} onOpenChange={(open) => setDetailDialog({ ...detailDialog, open })}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base">{getDetailTitle()}</DialogTitle>
            <DialogDescription className="text-xs">
              {detailData.length} {detailDialog.type} found
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto mt-4">
            {loadingDetail ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-3"></div>
                  <p className="text-sm text-gray-500">Loading...</p>
                </div>
              </div>
            ) : detailData.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-500">
                No {detailDialog.type} found
              </div>
            ) : (
              <div className="space-y-2">
                {detailData.map((item: any, index: number) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-gray-900">
                          {item.name || item.clientId || item.username || item.path || 'N/A'}
                        </h3>
                        {item.description && (
                          <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                        )}
                        {item.email && (
                          <p className="text-xs text-gray-500 mt-1">{item.email}</p>
                        )}
                        {item.clientId && (
                          <p className="text-xs text-gray-500 mt-1">Client ID: {item.clientId}</p>
                        )}
                        {item.enabled !== undefined && (
                          <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded ${
                            item.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {item.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Group Dialog */}
      <Dialog open={groupDialog.open} onOpenChange={(open) => setGroupDialog({ ...groupDialog, open })}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-base">Set Cluster Group</DialogTitle>
            <DialogDescription className="text-sm">
              Assign this cluster to a group for better organization
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="group_name_dialog" className="text-sm">Group Name</Label>
              <Input
                id="group_name_dialog"
                className="h-9"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="dev, prod, test, etc."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleUpdateGroup();
                  }
                }}
              />
              <p className="text-xs text-gray-500">
                Leave empty to remove from group
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline"
              onClick={() => {
                setGroupDialog({ open: false, clusterId: null, currentGroup: '' });
                setGroupName('');
              }}
              className="text-sm h-9"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateGroup} 
              className="bg-[#4a5568] hover:bg-[#374151] text-white text-sm h-9"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
