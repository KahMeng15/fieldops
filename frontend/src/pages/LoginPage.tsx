import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Server, Lock, User as UserIcon, ArrowRight, ShieldCheck } from 'lucide-react';
import { login, getAuthConfig } from '../api';

export const LoginPage = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [authConfig, setAuthConfig] = useState<{
    microsoft_enabled: boolean;
    azure_client_id: string;
    azure_tenant_id: string;
    azure_redirect_uri: string;
  } | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    getAuthConfig()
      .then(cfg => setAuthConfig(cfg))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login({ username, password });
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      navigate('/');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleMicrosoftLogin = () => {
    const tenantId = authConfig?.azure_tenant_id;
    const clientId = authConfig?.azure_client_id;
    const redirectUri = encodeURIComponent(
      authConfig?.azure_redirect_uri || `${window.location.origin}/auth/microsoft/callback`
    );

    if (!tenantId || !clientId) {
      setError('Microsoft SSO is not configured on the server. Please set AZURE_TENANT_ID and AZURE_CLIENT_ID.');
      return;
    }

    window.location.href = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&response_mode=query&scope=openid%20profile%20email%20User.Read`;
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-600/30 mb-4">
          <Server className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          FieldOps
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Sign in to manage client deployments and secure credentials
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-slate-800">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-950/50 border border-red-800/60 text-red-300 text-xs text-center font-medium">
              {error}
            </div>
          )}

          {/* Microsoft SSO Button */}
          {authConfig?.microsoft_enabled && (
            <div className="mb-6">
              <button
                type="button"
                onClick={handleMicrosoftLogin}
                className="w-full flex items-center justify-center space-x-3 py-2.5 px-4 rounded-xl text-sm font-semibold text-slate-100 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 transition-all shadow-md active:scale-[0.99]"
              >
                <svg className="w-5 h-5" viewBox="0 0 23 23" fill="none">
                  <rect x="1" y="1" width="10" height="10" fill="#F25022" />
                  <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
                  <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
                  <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
                </svg>
                <span>Sign in with Microsoft 365</span>
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-slate-900 px-3 text-slate-500 font-semibold">Or local account</span>
                </div>
              </div>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="admin"
                  className="block w-full pl-10 pr-3 py-2.5 text-sm bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3 py-2.5 text-sm bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all shadow-md shadow-blue-600/20"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Credential Hint */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center space-x-1.5 text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Default credentials pre-filled</span>
            </span>
            <span className="font-mono text-blue-400">admin / admin123</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
