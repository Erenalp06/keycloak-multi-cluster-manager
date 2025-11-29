import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Save, Globe, Bell, Database, Info, Users, UserCog } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Settings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // Mock save - in real app, this would call an API
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Settings</h1>
        <p className="text-sm text-gray-600">Configure your application preferences</p>
      </div>

      {/* Settings Grid - 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* General Settings */}
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-blue-300">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-gray-500" />
              <CardTitle className="text-base font-semibold text-gray-900">General</CardTitle>
            </div>
            <CardDescription className="text-xs text-gray-500 mt-1">
              Basic application settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Configure general application preferences and behavior.</p>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-blue-300">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-gray-500" />
              <CardTitle className="text-base font-semibold text-gray-900">Appearance</CardTitle>
            </div>
            <CardDescription className="text-xs text-gray-500 mt-1">
              Customize the look and feel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Customize theme, language, and display preferences.</p>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-blue-300">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-gray-500" />
              <CardTitle className="text-base font-semibold text-gray-900">Notifications</CardTitle>
            </div>
            <CardDescription className="text-xs text-gray-500 mt-1">
              Configure notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Manage email alerts and notification settings.</p>
          </CardContent>
        </Card>

        {/* Advanced */}
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-blue-300">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-gray-500" />
              <CardTitle className="text-base font-semibold text-gray-900">Advanced</CardTitle>
            </div>
            <CardDescription className="text-xs text-gray-500 mt-1">
              Advanced configuration options
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Configure logging, caching, and advanced features.</p>
          </CardContent>
        </Card>

        {/* User Management (Admin only) */}
        {user?.role === 'admin' && (
          <>
            <Card 
              onClick={() => navigate('/users')}
              className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-blue-300"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-gray-500" />
                  <CardTitle className="text-base font-semibold text-gray-900">Users</CardTitle>
                </div>
                <CardDescription className="text-xs text-gray-500 mt-1">
                  Manage application users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">View and manage application users and their permissions.</p>
              </CardContent>
            </Card>

            <Card 
              onClick={() => navigate('/roles')}
              className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-blue-300"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <UserCog className="h-5 w-5 text-gray-500" />
                  <CardTitle className="text-base font-semibold text-gray-900">Roles</CardTitle>
                </div>
                <CardDescription className="text-xs text-gray-500 mt-1">
                  Manage application roles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Configure roles and permissions for the application.</p>
              </CardContent>
            </Card>
          </>
        )}

        {/* About */}
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-blue-300">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-gray-500" />
              <CardTitle className="text-base font-semibold text-gray-900">About</CardTitle>
            </div>
            <CardDescription className="text-xs text-gray-500 mt-1">
              Application information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Version</span>
                <span className="font-medium text-gray-900">1.0.3</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">License</span>
                <span className="font-medium text-gray-900">MIT</span>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Save Button */}
      <div className="flex justify-end mt-6">
        <Button
          onClick={handleSave}
          className="bg-[#4a5568] hover:bg-[#374151] text-white text-sm h-9"
        >
          <Save className="mr-1.5 h-4 w-4" />
          {saved ? 'Saved!' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}

