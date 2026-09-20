import React, { useState } from 'react';
import { X, Key, ShieldCheck, Globe, Server } from 'lucide-react';
import { createCredential } from '../api';

interface NewCredentialModalProps {
  isOpen: boolean;
  deploymentId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewCredentialModal: React.FC<NewCredentialModalProps> = ({
  isOpen,
  deploymentId,
  onClose,
  onSuccess,
}) => {
  const [credentialType, setCredentialType] = useState<'web_ui_login' | 'backend_login'>('web_ui_login');
  const [label, setLabel] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      setError('Label is required');
      return;
    }
    if (!username.trim() && !password.trim()) {
      setError('Please provide at least a username or password');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payloadObj: Record<string, any> = {};
      if (host.trim()) payloadObj.url = host.trim();
      if (port.trim()) payloadObj.port = Number(port) || port.trim();
      if (username.trim()) payloadObj.username = username.trim();
      if (password) payloadObj.password = password;

      await createCredential({
        deployment_id: deploymentId,
        credential_type: credentialType,
        label: label.trim(),
        payload: payloadObj,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to save encrypted credential');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Add Encrypted Credential</h3>
              <p className="text-xs text-slate-400">Secure AES-256 encrypted storage</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-center space-x-2 px-3 py-2 bg-emerald-50 text-emerald-800 text-xs rounded-lg border border-emerald-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Encrypted at rest using <strong>AES-256-GCM</strong></span>
          </div>

          {error && (
            <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          {/* Credential Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Credential Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCredentialType('web_ui_login')}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex items-center space-x-2.5 ${
                  credentialType === 'web_ui_login'
                    ? 'border-emerald-500 bg-emerald-50/60 text-emerald-900 font-semibold ring-1 ring-emerald-500'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Globe className={`w-4 h-4 ${credentialType === 'web_ui_login' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className="text-xs">Web UI Login</span>
              </button>

              <button
                type="button"
                onClick={() => setCredentialType('backend_login')}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex items-center space-x-2.5 ${
                  credentialType === 'backend_login'
                    ? 'border-emerald-500 bg-emerald-50/60 text-emerald-900 font-semibold ring-1 ring-emerald-500'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Server className={`w-4 h-4 ${credentialType === 'backend_login' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className="text-xs">Backend Login</span>
              </button>
            </div>
          </div>

          {/* Label */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Label *
            </label>
            <input
              type="text"
              required
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder={credentialType === 'web_ui_login' ? 'e.g. Admin Portal' : 'e.g. SSH Gateway / Database'}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* URL / Host */}
          <div className={credentialType === 'backend_login' ? 'grid grid-cols-3 gap-2' : ''}>
            <div className={credentialType === 'backend_login' ? 'col-span-2' : ''}>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                {credentialType === 'web_ui_login' ? 'IP address and port' : 'IP Address'}
              </label>
              <input
                type="text"
                value={host}
                onChange={e => setHost(e.target.value)}
                placeholder={credentialType === 'web_ui_login' ? 'e.g. 192.168.1.100:8080 or https://192.168.1.100:8080' : '10.0.1.5 or srv.internal'}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            {credentialType === 'backend_login' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Port
                </label>
                <input
                  type="text"
                  value={port}
                  onChange={e => setPort(e.target.value)}
                  placeholder="22"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            )}
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="e.g. admin or ubuntu"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-xs transition-all cursor-pointer"
            >
              {isSubmitting ? 'Encrypting...' : 'Save Credential'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewCredentialModal;
