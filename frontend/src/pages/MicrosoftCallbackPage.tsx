import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Server, AlertCircle } from 'lucide-react';
import { loginWithMicrosoft } from '../api';

export const MicrosoftCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const code = searchParams.get('code');
    const authError = searchParams.get('error_description') || searchParams.get('error');

    if (authError) {
      setError(`Microsoft Authentication Error: ${authError}`);
      return;
    }

    if (!code) {
      setError('Authorization code missing from Microsoft callback URI.');
      return;
    }

    let isSubscribed = true;

    const processLogin = async () => {
      try {
        const redirectUri = window.location.origin + window.location.pathname;
        const data = await loginWithMicrosoft(code, redirectUri);
        if (!isSubscribed) return;
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        navigate('/');
      } catch (err: any) {
        if (!isSubscribed) return;
        const detail = err?.response?.data?.detail || err?.message || 'Microsoft authentication failed.';
        setError(detail);
      }
    };

    processLogin();

    return () => {
      isSubscribed = false;
    };
  }, [searchParams, navigate]);

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
          Authenticating with Microsoft Entra ID...
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-slate-800 text-center">
          {error ? (
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-red-950/80 text-red-400 border border-red-800/60 mb-2">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="text-sm font-medium text-red-300 bg-red-950/40 p-3 rounded-lg border border-red-800/50">
                {error}
              </div>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all"
              >
                Return to Login
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 space-y-4">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-slate-300 font-medium">Verifying organization credentials...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MicrosoftCallbackPage;
