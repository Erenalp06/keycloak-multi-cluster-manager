import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clusterApi, Cluster, ClusterHealth, ClusterMetrics } from '@/services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Server, 
  Plus, 
  Activity, 
  Shield, 
  Users, 
  Key, 
  Building2, 
  Network,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  Globe
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [healthStatuses, setHealthStatuses] = useState<Record<number, ClusterHealth>>({});
  const [metrics, setMetrics] = useState<Record<number, ClusterMetrics>>({});
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [totalMetrics, setTotalMetrics] = useState({
    clients: 0,
    users: 0,
    roles: 0,
    groups: 0,
  });

  useEffect(() => {
    loadClusters();
  }, []);

  useEffect(() => {
    if (clusters.length > 0) {
      checkAllClustersHealth();
      loadAllMetrics();
    }
  }, [clusters]);

  const loadClusters = async () => {
    try {
      const data = await clusterApi.getAll();
      setClusters(data || []);
    } catch (error) {
      console.error('Failed to load clusters:', error);
      setClusters([]);
    } finally {
      setLoading(false);
    }
  };

  const checkAllClustersHealth = async () => {
    if (clusters.length === 0) return;
    setLoadingHealth(true);
    try {
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
      setHealthStatuses(newHealthStatuses);
    } catch (error) {
      console.error('Failed to check all clusters health:', error);
    } finally {
      setLoadingHealth(false);
    }
  };

  const loadAllMetrics = async () => {
    if (clusters.length === 0) return;
    
    try {
      const metricsPromises = clusters.map(cluster => 
        clusterApi.getMetrics(cluster.id).catch(() => ({
          cluster_id: cluster.id,
          clients: 0,
          roles: 0,
          users: 0,
          groups: 0,
        }))
      );
      const results = await Promise.all(metricsPromises);
      const newMetrics: Record<number, ClusterMetrics> = {};
      let totalClients = 0;
      let totalUsers = 0;
      let totalRoles = 0;
      let totalGroups = 0;

      results.forEach(metric => {
        newMetrics[metric.cluster_id] = metric;
        totalClients += metric.clients || 0;
        totalUsers += metric.users || 0;
        totalRoles += metric.roles || 0;
        totalGroups += metric.groups || 0;
      });

      setMetrics(newMetrics);
      setTotalMetrics({
        clients: totalClients,
        users: totalUsers,
        roles: totalRoles,
        groups: totalGroups,
      });
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  };

  const healthyCount = Object.values(healthStatuses).filter(h => h.status === 'healthy').length;
  const unhealthyCount = Object.values(healthStatuses).filter(h => h.status !== 'healthy' && h.status !== 'unknown').length;
  const totalClusters = clusters.length;

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-3"></div>
            <p className="text-sm text-gray-500">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-sm text-gray-600">Overview of your Keycloak environments and resources</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={checkAllClustersHealth}
            disabled={loadingHealth}
            className="h-9"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loadingHealth ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/clusters')}
            className="bg-[#4a5568] hover:bg-[#374151] text-white h-9"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Cluster
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Clusters */}
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Total Clusters</CardTitle>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Server className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-1">{totalClusters}</div>
            <p className="text-xs text-gray-500">Keycloak environments</p>
          </CardContent>
        </Card>

        {/* Healthy Clusters */}
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Healthy</CardTitle>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-1">{healthyCount}</div>
            <p className="text-xs text-gray-500">
              {totalClusters > 0 ? `${Math.round((healthyCount / totalClusters) * 100)}% operational` : 'No clusters'}
            </p>
          </CardContent>
        </Card>

        {/* Unhealthy Clusters */}
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Issues</CardTitle>
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-1">{unhealthyCount}</div>
            <p className="text-xs text-gray-500">Clusters with issues</p>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Quick Actions</CardTitle>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Activity className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <Button 
                size="sm" 
                variant="outline"
                className="w-full justify-start text-xs h-8"
                onClick={() => navigate('/diff')}
              >
                <TrendingUp className="h-3 w-3 mr-2" />
                Compare Clusters
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Total Clients</CardTitle>
              <Building2 className="h-4 w-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{totalMetrics.clients.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">Across all clusters</p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
              <Users className="h-4 w-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{totalMetrics.users.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">Across all clusters</p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Total Roles</CardTitle>
              <Key className="h-4 w-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{totalMetrics.roles.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">Across all clusters</p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Total Groups</CardTitle>
              <Network className="h-4 w-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{totalMetrics.groups.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">Across all clusters</p>
          </CardContent>
        </Card>
      </div>

      {/* Clusters Overview */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Clusters */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-gray-900">Clusters Overview</CardTitle>
                <CardDescription className="text-xs text-gray-500 mt-0.5">
                  Your Keycloak environments
                </CardDescription>
              </div>
              <Button 
                size="sm"
                variant="ghost"
                onClick={() => navigate('/clusters')}
                className="text-xs h-7"
              >
                View All
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {clusters.length === 0 ? (
              <div className="text-center py-12 px-6">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Server className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-900 mb-1">No clusters found</p>
                <p className="text-xs text-gray-500 mb-4">Get started by adding your first Keycloak cluster</p>
                <Button 
                  size="sm"
                  onClick={() => navigate('/clusters')}
                  className="bg-[#4a5568] hover:bg-[#374151] text-white text-xs"
                >
                  <Plus className="mr-1.5 h-3 w-3" />
                  Add Your First Cluster
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {clusters.slice(0, 5).map((cluster) => {
                  const health = healthStatuses[cluster.id];
                  const clusterMetrics = metrics[cluster.id];
                  const isHealthy = health?.status === 'healthy';
                  
                  return (
                    <div
                      key={cluster.id}
                      onClick={() => navigate(`/clusters/${cluster.id}`)}
                      className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isHealthy ? 'bg-green-100' : health?.status === 'error' ? 'bg-red-100' : 'bg-gray-100'
                        }`}>
                          <Shield className={`h-5 w-5 ${
                            isHealthy ? 'text-green-600' : health?.status === 'error' ? 'text-red-600' : 'text-gray-400'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-gray-900 truncate">{cluster.name}</p>
                            {health && (
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                isHealthy ? 'bg-green-500' : 'bg-red-500'
                              }`} />
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              <span className="truncate max-w-[200px]">{cluster.base_url}</span>
                            </div>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded border border-gray-300">
                              {cluster.realm}
                            </span>
                          </div>
                        </div>
                      </div>
                      {clusterMetrics && (
                        <div className="flex items-center gap-4 ml-4 flex-shrink-0">
                          <div className="text-right">
                            <div className="text-xs font-medium text-gray-900">
                              {clusterMetrics.clients || 0} clients
                            </div>
                            <div className="text-xs text-gray-500">
                              {clusterMetrics.users || 0} users
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Health Status Summary */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-gray-900">Health Status</CardTitle>
                <CardDescription className="text-xs text-gray-500 mt-0.5">
                  Cluster connectivity overview
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {totalClusters === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">No clusters to monitor</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-green-900">Healthy</span>
                  </div>
                  <span className="text-lg font-bold text-green-700">{healthyCount}</span>
                </div>
                {(unhealthyCount > 0) && (
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <span className="text-sm font-medium text-red-900">Unhealthy</span>
                    </div>
                    <span className="text-lg font-bold text-red-700">{unhealthyCount}</span>
                  </div>
                )}
                {Object.keys(healthStatuses).length < totalClusters && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">Checking...</span>
                    </div>
                    <span className="text-lg font-bold text-gray-600">
                      {totalClusters - Object.keys(healthStatuses).length}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={checkAllClustersHealth}
                    disabled={loadingHealth}
                    className="w-full text-xs"
                  >
                    <RefreshCw className={`h-3 w-3 mr-2 ${loadingHealth ? 'animate-spin' : ''}`} />
                    Refresh Health Status
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
