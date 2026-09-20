import React, { useState } from 'react';
import { X, Key, ShieldCheck } from 'lucide-react';
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
  const [credentialType, setCredentialType] = useState('ssh');
  const [label, setLabel] = useState('');
  
  // Dynamic fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [secretKey, setSecretKey] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      setError('Label is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payloadObj: Record<string, any> = {};
      if (username) payloadObj.username = username;
      if (password) payloadObj.password = password;
      if (host) payloadObj.host = host;
      if (port) payloadObj.port = Number(port) || port;
      if (secretKey) payloadObj.secret_key = secretKey;

      // Ensure at least one secret field is provided
      if (Object.keys(payloadObj).length === 0) {
        payloadObj.value = password || secretKey || 'configured';
      }

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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <Key className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-base">Store Encrypted Credential</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-center space-x-2 px-3 py-2 bg-emerald-50 text-emerald-800 text-xs rounded-lg border border-emerald-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Encrypted at rest using <strong>AES-256-GCM</strong> with hardware master key</span>
          </div>

          {error && (
            <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Credential Type
              </label>
              <div className="relative">
                <select
                  value={credentialType}
                  onChange={e => setCredentialType(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="ssh">SSH Key / Bastion</option>
                  <option value="database">Database</option>
                  <option value="web_portal">Web Admin Portal</option>
                  <option value="api_key">API Key / Token</option>
                  <option value="root_password">System Password</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Label *
              </label>
              <input
                type="text"
                required
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="e.g. Bastion Host Key"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {(credentialType === 'ssh' || credentialType === 'database' || credentialType === 'web_portal') && (
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Host / URL
                </label>
                <input
                  type="text"
                  value={host}
                  onChange={e => setHost(e.target.value)}
                  placeholder="192.168.1.10 or host.domain"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Port
                </label>
                <input
                  type="text"
                  value={port}
                  onChange={e => setPort(e.target.value)}
                  placeholder={credentialType === 'ssh' ? '22' : '5432'}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Username / Identity
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="e.g. ubuntu or admin"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Password / Passphrase
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          {(credentialType === 'api_key' || credentialType === 'ssh') && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                {credentialType === 'ssh' ? 'SSH Private Key / Certificate' : 'Secret Key / Token'}
              </label>
              <textarea
                rows={3}
                value={secretKey}
                onChange={e => setSecretKey(e.target.value)}
                placeholder={credentialType === 'ssh' ? '-----BEGIN OPENSSH PRIVATE KEY-----...' : 'Bearer sk_live_...'}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-sm transition-all"
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
