import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { clusterApi, roleApi, Cluster, Role, ClusterMetrics } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, RefreshCw, Shield, Building2, Key, Users, Network, Activity, Server, Globe, Calendar, User, CheckCircle2, AlertCircle, ChevronRight, Clock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ClusterErrorState from '@/components/ClusterErrorState';

export default function ClusterDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cluster, setCluster] = useState<Cluster | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [metrics, setMetrics] = useState<ClusterMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [healthStatus, setHealthStatus] = useState<{ status: string; message?: string } | null>(null);
  const [error, setError] = useState<{ message: string; type?: 'connection' | 'auth' | 'notfound' | 'unknown' } | null>(null);
  const [detailDialog, setDetailDialog] = useState<{ open: boolean; type: 'clients' | 'users' | 'groups' | 'roles' | null }>({
    open: false,
    type: null,
  });
  const [detailData, setDetailData] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (id) {
      loadCluster();
      loadMetrics();
      loadRoles();
      checkHealth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadCluster = async () => {
    try {
      setError(null);
      const data = await clusterApi.getById(Number(id));
      setCluster(data);
    } catch (error: any) {
      console.error('Failed to load cluster:', error);
      setError({
        message: error.message || 'Failed to load cluster',
        type: 'notfound',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    if (!id) return;
    try {
      setLoadingMetrics(true);
      setError(null);
      const data = await clusterApi.getMetrics(Number(id));
      setMetrics(data);
    } catch (error: any) {
      console.error('Failed to load metrics:', error);
      setError({
        message: error.message || 'Failed to load cluster metrics',
        type: 'connection',
      });
    } finally {
      setLoadingMetrics(false);
    }
  };

  const loadRoles = async () => {
    if (!id) return;
    try {
      setLoadingRoles(true);
      setError(null);
      const data = await roleApi.getRoles(Number(id));
      setRoles(data || []);
    } catch (error: any) {
      console.error('Failed to load roles:', error);
      if (!error.message?.includes('connection refused')) {
        // Only show error if it's not already shown by metrics
        setError({
          message: error.message || 'Failed to load roles',
          type: 'connection',
        });
      }
    } finally {
      setLoadingRoles(false);
    }
  };

  const checkHealth = async () => {
    if (!id) return;
    try {
      setError(null);
      const health = await clusterApi.healthCheck(Number(id));
      setHealthStatus(health);
      if (health.status === 'error' || health.status === 'unhealthy') {
        setError({
          message: health.message || 'Cluster is not accessible',
          type: 'connection',
        });
      }
    } catch (error: any) {
      console.error('Failed to check health:', error);
      setError({
        message: error.message || 'Failed to check cluster health',
        type: 'connection',
      });
    }
  };

  const handleMetricClick = async (type: 'clients' | 'users' | 'groups' | 'roles') => {
    if (!id) return;
    setDetailDialog({ open: true, type });
    setLoadingDetail(true);
    setDetailData([]);
    
    try {
      let data: any[] = [];
      switch (type) {
        case 'clients':
          data = await clusterApi.getClients(Number(id));
          break;
        case 'users':
          data = await clusterApi.getUsers(Number(id), 100);
          break;
        case 'groups':
          data = await clusterApi.getGroups(Number(id), 100);
          break;
        case 'roles':
          data = await roleApi.getRoles(Number(id));
          break;
      }
      setDetailData(data || []);
    } catch (error: any) {
      console.error(`Failed to load ${type}:`, error);
      // Show error in dialog instead of alert
      setDetailData([]);
      setError({
        message: `Failed to load ${type}: ${error.message || 'Unknown error'}`,
        type: 'connection',
      });
    } finally {
      setLoadingDetail(false);
    }
  };

  const getDetailTitle = () => {
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
            <p className="text-sm text-gray-500">Loading cluster details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!cluster && !loading) {
    return (
      <ClusterErrorState
        errorMessage={error?.message || 'Cluster not found'}
        onBack={() => navigate('/clusters')}
        showBackButton={true}
      />
    );
  }

  // Show error state if cluster exists but there's a connection error
  if (cluster && error && (error.type === 'connection' || error.type === 'auth')) {
    return (
      <ClusterErrorState
        clusterName={cluster.name}
        errorMessage={error.message}
        onRetry={() => {
          setError(null);
          loadMetrics();
          loadRoles();
          checkHealth();
        }}
        onBack={() => navigate('/clusters')}
        showBackButton={true}
      />
    );
  }

  // TypeScript guard: cluster must exist at this point
  if (!cluster) {
    return null;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-5">
        <Button 
          variant="outline" 
          onClick={() => navigate('/clusters')} 
          className="mb-3 text-sm h-9"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Clusters
        </Button>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#4a5568] rounded-xl flex items-center justify-center">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-0.5">{cluster.name}</h1>
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <Globe className="h-4 w-4" />
                {cluster.base_url}
              </p>
            </div>
          </div>
          {healthStatus ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    className={`flex items-center gap-2.5 px-5 py-2.5 rounded-lg border cursor-pointer transition-all ${
                      healthStatus.status === 'healthy' 
                        ? 'bg-[#e8f5e9] text-[#2e7d32] border-[#4caf50] hover:bg-[#c8e6c9] shadow-sm' 
                        : healthStatus.status === 'error'
                        ? 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100 shadow-sm'
                        : 'bg-yellow-50 text-yellow-700 border-yellow-300 hover:bg-yellow-100 shadow-sm'
                    }`}
                    onClick={checkHealth}
                  >
                    {healthStatus.status === 'healthy' ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <AlertCircle className="h-5 w-5" />
                    )}
                    <span className="text-base font-semibold">
                      {healthStatus.status === 'healthy' ? 'Cluster Healthy' : healthStatus.status === 'error' ? 'Error' : 'Unhealthy'}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-medium mb-1">
                    {healthStatus.status === 'healthy' 
                      ? '✓ Cluster is Healthy' 
                      : healthStatus.status === 'error'
                      ? '✗ Connection Error'
                      : '⚠ Cluster is Unhealthy'
                    }
                  </p>
                  <p className="text-xs opacity-90">
                    {healthStatus.status === 'healthy' 
                      ? 'The Keycloak realm is accessible and responding correctly. All services are operational.' 
                      : healthStatus.status === 'error'
                      ? healthStatus.message || 'Failed to establish connection with the Keycloak server. Please check the URL and credentials.'
                      : healthStatus.message || 'The Keycloak realm is not accessible. Please verify the configuration.'
                    }
                  </p>
                  <p className="text-xs mt-2 pt-2 border-t border-gray-700 opacity-75">
                    Click to refresh health status
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-600 cursor-pointer hover:bg-gray-100 transition-all"
                    onClick={checkHealth}
                  >
                    <Activity className="h-5 w-5" />
                    <span className="text-sm font-semibold">Check Health</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">Health Check</p>
                  <p className="text-xs mt-1 opacity-90">
                    Click to verify if the Keycloak realm is accessible and responding
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card 
          className="border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer"
          onClick={() => metrics && metrics.clients > 0 && handleMetricClick('clients')}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[15px] font-semibold text-gray-900">Clients</CardTitle>
              <Building2 className="h-5 w-5 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {loadingMetrics ? (
                <span className="inline-block w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></span>
              ) : (
                metrics?.clients.toLocaleString() || '0'
              )}
            </div>
            <p className="text-xs text-gray-500">Registered clients</p>
          </CardContent>
        </Card>

        <Card 
          className="border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer"
          onClick={() => metrics && metrics.roles > 0 && handleMetricClick('roles')}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[15px] font-semibold text-gray-900">Roles</CardTitle>
              <Key className="h-5 w-5 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {loadingMetrics ? (
                <span className="inline-block w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></span>
              ) : (
                metrics?.roles.toLocaleString() || '0'
              )}
            </div>
            <p className="text-xs text-gray-500">Available roles</p>
          </CardContent>
        </Card>

        <Card 
          className="border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer"
          onClick={() => metrics && metrics.users > 0 && handleMetricClick('users')}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[15px] font-semibold text-gray-900">Users</CardTitle>
              <Users className="h-5 w-5 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {loadingMetrics ? (
                <span className="inline-block w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></span>
              ) : (
                metrics?.users.toLocaleString() || '0'
              )}
            </div>
            <p className="text-xs text-gray-500">Total users</p>
          </CardContent>
        </Card>

        <Card 
          className="border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer"
          onClick={() => metrics && metrics.groups > 0 && handleMetricClick('groups')}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[15px] font-semibold text-gray-900">Groups</CardTitle>
              <Network className="h-5 w-5 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {loadingMetrics ? (
                <span className="inline-block w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></span>
              ) : (
                metrics?.groups.toLocaleString() || '0'
              )}
            </div>
            <p className="text-xs text-gray-500">User groups</p>
          </CardContent>
        </Card>
      </div>

      {/* Cluster Information & Quick Actions - 2 Column Grid */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        {/* Cluster Information - 2 Column Layout */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-900">Cluster Information</CardTitle>
            <CardDescription className="text-xs text-gray-500 mt-0.5">
              Basic configuration details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-xs text-gray-500">Realm</span>
                </div>
                <span className="text-sm font-semibold text-gray-900 block">{cluster.realm}</span>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-xs text-gray-500">Username</span>
                </div>
                <span className="text-sm font-semibold text-gray-900 block">{cluster.username}</span>
              </div>
              <div className="space-y-2.5 col-span-2">
                <div className="flex items-center gap-1.5">
                  <Server className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-xs text-gray-500">Base URL</span>
                </div>
                <span className="text-sm font-semibold text-gray-900 block truncate">{cluster.base_url}</span>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-xs text-gray-500">Created</span>
                </div>
                <span className="text-sm font-semibold text-gray-900 block">
                  {new Date(cluster.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-xs text-gray-500">Updated</span>
                </div>
                <span className="text-sm font-semibold text-gray-900 block">
                  {new Date(cluster.updated_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-900">Quick Actions</CardTitle>
            <CardDescription className="text-xs text-gray-500 mt-0.5">
              Manage cluster resources
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-between text-sm h-10 hover:bg-gray-50 hover:border-gray-300 transition-colors group"
                onClick={() => handleMetricClick('clients')}
              >
                <div className="flex items-center">
                  <Building2 className="mr-2 h-4 w-4" />
                  View Clients ({metrics?.clients || 0})
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
              </Button>
              <Button
                variant="outline"
                className="w-full justify-between text-sm h-10 hover:bg-gray-50 hover:border-gray-300 transition-colors group"
                onClick={() => handleMetricClick('users')}
              >
                <div className="flex items-center">
                  <Users className="mr-2 h-4 w-4" />
                  View Users ({metrics?.users || 0})
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
              </Button>
              <Button
                variant="outline"
                className="w-full justify-between text-sm h-10 hover:bg-gray-50 hover:border-gray-300 transition-colors group"
                onClick={() => handleMetricClick('groups')}
              >
                <div className="flex items-center">
                  <Network className="mr-2 h-4 w-4" />
                  View Groups ({metrics?.groups || 0})
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
              </Button>
              <Button
                variant="outline"
                className="w-full justify-between text-sm h-10 hover:bg-gray-50 hover:border-gray-300 transition-colors group"
                onClick={() => handleMetricClick('roles')}
              >
                <div className="flex items-center">
                  <Key className="mr-2 h-4 w-4" />
                  View Roles ({metrics?.roles || 0})
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between text-sm h-10 hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-colors group"
                      onClick={checkHealth}
                    >
                      <div className="flex items-center">
                        <Activity className="mr-2 h-4 w-4" />
                        Check Health
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-green-600" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">Health Check</p>
                    <p className="text-xs mt-1 opacity-90">
                      Verifies if the Keycloak realm is accessible and responding. Tests the connection to {cluster.base_url}/realms/{cluster.realm}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Roles List */}
      <Card className="border border-gray-200 shadow-sm mt-6">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-base font-semibold text-gray-900">Roles</CardTitle>
              <CardDescription className="text-xs text-gray-500 mt-0.5">
                List of roles in the {cluster.realm} realm ({roles.length} total)
              </CardDescription>
            </div>
            <Button 
              onClick={loadRoles} 
              disabled={loadingRoles}
              variant="outline"
              size="sm"
              className="text-xs h-8"
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loadingRoles ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingRoles ? (
            <div className="py-8 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400 mx-auto mb-2"></div>
              <p className="text-xs text-gray-500">Loading roles...</p>
            </div>
          ) : roles.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              No roles found
            </div>
          ) : (
            <div>
              {roles.map((role, index) => (
                <div
                  key={role.id}
                  className={`px-6 py-3 transition-colors ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                  } hover:bg-gray-100 border-b border-gray-100 last:border-b-0`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-bold text-gray-900">{role.name}</h3>
                        {role.composite && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded border border-blue-300 flex-shrink-0">
                            Composite
                          </span>
                        )}
                        {role.clientRole && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded border border-gray-300 flex-shrink-0">
                            Client Role
                          </span>
                        )}
                      </div>
                      {role.description && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {role.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
    </div>
  );
}
