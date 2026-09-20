import React, { useEffect, useState } from 'react';
import { X, MessageSquare, Clock, User, Archive, Search, Filter, Layers } from 'lucide-react';
import { getPhaseRemarks, type PhaseRemarkItem } from '../api';

interface PhaseRemarksHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  deploymentId: string;
  customerName: string;
  statusOptions: string[];
}

export const PhaseRemarksHistoryModal: React.FC<PhaseRemarksHistoryModalProps> = ({
  isOpen,
  onClose,
  deploymentId,
  customerName,
  statusOptions,
}) => {
  const [remarks, setRemarks] = useState<PhaseRemarkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRemarks = async () => {
    try {
      setIsLoading(true);
      const data = await getPhaseRemarks(deploymentId);
      setRemarks(data || []);
    } catch (err) {
      console.error('Failed to load phase remarks', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRemarks();
      setSelectedPhaseFilter('ALL');
      setSearchQuery('');
    }
  }, [isOpen, deploymentId]);

  if (!isOpen) return null;

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

  const filteredRemarks = remarks.filter(r => {
    const matchPhase = selectedPhaseFilter === 'ALL' || r.phase === selectedPhaseFilter;
    const matchSearch = !searchQuery.trim() || 
      r.remark.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.author_name && r.author_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      r.phase.toLowerCase().includes(searchQuery.toLowerCase());
    return matchPhase && matchSearch;
  });

  const getPhaseColor = (phase: string) => {
    switch (phase.toLowerCase()) {
      case 'completed':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'on hold':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'cancelled':
        return 'bg-red-50 text-red-800 border-red-200';
      case 'in progress':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'planning':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      case 'pre-poc':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Phase Remarks & History Archive</h3>
              <p className="text-xs text-slate-400">Historical notes across all deployment stages • {customerName}</p>
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

        {/* Filter and Search Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center gap-3 shrink-0">
          <div className="relative w-full sm:flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search remarks, author, or keyword..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedPhaseFilter}
              onChange={e => setSelectedPhaseFilter(e.target.value)}
              className="w-full sm:w-auto px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer text-slate-800"
            >
              <option value="ALL">All Phases ({remarks.length})</option>
              {statusOptions.map(st => {
                const count = remarks.filter(r => r.phase === st).length;
                return (
                  <option key={st} value={st}>
                    {st} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Remarks List */}
        <div className="p-6 overflow-y-auto space-y-4 divide-y divide-slate-100 flex-1">
          {isLoading ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Loading stage remarks history...
            </div>
          ) : filteredRemarks.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Archive className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">No remarks found</p>
              <p className="text-xs text-slate-400 mt-1">
                {searchQuery || selectedPhaseFilter !== 'ALL'
                  ? 'Try clearing the search query or phase filter.'
                  : 'Remarks recorded during each deployment stage will be permanently preserved here.'}
              </p>
            </div>
          ) : (
            filteredRemarks.map((item, idx) => (
              <div key={item.id} className={`${idx === 0 ? 'pt-0' : 'pt-4'} space-y-2`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${getPhaseColor(item.phase)}`}>
                      <Layers className="w-3 h-3 mr-1 opacity-70" />
                      {item.phase}
                    </span>
                    {item.is_archived && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                        <Archive className="w-2.5 h-2.5 mr-0.5 text-slate-400" />
                        Archived
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-3 text-xs text-slate-500">
                    <span className="flex items-center space-x-1 font-medium text-slate-700">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>{item.author_name || 'System / Member'}</span>
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="flex items-center space-x-1 text-slate-400 text-[11px]">
                      <Clock className="w-3 h-3" />
                      <span>{formatDateTime(item.created_at)}</span>
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50/80 p-3.5 rounded-lg border border-slate-200/80 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
                  {item.remark}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>{filteredRemarks.length} remark(s) displayed</span>
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

export default PhaseRemarksHistoryModal;
