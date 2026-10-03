import React, { useEffect, useState } from 'react';
import { X, GitMerge, AlertTriangle, Search, Loader2 } from 'lucide-react';
import { getCompanies, mergeCompany, type Company } from '../api';

interface MergeCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (targetId: string) => void;
  sourceCompany: Company;
}

const MergeCompanyModal: React.FC<MergeCompanyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  sourceCompany
}) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [targetCompanyId, setTargetCompanyId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCompanies();
      setSearch('');
      setTargetCompanyId('');
      setError(null);
      setIsConfirming(false);
    }
  }, [isOpen]);

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const data = await getCompanies();
      // Filter out the source company itself
      setCompanies(data.filter((c: Company) => c.id !== sourceCompany.id));
    } catch (err) {
      console.error(err);
      setError('Failed to load companies.');
    } finally {
      setLoading(false);
    }
  };

  const handleMergeClick = () => {
    if (!targetCompanyId) return;
    setIsConfirming(true);
  };

  const handleExecuteMerge = async () => {
    const targetComp = companies.find(c => c.id === targetCompanyId);
    if (!targetComp) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await mergeCompany(sourceCompany.id, targetCompanyId);
      onSuccess(res.target_id);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.detail || 'Failed to merge companies.');
      setIsConfirming(false); // Go back to selection on error
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
              <GitMerge className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Merge Company</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isConfirming ? (
          <>
            <div className="px-6 py-6 space-y-6">
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex gap-3 text-sm">
                <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                <div className="text-orange-800">
                  <p className="font-bold mb-1">Warning: Destructive Action</p>
                  <p>You are moving all data from <strong className="font-extrabold">{sourceCompany.name}</strong> into another company. The original company will be deleted.</p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-semibold text-slate-700">Select Target Company to Merge Into</label>
                
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search companies..."
                    className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto bg-slate-50">
                  {loading ? (
                    <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin mb-2" />
                      <span className="text-xs">Loading companies...</span>
                    </div>
                  ) : filteredCompanies.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">No matching companies found.</div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {filteredCompanies.map(c => (
                        <label 
                          key={c.id} 
                          className={`flex items-center space-x-3 px-4 py-3 cursor-pointer hover:bg-white transition-colors ${targetCompanyId === c.id ? 'bg-blue-50/50' : ''}`}
                        >
                          <input
                            type="radio"
                            name="targetCompany"
                            value={c.id}
                            checked={targetCompanyId === c.id}
                            onChange={() => setTargetCompanyId(c.id)}
                            className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                          />
                          <div>
                            <div className="text-sm font-semibold text-slate-800">{c.name}</div>
                            <div className="text-[11px] text-slate-500">{(c.locations || []).length} locations</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="text-xs font-medium text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
                  {error}
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMergeClick}
                disabled={!targetCompanyId || isSubmitting}
                className="flex items-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>Continue</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="px-6 py-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-sm">
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
                
                <h3 className="text-lg font-bold text-red-800 text-center mb-4">CRITICAL WARNING</h3>
                
                <div className="text-red-900 space-y-3">
                  <p className="text-center">
                    You are about to permanently merge <strong className="font-extrabold">{sourceCompany.name}</strong> into <strong className="font-extrabold">{companies.find(c => c.id === targetCompanyId)?.name}</strong>.
                  </p>
                  
                  <ul className="list-disc pl-5 space-y-1">
                    <li>All deployments, locations, and contacts will be transferred.</li>
                    <li><strong className="font-bold">{sourceCompany.name}</strong> will be permanently deleted.</li>
                  </ul>
                  
                  <p className="font-bold text-center pt-2">
                    This action CANNOT be undone. Proceed?
                  </p>
                </div>
              </div>

              {error && (
                <div className="text-xs font-medium text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
                  {error}
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setIsConfirming(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-xl transition-colors cursor-pointer"
                disabled={isSubmitting}
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleExecuteMerge}
                disabled={isSubmitting}
                className="flex items-center space-x-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Merging...</span>
                  </>
                ) : (
                  <>
                    <GitMerge className="w-4 h-4" />
                    <span>Yes, Permanently Merge</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MergeCompanyModal;
