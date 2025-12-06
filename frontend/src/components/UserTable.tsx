import { useState } from 'react';
import { UserDetail } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExternalLink, Search, Loader2 } from 'lucide-react';

interface UserTableProps {
  users: UserDetail[];
  loading: boolean;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onUserClick: (user: UserDetail) => void;
  clusterBaseUrl: string;
  realm: string;
}

export default function UserTable({
  users,
  loading,
  searchTerm,
  onSearchChange,
  onUserClick,
  clusterBaseUrl,
  realm,
}: UserTableProps) {
  const filteredUsers = users.filter(user =>
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (filteredUsers.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-500">
        {users.length === 0 ? 'No users found' : 'No users match your search'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 pl-8 text-xs"
        />
      </div>
      
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Username</TableHead>
              <TableHead className="text-xs">Email</TableHead>
              <TableHead className="text-xs">Name</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Roles</TableHead>
              <TableHead className="text-xs w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow
                key={user.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => onUserClick(user)}
              >
                <TableCell className="text-xs font-medium">{user.username || '-'}</TableCell>
                <TableCell className="text-xs">{user.email || '-'}</TableCell>
                <TableCell className="text-xs">
                  {[user.firstName, user.lastName].filter(Boolean).join(' ') || '-'}
                </TableCell>
                <TableCell className="text-xs">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    user.enabled
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {user.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </TableCell>
                <TableCell className="text-xs">
                  {user.realmRoles && user.realmRoles.length > 0
                    ? `${user.realmRoles.length} role(s)`
                    : '-'}
                </TableCell>
                <TableCell className="text-xs">
                  <a
                    href={`${clusterBaseUrl}/admin/${realm || 'master'}/console/#/${realm || 'master'}/users/${user.id}`}
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

