import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { clusterApi, roleApi, exportImportApi, Cluster, Role, ClusterMetrics, PrometheusMetrics } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ArrowLeft, RefreshCw, Shield, Building2, Key, Users, Network, Activity, Server, Globe, Calendar, User, CheckCircle2, AlertCircle, ChevronRight, Clock, Download, Upload, MoreVertical, FileJson, Search, Eye, Copy, Check, Layers, Filter, X, Terminal } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ClusterErrorState from '@/components/ClusterErrorState';
import TokenInspectorDialog from '@/components/TokenInspectorDialog';

export default function ClusterDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cluster, setCluster] = useState<Cluster | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<ClusterMetrics | null>(null);
  const [prometheusMetrics, setPrometheusMetrics] = useState<PrometheusMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [clientFilterEnabled, setClientFilterEnabled] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userFilterEnabled, setUserFilterEnabled] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'clients' | 'roles' | 'users'>('overview');
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [clientDetailDialog, setClientDetailDialog] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingClientSecret, setLoadingClientSecret] = useState(false);
  const [showClientSecret, setShowClientSecret] = useState(false);
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
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadCluster();
      loadMetrics();
      loadRoles();
      loadClients();
      loadUsers();
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

  const loadClients = async () => {
    if (!id) return;
    try {
      setLoadingClients(true);
      setError(null);
      const data = await clusterApi.getClients(Number(id));
      setClients(data || []);
    } catch (error: any) {
      console.error('Failed to load clients:', error);
      if (!error.message?.includes('connection refused')) {
        setError({
          message: error.message || 'Failed to load clients',
          type: 'connection',
        });
      }
    } finally {
      setLoadingClients(false);
    }
  };

  const loadUsers = async () => {
    if (!id) return;
    try {
      setLoadingUsers(true);
      setError(null);
      const data = await clusterApi.getUsers(Number(id), 100);
      setUsers(data || []);
    } catch (error: any) {
      console.error('Failed to load users:', error);
      if (!error.message?.includes('connection refused')) {
        setError({
          message: error.message || 'Failed to load users',
          type: 'connection',
        });
      }
    } finally {
      setLoadingUsers(false);
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

      {/* Tabs Navigation */}
      <div className="mt-6 border-b border-gray-200">
        <nav className="flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Overview
            </div>
          </button>
          <button
            onClick={() => setActiveTab('clients')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'clients'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Clients
              {clients.length > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                  {clients.length}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'roles'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Roles
              {roles.length > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                  {roles.length}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'users'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
              {users.length > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                  {users.length}
                </span>
              )}
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
      {/* Cluster Information & Quick Actions - 2 Column Grid */}
          <div className="grid gap-6 lg:grid-cols-2 mt-6">
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
                  <Key className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-xs text-gray-500">Client ID</span>
                </div>
                <span className="text-sm font-semibold text-gray-900 block">{cluster.client_id || 'multi-manage'}</span>
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
                    onClick={() => setActiveTab('clients')}
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
                    onClick={() => setActiveTab('users')}
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
                    onClick={() => setActiveTab('roles')}
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

          {/* Prometheus Metrics - Only show if metrics_endpoint is configured */}
          {cluster?.metrics_endpoint && prometheusMetrics && (
            <Card className="border border-gray-200 shadow-sm mt-6">
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
        </>
      )}

      {activeTab === 'clients' && (
        <Card className="border border-gray-200 shadow-sm mt-6">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-base font-semibold text-gray-900">Clients</CardTitle>
              <CardDescription className="text-xs text-gray-500 mt-0.5">
                List of clients in the {cluster.realm} realm ({clients.length} total)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={loadClients} 
                disabled={loadingClients}
                variant="outline"
                size="sm"
                className="text-xs h-8"
              >
                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loadingClients ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
          {/* Search and Filter */}
          <div className="flex items-center gap-3 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search clients by name or client ID..."
                value={clientSearchTerm}
                onChange={(e) => setClientSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {clientSearchTerm && (
                <button
                  onClick={() => setClientSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={clientFilterEnabled}
                onChange={(e) => setClientFilterEnabled(e.target.value as 'all' | 'enabled' | 'disabled')}
                className="text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Clients</option>
                <option value="enabled">Enabled Only</option>
                <option value="disabled">Disabled Only</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingClients ? (
            <div className="py-8 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400 mx-auto mb-2"></div>
              <p className="text-xs text-gray-500">Loading clients...</p>
            </div>
          ) : (() => {
            // Filter clients
            const filteredClients = clients.filter((client) => {
              const matchesSearch = !clientSearchTerm || 
                (client.clientId || '').toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
                (client.name || '').toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
                (client.description || '').toLowerCase().includes(clientSearchTerm.toLowerCase());
              
              const matchesFilter = clientFilterEnabled === 'all' ||
                (clientFilterEnabled === 'enabled' && client.enabled) ||
                (clientFilterEnabled === 'disabled' && !client.enabled);
              
              return matchesSearch && matchesFilter;
            });

            if (filteredClients.length === 0) {
              return (
                <div className="py-8 text-center text-sm text-gray-500">
                  {clients.length === 0 ? 'No clients found' : 'No clients match your search criteria'}
                </div>
              );
            }

            return (
              <div>
                {filteredClients.map((client, index) => (
                  <div
                    key={client.id || client.clientId}
                    onClick={() => {
                      setSelectedClient(client);
                      setClientDetailDialog(true);
                      setClientSecret(null);
                      setShowClientSecret(false);
                    }}
                    className={`px-6 py-3 transition-colors cursor-pointer ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    } hover:bg-blue-50 border-b border-gray-100 last:border-b-0`}
                  >
                    <div className="flex justify-between items-center gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Building2 className="h-5 w-5 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-gray-900 truncate">{client.clientId || client.name || 'N/A'}</h3>
                            {client.enabled ? (
                              <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded border border-green-300 flex-shrink-0">
                                Enabled
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded border border-gray-300 flex-shrink-0">
                                Disabled
                              </span>
                            )}
                          </div>
                          {client.name && client.name !== client.clientId && (
                            <p className="text-xs text-gray-600 mt-0.5 truncate">{client.name}</p>
                          )}
                          {client.protocol && (
                            <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded border border-blue-200">
                              {client.protocol}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </CardContent>
      </Card>
      )}

      {activeTab === 'roles' && (
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
      )}

      {activeTab === 'users' && (
        <Card className="border border-gray-200 shadow-sm mt-6">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-base font-semibold text-gray-900">Users</CardTitle>
                <CardDescription className="text-xs text-gray-500 mt-0.5">
                  List of users in the {cluster.realm} realm ({users.length} total)
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={loadUsers} 
                  disabled={loadingUsers}
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                >
                  <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
            {/* Search and Filter */}
            <div className="flex items-center gap-3 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users by username or email..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {userSearchTerm && (
                  <button
                    onClick={() => setUserSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  value={userFilterEnabled}
                  onChange={(e) => setUserFilterEnabled(e.target.value as 'all' | 'enabled' | 'disabled')}
                  className="text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Users</option>
                  <option value="enabled">Enabled Only</option>
                  <option value="disabled">Disabled Only</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingUsers ? (
              <div className="py-8 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400 mx-auto mb-2"></div>
                <p className="text-xs text-gray-500">Loading users...</p>
              </div>
            ) : (() => {
              // Filter users
              const filteredUsers = users.filter((user) => {
                const matchesSearch = !userSearchTerm || 
                  (user.username || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                  (user.email || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                  ((user.firstName || '') + ' ' + (user.lastName || '')).toLowerCase().includes(userSearchTerm.toLowerCase());
                
                const matchesFilter = userFilterEnabled === 'all' ||
                  (userFilterEnabled === 'enabled' && user.enabled) ||
                  (userFilterEnabled === 'disabled' && !user.enabled);
                
                return matchesSearch && matchesFilter;
              });

              if (filteredUsers.length === 0) {
                return (
                  <div className="py-8 text-center text-sm text-gray-500">
                    {users.length === 0 ? 'No users found' : 'No users match your search criteria'}
                  </div>
                );
              }

              return (
                <div>
                  {filteredUsers.map((user, index) => (
                    <div
                      key={user.id || user.username}
                      className={`px-6 py-4 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                      } hover:bg-gray-100 border-b border-gray-100 last:border-b-0`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <h3 className="text-sm font-bold text-gray-900">{user.username || user.email || 'N/A'}</h3>
                            {user.enabled ? (
                              <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded border border-green-300 flex-shrink-0">
                                Enabled
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded border border-gray-300 flex-shrink-0">
                                Disabled
                              </span>
                            )}
                          </div>
                          {(user.firstName || user.lastName) && (
                            <p className="text-xs text-gray-600 ml-6 mb-1.5 font-medium">
                              {user.firstName} {user.lastName}
                            </p>
                          )}
                          {user.email && (
                            <p className="text-xs text-gray-500 ml-6 mb-2">
                              {user.email}
                            </p>
                          )}
                          {user.id && (
                            <p className="text-xs text-gray-400 ml-6">
                              ID: {user.id}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/clusters/${id}/permission-analyzer?entityType=user&entityName=${encodeURIComponent(user.username || user.email || '')}`)}
                            className="text-xs h-7 px-2"
                            title="Analyze permissions for this user"
                          >
                            <Layers className="h-3.5 w-3.5 mr-1" />
                            Analyze
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Client Detail Dialog */}
      <Dialog open={clientDetailDialog} onOpenChange={setClientDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              {selectedClient?.clientId || selectedClient?.name || 'Client Details'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Detailed information about the client
            </DialogDescription>
          </DialogHeader>
          {selectedClient && (
            <div className="flex-1 overflow-y-auto mt-4 space-y-6">
              {/* Basic Information */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500">Client ID</label>
                    <p className="text-sm font-medium text-gray-900 mt-1">{selectedClient.clientId || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Name</label>
                    <p className="text-sm font-medium text-gray-900 mt-1">{selectedClient.name || 'N/A'}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500">Description</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedClient.description || 'No description'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Protocol</label>
                    <p className="text-sm font-medium text-gray-900 mt-1">{selectedClient.protocol || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Status</label>
                    <div className="mt-1">
                      {selectedClient.enabled ? (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded border border-green-300">
                          Enabled
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded border border-gray-300">
                          Disabled
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Client ID (UUID)</label>
                    <p className="text-xs font-mono text-gray-600 mt-1 break-all">{selectedClient.id || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Client Type & Capabilities */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Client Type & Capabilities</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedClient.publicClient && (
                    <span className="px-3 py-1.5 text-xs font-medium bg-purple-50 text-purple-700 rounded border border-purple-200">
                      Public Client
                    </span>
                  )}
                  {selectedClient.bearerOnly && (
                    <span className="px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-700 rounded border border-indigo-200">
                      Bearer Only
                    </span>
                  )}
                  {selectedClient.serviceAccountsEnabled && (
                    <span className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 rounded border border-green-200">
                      Service Accounts Enabled
                    </span>
                  )}
                  {selectedClient.directAccessGrantsEnabled && (
                    <span className="px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 rounded border border-amber-200">
                      Direct Access Grants Enabled
                    </span>
                  )}
                  {!selectedClient.publicClient && !selectedClient.bearerOnly && (
                    <span className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded border border-blue-200">
                      Confidential Client
                    </span>
                  )}
                </div>
              </div>

              {/* Client Credentials */}
              {!selectedClient.publicClient && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Client Credentials</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div>
                      <label className="text-xs text-gray-500">Client ID</label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded text-sm font-mono text-gray-900 break-all">
                          {selectedClient.clientId}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(selectedClient.clientId, 'client-id')}
                          className="h-8"
                        >
                          {copiedField === 'client-id' ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Client Secret</label>
                      <div className="flex items-center gap-2 mt-1">
                        {loadingClientSecret ? (
                          <div className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded text-sm text-gray-500">
                            Loading...
                          </div>
                        ) : clientSecret ? (
                          <>
                            <code className={`flex-1 px-3 py-2 bg-white border border-gray-300 rounded text-sm font-mono break-all ${
                              showClientSecret ? 'text-gray-900' : 'text-gray-400'
                            }`}>
                              {showClientSecret ? clientSecret : '••••••••••••••••••••••••••••••••'}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowClientSecret(!showClientSecret)}
                              className="h-8"
                            >
                              {showClientSecret ? <Eye className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(clientSecret, 'client-secret')}
                              className="h-8"
                            >
                              {copiedField === 'client-secret' ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              if (!id || !selectedClient.id) return;
                              setLoadingClientSecret(true);
                              try {
                                const response = await clusterApi.getClientSecret(Number(id), selectedClient.id);
                                setClientSecret(response.secret);
                                setShowClientSecret(true);
                              } catch (error: any) {
                                console.error('Failed to load client secret:', error);
                                alert('Failed to load client secret: ' + (error.message || 'Unknown error'));
                              } finally {
                                setLoadingClientSecret(false);
                              }
                            }}
                            className="h-8"
                          >
                            Load Secret
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {selectedClient.publicClient 
                          ? 'Public clients do not have secrets' 
                          : 'Click "Load Secret" to retrieve the client secret'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Redirect URIs */}
              {selectedClient.redirectUris && selectedClient.redirectUris.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Redirect URIs</h3>
                  <div className="space-y-1">
                    {selectedClient.redirectUris.map((uri: string, idx: number) => (
                      <code key={idx} className="block px-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs font-mono text-gray-900 break-all">
                        {uri}
                      </code>
                    ))}
                  </div>
                </div>
              )}

              {/* Web Origins */}
              {selectedClient.webOrigins && selectedClient.webOrigins.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Web Origins</h3>
                  <div className="space-y-1">
                    {selectedClient.webOrigins.map((origin: string, idx: number) => (
                      <code key={idx} className="block px-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs font-mono text-gray-900 break-all">
                        {origin}
                      </code>
                    ))}
                  </div>
                </div>
              )}

              {/* Default Client Scopes */}
              {selectedClient.defaultClientScopes && selectedClient.defaultClientScopes.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Default Client Scopes</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedClient.defaultClientScopes.map((scope: string, idx: number) => (
                      <span key={idx} className="px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded border border-blue-200">
                        {scope}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Optional Client Scopes */}
              {selectedClient.optionalClientScopes && selectedClient.optionalClientScopes.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Optional Client Scopes</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedClient.optionalClientScopes.map((scope: string, idx: number) => (
                      <span key={idx} className="px-2 py-1 text-xs font-medium bg-gray-50 text-gray-700 rounded border border-gray-200">
                        {scope}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/clusters/${id}/permission-analyzer?entityType=client&entityName=${encodeURIComponent(selectedClient.clientId || selectedClient.name || '')}`)}
                  className="text-xs"
                >
                  <Layers className="h-3.5 w-3.5 mr-1.5" />
                  Permission Analyzer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
      <TokenInspectorDialog 
        open={tokenInspectorDialog} 
        onOpenChange={setTokenInspectorDialog}
        cluster={cluster}
      />
    </div>
  );
}
