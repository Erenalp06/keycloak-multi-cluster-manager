import { useState } from 'react';
import { GroupDetail } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExternalLink, Search, Loader2 } from 'lucide-react';

interface GroupTableProps {
  groups: GroupDetail[];
  loading: boolean;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onGroupClick: (group: GroupDetail) => void;
  clusterBaseUrl: string;
  realm: string;
}

export default function GroupTable({
  groups,
  loading,
  searchTerm,
  onSearchChange,
  onGroupClick,
  clusterBaseUrl,
  realm,
}: GroupTableProps) {
  const filteredGroups = groups.filter(group =>
    group.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.path?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (filteredGroups.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-500">
        {groups.length === 0 ? 'No groups found' : 'No groups match your search'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search groups..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 pl-8 text-xs"
        />
      </div>
      
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Name</TableHead>
              <TableHead className="text-xs">Path</TableHead>
              <TableHead className="text-xs">Realm Roles</TableHead>
              <TableHead className="text-xs">Client Roles</TableHead>
              <TableHead className="text-xs w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGroups.map((group) => (
              <TableRow
                key={group.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => onGroupClick(group)}
              >
                <TableCell className="text-xs font-medium">{group.name || '-'}</TableCell>
                <TableCell className="text-xs">{group.path || '-'}</TableCell>
                <TableCell className="text-xs">
                  {group.realmRoles && group.realmRoles.length > 0
                    ? `${group.realmRoles.length} role(s)`
                    : '-'}
                </TableCell>
                <TableCell className="text-xs">
                  {group.clientRoles && Object.keys(group.clientRoles).length > 0
                    ? `${Object.keys(group.clientRoles).length} client(s)`
                    : '-'}
                </TableCell>
                <TableCell className="text-xs">
                  <a
                    href={`${clusterBaseUrl}/admin/${realm || 'master'}/console/#/${realm || 'master'}/groups/${group.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

