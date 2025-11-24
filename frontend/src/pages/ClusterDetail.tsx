import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { clusterApi, roleApi, exportImportApi, Cluster, Role, ClusterMetrics, PrometheusMetrics } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, RefreshCw, Shield, Building2, Key, Users, Network, Activity, Server, Globe, Calendar, User, CheckCircle2, AlertCircle, ChevronRight, Clock, Download, Upload, MoreVertical, FileJson, Search, Eye, Copy, Check, Layers } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ClusterErrorState from '@/components/ClusterErrorState';

export default function ClusterDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cluster, setCluster] = useState<Cluster | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [metrics, setMetrics] = useState<ClusterMetrics | null>(null);
  const [prometheusMetrics, setPrometheusMetrics] = useState<PrometheusMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [loadingPrometheusMetrics, setLoadingPrometheusMetrics] = useState(false);
  const [healthStatus, setHealthStatus] = useState<{ status: string; message?: string } | null>(null);
  const [error, setError] = useState<{ message: string; type?: 'connection' | 'auth' | 'notfound' | 'unknown' } | null>(null);
  const [keycloakVersion, setKeycloakVersion] = useState<string | null>(null);
  const [loadingVersion, setLoadingVersion] = useState(false);
  const [detailDialog, setDetailDialog] = useState<{ open: boolean; type: 'clients' | 'users' | 'groups' | 'roles' | null }>({
    open: false,
    type: null,
  });
  const [detailData, setDetailData] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [exportImportDialog, setExportImportDialog] = useState<{ open: boolean; type: 'realm' | 'users' | 'clients' | null; action: 'export' | 'import' | null }>({
    open: false,
    type: null,
    action: null,
  });
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportPreviewDialog, setExportPreviewDialog] = useState<{ open: boolean; type: 'realm' | 'users' | 'clients' | null; filename: string; size: number }>({
    open: false,
    type: null,
    filename: '',
    size: 0,
  });
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [exportSelectionDialog, setExportSelectionDialog] = useState<{ open: boolean; type: 'realm' | 'users' | 'clients' | null }>({
    open: false,
    type: null,
  });
  const [exportItems, setExportItems] = useState<any[]>([]);
  const [selectedExportItems, setSelectedExportItems] = useState<Set<string>>(new Set());
  const [loadingExportItems, setLoadingExportItems] = useState(false);
  const [tokenInspectorDialog, setTokenInspectorDialog] = useState(false);
  const [selectedUsername, setSelectedUsername] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [clientId, setClientId] = useState('admin-cli');
  const [tokenData, setTokenData] = useState<any>(null);
  const [loadingToken, setLoadingToken] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadCluster();
      loadMetrics();
      loadRoles();
      checkHealth();
      loadServerInfo();
      // Only load Prometheus metrics if cluster has metrics_endpoint configured
      // We'll load it after cluster data is fetched
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Load Prometheus metrics only if cluster has metrics_endpoint
  useEffect(() => {
    if (cluster?.metrics_endpoint && id) {
      loadPrometheusMetrics();
    }
  }, [cluster?.metrics_endpoint, id]);

  const loadCluster = async () => {
    try {
      setError(null);
      const data = await clusterApi.getById(Number(id));
      setCluster(data);
    } catch (error: any) {
      console.error('Failed to load cluster:', error);
      const errorMessage = error.message || 'Failed to load cluster';
      setError({
        message: errorMessage,
        type: errorMessage.toLowerCase().includes('permission') || errorMessage.toLowerCase().includes('403') ? 'auth' : 'notfound',
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
      const errorMessage = error.message || 'Failed to load cluster metrics';
      setError({
        message: errorMessage,
        type: errorMessage.toLowerCase().includes('permission') || errorMessage.toLowerCase().includes('403') ? 'auth' : 'connection',
      });
    } finally {
      setLoadingMetrics(false);
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

  const loadPrometheusMetrics = async () => {
    if (!id) return;
    try {
      setLoadingPrometheusMetrics(true);
      const data = await clusterApi.getPrometheusMetrics(Number(id));
      setPrometheusMetrics(data);
    } catch (error: any) {
      console.error('Failed to load Prometheus metrics:', error);
      setPrometheusMetrics({
        cluster_id: Number(id),
        available: false,
        error: error.message || 'Failed to load Prometheus metrics',
      });
    } finally {
      setLoadingPrometheusMetrics(false);
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
      const errorMessage = error.message || 'Failed to check cluster health';
      setError({
        message: errorMessage,
        type: errorMessage.toLowerCase().includes('permission') || errorMessage.toLowerCase().includes('403') ? 'auth' : 'connection',
      });
    }
  };

  const loadServerInfo = async () => {
    if (!id) return;
    setLoadingVersion(true);
    try {
      const serverInfo = await clusterApi.getServerInfo(Number(id));
      if (serverInfo.systemInfo && serverInfo.systemInfo.version) {
        setKeycloakVersion(serverInfo.systemInfo.version);
      }
    } catch (error: any) {
      console.error('Failed to load server info:', error);
      // Don't show error, just leave version as null
    } finally {
      setLoadingVersion(false);
    }
  };

  const openExportDialog = async (type: 'realm' | 'users' | 'clients') => {
    if (!id) return;
    setExportSelectionDialog({ open: true, type });
    setLoadingExportItems(true);
    setSelectedExportItems(new Set());
    
    try {
      let items: any[] = [];
      
      switch (type) {
        case 'realm':
          // Realm is a single item, so we'll just mark it as selected
          setExportItems([{ id: 'realm', name: cluster?.realm || 'realm' }]);
          setSelectedExportItems(new Set(['realm']));
          break;
        case 'users':
          items = await clusterApi.getUsers(Number(id), 0);
          setExportItems(items.map((u: any) => ({ id: u.id || u.username, name: u.username || u.email || u.id })));
          // Select all by default
          setSelectedExportItems(new Set(items.map((u: any) => u.id || u.username)));
          break;
        case 'clients':
          items = await clusterApi.getClients(Number(id));
          setExportItems(items.map((c: any) => ({ id: c.id || c.clientId, name: c.clientId || c.name || c.id })));
          // Select all by default
          setSelectedExportItems(new Set(items.map((c: any) => c.id || c.clientId)));
          break;
      }
    } catch (error: any) {
      console.error(`Failed to load ${type} for export:`, error);
      alert(`Failed to load ${type}: ${error.message}`);
    } finally {
      setLoadingExportItems(false);
    }
  };

  const handleExport = async () => {
    if (!id || !exportSelectionDialog.type) return;
    setExporting(true);
    try {
      let blob: Blob;
      let filename: string;
      let allData: any;
      
      switch (exportSelectionDialog.type) {
        case 'realm':
          blob = await exportImportApi.exportRealm(Number(id));
          filename = `realm-export-${cluster?.name || id}-${Date.now()}.json`;
          break;
        case 'users':
          const allUsers = await clusterApi.getUsers(Number(id), 0);
          const selectedUsers = allUsers.filter((u: any) => selectedExportItems.has(u.id || u.username));
          allData = selectedUsers;
          const usersJson = JSON.stringify(selectedUsers, null, 2);
          blob = new Blob([usersJson], { type: 'application/json' });
          filename = `users-export-${cluster?.name || id}-${Date.now()}.json`;
          break;
        case 'clients':
          const allClients = await clusterApi.getClients(Number(id));
          const selectedClients = allClients.filter((c: any) => selectedExportItems.has(c.id || c.clientId));
          allData = selectedClients;
          const clientsJson = JSON.stringify(selectedClients, null, 2);
          blob = new Blob([clientsJson], { type: 'application/json' });
          filename = `clients-export-${cluster?.name || id}-${Date.now()}.json`;
          break;
      }
      
      // Show preview dialog
      setExportPreviewDialog({
        open: true,
        type: exportSelectionDialog.type,
        filename,
        size: blob.size,
      });
      
      // Close selection dialog
      setExportSelectionDialog({ open: false, type: null });
      
      // Auto download after showing preview
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      console.error(`Failed to export ${exportSelectionDialog.type}:`, error);
      alert(`Failed to export ${exportSelectionDialog.type}: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    if (!id || !importFile || !exportImportDialog.type) return;
    setImporting(true);
    try {
      const text = await importFile.text();
      
      switch (exportImportDialog.type) {
        case 'realm':
          await exportImportApi.importRealm(Number(id), text);
          break;
        case 'users':
          await exportImportApi.importUsers(Number(id), text);
          break;
        case 'clients':
          await exportImportApi.importClients(Number(id), text);
          break;
      }
      
      alert(`${exportImportDialog.type} imported successfully!`);
      setExportImportDialog({ open: false, type: null, action: null });
      setImportFile(null);
      
      // Refresh data
      if (exportImportDialog.type === 'users' || exportImportDialog.type === 'clients') {
        loadMetrics();
      }
    } catch (error: any) {
      console.error(`Failed to import ${exportImportDialog.type}:`, error);
      alert(`Failed to import ${exportImportDialog.type}: ${error.message}`);
    } finally {
      setImporting(false);
    }
  };

  const handleGetUserToken = async () => {
    if (!id || !selectedUsername || !userPassword) return;
    setLoadingToken(true);
    setTokenData(null);
    try {
      const data = await clusterApi.getUserToken(Number(id), selectedUsername, userPassword, clientId);
      setTokenData(data);
    } catch (error: any) {
      console.error('Failed to get user token:', error);
      alert(`Failed to get user token: ${error.message}`);
    } finally {
      setLoadingToken(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
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
              <div className="flex items-center gap-3 mb-0.5">
                <h1 className="text-2xl font-bold text-gray-900">{cluster.name}</h1>
                {keycloakVersion && (
                  <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-md border border-blue-200">
                    v{keycloakVersion}
                  </span>
                )}
                {loadingVersion && (
                  <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-md border border-gray-200">
                    Loading version...
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <Globe className="h-4 w-4" />
                {cluster.base_url}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
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
            {/* Token Inspector Button */}
            <Button
              variant="outline"
              className="h-10 px-4 bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-300 hover:border-purple-400 font-medium"
              onClick={() => setTokenInspectorDialog(true)}
            >
              <Eye className="h-4 w-4 mr-2" />
              Token Inspector
            </Button>
            
            {/* Export Button */}
            <div className="relative">
              <Button
                variant="outline"
                className="h-10 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300 hover:border-blue-400 font-medium"
                onClick={() => setActionsMenuOpen(!actionsMenuOpen)}
                disabled={exporting}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              {actionsMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setActionsMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
                    <div className="py-1">
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase border-b">
                        Export
                      </div>
                      <button
                        onClick={() => {
                          openExportDialog('realm');
                          setActionsMenuOpen(false);
                        }}
                        disabled={exporting}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50"
                      >
                        <Download className="h-4 w-4" />
                        Export Realm
                      </button>
                      <button
                        onClick={() => {
                          openExportDialog('users');
                          setActionsMenuOpen(false);
                        }}
                        disabled={exporting}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50"
                      >
                        <Download className="h-4 w-4" />
                        Export Users
                      </button>
                      <button
                        onClick={() => {
                          openExportDialog('clients');
                          setActionsMenuOpen(false);
                        }}
                        disabled={exporting}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50"
                      >
                        <Download className="h-4 w-4" />
                        Export Clients
                      </button>
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase border-t border-b mt-1">
                        Import
                      </div>
                      <button
                        onClick={() => {
                          setExportImportDialog({ open: true, type: 'realm', action: 'import' });
                          setActionsMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        Import Realm
                      </button>
                      <button
                        onClick={() => {
                          setExportImportDialog({ open: true, type: 'users', action: 'import' });
                          setActionsMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        Import Users
                      </button>
                      <button
                        onClick={() => {
                          setExportImportDialog({ open: true, type: 'clients', action: 'import' });
                          setActionsMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        Import Clients
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
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

      {/* Prometheus Metrics - Only show if metrics_endpoint is configured */}
      {cluster?.metrics_endpoint && prometheusMetrics && (
        <Card className="border border-gray-200 shadow-sm mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-gray-600" />
                  Prometheus Metrics
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 mt-0.5">
                  Real-time metrics from Prometheus endpoint
                </CardDescription>
              </div>
              {prometheusMetrics.available ? (
                <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-md border border-green-200">
                  Available
                </span>
              ) : (
                <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-md border border-gray-200">
                  Not Available
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingPrometheusMetrics ? (
              <div className="flex items-center justify-center py-8">
                <span className="inline-block w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></span>
                <span className="ml-2 text-sm text-gray-500">Loading Prometheus metrics...</span>
              </div>
            ) : prometheusMetrics.available ? (
              <div className="space-y-4">
                {/* Health Row */}
                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-2">📌 Health Row</div>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <div className="text-xs text-gray-600 mb-1">Uptime</div>
                      <div className="text-lg font-bold text-gray-900">
                        {prometheusMetrics.uptime ? formatUptime(prometheusMetrics.uptime) : '-'}
                      </div>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                      <div className="text-xs text-gray-600 mb-1">Active Sessions</div>
                      <div className="text-lg font-bold text-gray-900">
                        {prometheusMetrics.active_sessions?.toFixed(0) || '-'}
                      </div>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                      <div className="text-xs text-gray-600 mb-1">JVM Heap %</div>
                      <div className="text-lg font-bold text-gray-900">
                        {prometheusMetrics.jvm_heap_percent?.toFixed(1) || '-'}%
                      </div>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                      <div className="text-xs text-gray-600 mb-1">DB Pool Usage</div>
                      <div className="text-lg font-bold text-gray-900">
                        {prometheusMetrics.db_pool_usage?.toFixed(1) || '-'}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Traffic Row */}
                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-2">📌 Traffic Row</div>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                      <div className="text-xs text-gray-600 mb-1">Logins (1 min)</div>
                      <div className="text-lg font-bold text-green-700">
                        {prometheusMetrics.logins_1min?.toFixed(0) || '-'}
                      </div>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                      <div className="text-xs text-gray-600 mb-1">Failed Logins (1 min)</div>
                      <div className="text-lg font-bold text-red-700">
                        {prometheusMetrics.failed_logins_1min?.toFixed(0) || '-'}
                      </div>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <div className="text-xs text-gray-600 mb-1">Token Requests</div>
                      <div className="text-lg font-bold text-blue-700">
                        {prometheusMetrics.token_requests?.toFixed(0) || '-'}
                      </div>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                      <div className="text-xs text-gray-600 mb-1">Token Errors</div>
                      <div className="text-lg font-bold text-orange-700">
                        {prometheusMetrics.token_errors?.toFixed(0) || '-'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance Row */}
                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-2">📌 Performance Row</div>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="text-xs text-gray-600 mb-1">Avg Request Duration</div>
                      <div className="text-lg font-bold text-gray-900">
                        {prometheusMetrics.avg_request_duration ? `${((prometheusMetrics.avg_request_duration || 0) * 1000).toFixed(0)}ms` : '-'}
                      </div>
                    </div>
                    <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                      <div className="text-xs text-gray-600 mb-1">Token Endpoint Latency</div>
                      <div className="text-lg font-bold text-indigo-700">
                        {prometheusMetrics.token_endpoint_latency ? `${((prometheusMetrics.token_endpoint_latency || 0) * 1000).toFixed(0)}ms` : '-'}
                      </div>
                    </div>
                    <div className="p-3 bg-teal-50 rounded-lg border border-teal-100">
                      <div className="text-xs text-gray-600 mb-1">HTTP Request Count</div>
                      <div className="text-lg font-bold text-teal-700">
                        {prometheusMetrics.http_request_count?.toFixed(0) || '-'}
                      </div>
                    </div>
                    <div className="p-3 bg-pink-50 rounded-lg border border-pink-100">
                      <div className="text-xs text-gray-600 mb-1">GC Pauses (5 min)</div>
                      <div className="text-lg font-bold text-pink-700">
                        {prometheusMetrics.gc_pauses_5min ? `${(prometheusMetrics.gc_pauses_5min || 0).toFixed(2)}s` : '-'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cache Row */}
                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-2">📌 Cache Row</div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-cyan-50 rounded-lg border border-cyan-100">
                      <div className="text-xs text-gray-600 mb-1">Cache Hit Rate</div>
                      <div className="text-lg font-bold text-cyan-700">
                        {prometheusMetrics.cache_hit_rate?.toFixed(1) || '-'}%
                      </div>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                      <div className="text-xs text-gray-600 mb-1">Cache Misses</div>
                      <div className="text-lg font-bold text-amber-700">
                        {prometheusMetrics.cache_misses?.toFixed(0) || '-'}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="text-xs text-gray-600 mb-1">Infinispan Metrics</div>
                      <div className="text-lg font-bold text-slate-700">
                        {prometheusMetrics.infinispan_metrics ? Object.keys(prometheusMetrics.infinispan_metrics || {}).length : '-'} metrics
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center">
                <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-1">Prometheus metrics not available</p>
                {prometheusMetrics.error && (
                  <p className="text-xs text-gray-500">{prometheusMetrics.error}</p>
                )}
                {cluster.metrics_endpoint && (
                  <p className="text-xs text-gray-500 mt-2">
                    Endpoint: {cluster.metrics_endpoint}
                  </p>
                )}
                {!cluster.metrics_endpoint && (
                  <p className="text-xs text-gray-500 mt-2">
                    Please configure metrics endpoint in cluster settings
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => navigate(`/clusters/${id}/permission-analyzer`)}
                variant="outline"
                size="sm"
                className="text-xs h-8"
              >
                <Layers className="mr-1.5 h-3.5 w-3.5" />
                Permission Analyzer
              </Button>
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

      {/* Export Selection Dialog */}
      <Dialog open={exportSelectionDialog.open} onOpenChange={(open) => setExportSelectionDialog({ ...exportSelectionDialog, open })}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              Select {exportSelectionDialog.type === 'realm' ? 'Realm' : exportSelectionDialog.type === 'users' ? 'Users' : 'Clients'} to Export
            </DialogTitle>
            <DialogDescription>
              Choose which {exportSelectionDialog.type === 'realm' ? 'realm configuration' : exportSelectionDialog.type === 'users' ? 'users' : 'clients'} you want to export.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {loadingExportItems ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
              </div>
            ) : exportSelectionDialog.type === 'realm' ? (
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedExportItems.has('realm')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedExportItems(new Set(['realm']));
                      } else {
                        setSelectedExportItems(new Set());
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">{cluster?.realm || 'Realm Configuration'}</span>
                </label>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2 border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3 pb-2 border-b">
                  <span className="text-sm font-medium text-gray-700">
                    {exportItems.length} {exportSelectionDialog.type} found
                  </span>
                  <button
                    onClick={() => {
                      if (selectedExportItems.size === exportItems.length) {
                        setSelectedExportItems(new Set());
                      } else {
                        setSelectedExportItems(new Set(exportItems.map(item => item.id)));
                      }
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    {selectedExportItems.size === exportItems.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                {exportItems.map((item) => (
                  <label key={item.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedExportItems.has(item.id)}
                      onChange={(e) => {
                        const newSet = new Set(selectedExportItems);
                        if (e.target.checked) {
                          newSet.add(item.id);
                        } else {
                          newSet.delete(item.id);
                        }
                        setSelectedExportItems(newSet);
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700 flex-1">{item.name}</span>
                  </label>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setExportSelectionDialog({ open: false, type: null })}
              >
                Cancel
              </Button>
              <Button
                onClick={handleExport}
                disabled={selectedExportItems.size === 0 || exporting}
              >
                {exporting ? 'Exporting...' : `Export ${selectedExportItems.size} ${exportSelectionDialog.type === 'realm' ? 'Realm' : exportSelectionDialog.type === 'users' ? 'User(s)' : 'Client(s)'}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Preview Dialog */}
      <Dialog open={exportPreviewDialog.open} onOpenChange={(open) => setExportPreviewDialog({ ...exportPreviewDialog, open })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5 text-blue-600" />
              Export Successful
            </DialogTitle>
            <DialogDescription>
              Your {exportPreviewDialog.type === 'realm' ? 'realm configuration' : exportPreviewDialog.type === 'users' ? 'users' : 'clients'} have been exported successfully.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">File Name:</span>
                <span className="text-sm text-gray-900 font-mono">{exportPreviewDialog.filename}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">File Size:</span>
                <span className="text-sm text-gray-900">
                  {(exportPreviewDialog.size / 1024).toFixed(2)} KB
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Type:</span>
                <span className="text-sm text-gray-900 capitalize">{exportPreviewDialog.type}</span>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> The file has been automatically downloaded to your default download folder.
              </p>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => setExportPreviewDialog({ open: false, type: null, filename: '', size: 0 })}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={exportImportDialog.open} onOpenChange={(open) => setExportImportDialog({ ...exportImportDialog, open })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Import {exportImportDialog.type === 'realm' ? 'Realm' : exportImportDialog.type === 'users' ? 'Users' : 'Clients'}
            </DialogTitle>
            <DialogDescription>
              Select a JSON file to import {exportImportDialog.type === 'realm' ? 'realm configuration' : exportImportDialog.type === 'users' ? 'users' : 'clients'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select JSON File
              </label>
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setImportFile(file);
                  }
                }}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            {importFile && (
              <div className="text-sm text-gray-600">
                Selected: {importFile.name}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setExportImportDialog({ open: false, type: null, action: null });
                  setImportFile(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={!importFile || importing}
              >
                {importing ? 'Importing...' : 'Import'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Token Inspector Dialog */}
      <Dialog open={tokenInspectorDialog} onOpenChange={setTokenInspectorDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-purple-600" />
              User Token Inspector
            </DialogTitle>
            <DialogDescription>
              Get and inspect access token for a Keycloak user
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 overflow-y-auto flex-1">
            {/* Input Form */}
            {!tokenData && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={selectedUsername}
                    onChange={(e) => setSelectedUsername(e.target.value)}
                    placeholder="Enter username"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client ID (optional)
                  </label>
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="admin-cli"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <Button
                  onClick={handleGetUserToken}
                  disabled={!selectedUsername || !userPassword || loadingToken}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {loadingToken ? 'Getting Token...' : 'Get Token'}
                </Button>
              </div>
            )}

            {/* Token Display */}
            {tokenData && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Token Information</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTokenData(null);
                      setSelectedUsername('');
                      setUserPassword('');
                    }}
                  >
                    Inspect Another Token
                  </Button>
                </div>

                {/* Token Type & Expiration */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Token Type</div>
                    <div className="text-sm font-medium text-gray-900">{tokenData.token_type}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Expires In</div>
                    <div className="text-sm font-medium text-gray-900">{tokenData.expires_in} seconds</div>
                  </div>
                </div>

                {/* Access Token */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Access Token</label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(tokenData.access_token, 'token')}
                      className="h-7 text-xs"
                    >
                      {copiedField === 'token' ? (
                        <>
                          <Check className="h-3 w-3 mr-1" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <textarea
                    readOnly
                    value={tokenData.access_token}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-mono text-xs h-24 resize-none"
                  />
                </div>

                {/* Decoded Token Sections */}
                {tokenData.decoded && (
                  <div className="space-y-4">
                    {/* Header */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-semibold text-gray-900">Header</label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(JSON.stringify(tokenData.decoded.header, null, 2), 'header')}
                          className="h-7 text-xs"
                        >
                          {copiedField === 'header' ? (
                            <>
                              <Check className="h-3 w-3 mr-1" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                      <pre className="bg-gray-50 border border-gray-300 rounded-md p-3 text-xs overflow-x-auto">
                        {JSON.stringify(tokenData.decoded.header, null, 2)}
                      </pre>
                    </div>

                    {/* Payload */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-semibold text-gray-900">Payload</label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(JSON.stringify(tokenData.decoded.payload, null, 2), 'payload')}
                          className="h-7 text-xs"
                        >
                          {copiedField === 'payload' ? (
                            <>
                              <Check className="h-3 w-3 mr-1" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                      <pre className="bg-gray-50 border border-gray-300 rounded-md p-3 text-xs overflow-x-auto max-h-64 overflow-y-auto">
                        {JSON.stringify(tokenData.decoded.payload, null, 2)}
                      </pre>
                    </div>

                    {/* Claims Summary */}
                    {tokenData.decoded.claims && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Claims Summary</h4>
                        <div className="space-y-2 text-sm">
                          {tokenData.decoded.claims.subject && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Subject:</span>
                              <span className="font-mono text-gray-900">{tokenData.decoded.claims.subject}</span>
                            </div>
                          )}
                          {tokenData.decoded.claims.username && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Username:</span>
                              <span className="font-medium text-gray-900">{tokenData.decoded.claims.username}</span>
                            </div>
                          )}
                          {tokenData.decoded.claims.email && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Email:</span>
                              <span className="font-medium text-gray-900">{tokenData.decoded.claims.email}</span>
                            </div>
                          )}
                          {tokenData.decoded.claims.expiration && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Expiration:</span>
                              <span className="font-medium text-gray-900">
                                {formatDate(tokenData.decoded.claims.expiration as number)}
                              </span>
                            </div>
                          )}
                          {tokenData.decoded.claims.issued_at && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Issued At:</span>
                              <span className="font-medium text-gray-900">
                                {formatDate(tokenData.decoded.claims.issued_at as number)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Roles */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Realm Roles */}
                      {tokenData.decoded.claims.realm_roles && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <Key className="h-4 w-4" />
                            Realm Roles
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {(tokenData.decoded.claims.realm_roles as string[]).map((role: string, idx: number) => (
                              <span key={idx} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                                {role}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Client Roles */}
                      {tokenData.decoded.claims.client_roles && (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Client Roles
                          </h4>
                          <div className="space-y-2">
                            {Object.entries(tokenData.decoded.claims.client_roles as Record<string, string[]>).map(([clientId, roles]) => (
                              <div key={clientId}>
                                <div className="text-xs font-medium text-gray-700 mb-1">{clientId}:</div>
                                <div className="flex flex-wrap gap-2">
                                  {roles.map((role: string, idx: number) => (
                                    <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                                      {role}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setTokenInspectorDialog(false);
                setTokenData(null);
                setSelectedUsername('');
                setUserPassword('');
              }}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
