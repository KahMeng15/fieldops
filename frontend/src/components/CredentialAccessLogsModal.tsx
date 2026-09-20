import React, { useState, useEffect } from 'react';
import { 
  X, 
  KeyRound, 
  User, 
  Calendar, 
  Laptop, 
  Globe, 
  ShieldAlert, 
  Copy, 
  Check, 
  Search, 
  RefreshCw, 
  ChevronDown, 
  ChevronRight,
  Eye,
  Plus,
  Trash2,
  Fingerprint
} from 'lucide-react';
import { getDeploymentCredentialLogs, type CredentialAccessLogItem } from '../api';
import { getExternalIpSync } from '../utils/clientIp';

const getDisplayIp = (ip?: string) => {
  if (!ip || ip === '127.0.0.1' || ip.startsWith('172.22.') || ip.startsWith('172.17.') || ip.startsWith('172.18.') || ip.startsWith('172.19.')) {
    const ext = getExternalIpSync();
    if (ext) return ext;
  }
  return ip || '127.0.0.1';
};

interface CredentialAccessLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  deploymentId: string;
  customerName: string;
}

export const CredentialAccessLogsModal: React.FC<CredentialAccessLogsModalProps> = ({
  isOpen,
  onClose,
  deploymentId,
  customerName,
}) => {
  const [logs, setLogs] = useState<CredentialAccessLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getDeploymentCredentialLogs(deploymentId);
      setLogs(data || []);
      if (data && data.length > 0) {
        setExpandedLogId(data[0].id);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load credential access logs.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen, deploymentId]);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const formatDate = (isoString: string | null) => {
    if (!isoString) return 'Unknown Date';
    const date = new Date(isoString);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatCredType = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'web_ui_login':
        return 'Web UI Login';
      case 'backend_login':
        return 'Backend Login';
      default:
        return type || 'Credential';
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'reveal_credential':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Eye className="w-3 h-3 text-emerald-600" />
            <span>Decrypted / Revealed</span>
          </span>
        );
      case 'create_credential':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <Plus className="w-3 h-3 text-blue-600" />
            <span>Created Credential</span>
          </span>
        );
      case 'delete_credential':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-800 border border-red-200">
            <Trash2 className="w-3 h-3 text-red-600" />
            <span>Deleted Credential</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
            <span>{action}</span>
          </span>
        );
    }
  };

  const filteredLogs = logs.filter(log => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const displayIp = getDisplayIp(log.ip_address).toLowerCase();
    return (
      log.item_name?.toLowerCase().includes(q) ||
      log.user_name?.toLowerCase().includes(q) ||
      displayIp.includes(q) ||
      log.device_info?.toLowerCase().includes(q) ||
      log.browser_info?.toLowerCase().includes(q) ||
      log.action?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/30 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center space-x-2">
                <span>Credential Access Logs</span>
              </h3>
              <p className="text-xs text-slate-400 truncate max-w-md">
                Forensic access and reveal audit history for <span className="text-slate-200 font-medium">{customerName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Action Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by credential name, accessor, IP, or browser..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <span className="text-xs text-slate-500 font-medium">
              {filteredLogs.length} {filteredLogs.length === 1 ? 'record' : 'records'}
            </span>
            <button
              type="button"
              onClick={fetchLogs}
              disabled={isLoading}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Refresh Logs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400 text-sm space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-500" />
              <p>Loading credential access logs...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs">
              {error}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <KeyRound className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-medium text-slate-700">No credential access logs found</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchQuery ? 'No access records match your search query.' : 'Access logs are recorded automatically whenever credentials are created, viewed, decrypted, or modified.'}
              </p>
            </div>
          ) : (
            filteredLogs.map(log => {
              const isExpanded = expandedLogId === log.id;

              return (
                <div
                  key={log.id}
                  className={`rounded-xl border transition-all overflow-hidden ${
                    isExpanded 
                      ? 'border-emerald-300 bg-emerald-50/20 shadow-xs ring-1 ring-emerald-200' 
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  {/* Summary Bar */}
                  <div
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="flex items-start space-x-3 min-w-0">
                      <button
                        type="button"
                        className="mt-0.5 text-slate-400 hover:text-slate-600 shrink-0"
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-emerald-600" /> : <ChevronRight className="w-4 h-4" />}
                      </button>

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="font-semibold text-sm text-slate-900">
                            {log.item_name}
                          </span>
                          {getActionBadge(log.action)}
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            <User className="w-3 h-3 text-slate-500" />
                            <span>{log.user_name}</span>
                          </span>
                          <span className="text-[11px] font-mono text-slate-500 bg-slate-100/80 px-1.5 py-0.5 rounded">
                            {getDisplayIp(log.ip_address)}
                          </span>
                        </div>

                        <div className="flex items-center space-x-3 text-xs text-slate-500">
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{formatDate(log.timestamp)}</span>
                          </span>
                          <span className="hidden sm:inline">•</span>
                          <span className="hidden sm:inline font-medium text-slate-600">
                            {formatCredType(log.credential_type)}
                          </span>
                          <span className="hidden sm:inline">•</span>
                          <span className="hidden sm:inline truncate">{log.device_info}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 rounded-lg transition-colors shrink-0"
                    >
                      {isExpanded ? 'Hide Details' : 'View Details'}
                    </button>
                  </div>

                  {/* Expanded Security & Forensic Details */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-1 border-t border-slate-100/80 space-y-4 text-xs animate-in fade-in duration-150">
                      {/* Grid of Security Metadata */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {/* Accessor Identity */}
                        <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1.5">
                          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>Accessor Identity</span>
                          </div>
                          <div className="text-slate-900 font-semibold">{log.user_name}</div>
                          {log.user_email && (
                            <div className="text-slate-500 text-[11px]">{log.user_email}</div>
                          )}
                          <div className="text-[11px] font-mono text-slate-400 truncate">
                            User ID: {log.user_id || 'system'}
                          </div>
                        </div>

                        {/* Device & Client Info */}
                        <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1.5">
                          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                            <Laptop className="w-3.5 h-3.5 text-slate-400" />
                            <span>Device & Browser</span>
                          </div>
                          <div className="text-slate-900 font-medium">{log.device_info}</div>
                          <div className="text-slate-600 text-[11px]">{log.browser_info}</div>
                          <div className="text-slate-500 text-[11px] flex items-center space-x-1">
                            <Globe className="w-3 h-3 text-slate-400" />
                            <span>Client IP: <strong className="font-mono">{getDisplayIp(log.ip_address)}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Raw User Agent */}
                      {log.user_agent && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                            <span className="flex items-center space-x-1">
                              <Fingerprint className="w-3.5 h-3.5 text-slate-400" />
                              <span>User Agent String</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(log.user_agent, `ua-${log.id}`)}
                              className="text-slate-500 hover:text-slate-800 flex items-center space-x-1 text-[11px] cursor-pointer"
                            >
                              {copiedKey === `ua-${log.id}` ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span className="text-emerald-600">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                          <div className="p-2.5 bg-slate-900 text-slate-200 rounded-lg font-mono text-[11px] break-all border border-slate-800 select-all">
                            {log.user_agent}
                          </div>
                        </div>
                      )}

                      {/* Notes & Audit ID */}
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-600 space-y-1">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Security Notes</div>
                        <p>{log.notes || `Authenticated ${log.action_label} event recorded.`}</p>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span>Audit Log ID: <span className="font-mono">{log.id}</span></span>
                        <span>Event: <span className="font-mono font-medium text-slate-600">{log.action}</span></span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center space-x-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" />
            <span>Encrypted access logging active & compliance monitored</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CredentialAccessLogsModal;
