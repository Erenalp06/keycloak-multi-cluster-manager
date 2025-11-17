import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clusterApi, Cluster } from '@/services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Server, Plus, Activity, Shield } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClusters();
  }, []);

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

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-3"></div>
            <p className="text-sm text-gray-500">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  const totalClusters = clusters.length;
  const healthyClusters = clusters.length;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Dashboard</h1>
        <p className="text-sm text-gray-600">Overview of your Keycloak environments</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Total Clusters</CardTitle>
              <Server className="h-4 w-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-gray-900">{totalClusters}</div>
            <p className="text-xs text-gray-500 mt-1">Keycloak environments</p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Healthy</CardTitle>
              <Activity className="h-4 w-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-gray-900">{healthyClusters}</div>
            <p className="text-xs text-gray-500 mt-1">Operational clusters</p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Quick Actions</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                className="bg-[#4a5568] hover:bg-[#374151] text-white text-xs h-8"
                onClick={() => navigate('/clusters')}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Cluster
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="text-xs h-8"
                onClick={() => navigate('/diff')}
              >
                Compare
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clusters Table */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-gray-900">Clusters</CardTitle>
              <CardDescription className="text-xs text-gray-500 mt-0.5">Your Keycloak environments</CardDescription>
            </div>
            <Button 
              size="sm"
              onClick={() => navigate('/clusters')}
              className="bg-[#4a5568] hover:bg-[#374151] text-white text-xs h-8"
            >
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {clusters.length === 0 ? (
            <div className="text-center py-12 px-6">
              <Server className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-4">No clusters found</p>
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
              {clusters.slice(0, 5).map((cluster) => (
                <div
                  key={cluster.id}
                  onClick={() => navigate(`/clusters/${cluster.id}`)}
                  className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#4a5568] rounded flex items-center justify-center flex-shrink-0">
                      <Shield className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{cluster.name}</p>
                      <p className="text-xs text-gray-500">{cluster.base_url}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded border border-gray-300">
                      {cluster.realm}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
