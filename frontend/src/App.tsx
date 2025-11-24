import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import ClusterList from './pages/ClusterList';
import ClusterDetail from './pages/ClusterDetail';
import RoleDiff from './pages/RoleDiff';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Users from './pages/Users';
import Roles from './pages/Roles';
import Login from './pages/Login';
import Register from './pages/Register';
import PermissionAnalyzer from './pages/PermissionAnalyzer';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <div className="flex min-h-screen bg-[#f5f5f7]">
                  <Sidebar />
                  <main className="flex-1 overflow-auto">
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/clusters" element={<ClusterList />} />
                      <Route path="/clusters/:id" element={<ClusterDetail />} />
                      <Route path="/clusters/:id/permission-analyzer" element={<PermissionAnalyzer />} />
                      <Route path="/diff" element={<RoleDiff />} />
                      <Route path="/users" element={<Users />} />
                      <Route path="/roles" element={<Roles />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </main>
                </div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

