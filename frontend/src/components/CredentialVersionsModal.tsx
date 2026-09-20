import React, { useEffect, useState } from 'react';
import { 
  X, 
  History, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  Copy, 
  Check, 
  Clock, 
  User, 
  KeyRound
} from 'lucide-react';
import { 
  getCredentialVersions, 
  revealCredentialVersion, 
  restoreCredentialVersion, 
  type CredentialData, 
  type CredentialVersionItem 
} from '../api';

interface CredentialVersionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  credential: CredentialData | null;
  onRestored?: (updatedCred: CredentialData) => void;
}

export const CredentialVersionsModal: React.FC<CredentialVersionsModalProps> = ({
  isOpen,
  onClose,
  credential,
  onRestored,
}) => {
  const [versions, setVersions] = useState<CredentialVersionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revealedVersions, setRevealedVersions] = useState<Record<string, any>>({});
  const [revealingVersionId, setRevealingVersionId] = useState<string | null>(null);
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchVersions = async () => {
    if (!credential?.id) return;
    try {
      setIsLoading(true);
      const data = await getCredentialVersions(credential.id);
      setVersions(data || []);
    } catch (err) {
      console.error('Failed to load credential versions', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && credential?.id) {
      fetchVersions();
      setRevealedVersions({});
      setCopiedKey(null);
    }
  }, [isOpen, credential?.id]);

  if (!isOpen || !credential) return null;

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  const handleToggleRevealVersion = async (versionId: string) => {
    if (revealedVersions[versionId]) {
      setRevealedVersions(prev => {
        const copy = { ...prev };
        delete copy[versionId];
        return copy;
      });
      return;
    }

    try {
      setRevealingVersionId(versionId);
      const res = await revealCredentialVersion(versionId);
      setRevealedVersions(prev => ({
        ...prev,
        [versionId]: res.credential,
      }));
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to decrypt historical credential. Access was unauthorized or audit log failed.');
    } finally {
      setRevealingVersionId(null);
    }
  };

  const handleRestoreVersion = async (version: CredentialVersionItem) => {
    const confirmed = window.confirm(
      `Are you sure you want to restore "${credential.label}" to Version ${version.version_number}? ` +
      `This will recover the previous password/fields and create an audited restoration record.`
    );
    if (!confirmed) return;

    try {
      setRestoringVersionId(version.id);
      const updatedCred = await restoreCredentialVersion(version.id);
      alert(`Credential successfully restored to Version ${version.version_number}!`);
      if (onRestored) {
        onRestored(updatedCred);
      }
      await fetchVersions();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to restore credential version');
    } finally {
      setRestoringVersionId(null);
    }
  };

  const handleCopy = (text: string, keyIdentifier: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyIdentifier);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const formatPayloadKey = (key: string) => {
    switch (key.toLowerCase()) {
      case 'url':
        return 'IP Address and Port';
      case 'host':
        return 'IP Address';
      case 'port':
        return 'Port';
      case 'username':
        return 'Username';
      case 'password':
        return 'Password / Secret';
      default:
        return key.replace(/_/g, ' ');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Credential Version History & Recovery</h3>
              <p className="text-xs text-slate-400">
                Encrypted historical revisions for "{credential.label}"
              </p>
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

        {/* Security Notice */}
        <div className="p-4 bg-emerald-50/70 border-b border-emerald-100 flex items-start space-x-2.5 text-xs text-emerald-900 shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>AES-256-GCM Encrypted History:</strong> All past credentials are stored encrypted. 
            Decrypting or revealing any previous version triggers an <strong>audited access event</strong> recording your user account, IP address, and timestamp.
          </div>
        </div>

        {/* Versions List */}
        <div className="p-6 overflow-y-auto space-y-4 divide-y divide-slate-100 flex-1">
          {isLoading ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Loading credential revisions...
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <KeyRound className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">No previous versions recorded</p>
              <p className="text-xs text-slate-400 mt-1">
                Any future edits to this credential will automatically snapshot historical versions here for recovery.
              </p>
            </div>
          ) : (
            versions.map((ver, idx) => {
              const isRevealed = Boolean(revealedVersions[ver.id]);
              const payloadData = revealedVersions[ver.id];
              const isCurrent = idx === 0;

              return (
                <div key={ver.id} className={`${idx === 0 ? 'pt-0' : 'pt-4'} space-y-3`}>
                  {/* Version header */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        isCurrent 
                          ? 'bg-blue-50 text-blue-800 border-blue-200' 
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        Version {ver.version_number} {isCurrent && '(Active)'}
                      </span>
                      <span className="text-xs font-semibold text-slate-800">
                        {ver.label}
                      </span>
                      {ver.change_summary && (
                        <span className="text-[11px] text-slate-400 hidden sm:inline">
                          • {ver.change_summary}
                        </span>
                      )}
                    </div>

                    {/* Action buttons: Reveal and Restore */}
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleToggleRevealVersion(ver.id)}
                        disabled={revealingVersionId === ver.id}
                        className={`inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium rounded-md border transition-all cursor-pointer ${
                          isRevealed
                            ? 'bg-slate-800 text-white border-slate-700 hover:bg-slate-700'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {isRevealed ? (
                          <>
                            <EyeOff className="w-3 h-3" />
                            <span>Hide</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3" />
                            <span>{revealingVersionId === ver.id ? 'Decrypting...' : 'Reveal Secret'}</span>
                          </>
                        )}
                      </button>

                      {!isCurrent && (
                        <button
                          type="button"
                          onClick={() => handleRestoreVersion(ver)}
                          disabled={restoringVersionId === ver.id}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-all cursor-pointer"
                          title="Revert credential to this version"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>{restoringVersionId === ver.id ? 'Restoring...' : 'Restore'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Metadata line */}
                  <div className="flex items-center space-x-3 text-xs text-slate-500">
                    <span className="flex items-center space-x-1">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>{ver.changed_by_name || 'System'}</span>
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="flex items-center space-x-1 text-slate-400 text-[11px]">
                      <Clock className="w-3 h-3" />
                      <span>{formatDateTime(ver.created_at)}</span>
                    </span>
                  </div>

                  {/* Masked vs Revealed content */}
                  {!isRevealed ? (
                    <div className="bg-slate-100/70 border border-slate-200 px-3 py-2 rounded-lg text-xs font-mono text-slate-400 tracking-widest flex items-center justify-between">
                      <span>••••••••••••••••••••••••••••••••</span>
                      <span className="text-[11px] font-sans text-slate-400 tracking-normal">Encrypted AES-256</span>
                    </div>
                  ) : (
                    <div className="bg-slate-900 text-slate-100 p-3.5 rounded-lg text-xs font-mono border border-slate-800 space-y-2 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-[11px] text-slate-400">
                        <span className="font-sans font-semibold text-emerald-400 flex items-center space-x-1">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Decrypted Version {ver.version_number} (Audited)</span>
                        </span>
                        <button
                          onClick={() => handleCopy(JSON.stringify(payloadData, null, 2), `ver-all-${ver.id}`)}
                          className="flex items-center space-x-1 text-slate-300 hover:text-white transition-colors cursor-pointer"
                        >
                          {copiedKey === `ver-all-${ver.id}` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy All</span>
                            </>
                          )}
                        </button>
                      </div>

                      {typeof payloadData === 'object' && payloadData !== null ? (
                        <div className="space-y-1.5 pt-0.5 font-sans">
                          {Object.entries(payloadData).map(([key, val]) => (
                            <div key={key} className="flex items-center justify-between py-1 px-2 rounded bg-slate-800/80 hover:bg-slate-800">
                              <div className="flex items-center space-x-2 truncate mr-2">
                                <span className="text-slate-400 text-xs">{formatPayloadKey(key)}:</span>
                                <span className="text-slate-100 font-semibold font-mono text-xs truncate">{String(val)}</span>
                              </div>
                              <button
                                onClick={() => handleCopy(String(val), `${ver.id}-${key}`)}
                                title={`Copy ${key}`}
                                className="text-slate-400 hover:text-white p-1 shrink-0 cursor-pointer"
                              >
                                {copiedKey === `${ver.id}-${key}` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="py-1 text-slate-200">{String(payloadData)}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>{versions.length} revision(s) preserved</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CredentialVersionsModal;
