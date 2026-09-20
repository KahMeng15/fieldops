import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  MapPin, 
  Server, 
  Plus, 
  Search, 
  Globe, 
  Mail, 
  ChevronRight,
  Trash2,
  Pencil,
  MoreVertical
} from 'lucide-react';
import { getCompanies, deleteCompany, type Company } from '../api';
import NewCompanyModal from '../components/NewCompanyModal';
import EditCompanyModal from '../components/EditCompanyModal';

export const CompaniesPage: React.FC = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const data = await getCompanies(search || undefined);
      setCompanies(data || []);
    } catch (err) {
      console.error('Failed to load companies', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCompany = async (companyId: string, companyName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${companyName}"? This will also remove its associated locations and deployments.`)) {
      return;
    }
    try {
      setDeletingId(companyId);
      await deleteCompany(companyId);
      setCompanies(prev => prev.filter(c => c.id !== companyId));
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to delete company. You may not have sufficient permissions.');
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [search]);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Companies & Locations</h1>
              <p className="text-sm text-slate-500">
                Organize client organizations, configure their datacenter locations, and track deployment records over time.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setIsCompanyModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Company</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-md w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search companies by name or description..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-xs"
          />
        </div>

        <div className="text-xs font-medium text-slate-500">
          Showing <span className="font-semibold text-slate-800">{companies.length}</span> companies
        </div>
      </div>

      {/* Companies Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3" />
          <p className="text-sm">Loading companies and locations...</p>
        </div>
      ) : companies.length === 0 ? (
        <div className="py-16 text-center bg-white border border-slate-200 rounded-xl p-8 shadow-xs">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800 mb-1">No Companies Found</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-5">
            {search ? 'No companies match your search criteria.' : 'Create a company first, then set up its datacenter locations and deployment records.'}
          </p>
          <button
            type="button"
            onClick={() => setIsCompanyModalOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Company</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {companies.map((company) => (
            <div
              key={company.id}
              onClick={() => navigate(`/companies/${company.id}`)}
              className="bg-white border border-slate-200 hover:border-blue-300 rounded-xl shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group cursor-pointer"
            >
              <div className="p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900 group-hover:text-blue-600 text-base line-clamp-1 transition-colors">
                      {company.name}
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      Added {new Date(company.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* 3-dots Menu */}
                  <div className="relative inline-block text-left shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(prev => prev === company.id ? null : company.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Company options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {openMenuId === company.id && (
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 mt-1 w-40 rounded-lg bg-white shadow-lg border border-slate-200 py-1 z-30 animate-in fade-in zoom-in-95 duration-100"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null);
                            setEditingCompany(company);
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center space-x-2 cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5 text-slate-500" />
                          <span>Edit Company</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null);
                            handleDeleteCompany(company.id, company.name);
                          }}
                          disabled={deletingId === company.id}
                          className="w-full text-left px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center space-x-2 cursor-pointer border-t border-slate-100 disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          <span>Delete Company</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                {company.description && (
                  <p className="text-xs text-slate-600 line-clamp-2">
                    {company.description}
                  </p>
                )}

                {/* Contact metadata */}
                <div className="space-y-1.5 text-xs text-slate-500 pt-2 border-t border-slate-100">
                  {company.contact_email && (
                    <div className="flex items-center space-x-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{company.contact_email}</span>
                    </div>
                  )}
                  {company.website && (
                    <div className="flex items-center space-x-2 truncate">
                      <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <a 
                        href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                        onClick={(e) => e.stopPropagation()}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-blue-600 hover:underline"
                      >
                        {company.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                </div>

                {/* Metrics Stats */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div className="flex items-center space-x-1.5 text-slate-500 text-[11px] mb-0.5">
                      <MapPin className="w-3 h-3 text-emerald-600" />
                      <span>Locations</span>
                    </div>
                    <div className="text-base font-bold text-slate-900">
                      {company.locations_count || 0}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div className="flex items-center space-x-1.5 text-slate-500 text-[11px] mb-0.5">
                      <Server className="w-3 h-3 text-blue-600" />
                      <span>Deployments</span>
                    </div>
                    <div className="text-base font-bold text-slate-900">
                      {company.deployments_count || 0}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="text-[11px] font-medium text-slate-400">
                  {company.locations_count ? `${company.locations_count} ${company.locations_count === 1 ? 'Location' : 'Locations'}` : 'No locations yet'}
                </span>
                <span className="font-semibold text-blue-600 group-hover:text-blue-700 flex items-center space-x-1 group-hover:translate-x-0.5 transition-all">
                  <span>View Locations</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <NewCompanyModal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        onSuccess={() => {
          fetchCompanies();
        }}
      />

      <EditCompanyModal
        isOpen={Boolean(editingCompany)}
        company={editingCompany}
        onClose={() => setEditingCompany(null)}
        onSuccess={(updated) => {
          setCompanies(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
        }}
      />
    </div>
  );
};

export default CompaniesPage;
