import React, { useState, useEffect } from 'react';
import { 
  X, 
  History, 
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
  ArrowRight,
  Fingerprint
} from 'lucide-react';
import { getDeploymentActivity, type ActivityLogItem } from '../api';
import { getExternalIpSync } from '../utils/clientIp';

const getDisplayIp = (ip?: string) => {
  if (!ip || ip === '127.0.0.1' || ip.startsWith('172.22.') || ip.startsWith('172.17.') || ip.startsWith('172.18.') || ip.startsWith('172.19.')) {
    const ext = getExternalIpSync();
    if (ext) return ext;
  }
  return ip || '127.0.0.1';
};

interface DeploymentActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  deploymentId: string;
  customerName: string;
}

export const DeploymentActivityModal: React.FC<DeploymentActivityModalProps> = ({
  isOpen,
  onClose,
  deploymentId,
  customerName,
}) => {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getDeploymentActivity(deploymentId);
      setLogs(data || []);
      // Expand first log by default if exists
      if (data && data.length > 0) {
        setExpandedLogId(data[0].id);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load activity logs.');
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

  const filteredLogs = logs.filter(log => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const displayIp = getDisplayIp(log.ip_address).toLowerCase();
    return (
      log.item_name?.toLowerCase().includes(q) ||
      log.user_name?.toLowerCase().includes(q) ||
      displayIp.includes(q) ||
      log.device_info?.toLowerCase().includes(q) ||
      log.browser_info?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center space-x-2">
                <span>Deployment Activity Log</span>
              </h3>
              <p className="text-xs text-slate-400 truncate max-w-md">
                Audit trail and change history for <span className="text-slate-200 font-medium">{customerName}</span>
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
              placeholder="Search by editor, field, IP, or browser..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <span className="text-xs text-slate-500 font-medium">
              {filteredLogs.length} {filteredLogs.length === 1 ? 'event' : 'events'}
            </span>
            <button
              type="button"
              onClick={fetchLogs}
              disabled={isLoading}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Refresh Activity"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400 text-sm space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500" />
              <p>Loading activity logs...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs">
              {error}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <History className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-medium text-slate-700">No activity logs found</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchQuery ? 'No log entries match your search query.' : 'Activity logs will record automatically whenever changes are made to this deployment.'}
              </p>
            </div>
          ) : (
            filteredLogs.map(log => {
              const isExpanded = expandedLogId === log.id;
              const hasChanges = log.changes && Object.keys(log.changes).length > 0;

              return (
                <div
                  key={log.id}
                  className={`rounded-xl border transition-all overflow-hidden ${
                    isExpanded 
                      ? 'border-blue-300 bg-blue-50/20 shadow-xs ring-1 ring-blue-200' 
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  {/* Summary Bar (Always Visible) */}
                  <div
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="flex items-start space-x-3 min-w-0">
                      <button
                        type="button"
                        className="mt-0.5 text-slate-400 hover:text-slate-600 shrink-0"
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-blue-600" /> : <ChevronRight className="w-4 h-4" />}
                      </button>

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="font-semibold text-sm text-slate-900">
                            {log.item_name}
                          </span>
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
                          <span className="hidden sm:inline truncate">{log.device_info}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 rounded-lg transition-colors shrink-0"
                    >
                      {isExpanded ? 'Hide Details' : 'View Details'}
                    </button>
                  </div>

                  {/* Expanded Audit Details */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-1 border-t border-slate-100/80 space-y-4 text-xs animate-in fade-in duration-150">
                      {/* What Changed Diff Section */}
                      {hasChanges && (
                        <div className="space-y-2">
                          <div className="font-semibold text-slate-800 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                            <span>Field Changes</span>
                          </div>
                          <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 bg-white">
                            {Object.entries(log.changes || {}).map(([field, change]: any) => (
                              <div key={field} className="p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                <span className="font-semibold text-slate-700 capitalize min-w-36">
                                  {field.replace(/_/g, ' ')}:
                                </span>
                                <div className="flex items-center space-x-2 flex-1 min-w-0 font-mono">
                                  <span className="text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded truncate max-w-[200px]" title={String(change.old)}>
                                    {String(change.old ?? '(empty)')}
                                  </span>
                                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded truncate max-w-[200px]" title={String(change.new)}>
                                    {String(change.new ?? '(empty)')}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Forensic / Security Metadata Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {/* Editor Identity */}
                        <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1.5">
                          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>Editor Identity</span>
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
                            <span>IP: <strong className="font-mono">{getDisplayIp(log.ip_address)}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Raw User Agent & Audit ID */}
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

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span>Audit Log ID: <span className="font-mono">{log.id}</span></span>
                        <span>Action: <span className="font-mono font-medium text-slate-600">{log.action}</span></span>
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
            <ShieldAlert className="w-3.5 h-3.5 text-blue-600" />
            <span>Immutable audit trail recorded on server</span>
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

export default DeploymentActivityModal;
