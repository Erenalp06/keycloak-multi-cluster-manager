import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, Shield, Key, Lock, FileText, Users, Layers, ArrowLeft, RefreshCw, AlertCircle, User, Building2 } from 'lucide-react';
import { clusterApi, roleApi, Cluster } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface RBACNode {
  id: string;
  name: string;
  type: string;
  description?: string;
  policy_type?: string;
  children?: RBACNode[];
}

interface RBACAnalysis {
  role: RBACNode;
  statistics: {
    roles: number;
    composites: number;
    client_roles: number;
    scopes: number;
    permissions: number;
    policies: number;
  };
}

type EntityType = 'user' | 'role' | 'client';

export default function PermissionAnalyzer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [clusterId, setClusterId] = useState<number | null>(id ? Number(id) : null);
  const [entityType, setEntityType] = useState<EntityType>('role');
  const [roles, setRoles] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [rbacData, setRbacData] = useState<RBACAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadClusters();
  }, []);

  useEffect(() => {
    if (clusterId) {
      loadEntities();
    }
  }, [clusterId, entityType]);

  const loadClusters = async () => {
    try {
      const data = await clusterApi.getAll();
      setClusters(data || []);
      if (!clusterId && data && data.length > 0) {
        setClusterId(data[0].id);
      }
    } catch (error: any) {
      console.error('Failed to load clusters:', error);
    }
  };

  const loadEntities = async () => {
    if (!clusterId) return;
    setLoadingEntities(true);
    setSelectedEntity('');
    setRbacData(null);
    try {
      switch (entityType) {
        case 'role':
          const rolesData = await roleApi.getRoles(clusterId);
          setRoles(rolesData || []);
          if (rolesData && rolesData.length > 0) {
            setSelectedEntity(rolesData[0].name);
          }
          break;
        case 'user':
          const usersData = await clusterApi.getUsers(clusterId, 100);
          setUsers(usersData || []);
          if (usersData && usersData.length > 0) {
            setSelectedEntity(usersData[0].username || usersData[0].id);
          }
          break;
        case 'client':
          const clientsData = await clusterApi.getClients(clusterId);
          setClients(clientsData || []);
          if (clientsData && clientsData.length > 0) {
            setSelectedEntity(clientsData[0].id);
          }
          break;
      }
    } catch (error: any) {
      console.error('Failed to load entities:', error);
      setError('Failed to load entities');
    } finally {
      setLoadingEntities(false);
    }
  };

  const loadRBACAnalysis = async () => {
    if (!clusterId || !selectedEntity) return;
    setLoading(true);
    setError(null);
    try {
      const data = await clusterApi.getRBACAnalysis(clusterId, entityType, selectedEntity);
      setRbacData(data);
      // Expand root node by default
      if (data?.role) {
        setExpandedNodes({ [data.role.id]: true });
      }
    } catch (error: any) {
      console.error('Failed to load RBAC analysis:', error);
      setError(error.message || 'Failed to load RBAC analysis');
    } finally {
      setLoading(false);
    }
  };

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'user': return <User className="w-5 h-5 text-indigo-500" />;
      case 'client': return <Building2 className="w-5 h-5 text-cyan-500" />;
      case 'role': return <Shield className="w-5 h-5 text-purple-500" />;
      case 'composite': return <Layers className="w-5 h-5 text-blue-500" />;
      case 'client-role': return <Users className="w-5 h-5 text-green-500" />;
      case 'scope': return <Key className="w-5 h-5 text-yellow-500" />;
      case 'permission': return <Lock className="w-5 h-5 text-orange-500" />;
      case 'policy': return <FileText className="w-5 h-5 text-red-500" />;
      default: return null;
    }
  };

  const getPolicyBadge = (policyType?: string) => {
    if (!policyType) return 'bg-gray-100 text-gray-700';
    const colors: Record<string, string> = {
      role: 'bg-purple-100 text-purple-700',
      time: 'bg-blue-100 text-blue-700',
      group: 'bg-green-100 text-green-700',
      ip: 'bg-yellow-100 text-yellow-700',
      aggregated: 'bg-red-100 text-red-700'
    };
    return colors[policyType] || 'bg-gray-100 text-gray-700';
  };

  const TreeNode = ({ node, level = 0 }: { node: RBACNode; level?: number }) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes[node.id];

    return (
      <div className="relative">
        <div 
          className="flex items-center gap-3 py-2 px-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer group"
          style={{ paddingLeft: `${level * 24 + 12}px` }}
          onClick={() => hasChildren && toggleNode(node.id)}
        >
          {/* Bağlantı çizgisi */}
          {level > 0 && (
            <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-200" 
                 style={{ left: `${level * 24 - 12}px` }} />
          )}
          
          {/* Genişlet/Daralt ikonu */}
          <div className="flex-shrink-0 w-5">
            {hasChildren && (
              isExpanded ? 
                <ChevronDown className="w-4 h-4 text-gray-400" /> : 
                <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </div>
          
          {/* Tip ikonu */}
          <div className="flex-shrink-0">
            {getIcon(node.type)}
          </div>
          
          {/* İçerik */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-800 truncate">
                {node.name}
              </span>
              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                {node.type}
              </span>
              {node.policy_type && (
                <span className={`text-xs px-2 py-0.5 rounded ${getPolicyBadge(node.policy_type)}`}>
                  {node.policy_type}
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500 truncate">
              {node.description}
            </div>
          </div>
          
          {/* Sayaç */}
          {hasChildren && (
            <div className="flex-shrink-0 text-xs text-gray-400">
              {node.children?.length} item
            </div>
          )}
        </div>
        
        {/* Alt düğümler */}
        {hasChildren && isExpanded && (
          <div className="relative">
            {node.children?.map((child) => (
              <TreeNode key={child.id} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const getEntityLabel = () => {
    switch (entityType) {
      case 'user': return 'User';
      case 'role': return 'Role';
      case 'client': return 'Client';
    }
  };

  const getEntityOptions = () => {
    switch (entityType) {
      case 'role':
        return roles.map((role) => ({ value: role.name, label: role.name }));
      case 'user':
        return users.map((user) => ({ value: user.username || user.id, label: user.username || user.id }));
      case 'client':
        return clients.map((client) => ({ value: client.id, label: client.clientId || client.id }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="outline" 
            onClick={() => navigate('/clusters')} 
            className="mb-4 text-sm h-9"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Clusters
          </Button>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Permission Analyzer
          </h1>
          <p className="text-gray-600">
            Keycloak RBAC yapısını görselleştir: Kullanıcı/Rol/Client → Role → Composite → Client Role → Scope → Permission → Policy
          </p>
        </div>

        {/* Cluster and Entity Selection */}
        <Card className="mb-6 border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Select Cluster and Entity</CardTitle>
            <CardDescription>Choose a cluster, entity type, and entity to analyze</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Cluster</label>
                <Select 
                  value={clusterId?.toString() || ''} 
                  onValueChange={(value) => {
                    setClusterId(Number(value));
                    setSelectedEntity('');
                    setRbacData(null);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a cluster" />
                  </SelectTrigger>
                  <SelectContent>
                    {clusters.map((cluster) => (
                      <SelectItem key={cluster.id} value={cluster.id.toString()}>
                        {cluster.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Entity Type</label>
                <Select 
                  value={entityType} 
                  onValueChange={(value) => {
                    setEntityType(value as EntityType);
                    setSelectedEntity('');
                    setRbacData(null);
                  }}
                  disabled={!clusterId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="role">Role</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">{getEntityLabel()}</label>
                <Select 
                  value={selectedEntity} 
                  onValueChange={setSelectedEntity}
                  disabled={!clusterId || loadingEntities}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={loadingEntities ? "Loading..." : `Select a ${getEntityLabel()?.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {getEntityOptions()?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button 
              onClick={loadRBACAnalysis} 
              disabled={!clusterId || !selectedEntity || loading}
              className="mt-4"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Analyzing...' : 'Analyze RBAC'}
            </Button>
          </CardContent>
        </Card>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {rbacData && (
          <>
            {/* İstatistikler */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-4 h-4 text-purple-500" />
                    <span className="text-xs text-gray-500">Roles</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{rbacData.statistics.roles}</div>
                </CardContent>
              </Card>
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Layers className="w-4 h-4 text-blue-500" />
                    <span className="text-xs text-gray-500">Composites</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{rbacData.statistics.composites}</div>
                </CardContent>
              </Card>
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-gray-500">Client Roles</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{rbacData.statistics.client_roles}</div>
                </CardContent>
              </Card>
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Key className="w-4 h-4 text-yellow-500" />
                    <span className="text-xs text-gray-500">Scopes</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{rbacData.statistics.scopes}</div>
                </CardContent>
              </Card>
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Lock className="w-4 h-4 text-orange-500" />
                    <span className="text-xs text-gray-500">Permissions</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{rbacData.statistics.permissions}</div>
                </CardContent>
              </Card>
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-red-500" />
                    <span className="text-xs text-gray-500">Policies</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{rbacData.statistics.policies}</div>
                </CardContent>
              </Card>
            </div>

            {/* Legend */}
            <Card className="mb-6 border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-gray-700">Legend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm text-gray-600">User</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-cyan-500" />
                    <span className="text-sm text-gray-600">Client</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-500" />
                    <span className="text-sm text-gray-600">Role</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-gray-600">Composite</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-gray-600">Client Role</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm text-gray-600">Scope</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-orange-500" />
                    <span className="text-sm text-gray-600">Permission</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-gray-600">Policy</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ağaç Görünümü */}
            <Card className="border border-gray-200 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-gray-900">RBAC Hierarchy Tree</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-l-2 border-gray-200">
                  <TreeNode node={rbacData.role} />
                </div>
              </CardContent>
            </Card>

            {/* Info Box */}
            <Card className="mt-6 border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 Permission Analyzer Özellikleri</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Kullanıcı, Rol veya Client seçerek RBAC analizi yap</li>
                  <li>• Tek bakışta tüm RBAC zincirini görüntüle</li>
                  <li>• Role → Composite → Client Role → Scope → Permission → Policy ilişkilerini takip et</li>
                  <li>• Policy tiplerini (role, time, group, IP, aggregated) renklerle ayırt et</li>
                  <li>• Recursive composite role yapısını çöz</li>
                </ul>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
