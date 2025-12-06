import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tag, Plus, Edit, Trash2, X, Check } from 'lucide-react';
import { environmentTagApi, clusterApi, EnvironmentTag, Cluster, CreateEnvironmentTagRequest, UpdateEnvironmentTagRequest, AssignTagsToClustersRequest } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

export default function EnvironmentTags() {
  const { user } = useAuth();
  const [tags, setTags] = useState<EnvironmentTag[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<EnvironmentTag | null>(null);
  const [selectedClusters, setSelectedClusters] = useState<Set<number>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<number>>(new Set());
  
  const [newTag, setNewTag] = useState<CreateEnvironmentTagRequest>({
    name: '',
    color: '#3b82f6',
    description: '',
  });
  
  const [editTag, setEditTag] = useState<UpdateEnvironmentTagRequest>({
    name: '',
    color: '#3b82f6',
    description: '',
  });

  useEffect(() => {
    if (user?.role === 'admin') {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tagsData, clustersData] = await Promise.all([
        environmentTagApi.getAll(),
        clusterApi.getAll(),
      ]);
      setTags(tagsData);
      setClusters(clustersData);
      setError(null);
    } catch (error: any) {
      setError(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newTag.name.trim()) {
      setError('Tag name is required');
      return;
    }

    try {
      await environmentTagApi.create(newTag);
      setSuccess('Environment tag created successfully');
      setError(null);
      setCreateDialogOpen(false);
      setNewTag({ name: '', color: '#3b82f6', description: '' });
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      setError(error.message || 'Failed to create tag');
      setSuccess(null);
    }
  };

  const handleEdit = async () => {
    if (!selectedTag) return;

    try {
      await environmentTagApi.update(selectedTag.id, editTag);
      setSuccess('Environment tag updated successfully');
      setError(null);
      setEditDialogOpen(false);
      setSelectedTag(null);
      setEditTag({ name: '', color: '#3b82f6', description: '' });
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      setError(error.message || 'Failed to update tag');
      setSuccess(null);
    }
  };

  const handleDelete = async (tag: EnvironmentTag) => {
    if (!window.confirm(`Are you sure you want to delete the tag "${tag.name}"?`)) {
      return;
    }

    try {
      await environmentTagApi.delete(tag.id);
      setSuccess('Environment tag deleted successfully');
      setError(null);
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      setError(error.message || 'Failed to delete tag');
      setSuccess(null);
    }
  };

  const openEditDialog = (tag: EnvironmentTag) => {
    setSelectedTag(tag);
    setEditTag({
      name: tag.name,
      color: tag.color,
      description: tag.description || '',
    });
    setEditDialogOpen(true);
  };

  const handleAssignTags = async () => {
    if (selectedClusters.size === 0 || selectedTags.size === 0) {
      setError('Please select at least one cluster and one tag');
      return;
    }

    try {
      const request: AssignTagsToClustersRequest = {
        cluster_ids: Array.from(selectedClusters),
        tag_ids: Array.from(selectedTags),
      };
      await environmentTagApi.assignTagsToClusters(request);
      setSuccess('Tags assigned to clusters successfully');
      setError(null);
      setAssignDialogOpen(false);
      setSelectedClusters(new Set());
      setSelectedTags(new Set());
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      setError(error.message || 'Failed to assign tags');
      setSuccess(null);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">You don't have permission to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-center text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
          {success}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Environment Tags</h1>
          <p className="text-sm text-gray-500 mt-1">Manage environment tags and assign them to clusters</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setAssignDialogOpen(true)} variant="outline">
            <Tag className="h-4 w-4 mr-2" />
            Assign Tags to Clusters
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Tag
          </Button>
        </div>
      </div>

      {/* Tags List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tags.map((tag) => (
          <Card key={tag.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <CardTitle className="text-base">{tag.name}</CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(tag)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(tag)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {tag.description && (
                <CardDescription className="text-xs mt-2">{tag.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {clusters
                  .filter((c) => c.environment_tags?.some((t) => t.id === tag.id))
                  .map((cluster) => (
                    <Badge key={cluster.id} variant="outline" className="text-xs">
                      {cluster.name}
                    </Badge>
                  ))}
                {clusters.filter((c) => c.environment_tags?.some((t) => t.id === tag.id)).length === 0 && (
                  <span className="text-xs text-gray-400">No clusters assigned</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Environment Tag</DialogTitle>
            <DialogDescription>Create a new environment tag for categorizing clusters</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={newTag.name}
                onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                placeholder="e.g., Prod, Dev, Test"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <div className="flex gap-2">
                <Input
                  id="color"
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
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={newTag.description}
                onChange={(e) => setNewTag({ ...newTag, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Environment Tag</DialogTitle>
            <DialogDescription>Update the environment tag details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={editTag.name}
                onChange={(e) => setEditTag({ ...editTag, name: e.target.value })}
                placeholder="e.g., Prod, Dev, Test"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-color">Color</Label>
              <div className="flex gap-2">
                <Input
                  id="edit-color"
                  type="color"
                  value={editTag.color}
                  onChange={(e) => setEditTag({ ...editTag, color: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  value={editTag.color}
                  onChange={(e) => setEditTag({ ...editTag, color: e.target.value })}
                  placeholder="#3b82f6"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={editTag.description}
                onChange={(e) => setEditTag({ ...editTag, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Tags Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Tags to Clusters</DialogTitle>
            <DialogDescription>Select clusters and tags to assign</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Select Clusters</Label>
              <div className="border rounded-lg p-4 max-h-48 overflow-y-auto space-y-2">
                {clusters.map((cluster) => (
                  <label key={cluster.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={selectedClusters.has(cluster.id)}
                      onChange={(e) => {
                        const newSet = new Set(selectedClusters);
                        if (e.target.checked) {
                          newSet.add(cluster.id);
                        } else {
                          newSet.delete(cluster.id);
                        }
                        setSelectedClusters(newSet);
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{cluster.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Select Tags</Label>
              <div className="border rounded-lg p-4 max-h-48 overflow-y-auto space-y-2">
                {tags.map((tag) => (
                  <label key={tag.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={selectedTags.has(tag.id)}
                      onChange={(e) => {
                        const newSet = new Set(selectedTags);
                        if (e.target.checked) {
                          newSet.add(tag.id);
                        } else {
                          newSet.delete(tag.id);
                        }
                        setSelectedTags(newSet);
                      }}
                      className="rounded"
                    />
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="text-sm">{tag.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignTags}>
              Assign Tags
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

