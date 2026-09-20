import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Server, 
  LayoutDashboard, 
  LogOut, 
  User as UserIcon, 
  Shield, 
  Settings, 
  ChevronDown 
} from 'lucide-react';
import { logout, getMe } from '../api';

export const Navbar = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

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
              <span className="font-bold text-lg tracking-tight">FieldOps</span>
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

          {/* Right: User Menu Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-expanded={menuOpen}
              aria-haspopup="true"
              className="flex items-center space-x-2.5 px-3 py-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-800 border border-slate-700/70 hover:border-slate-600 text-slate-200 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-300">
                <UserIcon className="w-3.5 h-3.5" />
              </div>
              <div className="hidden md:block text-left text-xs">
                <p className="font-semibold text-slate-200 leading-tight">
                  {currentUser?.username || 'admin'}
                </p>
                <p className="text-[11px] text-slate-400 flex items-center space-x-1 leading-tight">
                  <Shield className="w-2.5 h-2.5 text-blue-400" />
                  <span>Admin</span>
                </p>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} />
            </button>

            {menuOpen && (
              <div 
                role="menu"
                aria-orientation="vertical"
                className="absolute right-0 mt-2 w-48 rounded-lg bg-slate-800 border border-slate-700 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="px-3.5 py-2 border-b border-slate-700/80 md:hidden">
                  <p className="text-xs font-semibold text-slate-200">
                    {currentUser?.username || 'admin'}
                  </p>
                  <p className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5">
                    <Shield className="w-2.5 h-2.5 text-blue-400" />
                    <span>Admin</span>
                  </p>
                </div>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/settings/user');
                  }}
                  className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700/70 hover:text-white transition-colors text-left cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>User Settings</span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/settings/admin');
                  }}
                  className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700/70 hover:text-white transition-colors text-left cursor-pointer"
                >
                  <Shield className="w-4 h-4 text-slate-400" />
                  <span>Admin Settings</span>
                </button>

                <div className="border-t border-slate-700/80 my-1" />

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-medium text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-colors text-left cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-red-400" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
