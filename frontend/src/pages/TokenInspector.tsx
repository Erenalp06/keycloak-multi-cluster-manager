import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clusterApi, Cluster } from '@/services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Key, Server } from 'lucide-react';
import TokenInspectorDialog from '@/components/TokenInspectorDialog';

export default function TokenInspector() {
  const navigate = useNavigate();
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadClusters();
  }, []);

  const loadClusters = async () => {
    try {
      const data = await clusterApi.getAll();
      setClusters(data || []);
      if (data && data.length > 0) {
        setSelectedCluster(data[0]);
      }
    } catch (error) {
      console.error('Failed to load clusters:', error);
      setClusters([]);
    }
  };

  const handleOpenDialog = () => {
    if (selectedCluster) {
      setDialogOpen(true);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Token Inspector</h1>
        <p className="text-sm text-gray-600">Get and inspect access tokens for Keycloak users</p>
      </div>

      {/* Cluster Selection */}
      <Card className="mb-6 border-2 border-blue-200 bg-gradient-to-br from-blue-50/50 to-white shadow-md">
        <CardHeader className="pb-3 bg-blue-50/50 rounded-t-lg border-b border-blue-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Server className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Select Cluster</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Choose a Keycloak cluster to inspect tokens
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Server className="h-4 w-4 text-gray-500" />
                Cluster
                <span className="text-red-500 font-bold">*</span>
              </label>
              <Select
                value={selectedCluster?.id.toString() || ''}
                onValueChange={(value) => {
                  const cluster = clusters.find(c => c.id.toString() === value);
                  setSelectedCluster(cluster || null);
                }}
              >
                <SelectTrigger className="h-11 border-2 focus:border-blue-500">
                  <SelectValue placeholder="Select a cluster" />
                </SelectTrigger>
                <SelectContent>
                  {clusters.map((cluster) => (
                    <SelectItem key={cluster.id} value={cluster.id.toString()}>
                      <div className="flex items-center gap-2">
                        <Server className="h-4 w-4" />
                        <span>{cluster.name}</span>
                        <span className="text-xs text-gray-400">({cluster.realm})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <button
              onClick={handleOpenDialog}
              disabled={!selectedCluster}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 font-semibold text-base shadow-md hover:shadow-lg transition-all rounded-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Key className="h-5 w-5" />
              Open Token Inspector
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Key className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-blue-900 mb-1">About Token Inspector</h3>
              <p className="text-sm text-blue-800">
                The Token Inspector allows you to obtain and decode access tokens for Keycloak users.
                You can use different grant types (Password Grant or Client Credentials) and inspect
                the token's claims, roles, and other information.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Token Inspector Dialog */}
      <TokenInspectorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        cluster={selectedCluster}
      />
    </div>
  );
}



