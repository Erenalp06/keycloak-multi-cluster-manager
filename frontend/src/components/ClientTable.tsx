import { useState } from 'react';
import { ClientDetail } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExternalLink, Search, Loader2, Key } from 'lucide-react';

interface ClientTableProps {
  clients: ClientDetail[];
  loading: boolean;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onClientClick: (client: ClientDetail) => void;
  onAssignRoleClick: (client: ClientDetail) => void;
  clusterBaseUrl: string;
  realm: string;
}

export default function ClientTable({
  clients,
  loading,
  searchTerm,
  onSearchChange,
  onClientClick,
  onAssignRoleClick,
  clusterBaseUrl,
  realm,
}: ClientTableProps) {
  const filteredClients = clients.filter(client =>
    client.clientId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (filteredClients.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-500">
        {clients.length === 0 ? 'No clients found' : 'No clients match your search'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search clients..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 pl-8 text-xs"
        />
      </div>
      
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Client ID</TableHead>
              <TableHead className="text-xs">Name</TableHead>
              <TableHead className="text-xs">Protocol</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.map((client) => (
              <TableRow
                key={client.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => onClientClick(client)}
              >
                <TableCell className="text-xs font-medium">{client.clientId || '-'}</TableCell>
                <TableCell className="text-xs">{client.name && client.name !== client.clientId ? client.name : '-'}</TableCell>
                <TableCell className="text-xs">{client.protocol || '-'}</TableCell>
                <TableCell className="text-xs">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    client.enabled
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {client.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </TableCell>
                <TableCell className="text-xs">
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAssignRoleClick(client);
                      }}
                      className="h-7 px-2 text-xs"
                    >
                      <Key className="h-3.5 w-3.5" />
                    </Button>
                    <a
                      href={`${clusterBaseUrl}/admin/${realm || 'master'}/console/#/${realm || 'master'}/clients/${client.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

