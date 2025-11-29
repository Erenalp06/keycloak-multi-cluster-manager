import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cluster, ClusterHealth, ClusterMetrics } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Eye, 
  Key, 
  Trash2, 
  Edit, 
  ExternalLink, 
  Shield, 
  Users, 
  Building2, 
  Tag, 
  Folder,
  CheckCircle2,
  AlertCircle,
  Server,
  ChevronDown,
  ChevronRight,
  Loader2,
  Settings
} from 'lucide-react';

interface RealmTableProps {
  clusters: Cluster[];
  healthStatuses: Record<number, ClusterHealth>;
  metrics: Record<number, ClusterMetrics>;
  loadingMetrics: Record<number, boolean>;
  onDelete: (clusterId: number) => void;
  onEdit: (cluster: Cluster) => void;
  onTokenInspector: (clusterId: number) => void;
  getClusterMetrics: (clusterId: number) => ClusterMetrics | { clients: number; roles: number; users: number; groups: number; };
}

export default function RealmTable({
  clusters,
  healthStatuses,
  metrics,
  loadingMetrics,
  onDelete,
  onEdit,
  onTokenInspector,
  getClusterMetrics,
}: RealmTableProps) {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = (clusterId: number) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(clusterId)) {
        newSet.delete(clusterId);
      } else {
        newSet.add(clusterId);
      }
      return newSet;
    });
  };

  const getHealthStatus = (cluster: Cluster) => {
    const health = healthStatuses[cluster.id];
    const isHealthy = health?.status === 'healthy';
    const isError = health?.status === 'error' || health?.status === 'unhealthy';
    
    return {
      isHealthy,
      isError,
      status: isHealthy ? 'Online' : isError ? 'Offline' : 'Unknown',
      color: isHealthy ? 'green' : isError ? 'red' : 'gray',
    };
  };

  const formatMetric = (value: number | undefined, loading: boolean) => {
    if (loading) {
      return <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />;
    }
    if (value === undefined || value === -1) {
      return <span className="text-gray-400">-</span>;
    }
    return <span className="font-semibold">{value}</span>;
  };

  if (clusters.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">No realms found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border border-gray-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Realm
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    Clients
                  </div>
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    Users
                  </div>
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-1">
                    <Tag className="h-3.5 w-3.5" />
                    Roles
                  </div>
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-1">
                    <Folder className="h-3.5 w-3.5" />
                    Groups
                  </div>
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clusters.map((cluster) => {
                const health = getHealthStatus(cluster);
                const clusterMetrics = getClusterMetrics(cluster.id);
                const isLoading = loadingMetrics[cluster.id];
                const isExpanded = expandedRows.has(cluster.id);

                return (
                  <>
                    <tr
                      key={cluster.id}
                      className={`group hover:bg-gray-50 transition-colors cursor-pointer ${
                        health.isHealthy ? 'hover:bg-green-50/50' : health.isError ? 'hover:bg-red-50/50' : ''
                      }`}
                      onClick={() => toggleRow(cluster.id)}
                    >
                      {/* Realm Name */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRow(cluster.id);
                            }}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              health.isHealthy ? 'bg-green-500' : health.isError ? 'bg-red-500' : 'bg-gray-400'
                            }`} />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-900">
                                  {cluster.realm || 'master'}
                                </span>
                                {cluster.group_name && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                    <Folder className="h-2.5 w-2.5" />
                                    {cluster.group_name}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                                <Server className="h-3 w-3" />
                                <span className="truncate max-w-[200px]">{cluster.base_url}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          health.isHealthy
                            ? 'bg-green-100 text-green-800'
                            : health.isError
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {health.isHealthy ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : health.isError ? (
                            <AlertCircle className="h-3.5 w-3.5" />
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full bg-current opacity-50" />
                          )}
                          <span>{health.status}</span>
                        </div>
                      </td>

                      {/* Clients */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center">
                          {formatMetric(clusterMetrics.clients, isLoading)}
                        </div>
                      </td>

                      {/* Users */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center">
                          {formatMetric(clusterMetrics.users, isLoading)}
                        </div>
                      </td>

                      {/* Roles */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center">
                          {formatMetric(clusterMetrics.roles, isLoading)}
                        </div>
                      </td>

                      {/* Groups */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center">
                          {formatMetric(clusterMetrics.groups, isLoading)}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className={`h-8 px-2.5 text-xs font-medium transition-all duration-200 ${
                                    health.isHealthy
                                      ? 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200 hover:border-green-300 hover:shadow-sm'
                                      : health.isError
                                      ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200 hover:border-red-300 hover:shadow-sm'
                                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200 hover:border-gray-300 hover:shadow-sm'
                                  }`}
                                  onClick={() => navigate(`/clusters/${cluster.id}`)}
                                >
                                  <Eye className="h-3.5 w-3.5 mr-1.5" />
                                  View
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs font-medium">View Details</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2.5 text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 hover:border-blue-300 hover:shadow-sm transition-all duration-200"
                                  onClick={() => onTokenInspector(cluster.id)}
                                >
                                  <Key className="h-3.5 w-3.5 mr-1.5" />
                                  Token
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs font-medium">Token Inspector</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2.5 text-xs font-medium bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200 hover:border-purple-300 hover:shadow-sm transition-all duration-200"
                                  onClick={() => navigate(`/keycloak-management?clusterId=${cluster.id}`)}
                                >
                                  <Settings className="h-3.5 w-3.5 mr-1.5" />
                                  Manage
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs font-medium">Keycloak Management</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <a
                            href={`${cluster.base_url}/admin/${cluster.realm || 'master'}/console`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 px-2.5 text-xs font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 hover:border-indigo-300 hover:shadow-sm transition-all duration-200"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                                    Console
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs font-medium">Open Keycloak Console</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </a>

                          {isAdmin && (
                            <>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 px-2.5 text-xs font-medium bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200 hover:border-amber-300 hover:shadow-sm transition-all duration-200"
                                      onClick={() => onEdit(cluster)}
                                    >
                                      <Edit className="h-3.5 w-3.5 mr-1.5" />
                                      Edit
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs font-medium">Edit Realm</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 px-2.5 text-xs font-medium bg-red-50 hover:bg-red-100 text-red-700 border-red-200 hover:border-red-300 hover:shadow-sm transition-all duration-200"
                                      onClick={() => onDelete(cluster.id)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                      Delete
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs font-medium">Delete Realm</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Row Details */}
                    {isExpanded && (
                      <tr className="bg-gray-50/50">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                              <div className="text-xs text-gray-500 mb-1">Cluster Name</div>
                              <div className="text-sm font-medium text-gray-900">{cluster.name}</div>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                              <div className="text-xs text-gray-500 mb-1">Base URL</div>
                              <div className="text-sm font-medium text-gray-900 truncate">{cluster.base_url}</div>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                              <div className="text-xs text-gray-500 mb-1">Realm</div>
                              <div className="text-sm font-medium text-gray-900">{cluster.realm || 'master'}</div>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                              <div className="text-xs text-gray-500 mb-1">Client ID</div>
                              <div className="text-sm font-medium text-gray-900">{cluster.client_id || '-'}</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

