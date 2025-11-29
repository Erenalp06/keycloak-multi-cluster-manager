import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, User, Lock, CheckCircle2 } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const dataStreamsContainerRef = useRef<HTMLDivElement>(null);

  // Data streams animation
  useEffect(() => {
    const container = dataStreamsContainerRef.current;
    if (!container) return;

    const createDataStream = () => {
      const stream = document.createElement('div');
      stream.className = 'data-stream';
      stream.style.left = Math.random() * 100 + '%';
      stream.style.animationDelay = Math.random() * 3 + 's';
      stream.style.animationDuration = (Math.random() * 2 + 2) + 's';
      container.appendChild(stream);

      setTimeout(() => stream.remove(), 5000);
    };

    const interval = setInterval(createDataStream, 800);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setIsAuthenticated(false);

    try {
      await login(username, password);
      setIsAuthenticated(true);
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Login failed');
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0e27]">
      {/* Left Side - Animated Server Room */}
      <div className="flex-1 relative overflow-hidden bg-gradient-to-br from-[#0a0e27] via-[#1a1f3a] to-[#0f1429]">
        {/* Grid Overlay */}
        <div 
          className="absolute inset-0 opacity-30 animate-gridMove"
          style={{
            backgroundImage: `
              linear-gradient(rgba(100, 150, 255, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(100, 150, 255, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />

        {/* Company Branding */}
        <div className="absolute top-12 left-16 z-10">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white to-blue-300 bg-clip-text text-transparent">
            Keyclock
          </h1>
          <p className="text-sm text-white/50 font-normal tracking-wider uppercase">
            Enterprise Cluster Management
          </p>
        </div>

        {/* Server Room */}
        <div className="absolute inset-0 flex items-center justify-center perspective-1200">
          {/* Server Rack 1 */}
          <div className="w-32 h-[400px] bg-gradient-to-b from-[#1e2642] to-[#151a2e] border border-blue-500/20 rounded-lg shadow-2xl shadow-black/50 relative mx-10">
            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 via-transparent to-blue-500/5 rounded-lg" />
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 border-b border-blue-500/10">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500 shadow-lg shadow-green-500/50 animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-green-500 shadow-lg shadow-green-500/50 animate-pulse" style={{ animationDelay: '0.5s' }} />
                  <div className="w-2 h-2 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50 animate-pulse" style={{ animationDelay: '1s' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Server Rack 2 */}
          <div className="w-32 h-[400px] bg-gradient-to-b from-[#1e2642] to-[#151a2e] border border-blue-500/20 rounded-lg shadow-2xl shadow-black/50 relative mx-10">
            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 via-transparent to-blue-500/5 rounded-lg" />
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 border-b border-blue-500/10">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50 animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-green-500 shadow-lg shadow-green-500/50 animate-pulse" style={{ animationDelay: '0.5s' }} />
                  <div className="w-2 h-2 rounded-full bg-orange-500 shadow-lg shadow-orange-500/50 animate-pulse" style={{ animationDelay: '1s' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Overlay */}
        <div className="absolute bottom-12 left-16 flex gap-10 z-10">
          <div>
            <div className="text-xs uppercase tracking-wider text-white/40 mb-1">Active Clusters</div>
            <div className="text-2xl font-semibold text-white">247</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-white/40 mb-1">Uptime</div>
            <div className="text-2xl font-semibold text-white">99.9%</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-white/40 mb-1">Nodes</div>
            <div className="text-2xl font-semibold text-white">1,842</div>
          </div>
        </div>

        {/* Data Streams Container */}
        <div ref={dataStreamsContainerRef} className="absolute inset-0 pointer-events-none" />
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center bg-white relative">
        <div className="w-[440px] animate-fadeInUp">
          {/* Logo Section */}
          <div className="flex items-center gap-3.5 mb-12">
            <div className="w-12 h-12 bg-[#1a1f3a] rounded-lg flex items-center justify-center text-white text-2xl font-bold tracking-tight">
              K
            </div>
            <div>
              <h2 className="text-[22px] font-bold text-[#0a0e27] tracking-tight">Keyclock</h2>
              <p className="text-[13px] text-slate-500 mt-0.5">Multi-Cluster Management</p>
            </div>
          </div>

          {/* Login Header */}
          <div className="mb-8">
            <h1 className="text-[28px] font-bold text-[#0a0e27] mb-2 tracking-tight">Welcome Back</h1>
            <p className="text-[15px] text-slate-500">Enter your credentials to access your account</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            {/* Username Field */}
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Username</label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full px-4 py-3 border-[1.5px] border-slate-200 rounded-lg text-[15px] transition-all focus:outline-none focus:border-[#1a1f3a] focus:ring-4 focus:ring-[#1a1f3a]/8"
                  required
                  autoFocus
                />
                <User className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 border-[1.5px] border-slate-200 rounded-lg text-[15px] transition-all focus:outline-none focus:border-[#1a1f3a] focus:ring-4 focus:ring-[#1a1f3a]/8"
                  required
                />
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
            </div>

            {/* Form Options */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-[18px] h-[18px] cursor-pointer accent-[#1a1f3a]"
                />
                <label htmlFor="remember" className="text-sm text-slate-600 cursor-pointer">
                  Remember me
                </label>
              </div>
              <a href="#" className="text-sm font-medium text-[#1a1f3a] hover:text-[#0a0e27] transition-colors">
                Forgot password?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || isAuthenticated}
              className={`w-full py-3.5 rounded-lg font-semibold text-[15px] tracking-wide transition-all ${
                isAuthenticated
                  ? 'bg-green-500 text-white cursor-not-allowed'
                  : loading
                  ? 'bg-[#0f1429] text-white cursor-not-allowed'
                  : 'bg-[#1a1f3a] text-white hover:bg-[#0f1429] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#1a1f3a]/30 active:translate-y-0'
              }`}
            >
              {isAuthenticated ? (
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Authenticated
                </span>
              ) : loading ? (
                'Signing In...'
              ) : (
                'Sign In'
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center my-8 text-slate-400 text-[13px]">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="px-4">OR</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Register Link */}
            <div className="text-center text-sm text-slate-600">
              Don't have an account?{' '}
              <Link to="/register" className="font-semibold text-[#1a1f3a] hover:text-[#0a0e27] transition-colors">
                Request Access
              </Link>
            </div>

            {/* Security Badge */}
            <div className="flex items-center justify-center gap-1.5 mt-8 pt-6 border-t border-slate-200 text-xs text-slate-500">
              <span>🔒</span>
              <span>Secured with enterprise-grade encryption</span>
            </div>
          </form>
        </div>
      </div>

      <style>{`
        .data-stream {
          position: absolute;
          width: 2px;
          height: 60px;
          background: linear-gradient(to bottom, transparent, #3b82f6, transparent);
          animation: dataFlow 3s linear infinite;
          opacity: 0.6;
        }
      `}</style>
    </div>
  );
}
