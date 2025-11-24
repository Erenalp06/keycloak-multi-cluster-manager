import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clusterApi, roleApi, Cluster, ClusterHealth, ClusterMetrics, PrometheusMetrics } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Activity, Eye, Shield, Users, Key, Building2, Network, Server, X, CheckCircle2, AlertCircle, Tag, Grid3x3, List, Filter, Edit } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type ViewMode = 'grid' | 'list';
type HealthFilter = 'all' | 'online' | 'offline';

export default function ClusterList() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [healthStatuses, setHealthStatuses] = useState<Record<number, ClusterHealth>>({});
  const [checkingHealth, setCheckingHealth] = useState<Record<number, boolean>>({});
  const [checkingAllHealth, setCheckingAllHealth] = useState(false);
  const [metrics, setMetrics] = useState<Record<number, ClusterMetrics>>({});
  const [loadingMetrics, setLoadingMetrics] = useState<Record<number, boolean>>({});
  const [prometheusMetrics, setPrometheusMetrics] = useState<Record<number, PrometheusMetrics>>({});
  const [loadingPrometheusMetrics, setLoadingPrometheusMetrics] = useState<Record<number, boolean>>({});
  const [versions, setVersions] = useState<Record<number, string>>({});
  const [loadingVersions, setLoadingVersions] = useState<Record<number, boolean>>({});
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('all');
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
    metrics_endpoint: '',
  });
  const [editDialog, setEditDialog] = useState<{ open: boolean; clusterId: number | null }>({
    open: false,
    clusterId: null,
  });
  const [editFormData, setEditFormData] = useState({
    name: '',
    base_url: '',
    realm: 'master',
    username: '',
    password: '',
    group_name: '',
    metrics_endpoint: '',
  });

  useEffect(() => {
    loadClusters();
  }, []);

  useEffect(() => {
    // Load metrics and check health for all clusters
    if (clusters.length > 0) {
      clusters.forEach((cluster) => {
        if (!metrics[cluster.id] && !loadingMetrics[cluster.id]) {
          loadMetrics(cluster.id);
        }
        // Check health for all clusters on initial load
        if (!healthStatuses[cluster.id] && !checkingHealth[cluster.id]) {
          handleHealthCheck(cluster.id);
        }
        // Load version for all clusters
        if (!versions[cluster.id] && !loadingVersions[cluster.id]) {
          loadVersion(cluster.id);
        }
        // Load Prometheus metrics only if metrics_endpoint is configured
        if (cluster.metrics_endpoint && !prometheusMetrics[cluster.id] && !loadingPrometheusMetrics[cluster.id]) {
          loadPrometheusMetrics(cluster.id);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusters]);

  // Check all clusters health on mount
  useEffect(() => {
    if (clusters.length > 0 && Object.keys(healthStatuses).length === 0) {
      checkAllClustersHealth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusters.length]);

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
        metrics_endpoint: formData.metrics_endpoint.trim() === '' ? undefined : formData.metrics_endpoint.trim(),
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
        metrics_endpoint: '',
      });
      loadClusters();
      
      // Notify sidebar to refresh
      window.dispatchEvent(new CustomEvent('clusterUpdated'));
    } catch (error: any) {
      alert(error.message || 'Failed to create cluster');
    }
  };

  const handleEdit = (cluster: Cluster) => {
    setEditFormData({
      name: cluster.name,
      base_url: cluster.base_url,
      realm: cluster.realm,
      username: cluster.username,
      password: cluster.password,
      group_name: cluster.group_name || '',
      metrics_endpoint: cluster.metrics_endpoint || '',
    });
    setEditDialog({ open: true, clusterId: cluster.id });
  };

  const handleUpdate = async () => {
    if (!editDialog.clusterId) return;
    
    try {
      const updateData = {
        ...editFormData,
        group_name: editFormData.group_name.trim() === '' ? undefined : editFormData.group_name.trim(),
        metrics_endpoint: editFormData.metrics_endpoint.trim() === '' ? undefined : editFormData.metrics_endpoint.trim(),
      };
      await clusterApi.update(editDialog.clusterId, updateData);
      setEditDialog({ open: false, clusterId: null });
      setEditFormData({
        name: '',
        base_url: '',
        realm: 'master',
        username: '',
        password: '',
        group_name: '',
        metrics_endpoint: '',
      });
      loadClusters();
      
      // Notify sidebar to refresh
      window.dispatchEvent(new CustomEvent('clusterUpdated'));
    } catch (error: any) {
      alert(error.message || 'Failed to update cluster');
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
    setCheckingHealth(prev => ({ ...prev, [id]: true }));
    try {
      const health = await clusterApi.healthCheck(id);
      setHealthStatuses(prev => ({ ...prev, [id]: health }));
    } catch (error) {
      setHealthStatuses(prev => ({
        ...prev,
        [id]: { cluster_id: id, status: 'error', message: 'Failed to check health' },
      }));
    } finally {
      setCheckingHealth(prev => ({ ...prev, [id]: false }));
    }
  };

  const checkAllClustersHealth = async () => {
    if (clusters.length === 0) return;
    setCheckingAllHealth(true);
    try {
      // Check health for all clusters in parallel
      const healthPromises = clusters.map(cluster => 
        clusterApi.healthCheck(cluster.id).catch(() => ({
          cluster_id: cluster.id,
          status: 'error' as const,
          message: 'Failed to check health'
        }))
      );
      const results = await Promise.all(healthPromises);
      const newHealthStatuses: Record<number, ClusterHealth> = {};
      results.forEach(health => {
        newHealthStatuses[health.cluster_id] = health;
      });
      setHealthStatuses(prev => ({ ...prev, ...newHealthStatuses }));
    } catch (error) {
      console.error('Failed to check all clusters health:', error);
    } finally {
      setCheckingAllHealth(false);
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

  const loadVersion = async (clusterId: number) => {
    if (loadingVersions[clusterId] || versions[clusterId]) return;
    
    setLoadingVersions((prev) => ({ ...prev, [clusterId]: true }));
    try {
      const serverInfo = await clusterApi.getServerInfo(clusterId);
      if (serverInfo.systemInfo && serverInfo.systemInfo.version) {
        setVersions((prev) => ({ ...prev, [clusterId]: serverInfo.systemInfo.version }));
      }
    } catch (error: any) {
      console.error(`Failed to load version for cluster ${clusterId}:`, error);
      // Don't set error, just leave version as undefined
    } finally {
      setLoadingVersions((prev) => ({ ...prev, [clusterId]: false }));
    }
  };

  const loadPrometheusMetrics = async (clusterId: number) => {
    if (loadingPrometheusMetrics[clusterId] || prometheusMetrics[clusterId]) return;
    
    setLoadingPrometheusMetrics((prev) => ({ ...prev, [clusterId]: true }));
    try {
      const data = await clusterApi.getPrometheusMetrics(clusterId);
      setPrometheusMetrics((prev) => ({ ...prev, [clusterId]: data }));
    } catch (error: any) {
      console.error(`Failed to load Prometheus metrics for cluster ${clusterId}:`, error);
      // Set unavailable state
      setPrometheusMetrics((prev) => ({
        ...prev,
        [clusterId]: {
          cluster_id: clusterId,
          available: false,
          error: error.message || 'Failed to load Prometheus metrics',
        },
      }));
    } finally {
      setLoadingPrometheusMetrics((prev) => ({ ...prev, [clusterId]: false }));
    }
  };

  // Filter clusters based on health filter
  const getFilteredClusters = () => {
    if (healthFilter === 'all') return clusters;
    return clusters.filter(cluster => {
      const health = healthStatuses[cluster.id];
      if (!health) return healthFilter === 'offline';
      const isHealthy = health.status === 'healthy';
      return healthFilter === 'online' ? isHealthy : !isHealthy;
    });
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

  const formatUptime = (seconds: number | undefined): string => {
    if (!seconds || seconds < 0) return '-';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
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

  const filteredClusters = getFilteredClusters();
  const onlineCount = clusters.filter(c => healthStatuses[c.id]?.status === 'healthy').length;
  const offlineCount = clusters.length - onlineCount;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Clusters</h1>
          <p className="text-sm text-gray-600">Manage your Keycloak environments</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('grid')}
              className={`h-8 px-3 ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('list')}
              className={`h-8 px-3 ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Health Filter */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <Filter className="h-4 w-4 text-gray-600 ml-2" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHealthFilter('all')}
              className={`h-8 px-3 text-xs ${healthFilter === 'all' ? 'bg-white shadow-sm font-semibold' : ''}`}
            >
              All ({clusters.length})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHealthFilter('online')}
              className={`h-8 px-3 text-xs ${healthFilter === 'online' ? 'bg-green-50 text-green-700 shadow-sm font-semibold' : ''}`}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 inline" />
              Online ({onlineCount})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHealthFilter('offline')}
              className={`h-8 px-3 text-xs ${healthFilter === 'offline' ? 'bg-red-50 text-red-700 shadow-sm font-semibold' : ''}`}
            >
              <AlertCircle className="h-3.5 w-3.5 mr-1.5 inline" />
              Offline ({offlineCount})
            </Button>
          </div>

          {/* Refresh Health Check */}
          <Button
            variant="outline"
            size="sm"
            onClick={checkAllClustersHealth}
            disabled={checkingAllHealth}
            className="h-8 text-xs"
          >
            <Activity className={`h-3.5 w-3.5 mr-1.5 ${checkingAllHealth ? 'animate-spin' : ''}`} />
            {checkingAllHealth ? 'Checking...' : 'Refresh Health'}
          </Button>

          {isAdmin && (
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
              <div className="grid gap-2">
                <Label htmlFor="metrics_endpoint" className="text-sm">Metrics Endpoint (Optional)</Label>
                <Input
                  id="metrics_endpoint"
                  className="h-9"
                  value={formData.metrics_endpoint}
                  onChange={(e) => setFormData({ ...formData, metrics_endpoint: e.target.value })}
                  placeholder="http://keycloak-ip:9000/metrics"
                />
                <p className="text-xs text-gray-500">
                  Prometheus metrics endpoint URL (e.g., http://keycloak-ip:9000/metrics)
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} className="bg-[#4a5568] hover:bg-[#374151] text-white text-sm h-9">
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
          )}
        </div>
      </div>

      {/* Clusters Display */}
      {(() => {
        if (filteredClusters.length === 0 && clusters.length > 0) {
          return (
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="text-center py-12">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Filter className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-900 mb-1">No clusters match the filter</p>
                <p className="text-xs text-gray-500">Try selecting a different filter option</p>
              </CardContent>
            </Card>
          );
        }
        
        if (filteredClusters.length === 0) {
          return (
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="text-center py-12">
                <div className="w-12 h-12 bg-[#4a5568] rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Server className="h-6 w-6 text-white" />
                </div>
                <p className="text-sm font-medium text-gray-900 mb-1">No clusters found</p>
                <p className="text-xs text-gray-500 mb-4">Add your first Keycloak cluster to get started</p>
                {isAdmin && (
                  <Button 
                    onClick={() => setIsDialogOpen(true)} 
                    className="bg-[#4a5568] hover:bg-[#374151] text-white text-sm h-9"
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add Cluster
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        }

        if (viewMode === 'grid') {
          return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredClusters.map((cluster: Cluster) => {
                const clusterMetrics = getClusterMetrics(cluster.id);
                const health = healthStatuses[cluster.id];
                const isHealthy = health?.status === 'healthy';
                const isError = health?.status === 'error' || health?.status === 'unhealthy';
                const isUnknown = !health;
                
                // Determine card styling based on health status
                const cardBorderClass = isHealthy 
                  ? 'border-2 border-green-400 shadow-green-100' 
                  : isError 
                  ? 'border-2 border-red-400 shadow-red-100' 
                  : 'border-2 border-gray-300 shadow-gray-100';
                
                const cardBgClass = isHealthy 
                  ? 'bg-gradient-to-br from-green-50 to-white' 
                  : isError 
                  ? 'bg-gradient-to-br from-red-50 to-white' 
                  : 'bg-white';
                
                return (
              <Card 
                key={cluster.id} 
                className={`${cardBorderClass} ${cardBgClass} shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden`}
              >
                {/* Status indicator bar at top */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${
                  isHealthy ? 'bg-green-500' : isError ? 'bg-red-500' : 'bg-gray-400'
                }`} />
                
                <CardHeader className="pb-3 pt-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm ${
                      isHealthy 
                        ? 'bg-green-500' 
                        : isError 
                        ? 'bg-red-500' 
                        : 'bg-gray-400'
                    }`}>
                      <Shield className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-base font-bold truncate">{cluster.name}</CardTitle>
                        {health && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                            isHealthy 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {isHealthy ? (
                              <>
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Online</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-3 w-3" />
                                <span>Offline</span>
                              </>
                            )}
                          </span>
                        )}
                      </div>
                      <CardDescription className="text-xs text-gray-600 truncate flex items-center gap-1">
                        <Server className="h-3 w-3" />
                        {cluster.base_url}
                      </CardDescription>
                      {cluster.realm && (
                        <CardDescription className="text-xs text-gray-500 mt-0.5">
                          Realm: {cluster.realm}
                        </CardDescription>
                      )}
                      {cluster.group_name && (
                        <div className="mt-1.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                            <Tag className="h-3 w-3" />
                            {cluster.group_name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Health Status Banner */}
                  {health && (
                    <div className={`mb-4 p-3 rounded-lg border ${
                      isHealthy 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        {isHealthy ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-600" />
                        )}
                        <div className="flex-1">
                          <p className={`text-sm font-semibold ${
                            isHealthy ? 'text-green-800' : 'text-red-800'
                          }`}>
                            {isHealthy 
                              ? 'Cluster is healthy and accessible' 
                              : `Error: ${health.message || 'Failed to connect'}`
                            }
                          </p>
                          {!isHealthy && health.message && (
                            <p className="text-xs text-red-600 mt-0.5">{health.message}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Mini Metrics */}
                  <div className={`grid grid-cols-4 gap-2 mb-3 pb-3 border-b ${
                    isHealthy ? 'border-green-100' : isError ? 'border-red-100' : 'border-gray-100'
                  }`}>
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
                    {versions[cluster.id] && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Version:</span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 font-medium rounded border border-blue-200">
                          v{versions[cluster.id]}
                        </span>
                      </div>
                    )}
                    {loadingVersions[cluster.id] && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Version:</span>
                        <span className="text-gray-400">Loading...</span>
                      </div>
                    )}
                    {cluster.group_name && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Group:</span>
                        <span className="font-medium text-blue-600">{cluster.group_name}</span>
                      </div>
                    )}
                  </div>

                  {/* Prometheus Metrics Indicator - Only show if configured */}
                  {cluster.metrics_endpoint && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      {prometheusMetrics[cluster.id] && prometheusMetrics[cluster.id].available ? (
                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                          <Activity className="h-3 w-3 text-green-500" />
                          <span className="font-medium">Prometheus: Active</span>
                          {prometheusMetrics[cluster.id]?.active_sessions !== undefined && (
                            <span className="text-gray-500">• {prometheusMetrics[cluster.id]?.active_sessions?.toFixed(0)} sessions</span>
                          )}
                        </div>
                      ) : loadingPrometheusMetrics[cluster.id] ? (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <span className="inline-block w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></span>
                          Loading metrics...
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <AlertCircle className="h-3 w-3" />
                          <span>Metrics unavailable</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      className={`flex-1 text-xs h-9 font-semibold transition-all ${
                        isHealthy 
                          ? 'bg-green-600 hover:bg-green-700 text-white border-green-700' 
                          : isError
                          ? 'bg-red-600 hover:bg-red-700 text-white border-red-700'
                          : 'bg-[#4a5568] hover:bg-[#374151] text-white'
                      }`}
                      onClick={() => navigate(`/clusters/${cluster.id}`)}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1.5" />
                      View Details
                    </Button>
                    {isAdmin && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-8 px-2 text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                              onClick={() => handleEdit(cluster)}
                              title="Edit Cluster"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-medium">Edit Cluster</p>
                            <p className="text-xs mt-1 opacity-90">
                              Edit cluster details
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
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
                    {isAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 px-2 text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                        onClick={() => handleDelete(cluster.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
                );
              })}
            </div>
          );
        }

        // List View
        return (
          <div className="space-y-3">
            {filteredClusters.map((cluster: Cluster) => {
              const clusterMetrics = getClusterMetrics(cluster.id);
              const health = healthStatuses[cluster.id];
              const isHealthy = health?.status === 'healthy';
              const isError = health?.status === 'error' || health?.status === 'unhealthy';
              
              return (
                <Card 
                  key={cluster.id} 
                  className={`border-2 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden ${
                    isHealthy 
                      ? 'border-green-400 bg-gradient-to-r from-green-50 to-white' 
                      : isError 
                      ? 'border-red-400 bg-gradient-to-r from-red-50 to-white' 
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  {/* Status indicator bar at left */}
                  <div className={`absolute top-0 left-0 bottom-0 w-1 ${
                    isHealthy ? 'bg-green-500' : isError ? 'bg-red-500' : 'bg-gray-400'
                  }`} />
                  
                  <CardContent className="p-4 pl-6">
                    <div className="flex items-center justify-between">
                      {/* Left: Cluster Info */}
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Icon */}
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm ${
                          isHealthy 
                            ? 'bg-green-500' 
                            : isError 
                            ? 'bg-red-500' 
                            : 'bg-gray-400'
                        }`}>
                          <Shield className="h-6 w-6 text-white" />
                        </div>
                        
                        {/* Cluster Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-lg font-bold text-gray-900">{cluster.name}</h3>
                            {health && (
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                                isHealthy 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {isHealthy ? (
                                  <>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span>Online</span>
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    <span>Offline</span>
                                  </>
                                )}
                              </span>
                            )}
                            {cluster.group_name && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                                <Tag className="h-3 w-3" />
                                {cluster.group_name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1.5">
                              <Server className="h-4 w-4" />
                              <span className="truncate">{cluster.base_url}</span>
                            </div>
                            {cluster.realm && (
                              <div className="flex items-center gap-1.5">
                                <Shield className="h-4 w-4" />
                                <span>Realm: {cluster.realm}</span>
                              </div>
                            )}
                            {versions[cluster.id] && (
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded border border-blue-200 text-xs font-medium">
                                  v{versions[cluster.id]}
                                </span>
                              </div>
                            )}
                            {loadingVersions[cluster.id] && (
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded border border-gray-300 text-xs">
                                  Loading version...
                                </span>
                              </div>
                            )}
                          </div>
                          {health && !isHealthy && health.message && (
                            <div className="mt-2 text-xs text-red-600 flex items-center gap-1.5">
                              <AlertCircle className="h-3.5 w-3.5" />
                              <span>{health.message}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Center: Metrics */}
                      <div className="flex items-center gap-6 px-6 border-l border-r border-gray-200 mx-4">
                        <div 
                          className="text-center cursor-pointer hover:bg-gray-50 rounded p-2 transition-colors"
                          onClick={() => !loadingMetrics[cluster.id] && clusterMetrics.clients !== -1 && handleMetricClick('clients', cluster.id)}
                        >
                          <Building2 className="h-4 w-4 text-gray-600 mx-auto mb-1" />
                          <div className="text-base font-bold text-gray-900">
                            {loadingMetrics[cluster.id] ? (
                              <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></span>
                            ) : clusterMetrics.clients === -1 ? (
                              <span className="text-gray-400">-</span>
                            ) : (
                              clusterMetrics.clients.toLocaleString()
                            )}
                          </div>
                          <div className="text-xs text-gray-500 font-medium">Clients</div>
                        </div>
                        <div 
                          className="text-center cursor-pointer hover:bg-gray-50 rounded p-2 transition-colors"
                          onClick={() => !loadingMetrics[cluster.id] && clusterMetrics.roles !== -1 && handleMetricClick('roles', cluster.id)}
                        >
                          <Key className="h-4 w-4 text-gray-600 mx-auto mb-1" />
                          <div className="text-base font-bold text-gray-900">
                            {loadingMetrics[cluster.id] ? (
                              <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></span>
                            ) : clusterMetrics.roles === -1 ? (
                              <span className="text-gray-400">-</span>
                            ) : (
                              clusterMetrics.roles.toLocaleString()
                            )}
                          </div>
                          <div className="text-xs text-gray-500 font-medium">Roles</div>
                        </div>
                        <div 
                          className="text-center cursor-pointer hover:bg-gray-50 rounded p-2 transition-colors"
                          onClick={() => !loadingMetrics[cluster.id] && clusterMetrics.users !== -1 && handleMetricClick('users', cluster.id)}
                        >
                          <Users className="h-4 w-4 text-gray-600 mx-auto mb-1" />
                          <div className="text-base font-bold text-gray-900">
                            {loadingMetrics[cluster.id] ? (
                              <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></span>
                            ) : clusterMetrics.users === -1 ? (
                              <span className="text-gray-400">-</span>
                            ) : (
                              clusterMetrics.users.toLocaleString()
                            )}
                          </div>
                          <div className="text-xs text-gray-500 font-medium">Users</div>
                        </div>
                        <div 
                          className="text-center cursor-pointer hover:bg-gray-50 rounded p-2 transition-colors"
                          onClick={() => !loadingMetrics[cluster.id] && clusterMetrics.groups !== -1 && handleMetricClick('groups', cluster.id)}
                        >
                          <Network className="h-4 w-4 text-gray-600 mx-auto mb-1" />
                          <div className="text-base font-bold text-gray-900">
                            {loadingMetrics[cluster.id] ? (
                              <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></span>
                            ) : clusterMetrics.groups === -1 ? (
                              <span className="text-gray-400">-</span>
                            ) : (
                              clusterMetrics.groups.toLocaleString()
                            )}
                          </div>
                          <div className="text-xs text-gray-500 font-medium">Groups</div>
                        </div>
                      </div>

                      {/* Prometheus Metrics Indicator - Only show if configured */}
                      {cluster.metrics_endpoint && (
                        <div className="px-6 border-t border-gray-200 pt-2 mt-2">
                          {prometheusMetrics[cluster.id] && prometheusMetrics[cluster.id].available ? (
                            <div className="flex items-center gap-1.5 text-xs text-gray-600">
                              <Activity className="h-3 w-3 text-green-500" />
                              <span className="font-medium">Prometheus: Active</span>
                              {prometheusMetrics[cluster.id]?.active_sessions !== undefined && (
                                <span className="text-gray-500">• {prometheusMetrics[cluster.id]?.active_sessions?.toFixed(0)} sessions</span>
                              )}
                            </div>
                          ) : loadingPrometheusMetrics[cluster.id] ? (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              <span className="inline-block w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></span>
                              Loading metrics...
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              <AlertCircle className="h-3 w-3" />
                              <span>Metrics unavailable</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Right: Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          className={`text-xs h-9 font-semibold transition-all ${
                            isHealthy 
                              ? 'bg-green-600 hover:bg-green-700 text-white' 
                              : isError
                              ? 'bg-red-600 hover:bg-red-700 text-white'
                              : 'bg-[#4a5568] hover:bg-[#374151] text-white'
                          }`}
                          onClick={() => navigate(`/clusters/${cluster.id}`)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1.5" />
                          View
                        </Button>
                        {isAdmin && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs h-9 px-3 text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                                  onClick={() => handleEdit(cluster)}
                                >
                                  <Edit className="h-3.5 w-3.5 mr-1.5" />
                                  Edit
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-medium">Edit Cluster</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className={`text-xs h-9 px-3 ${
                                  checkingHealth[cluster.id] 
                                    ? 'opacity-50 cursor-not-allowed' 
                                    : isHealthy
                                    ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100'
                                    : isError
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
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {isAdmin && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-9 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
                            onClick={() => handleDelete(cluster.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        );
      })()}

      {/* Detail Dialog */}
      <Dialog
        open={detailDialog.open}
        onOpenChange={(open) => setDetailDialog({ ...detailDialog, open })}
      >
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
      <Dialog
        open={groupDialog.open}
        onOpenChange={(open) =>
          setGroupDialog({ ...groupDialog, open })
        }
      >
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

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ ...editDialog, open })}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-base">Edit Cluster</DialogTitle>
            <DialogDescription className="text-sm">
              Update the details of your Keycloak cluster.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit_name" className="text-sm">Name</Label>
              <Input
                id="edit_name"
                className="h-9"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                placeholder="dev-cluster"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_base_url" className="text-sm">Base URL</Label>
              <Input
                id="edit_base_url"
                className="h-9"
                value={editFormData.base_url}
                onChange={(e) => setEditFormData({ ...editFormData, base_url: e.target.value })}
                placeholder="https://keycloak.example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_realm" className="text-sm">Realm</Label>
              <Input
                id="edit_realm"
                className="h-9"
                value={editFormData.realm}
                onChange={(e) => setEditFormData({ ...editFormData, realm: e.target.value })}
                placeholder="master"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_username" className="text-sm">Username</Label>
              <Input
                id="edit_username"
                className="h-9"
                value={editFormData.username}
                onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                placeholder="admin"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_password" className="text-sm">Password</Label>
              <Input
                id="edit_password"
                type="password"
                className="h-9"
                value={editFormData.password}
                onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                placeholder="password"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_group_name" className="text-sm">Group (Optional)</Label>
              <Input
                id="edit_group_name"
                className="h-9"
                value={editFormData.group_name}
                onChange={(e) => setEditFormData({ ...editFormData, group_name: e.target.value })}
                placeholder="dev, prod, test, etc."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_metrics_endpoint" className="text-sm">Metrics Endpoint (Optional)</Label>
              <Input
                id="edit_metrics_endpoint"
                className="h-9"
                value={editFormData.metrics_endpoint}
                onChange={(e) => setEditFormData({ ...editFormData, metrics_endpoint: e.target.value })}
                placeholder="http://keycloak-ip:9000/metrics"
              />
              <p className="text-xs text-gray-500">
                Prometheus metrics endpoint URL (e.g., http://keycloak-ip:9000/metrics)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialog({ open: false, clusterId: null });
                setEditFormData({
                  name: '',
                  base_url: '',
                  realm: 'master',
                  username: '',
                  password: '',
                  group_name: '',
                  metrics_endpoint: '',
                });
              }}
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
    </div>
  );
}
