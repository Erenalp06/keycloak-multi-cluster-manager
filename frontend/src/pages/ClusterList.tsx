import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clusterApi, roleApi, Cluster, ClusterHealth, ClusterMetrics, PrometheusMetrics, DiscoverRealmsRequest, RealmInfo, environmentTagApi, EnvironmentTag, AssignTagsToClustersRequest, RemoveTagsFromClustersRequest, CreateEnvironmentTagRequest } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Activity, Eye, Shield, Users, Key, Building2, Network, Server, X, CheckCircle2, AlertCircle, Tag, Grid3x3, List, Filter, Edit, ChevronDown, ChevronRight, Folder, Search, Search as SearchIcon, Loader2, ExternalLink } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import TokenInspectorDialog from '@/components/TokenInspectorDialog';
import MultiClusterSearch from '@/components/MultiClusterSearch';
import RealmTable from '@/components/RealmTable';

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
  const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set());
  const [tags, setTags] = useState<EnvironmentTag[]>([]);
  const [tagFilterOpen, setTagFilterOpen] = useState(false);
  const [selectedClusters, setSelectedClusters] = useState<Set<number>>(new Set());
  const [tagAssignDialog, setTagAssignDialog] = useState<{ open: boolean; clusterId: number | null; isBulk: boolean }>({
    open: false,
    clusterId: null,
    isBulk: false,
  });
  const [selectedTagsForAssign, setSelectedTagsForAssign] = useState<Set<number>>(new Set());
  const [createTagDialogOpen, setCreateTagDialogOpen] = useState(false);
  const [newTag, setNewTag] = useState<CreateEnvironmentTagRequest>({
    name: '',
    color: '#3b82f6',
    description: '',
  });
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
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [tokenInspectorDialog, setTokenInspectorDialog] = useState<{ open: boolean; clusterId: number | null }>({
    open: false,
    clusterId: null,
  });
  const [addMode, setAddMode] = useState<'manual' | 'discover'>('manual');
  const [discoverFormData, setDiscoverFormData] = useState<DiscoverRealmsRequest>({
    base_url: '',
    username: '',
    password: '',
    skip_tls_verify: false,
  });
  const [discoveredRealms, setDiscoveredRealms] = useState<RealmInfo[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [selectedRealms, setSelectedRealms] = useState<Set<string>>(new Set());
  

  const [formData, setFormData] = useState({
    name: '',
    base_url: '',
    realm: 'master',
    master_username: '',
    master_password: '',
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
    master_username: '',
    master_password: '',
    group_name: '',
    metrics_endpoint: '',
  });

  useEffect(() => {
    loadClusters();
    if (isAdmin) {
      loadTags();
    }
  }, [isAdmin]);
  
  const loadTags = async () => {
    try {
      const data = await environmentTagApi.getAll();
      setTags(data || []); // Ensure it's always an array
    } catch (error) {
      console.error('Failed to load tags:', error);
      setTags([]); // Set empty array on error
    }
  };

  const handleAssignTagsToCluster = async () => {
    const clusterIds = tagAssignDialog.isBulk 
      ? Array.from(selectedClusters)
      : (tagAssignDialog.clusterId ? [tagAssignDialog.clusterId] : []);
    
    if (clusterIds.length === 0) {
      alert('Please select at least one cluster');
      return;
    }

    try {
      // Get current tags for all clusters
      const currentTagIdsByCluster = new Map<number, Set<number>>();
      for (const clusterId of clusterIds) {
        const cluster = clusters.find(c => c.id === clusterId);
        if (cluster) {
          currentTagIdsByCluster.set(clusterId, new Set(cluster.environment_tags?.map(t => t.id) || []));
        }
      }

      // Determine which tags to assign and which to remove
      // For bulk operations, we need to track which clusters need which tags
      const tagsToAssignByCluster = new Map<number, number[]>(); // clusterId -> tagIds[]
      const tagsToRemoveByCluster = new Map<number, number[]>(); // clusterId -> tagIds[]

      for (const tag of tags) {
        const shouldHaveTag = selectedTagsForAssign.has(tag.id);
        
        if (tagAssignDialog.isBulk) {
          // For each cluster, check if tag should be added or removed
          for (const clusterId of clusterIds) {
            const currentTags = currentTagIdsByCluster.get(clusterId) || new Set();
            const currentlyHasTag = currentTags.has(tag.id);

            if (shouldHaveTag && !currentlyHasTag) {
              // Need to assign this tag to this cluster
              if (!tagsToAssignByCluster.has(clusterId)) {
                tagsToAssignByCluster.set(clusterId, []);
              }
              tagsToAssignByCluster.get(clusterId)!.push(tag.id);
            } else if (!shouldHaveTag && currentlyHasTag) {
              // Need to remove this tag from this cluster
              if (!tagsToRemoveByCluster.has(clusterId)) {
                tagsToRemoveByCluster.set(clusterId, []);
              }
              tagsToRemoveByCluster.get(clusterId)!.push(tag.id);
            }
          }
        } else {
          // Single cluster operation
          const clusterId = tagAssignDialog.clusterId!;
          const currentTags = currentTagIdsByCluster.get(clusterId) || new Set();
          const currentlyHasTag = currentTags.has(tag.id);

          if (shouldHaveTag && !currentlyHasTag) {
            if (!tagsToAssignByCluster.has(clusterId)) {
              tagsToAssignByCluster.set(clusterId, []);
            }
            tagsToAssignByCluster.get(clusterId)!.push(tag.id);
          } else if (!shouldHaveTag && currentlyHasTag) {
            if (!tagsToRemoveByCluster.has(clusterId)) {
              tagsToRemoveByCluster.set(clusterId, []);
            }
            tagsToRemoveByCluster.get(clusterId)!.push(tag.id);
          }
        }
      }

      // Group clusters by their tag sets for efficient API calls
      // For assign operations: group clusters that need the same tags
      const assignGroups = new Map<string, { clusterIds: number[], tagIds: number[] }>();
      tagsToAssignByCluster.forEach((tagIds, clusterId) => {
        const key = tagIds.sort().join(',');
        if (!assignGroups.has(key)) {
          assignGroups.set(key, { clusterIds: [], tagIds });
        }
        assignGroups.get(key)!.clusterIds.push(clusterId);
      });

      // For remove operations: group clusters that need to remove the same tags
      const removeGroups = new Map<string, { clusterIds: number[], tagIds: number[] }>();
      tagsToRemoveByCluster.forEach((tagIds, clusterId) => {
        const key = tagIds.sort().join(',');
        if (!removeGroups.has(key)) {
          removeGroups.set(key, { clusterIds: [], tagIds });
        }
        removeGroups.get(key)!.clusterIds.push(clusterId);
      });

      // Perform assign and remove operations
      const promises: Promise<any>[] = [];
      
      assignGroups.forEach((group) => {
        promises.push(environmentTagApi.assignTagsToClusters({
          cluster_ids: group.clusterIds,
          tag_ids: group.tagIds,
        }));
      });
      
      removeGroups.forEach((group) => {
        promises.push(environmentTagApi.removeTagsFromClusters({
          cluster_ids: group.clusterIds,
          tag_ids: group.tagIds,
        }));
      });

      if (promises.length > 0) {
        await Promise.all(promises);
        const totalAssignCount = Array.from(tagsToAssignByCluster.values()).reduce((sum, tags) => sum + tags.length, 0);
        const totalRemoveCount = Array.from(tagsToRemoveByCluster.values()).reduce((sum, tags) => sum + tags.length, 0);
        const actions = [];
        if (totalAssignCount > 0) actions.push(`assigned ${totalAssignCount} tag${totalAssignCount > 1 ? 's' : ''}`);
        if (totalRemoveCount > 0) actions.push(`removed ${totalRemoveCount} tag${totalRemoveCount > 1 ? 's' : ''}`);
        alert(`Successfully ${actions.join(' and ')} for ${clusterIds.length} cluster${clusterIds.length > 1 ? 's' : ''}`);
      } else {
        alert('No changes to apply');
      }

      setTagAssignDialog({ open: false, clusterId: null, isBulk: false });
      setSelectedTagsForAssign(new Set());
      if (tagAssignDialog.isBulk) {
        setSelectedClusters(new Set());
      }
      loadClusters();
      loadTags(); // Reload tags in case a new one was created
    } catch (error: any) {
      alert(error.message || 'Failed to update tags');
    }
  };

  const handleBulkTagAssign = () => {
    if (selectedClusters.size === 0) {
      alert('Please select at least one cluster');
      return;
    }
    // For bulk, check which tags are common to ALL selected clusters
    const commonTagIds = new Set<number>();
    const firstCluster = clusters.find(c => selectedClusters.has(c.id));
    if (firstCluster) {
      const firstClusterTagIds = new Set(firstCluster.environment_tags?.map(t => t.id) || []);
      // Start with first cluster's tags
      firstClusterTagIds.forEach(tagId => commonTagIds.add(tagId));
      
      // Keep only tags that exist in ALL selected clusters
      Array.from(selectedClusters).forEach(clusterId => {
        const cluster = clusters.find(c => c.id === clusterId);
        if (cluster) {
          const clusterTagIds = new Set(cluster.environment_tags?.map(t => t.id) || []);
          // Remove tags that don't exist in this cluster
          Array.from(commonTagIds).forEach(tagId => {
            if (!clusterTagIds.has(tagId)) {
              commonTagIds.delete(tagId);
            }
          });
        }
      });
    }
    setTagAssignDialog({ open: true, clusterId: null, isBulk: true });
    setSelectedTagsForAssign(commonTagIds);
  };

  const handleCreateTag = async () => {
    if (!newTag.name.trim()) {
      alert('Tag name is required');
      return;
    }

    try {
      await environmentTagApi.create(newTag);
      setCreateTagDialogOpen(false);
      setNewTag({ name: '', color: '#3b82f6', description: '' });
      await loadTags();
      alert('Tag created successfully');
    } catch (error: any) {
      alert(error.message || 'Failed to create tag');
    }
  };

  // Auto-expand all groups when clusters are loaded
  useEffect(() => {
    if (clusters.length > 0) {
      const { nestedGroups, standaloneGroups } = groupedClusters();
      const allGroupKeys = new Set<string>();
      
      // Add instance group keys
      Object.keys(nestedGroups).forEach(instanceName => {
        allGroupKeys.add(instanceName);
        // Also expand sub-groups within instances
        Object.keys(nestedGroups[instanceName].groups).forEach(groupName => {
          allGroupKeys.add(`${instanceName}:${groupName}`);
        });
      });
      
      // Add standalone group keys
      Object.keys(standaloneGroups).forEach(groupName => {
        allGroupKeys.add(groupName);
      });
      
      if (allGroupKeys.size > 0) {
        setExpandedGroups(allGroupKeys);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusters]);

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
        master_username: '',
        master_password: '',
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

  const handleDiscover = async () => {
    try {
      setDiscovering(true);
      const realms = await clusterApi.discoverRealms(discoverFormData);
      setDiscoveredRealms(realms);
    } catch (error: any) {
      alert(error.message || 'Failed to discover realms');
      setDiscoveredRealms([]);
    } finally {
      setDiscovering(false);
    }
  };

  const handleAddSelectedRealms = async () => {
    try {
      const promises = Array.from(selectedRealms).map(realm => {
        return clusterApi.create({
          name: `${discoverFormData.base_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}-${realm}`,
          base_url: discoverFormData.base_url,
          realm: realm,
          master_username: discoverFormData.username,
          master_password: discoverFormData.password,
        });
      });
      
      await Promise.all(promises);
      setIsDialogOpen(false);
      setDiscoveredRealms([]);
      setSelectedRealms(new Set());
      setDiscoverFormData({
        base_url: '',
        username: '',
        password: '',
        skip_tls_verify: false,
      });
      setAddMode('manual');
      loadClusters();
      window.dispatchEvent(new CustomEvent('clusterUpdated'));
    } catch (error: any) {
      alert(error.message || 'Failed to add clusters');
    }
  };

  const handleEdit = (cluster: Cluster) => {
    setEditFormData({
      name: cluster.name,
      base_url: cluster.base_url,
      realm: cluster.realm,
      master_username: '', // Not stored, user needs to provide again
      master_password: '', // Not stored, user needs to provide again
      group_name: cluster.group_name || '',
      metrics_endpoint: cluster.metrics_endpoint || '',
    });
    setEditDialog({ open: true, clusterId: cluster.id });
  };

  const handleUpdate = async () => {
    if (!editDialog.clusterId) return;
    
    try {
      const updateData: any = {
        name: editFormData.name,
        base_url: editFormData.base_url,
        realm: editFormData.realm,
        master_username: editFormData.master_username,
        master_password: editFormData.master_password,
      };
      
      // Handle group_name: send null if empty, otherwise send the trimmed value
      if (editFormData.group_name.trim() === '') {
        updateData.group_name = null;
      } else {
        updateData.group_name = editFormData.group_name.trim();
      }
      
      // Handle metrics_endpoint: send null if empty, otherwise send the trimmed value
      if (editFormData.metrics_endpoint.trim() === '') {
        updateData.metrics_endpoint = null;
      } else {
        updateData.metrics_endpoint = editFormData.metrics_endpoint.trim();
      }
      
      await clusterApi.update(editDialog.clusterId, updateData);
      setEditDialog({ open: false, clusterId: null });
      setEditFormData({
        name: '',
        base_url: '',
        realm: 'master',
        master_username: '',
        master_password: '',
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
        master_username: '', // Not needed if realm/base_url unchanged
        master_password: '', // Not needed if realm/base_url unchanged
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

  // Filter clusters based on health filter and tag filter
  const getFilteredClusters = () => {
    let filtered = clusters;
    
    // Health filter
    if (healthFilter !== 'all') {
      filtered = filtered.filter(cluster => {
        const health = healthStatuses[cluster.id];
        if (!health) return healthFilter === 'offline';
        const isHealthy = health.status === 'healthy';
        return healthFilter === 'online' ? isHealthy : !isHealthy;
      });
    }
    
    // Tag filter
    if (selectedTagIds.size > 0) {
      filtered = filtered.filter(cluster => {
        if (!cluster.environment_tags || cluster.environment_tags.length === 0) {
          return false;
        }
        const clusterTagIds = new Set(cluster.environment_tags.map(tag => tag.id));
        // Check if cluster has at least one of the selected tags
        return Array.from(selectedTagIds).some(tagId => clusterTagIds.has(tagId));
      });
    }
    
    return filtered;
  };

  // Group clusters by base_url (Keycloak instance) first, then by group_name (nested)
  const groupedClusters = () => {
    const filtered = getFilteredClusters();
    
    // Helper to get instance name from base_url (hostname + port)
    const getInstanceName = (baseUrl: string): string => {
      try {
        const url = new URL(baseUrl);
        // Include both hostname and port to distinguish different instances on same machine
        if (url.port) {
          return `${url.hostname}:${url.port}`;
        }
        // If no port specified, use default ports based on protocol
        const defaultPort = url.protocol === 'https:' ? '443' : '80';
        return `${url.hostname}:${defaultPort}`;
      } catch {
        return baseUrl;
      }
    };

    // First pass: Group ALL clusters by base_url (instance) - PRIMARY grouping
    const instanceGroups: Record<string, Cluster[]> = {};
    filtered.forEach((cluster) => {
      const instanceName = getInstanceName(cluster.base_url);
      if (!instanceGroups[instanceName]) {
        instanceGroups[instanceName] = [];
      }
      instanceGroups[instanceName].push(cluster);
    });

    // Second pass: For each instance, group by group_name (SECONDARY grouping)
    // Structure: { instanceName: { groups: Record<string, Cluster[]>, ungrouped: Cluster[] } }
    const nestedGroups: Record<string, { groups: Record<string, Cluster[]>, ungrouped: Cluster[] }> = {};
    const standaloneGroups: Record<string, Cluster[]> = {}; // Manual groups spanning multiple instances
    const ungrouped: Cluster[] = [];

    Object.entries(instanceGroups).forEach(([instanceName, clusterList]) => {
      if (clusterList.length > 1) {
        // Multiple realms on same instance - create nested structure
        nestedGroups[instanceName] = { groups: {}, ungrouped: [] };
        
        // Group by group_name within this instance
        clusterList.forEach((cluster) => {
          if (cluster.group_name && cluster.group_name.trim() !== '') {
            if (!nestedGroups[instanceName].groups[cluster.group_name]) {
              nestedGroups[instanceName].groups[cluster.group_name] = [];
            }
            nestedGroups[instanceName].groups[cluster.group_name].push(cluster);
          } else {
            nestedGroups[instanceName].ungrouped.push(cluster);
          }
        });
      } else {
        // Single realm on instance
        const cluster = clusterList[0];
        if (cluster.group_name && cluster.group_name.trim() !== '') {
          // Has manual group - check if other instances also have this group_name
          if (!standaloneGroups[cluster.group_name]) {
            standaloneGroups[cluster.group_name] = [];
          }
          standaloneGroups[cluster.group_name].push(cluster);
        } else {
          // No manual group - leave ungrouped
          ungrouped.push(cluster);
        }
      }
    });

    // Filter standalone groups - only keep those with multiple clusters from different instances
    const finalStandaloneGroups: Record<string, Cluster[]> = {};
    Object.entries(standaloneGroups).forEach(([groupName, clusterList]) => {
      if (clusterList.length > 1) {
        finalStandaloneGroups[groupName] = clusterList;
      } else {
        // Single cluster with group_name but alone - add to ungrouped
        ungrouped.push(clusterList[0]);
      }
    });

    return { nestedGroups, standaloneGroups: finalStandaloneGroups, ungrouped };
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) {
        newSet.delete(groupName);
      } else {
        newSet.add(groupName);
      }
      return newSet;
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
      {/* Header with Search */}
      <div className="flex items-center mb-6 gap-4">
        <div className="flex-shrink-0">
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Clusters</h1>
          <p className="text-sm text-gray-600">Manage your Keycloak environments</p>
        </div>
        <div className="flex-1 min-w-0">
          {/* Multi-Cluster Search - Takes remaining space */}
          <MultiClusterSearch clusters={clusters} />
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          
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
          
          {/* Tag Filter */}
          {isAdmin && tags.length > 0 && (
            <div className="relative" onMouseLeave={() => setTagFilterOpen(false)}>
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <Tag className="h-3.5 w-3.5 text-gray-600 ml-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onMouseEnter={() => setTagFilterOpen(true)}
                  onClick={() => setTagFilterOpen(!tagFilterOpen)}
                >
                  {selectedTagIds.size > 0 ? `${selectedTagIds.size} selected` : 'Filter by tag'}
                </Button>
                {selectedTagIds.size > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTagIds(new Set());
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              {tagFilterOpen && (
                <div className="absolute top-full right-0 mt-1 bg-white border rounded-lg shadow-lg p-3 z-50 min-w-[250px] max-h-[400px] overflow-y-auto">
                  <div className="text-xs font-semibold mb-2 text-gray-700">Select Tags to Filter:</div>
                  <div className="space-y-1">
                    {tags.map((tag) => (
                      <label key={tag.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={selectedTagIds.has(tag.id)}
                          onChange={(e) => {
                            const newSet = new Set(selectedTagIds);
                            if (e.target.checked) {
                              newSet.add(tag.id);
                            } else {
                              newSet.delete(tag.id);
                            }
                            setSelectedTagIds(newSet);
                          }}
                          className="rounded"
                        />
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="text-sm flex-1">{tag.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
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

          {/* Bulk Tag Assign/Remove */}
          {isAdmin && selectedClusters.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkTagAssign}
              className="h-8 text-xs bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200"
            >
              <Tag className="h-3.5 w-3.5 mr-1.5" />
              Manage Tags ({selectedClusters.size})
            </Button>
          )}

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
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              // Reset states when dialog closes
              setAddMode('manual');
              setDiscoveredRealms([]);
              setSelectedRealms(new Set());
              setDiscoverFormData({
                base_url: '',
                username: '',
                password: '',
              });
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-[#4a5568] hover:bg-[#374151] text-white text-sm h-9">
                <Plus className="mr-1.5 h-4 w-4" />
                Add Cluster
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-base">Add New Cluster</DialogTitle>
              <DialogDescription className="text-sm">
                Add a cluster manually or discover realms from a Keycloak instance.
              </DialogDescription>
            </DialogHeader>

            {/* Mode Toggle */}
            <div className="flex items-center gap-2 mb-4 border-b pb-3">
              <Button
                variant={addMode === 'manual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAddMode('manual')}
                className={`text-sm h-8 ${addMode === 'manual' ? 'bg-[#4a5568] hover:bg-[#374151] text-white' : ''}`}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Manual
              </Button>
              <Button
                variant={addMode === 'discover' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAddMode('discover')}
                className={`text-sm h-8 ${addMode === 'discover' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
              >
                <SearchIcon className="mr-1.5 h-3.5 w-3.5" />
                Discover
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {addMode === 'manual' ? (
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
                <Label htmlFor="master_username" className="text-sm">Master Realm Admin Username</Label>
                <Input
                  id="master_username"
                  className="h-9"
                  value={formData.master_username}
                  onChange={(e) => setFormData({ ...formData, master_username: e.target.value })}
                  placeholder="admin"
                />
                <p className="text-xs text-gray-500">
                  Master realm admin credentials (used only during setup to create service account)
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="master_password" className="text-sm">Master Realm Admin Password</Label>
                <Input
                  id="master_password"
                  type="password"
                  className="h-9"
                  value={formData.master_password}
                  onChange={(e) => setFormData({ ...formData, master_password: e.target.value })}
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
              ) : (
                <div className="py-4">
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="discover_base_url" className="text-sm">Base URL</Label>
                      <Input
                        id="discover_base_url"
                        className="h-9"
                        value={discoverFormData.base_url}
                        onChange={(e) => setDiscoverFormData({ ...discoverFormData, base_url: e.target.value })}
                        placeholder="https://keycloak.example.com"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="discover_username" className="text-sm">Admin Username</Label>
                      <Input
                        id="discover_username"
                        className="h-9"
                        value={discoverFormData.username}
                        onChange={(e) => setDiscoverFormData({ ...discoverFormData, username: e.target.value })}
                        placeholder="admin"
                      />
                      <p className="text-xs text-gray-500">
                        Master realm admin credentials required
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="discover_password" className="text-sm">Admin Password</Label>
                      <Input
                        id="discover_password"
                        type="password"
                        className="h-9"
                        value={discoverFormData.password}
                        onChange={(e) => setDiscoverFormData({ ...discoverFormData, password: e.target.value })}
                        placeholder="password"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="discover_skip_tls"
                        checked={discoverFormData.skip_tls_verify || false}
                        onChange={(e) => setDiscoverFormData({ ...discoverFormData, skip_tls_verify: e.target.checked })}
                        className="rounded"
                      />
                      <Label htmlFor="discover_skip_tls" className="text-sm cursor-pointer">
                        Skip TLS Verification
                      </Label>
                    </div>
                    <Button
                      onClick={handleDiscover}
                      disabled={discovering || !discoverFormData.base_url || !discoverFormData.username || !discoverFormData.password}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm h-9"
                    >
                      {discovering ? (
                        <>
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                          Discovering...
                        </>
                      ) : (
                        <>
                          <SearchIcon className="mr-1.5 h-4 w-4" />
                          Discover Realms
                        </>
                      )}
                    </Button>
                  </div>

                  {discoveredRealms.length > 0 && (
                    <div className="mt-6 border-t pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold">Discovered Realms ({discoveredRealms.length})</h3>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => {
                              const allEnabled = discoveredRealms.filter(r => r.enabled).map(r => r.realm);
                              setSelectedRealms(new Set(allEnabled));
                            }}
                          >
                            Select All Enabled
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => setSelectedRealms(new Set())}
                          >
                            Clear Selection
                          </Button>
                        </div>
                      </div>
                      <div className="max-h-[300px] overflow-y-auto space-y-2">
                        {discoveredRealms.map((realm) => (
                          <div
                            key={realm.realm}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedRealms.has(realm.realm)
                                ? 'bg-blue-50 border-blue-300'
                                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                            }`}
                            onClick={() => {
                              const newSelected = new Set(selectedRealms);
                              if (newSelected.has(realm.realm)) {
                                newSelected.delete(realm.realm);
                              } else {
                                newSelected.add(realm.realm);
                              }
                              setSelectedRealms(newSelected);
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedRealms.has(realm.realm)}
                              onChange={() => {}}
                              className="h-4 w-4 text-blue-600 rounded"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-gray-600" />
                                <span className="text-sm font-medium">{realm.realm}</span>
                                {!realm.enabled && (
                                  <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded">Disabled</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {selectedRealms.size > 0 && (
                        <div className="mt-4 pt-4 border-t space-y-2">
                          <Button
                            onClick={handleAddSelectedRealms}
                            className="w-full bg-green-600 hover:bg-green-700 text-white text-sm h-9"
                          >
                            <Plus className="mr-1.5 h-4 w-4" />
                            Add {selectedRealms.size} Selected Realm{selectedRealms.size > 1 ? 's' : ''}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              {addMode === 'manual' ? (
              <Button onClick={handleCreate} className="bg-[#4a5568] hover:bg-[#374151] text-white text-sm h-9">
                Create
              </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setDiscoveredRealms([]);
                    setSelectedRealms(new Set());
                    setDiscoverFormData({
                      base_url: '',
                      username: '',
                      password: '',
                    });
                  }}
                  className="text-sm h-9"
                >
                  Close
                </Button>
              )}
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
          const { nestedGroups, standaloneGroups, ungrouped } = groupedClusters();
          const sortedInstanceNames = Object.keys(nestedGroups).sort();
          const sortedStandaloneNames = Object.keys(standaloneGroups).sort();
          
          // Helper function to render a cluster card
          const renderClusterCard = (cluster: Cluster) => {
                const clusterMetrics = getClusterMetrics(cluster.id);
                const health = healthStatuses[cluster.id];
                const isHealthy = health?.status === 'healthy';
                const isError = health?.status === 'error' || health?.status === 'unhealthy';
                
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
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
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
                      </div>

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
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-9 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300 hover:border-blue-400 font-medium"
                            onClick={() => setTokenInspectorDialog({ open: true, clusterId: cluster.id })}
                          >
                            <Key className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">Token Inspector</p>
                          <p className="text-xs mt-1 opacity-90">
                            Get and inspect access token for a Keycloak user
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    {isAdmin && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-8 px-2 text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                        onClick={() => handleEdit(cluster)}
                          >
                        <Edit className="h-3.5 w-3.5" />
                          </Button>
                    )}
                    {isAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 px-2 text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                        onClick={() => handleDelete(cluster.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
                );
          };

        return (
            <div className="space-y-6">
              {/* Nested instance groups (base_url -> group_name) */}
              {sortedInstanceNames.map((instanceName) => {
                const instanceData = nestedGroups[instanceName];
                const isInstanceExpanded = expandedGroups.has(instanceName);
                const totalClusters = Object.values(instanceData.groups).flat().length + instanceData.ungrouped.length;
                const sortedSubGroupNames = Object.keys(instanceData.groups).sort();
              
              return (
                  <div key={instanceName} className="space-y-3">
                    <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
                      <button
                        onClick={() => toggleGroup(instanceName)}
                        className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
                      >
                        <Server className="h-4 w-4 text-blue-500" />
                        <span>{instanceName}</span>
                        <span className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded border border-blue-200">
                          Instance
                        </span>
                        <span className="text-xs text-gray-500">({totalClusters})</span>
                        {isInstanceExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                        </div>
                    {isInstanceExpanded && (
                      <div className="pl-4 border-l-2 border-gray-200 space-y-4">
                        {/* Sub-groups by group_name */}
                        {sortedSubGroupNames.map((groupName) => {
                          const subGroupClusters = instanceData.groups[groupName];
                          const subGroupKey = `${instanceName}:${groupName}`;
                          const isSubGroupExpanded = expandedGroups.has(subGroupKey);
                          
                          return (
                            <div key={subGroupKey} className="space-y-3">
                              <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
                                <button
                                  onClick={() => toggleGroup(subGroupKey)}
                                  className="flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-gray-800 transition-colors"
                                >
                                  <Folder className="h-3.5 w-3.5 text-gray-400" />
                                  <span>{groupName}</span>
                                  <span className="text-xs text-gray-500">({subGroupClusters.length})</span>
                                  {isSubGroupExpanded ? (
                                    <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                                  ) : (
                                    <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                                  )}
                                </button>
                          </div>
                              {isSubGroupExpanded && (
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pl-4 border-l-2 border-gray-200">
                                  {subGroupClusters.map((cluster: Cluster) => renderClusterCard(cluster))}
                              </div>
                            )}
                              </div>
                          );
                        })}
                        
                        {/* Ungrouped clusters within instance */}
                        {instanceData.ungrouped.length > 0 && (
                          <div className="space-y-3">
                            <div className="text-xs font-semibold text-gray-500 pb-2 border-b border-gray-200">
                              Other ({instanceData.ungrouped.length})
                              </div>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pl-4 border-l-2 border-gray-200">
                              {instanceData.ungrouped.map((cluster: Cluster) => renderClusterCard(cluster))}
                          </div>
                            </div>
                          )}
                        </div>
                    )}
                      </div>
                );
              })}
              
              {/* Standalone groups (manual groups spanning multiple instances) */}
              {sortedStandaloneNames.map((groupName) => {
                const groupClusters = standaloneGroups[groupName];
                const isGroupExpanded = expandedGroups.has(groupName);
                
                return (
                  <div key={groupName} className="space-y-3">
                    <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
                      <button
                        onClick={() => toggleGroup(groupName)}
                        className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
                        >
                        <Folder className="h-4 w-4 text-gray-500" />
                        <span>{groupName}</span>
                        <span className="text-xs text-gray-500">({groupClusters.length})</span>
                        {isGroupExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                          </div>
                    {isGroupExpanded && (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pl-4 border-l-2 border-gray-200">
                        {groupClusters.map((cluster: Cluster) => renderClusterCard(cluster))}
                        </div>
                            )}
                          </div>
                );
              })}
              
              {/* Ungrouped clusters */}
              {ungrouped.length > 0 && (
                <div className="space-y-3">
                  <div className="pb-2 border-b border-gray-200">
                    <div className="text-sm font-semibold text-gray-700">Other Clusters</div>
                        </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {ungrouped.map((cluster: Cluster) => renderClusterCard(cluster))}
                          </div>
                        </div>
                            )}
                          </div>
          );
        }

        // List View - Table format
        const { nestedGroups: listNestedGroups, standaloneGroups: listStandaloneGroups, ungrouped: listUngrouped } = groupedClusters();
        const sortedListInstanceNames = Object.keys(listNestedGroups).sort();
        const sortedListStandaloneNames = Object.keys(listStandaloneGroups).sort();
        
        // Collect all clusters for table view
        const allClustersForTable: Cluster[] = [];
        
        // Add nested instance groups
        sortedListInstanceNames.forEach((instanceName) => {
          const instanceData = listNestedGroups[instanceName];
          const allInstanceClusters = [
            ...Object.values(instanceData.groups).flat(),
            ...instanceData.ungrouped
          ];
          allClustersForTable.push(...allInstanceClusters);
        });
        
        // Add standalone groups
        sortedListStandaloneNames.forEach((groupName) => {
          allClustersForTable.push(...listStandaloneGroups[groupName]);
        });
        
        // Add ungrouped
        allClustersForTable.push(...listUngrouped);
        
        return (
          <div className="space-y-6">
            {/* Instance Headers */}
            {sortedListInstanceNames.map((instanceName) => {
              const instanceData = listNestedGroups[instanceName];
              const isInstanceExpanded = expandedGroups.has(instanceName);
              const allInstanceClusters = [
                ...Object.values(instanceData.groups).flat(),
                ...instanceData.ungrouped
              ];
              const totalClusters = allInstanceClusters.length;
              
              return (
                <div key={instanceName} className="space-y-4">
                  <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-white shadow-md">
                    <CardContent className="p-4">
                      <button
                        onClick={() => toggleGroup(instanceName)}
                        className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center shadow-sm">
                            <Server className="h-5 w-5 text-white" />
                        </div>
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-700">Keycloak Instance:</span>
                              <span className="text-base font-bold text-gray-900">{instanceName}</span>
                      </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {totalClusters} {totalClusters === 1 ? 'realm' : 'realms'}
                            </div>
                          </div>
                        </div>
                        {isInstanceExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </CardContent>
                  </Card>
                  
                  {isInstanceExpanded && (
                    <RealmTable
                      clusters={allInstanceClusters}
                      healthStatuses={healthStatuses}
                      metrics={metrics}
                      loadingMetrics={loadingMetrics}
                      onDelete={handleDelete}
                      onEdit={handleEdit}
                      onTokenInspector={(clusterId) => setTokenInspectorDialog({ open: true, clusterId })}
                      onAssignTags={isAdmin ? (clusterId) => {
                        const cluster = clusters.find(c => c.id === clusterId);
                        if (cluster) {
                          const existingTagIds = new Set(cluster.environment_tags?.map(t => t.id) || []);
                          setSelectedTagsForAssign(existingTagIds);
                          setTagAssignDialog({ open: true, clusterId, isBulk: false });
                        }
                      } : undefined}
                      selectedClusters={selectedClusters}
                      onClusterSelect={isAdmin ? (clusterId, selected) => {
                        const newSet = new Set(selectedClusters);
                        if (selected) {
                          newSet.add(clusterId);
                        } else {
                          newSet.delete(clusterId);
                        }
                        setSelectedClusters(newSet);
                      } : undefined}
                      getClusterMetrics={getClusterMetrics}
                    />
                        )}
                      </div>
              );
            })}
            
            {/* Standalone groups */}
            {sortedListStandaloneNames.map((groupName) => {
              const groupClusters = listStandaloneGroups[groupName];
              const isGroupExpanded = expandedGroups.has(groupName);
              
              return (
                <div key={groupName} className="space-y-4">
                  <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-white shadow-md">
                    <CardContent className="p-4">
                      <button
                        onClick={() => toggleGroup(groupName)}
                        className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center shadow-sm">
                            <Folder className="h-5 w-5 text-white" />
                    </div>
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-700">Group:</span>
                              <span className="text-base font-bold text-gray-900">{groupName}</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {groupClusters.length} {groupClusters.length === 1 ? 'realm' : 'realms'}
                            </div>
                          </div>
                        </div>
                        {isGroupExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                  </CardContent>
                </Card>
                  
                  {isGroupExpanded && (
                    <RealmTable
                      clusters={groupClusters}
                      healthStatuses={healthStatuses}
                      metrics={metrics}
                      loadingMetrics={loadingMetrics}
                      onDelete={handleDelete}
                      onEdit={handleEdit}
                      onTokenInspector={(clusterId) => setTokenInspectorDialog({ open: true, clusterId })}
                      onAssignTags={isAdmin ? (clusterId) => {
                        const cluster = clusters.find(c => c.id === clusterId);
                        if (cluster) {
                          const existingTagIds = new Set(cluster.environment_tags?.map(t => t.id) || []);
                          setSelectedTagsForAssign(existingTagIds);
                          setTagAssignDialog({ open: true, clusterId, isBulk: false });
                        }
                      } : undefined}
                      selectedClusters={selectedClusters}
                      onClusterSelect={isAdmin ? (clusterId, selected) => {
                        const newSet = new Set(selectedClusters);
                        if (selected) {
                          newSet.add(clusterId);
                        } else {
                          newSet.delete(clusterId);
                        }
                        setSelectedClusters(newSet);
                      } : undefined}
                      getClusterMetrics={getClusterMetrics}
                    />
                  )}
                </div>
              );
            })}
            
            {/* Ungrouped clusters */}
            {listUngrouped.length > 0 && (
              <div className="space-y-4">
                <Card className="border-2 border-gray-200 bg-gradient-to-r from-gray-50 to-white shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-500 flex items-center justify-center shadow-sm">
                        <Shield className="h-5 w-5 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-semibold text-gray-700">Other Clusters</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {listUngrouped.length} {listUngrouped.length === 1 ? 'realm' : 'realms'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <RealmTable
                  clusters={listUngrouped}
                  healthStatuses={healthStatuses}
                  metrics={metrics}
                  loadingMetrics={loadingMetrics}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  onTokenInspector={(clusterId) => setTokenInspectorDialog({ open: true, clusterId })}
                  onAssignTags={isAdmin ? (clusterId) => {
                    const cluster = clusters.find(c => c.id === clusterId);
                    if (cluster) {
                      const existingTagIds = new Set(cluster.environment_tags?.map(t => t.id) || []);
                      setSelectedTagsForAssign(existingTagIds);
                      setTagAssignDialog({ open: true, clusterId, isBulk: false });
                    }
                  } : undefined}
                  selectedClusters={selectedClusters}
                  onClusterSelect={isAdmin ? (clusterId, selected) => {
                    const newSet = new Set(selectedClusters);
                    if (selected) {
                      newSet.add(clusterId);
                    } else {
                      newSet.delete(clusterId);
                    }
                    setSelectedClusters(newSet);
                  } : undefined}
                  getClusterMetrics={getClusterMetrics}
                />
              </div>
            )}
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
              <Label htmlFor="edit_master_username" className="text-sm">Master Realm Admin Username</Label>
              <Input
                id="edit_master_username"
                className="h-9"
                value={editFormData.master_username}
                onChange={(e) => setEditFormData({ ...editFormData, master_username: e.target.value })}
                placeholder="admin"
              />
              <p className="text-xs text-gray-500">
                Required only if realm or base URL changes (used to re-setup service account)
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_master_password" className="text-sm">Master Realm Admin Password</Label>
              <Input
                id="edit_master_password"
                type="password"
                className="h-9"
                value={editFormData.master_password}
                onChange={(e) => setEditFormData({ ...editFormData, master_password: e.target.value })}
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
                  master_username: '',
                  master_password: '',
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

      {/* Token Inspector Dialog */}
      {tokenInspectorDialog.clusterId && (
        <TokenInspectorDialog
          open={tokenInspectorDialog.open}
          onOpenChange={(open) => setTokenInspectorDialog({ open, clusterId: open ? tokenInspectorDialog.clusterId : null })}
          cluster={clusters.find(c => c.id === tokenInspectorDialog.clusterId) || null}
        />
      )}

      {/* Tag Assign Dialog */}
      {isAdmin && (
        <Dialog open={tagAssignDialog.open} onOpenChange={(open) => {
          if (!open) {
            setTagAssignDialog({ open: false, clusterId: null, isBulk: false });
            setSelectedTagsForAssign(new Set());
            if (tagAssignDialog.isBulk) {
              setSelectedClusters(new Set());
            }
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {tagAssignDialog.isBulk 
                  ? `Manage Tags for ${selectedClusters.size} Cluster${selectedClusters.size > 1 ? 's' : ''}`
                  : 'Manage Tags for Cluster'}
              </DialogTitle>
              <DialogDescription>
                {tagAssignDialog.isBulk
                  ? `Check tags to assign, uncheck to remove. Changes will be applied to ${selectedClusters.size} selected cluster${selectedClusters.size > 1 ? 's' : ''}.`
                  : 'Check tags to assign, uncheck to remove. Changes will be applied to this cluster.'}
              </DialogDescription>
            </DialogHeader>
            {tagAssignDialog.isBulk && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <div className="text-sm font-medium text-blue-900 mb-2">Selected Clusters:</div>
                <div className="flex flex-wrap gap-2">
                  {Array.from(selectedClusters).map(clusterId => {
                    const cluster = clusters.find(c => c.id === clusterId);
                    return cluster ? (
                      <span key={clusterId} className="text-xs px-2 py-1 bg-white rounded border border-blue-300 text-blue-700">
                        {cluster.name || cluster.realm}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Select Tags</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCreateTagDialogOpen(true)}
                    className="text-xs h-7"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Create Tag
                  </Button>
                </div>
                <div className="border rounded-lg p-3 max-h-64 overflow-y-auto space-y-2">
                  {tags.length === 0 ? (
                    <div className="text-center py-4 text-sm text-gray-500">
                      No tags available. <button onClick={() => setCreateTagDialogOpen(true)} className="text-blue-600 hover:underline">Create one</button>
                    </div>
                  ) : (
                    tags.map((tag) => {
                    // Check current state - for bulk, show if ALL clusters have it
                    let currentlyHasTag = false;
                    if (tagAssignDialog.isBulk) {
                      const clustersWithTag = Array.from(selectedClusters).filter(clusterId => {
                        const cluster = clusters.find(c => c.id === clusterId);
                        return cluster?.environment_tags?.some(t => t.id === tag.id);
                      });
                      currentlyHasTag = clustersWithTag.length === selectedClusters.size;
                    } else {
                      const cluster = clusters.find(c => c.id === tagAssignDialog.clusterId);
                      currentlyHasTag = cluster?.environment_tags?.some(t => t.id === tag.id) || false;
                    }
                    
                    return (
                      <label key={tag.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={selectedTagsForAssign.has(tag.id)}
                          onChange={(e) => {
                            const newSet = new Set(selectedTagsForAssign);
                            if (e.target.checked) {
                              newSet.add(tag.id);
                            } else {
                              newSet.delete(tag.id);
                            }
                            setSelectedTagsForAssign(newSet);
                          }}
                          className="rounded"
                        />
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="text-sm flex-1">{tag.name}</span>
                        {currentlyHasTag && !selectedTagsForAssign.has(tag.id) && (
                          <span className="text-xs text-orange-600 font-medium">
                            (will be removed)
                          </span>
                        )}
                        {!currentlyHasTag && selectedTagsForAssign.has(tag.id) && (
                          <span className="text-xs text-green-600 font-medium">
                            (will be added)
                          </span>
                        )}
                      </label>
                    );
                  }))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setTagAssignDialog({ open: false, clusterId: null, isBulk: false });
                setSelectedTagsForAssign(new Set());
                if (tagAssignDialog.isBulk) {
                  setSelectedClusters(new Set());
                }
              }}>
                Cancel
              </Button>
              <Button onClick={handleAssignTagsToCluster}>
                Save Changes {tagAssignDialog.isBulk ? `(${selectedClusters.size} Cluster${selectedClusters.size > 1 ? 's' : ''})` : ''}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Tag Dialog */}
      <Dialog open={createTagDialogOpen} onOpenChange={setCreateTagDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Environment Tag</DialogTitle>
            <DialogDescription>Create a new tag to categorize clusters</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="tag-name">Name *</Label>
              <Input
                id="tag-name"
                value={newTag.name}
                onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                placeholder="e.g., Production, Development"
              />
            </div>
            <div>
              <Label htmlFor="tag-color">Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="tag-color"
                  type="color"
                  value={newTag.color}
                  onChange={(e) => setNewTag({ ...newTag, color: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  value={newTag.color}
                  onChange={(e) => setNewTag({ ...newTag, color: e.target.value })}
                  placeholder="#3b82f6"
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="tag-description">Description</Label>
              <Input
                id="tag-description"
                value={newTag.description || ''}
                onChange={(e) => setNewTag({ ...newTag, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setCreateTagDialogOpen(false);
              setNewTag({ name: '', color: '#3b82f6', description: '' });
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateTag}>
              Create Tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
