import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Server, LayoutDashboard, LogOut, User as UserIcon, Shield, Activity } from 'lucide-react';
import { logout, getMe } from '../api';

export const Navbar = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    getMe()
      .then(user => setCurrentUser(user))
      .catch(() => {
        // Fallback if me endpoint is unavailable
        setCurrentUser({ username: 'admin' });
      });
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Deployments', path: '/deployments', icon: Server },
  ];

  return (
    <nav className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand & Navigation Links */}
          <div className="flex items-center space-x-8">
            <NavLink to="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/30 group-hover:bg-blue-500 transition-colors">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-lg tracking-tight">FieldOps</span>
                <span className="hidden sm:inline-block ml-2 text-xs font-medium px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50">
                  v1.0
                </span>
              </div>
            </NavLink>

            <div className="flex space-x-1">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = item.path === '/' 
                  ? location.pathname === '/' 
                  : location.pathname.startsWith(item.path);

                return (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    className={`flex items-center space-x-2 px-3.5 py-2 rounded-md text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-slate-800 text-blue-400 border border-slate-700/60 shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>

          {/* Right: User Info & Actions */}
          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-2 text-xs bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 px-2.5 py-1 rounded-full">
              <Activity className="w-3 h-3 animate-pulse" />
              <span>API Live</span>
            </div>

            <div className="flex items-center space-x-3 pl-2 border-l border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div className="hidden md:block text-left text-xs">
                  <p className="font-semibold text-slate-200">
                    {currentUser?.username || 'admin'}
                  </p>
                  <p className="text-slate-400 flex items-center space-x-1">
                    <Shield className="w-2.5 h-2.5 text-blue-400" />
                    <span>Admin</span>
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                title="Log out"
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-red-950/40 hover:text-red-300 hover:border-red-800/50 border border-slate-700/80 rounded-md transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
