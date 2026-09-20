import React, { useState, useEffect } from 'react';
import { X, Key, ShieldCheck, Globe, Server, Eye, EyeOff } from 'lucide-react';
import { updateCredential, type CredentialData } from '../api';

interface EditCredentialModalProps {
  isOpen: boolean;
  credential: CredentialData | null;
  decryptedPayload: Record<string, any> | null;
  onClose: () => void;
  onSuccess: (updated: CredentialData, newPayload: Record<string, any>) => void;
}

export const EditCredentialModal: React.FC<EditCredentialModalProps> = ({
  isOpen,
  credential,
  decryptedPayload,
  onClose,
  onSuccess,
}) => {
  const [credentialType, setCredentialType] = useState<'web_ui_login' | 'backend_login'>('web_ui_login');
  const [label, setLabel] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (credential && isOpen) {
      setLabel(credential.label || '');
      
      const type = credential.credential_type === 'backend_login' || credential.credential_type === 'ssh' || credential.credential_type === 'database'
        ? 'backend_login'
        : 'web_ui_login';
      setCredentialType(type);

      if (decryptedPayload) {
        setHost(decryptedPayload.url || decryptedPayload.host || decryptedPayload.ip_address || '');
        setPort(decryptedPayload.port != null ? String(decryptedPayload.port) : '');
        setUsername(decryptedPayload.username || '');
        setPassword(decryptedPayload.password || decryptedPayload.secret || '');
      } else {
        setHost('');
        setPort('');
        setUsername('');
        setPassword('');
      }
      setShowPassword(false);
      setError(null);
    }
  }, [credential, decryptedPayload, isOpen]);

  if (!isOpen || !credential) return null;

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
      // Preserve any additional fields that were originally in decryptedPayload
      const payloadObj: Record<string, any> = { ...(decryptedPayload || {}) };
      
      if (host.trim()) {
        payloadObj.url = host.trim();
        // clean up alternate keys if present
        delete payloadObj.host;
        delete payloadObj.ip_address;
      } else {
        delete payloadObj.url;
        delete payloadObj.host;
        delete payloadObj.ip_address;
      }

      if (port.trim()) {
        payloadObj.port = Number(port) || port.trim();
      } else {
        delete payloadObj.port;
      }

      if (username.trim()) {
        payloadObj.username = username.trim();
      } else {
        delete payloadObj.username;
      }

      if (password) {
        payloadObj.password = password;
        delete payloadObj.secret;
      } else {
        delete payloadObj.password;
        delete payloadObj.secret;
      }

      const updated = await updateCredential(credential.id!, {
        label: label.trim(),
        credential_type: credentialType,
        payload: payloadObj,
      });

      onSuccess(updated, payloadObj);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to update encrypted credential');
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
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Edit Credential</h3>
              <p className="text-xs text-slate-400">Decrypted & Audited Access</p>
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
          {/* Security & Audit notice banner */}
          <div className="flex items-start space-x-2 px-3 py-2.5 bg-blue-50 text-blue-900 text-xs rounded-lg border border-blue-200">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              <strong>Decrypted & Audited:</strong> Secret fields are decrypted for your session. Modifying and saving will re-encrypt with <strong>AES-256-GCM</strong> and record an update log.
            </span>
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
                    ? 'border-blue-500 bg-blue-50/60 text-blue-900 font-semibold ring-1 ring-blue-500'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Globe className={`w-4 h-4 ${credentialType === 'web_ui_login' ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className="text-xs">Web UI Login</span>
              </button>

              <button
                type="button"
                onClick={() => setCredentialType('backend_login')}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex items-center space-x-2.5 ${
                  credentialType === 'backend_login'
                    ? 'border-blue-500 bg-blue-50/60 text-blue-900 font-semibold ring-1 ring-blue-500'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Server className={`w-4 h-4 ${credentialType === 'backend_login' ? 'text-blue-600' : 'text-slate-400'}`} />
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
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Password / Secret
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>{showPassword ? 'Hide' : 'Reveal'}</span>
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
              />
            </div>
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
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-xs transition-all cursor-pointer"
            >
              {isSubmitting ? 'Encrypting & Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCredentialModal;
