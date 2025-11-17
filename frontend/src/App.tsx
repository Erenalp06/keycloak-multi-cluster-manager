import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import ClusterList from './pages/ClusterList';
import ClusterDetail from './pages/ClusterDetail';
import RoleDiff from './pages/RoleDiff';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';

function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-[#f5f5f7]">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clusters" element={<ClusterList />} />
            <Route path="/clusters/:id" element={<ClusterDetail />} />
            <Route path="/diff" element={<RoleDiff />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

