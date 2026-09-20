import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  Plus, 
  ArrowLeft, 
  ExternalLink, 
  Globe, 
  Mail, 
  Phone, 
  Calendar, 
  Package, 
  Tag, 
  User,
  Users,
  AlertCircle,
  Trash2,
  Pencil,
  MoreVertical,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { 
  getCompany, 
  deleteCompany,
  deleteLocation,
  getLocationDeployments, 
  deleteCompanyContact,
  type Company, 
  type CompanyLocation, 
  type CompanyContact,
  type DeploymentData 
} from '../api';
import NewLocationModal from '../components/NewLocationModal';
import EditLocationModal from '../components/EditLocationModal';
import EditCompanyModal from '../components/EditCompanyModal';
import NewDeploymentModal from '../components/NewDeploymentModal';
import ContactModal from '../components/ContactModal';

export const CompanyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<CompanyLocation | null>(null);
  const [collapsedLocations, setCollapsedLocations] = useState<Record<string, boolean>>({});
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Deployments mapped by locationId -> DeploymentData[]
  const [locationDeployments, setLocationDeployments] = useState<Record<string, DeploymentData[]>>({});
  const [loadingDeployments, setLoadingDeployments] = useState<Record<string, boolean>>({});

  // Modals
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<CompanyContact | null>(null);
  const [deploymentModalLocation, setDeploymentModalLocation] = useState<CompanyLocation | null>(null);

  const fetchCompanyData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const comp = await getCompany(id);
      setCompany(comp);

      // Fetch deployment records for each location
      if (comp.locations && comp.locations.length > 0) {
        for (const loc of comp.locations) {
          fetchDeploymentsForLocation(loc.id);
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load company details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDeploymentsForLocation = async (locationId: string) => {
    try {
      setLoadingDeployments(prev => ({ ...prev, [locationId]: true }));
      const deps = await getLocationDeployments(locationId);
      setLocationDeployments(prev => ({ ...prev, [locationId]: deps || [] }));
    } catch (err) {
      console.error(`Failed to fetch deployments for location ${locationId}`, err);
    } finally {
      setLoadingDeployments(prev => ({ ...prev, [locationId]: false }));
    }
  };

  useEffect(() => {
    fetchCompanyData();
  }, [id]);

  useEffect(() => {
    const handleDocClick = () => {
      setOpenMenuId(null);
    };
    if (openMenuId) {
      document.addEventListener('click', handleDocClick);
    }
    return () => {
      document.removeEventListener('click', handleDocClick);
    };
  }, [openMenuId]);

  const toggleLocation = (locId: string) => {
    setCollapsedLocations(prev => ({
      ...prev,
      [locId]: !prev[locId],
    }));
  };

  const handleDeleteCompany = async () => {
    if (!company) return;
    if (!window.confirm(`Are you sure you want to permanently delete "${company.name}"? This will also delete all its datacenter locations and deployments.`)) {
      return;
    }
    try {
      await deleteCompany(company.id);
      navigate('/companies');
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to delete company. You may not have sufficient permissions.');
    }
  };

  const handleDeleteLocation = async (locId: string, locName: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete location "${locName}" and its deployments?`)) {
      return;
    }
    try {
      await deleteLocation(locId);
      fetchCompanyData();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to delete location.');
    }
  };

  const handleDeleteContact = async (contactId: string, contactName: string) => {
    if (!company) return;
    if (!window.confirm(`Are you sure you want to delete contact "${contactName}"?`)) return;
    try {
      await deleteCompanyContact(company.id, contactId);
      setCompany(prev => prev ? {
        ...prev,
        contacts: (prev.contacts || []).filter(c => c.id !== contactId)
      } : null);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to delete contact.');
    }
  };

  const handleContactSuccess = (saved: CompanyContact) => {
    setCompany(prev => {
      if (!prev) return null;
      const currentContacts = prev.contacts || [];
      const exists = currentContacts.some(c => c.id === saved.id);
      return {
        ...prev,
        contacts: exists 
          ? currentContacts.map(c => c.id === saved.id ? saved : c)
          : [...currentContacts, saved]
      };
    });
  };

  const getStatusBadge = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'in progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'planning':
      case 'pre-poc':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'staging':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'completed':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3" />
        <p className="text-sm">Loading company profile and locations...</p>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">Company Not Found</h2>
        <p className="text-sm text-slate-500">{error || 'The requested company does not exist.'}</p>
        <Link
          to="/companies"
          className="inline-flex items-center space-x-1 text-sm font-medium text-blue-600 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Companies</span>
        </Link>
      </div>
    );
  }

  const locations = company.locations || [];
  const contacts = company.contacts || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-200 pb-12">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <Link
          to="/companies"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Companies</span>
        </Link>
      </div>

      {/* Company Header Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-7 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {company.name}
            </h1>

            {company.description && (
              <p className="text-sm text-slate-600 max-w-2xl">
                {company.description}
              </p>
            )}
          </div>

          {/* Quick Metrics and Menu */}
          <div className="flex items-center space-x-3 shrink-0">
            <div className="bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 text-center min-w-20">
              <div className="text-[11px] font-medium text-slate-500">Locations</div>
              <div className="text-lg font-bold text-slate-900">{locations.length}</div>
            </div>
            <div className="bg-blue-50 px-3.5 py-2 rounded-xl border border-blue-200 text-center min-w-24">
              <div className="text-[11px] font-medium text-blue-700">Deployments</div>
              <div className="text-lg font-bold text-blue-900">{company.deployments_count || 0}</div>
            </div>
            <div className="bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200 text-center min-w-20">
              <div className="text-[11px] font-medium text-emerald-700">Contacts</div>
              <div className="text-lg font-bold text-emerald-900">{contacts.length}</div>
            </div>

            {/* Company Action Menu at the very right */}
            <div className="relative inline-block text-left">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId(prev => prev === 'company' ? null : 'company');
                }}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-slate-200"
                title="Company options"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {openMenuId === 'company' && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 mt-1 w-44 rounded-lg bg-white shadow-lg border border-slate-200 py-1 z-30 animate-in fade-in zoom-in-95 duration-100"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setOpenMenuId(null);
                      setIsEditModalOpen(true);
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
                      handleDeleteCompany();
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center space-x-2 cursor-pointer border-t border-slate-100"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    <span>Delete Company</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Website & Profile info bar */}
        {company.website && (
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-100 text-xs text-slate-600">
            <a
              href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-1.5 text-blue-600 hover:underline"
            >
              <Globe className="w-4 h-4 text-slate-400" />
              <span>{company.website.replace(/^https?:\/\//, '')}</span>
            </a>
          </div>
        )}
      </div>

      {/* Company Contacts Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span>Company Contacts</span>
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {contacts.length}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingContact(null);
              setIsContactModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Contact</span>
          </button>
        </div>

        {contacts.length === 0 ? (
          <div className="py-8 text-center bg-white border border-dashed border-slate-200 rounded-xl p-6 shadow-2xs">
            <Users className="w-9 h-9 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-700 mb-0.5">No Contacts Added</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-3">
              Keep track of key technical leads, account executives, and escalation contacts for {company.name}.
            </p>
            <button
              type="button"
              onClick={() => {
                setEditingContact(null);
                setIsContactModalOpen(true);
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add First Contact</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contacts.map((contact) => (
              <div 
                key={contact.id}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between relative group"
              >
                <div className="space-y-3">
                  {/* Top row: Avatar, Name, Position, and 3-dots Menu */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start space-x-3">
                      <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold text-xs shrink-0">
                        {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'C'}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm leading-snug">
                          {contact.name}
                        </h4>
                        {contact.position && (
                          <span className="inline-block mt-0.5 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                            {contact.position}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 3-dots Menu for Contact */}
                    <div className="relative inline-block text-left shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(prev => prev === `contact-${contact.id}` ? null : `contact-${contact.id}`);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                        title="Contact options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {openMenuId === `contact-${contact.id}` && (
                        <div 
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 mt-1 w-36 rounded-lg bg-white shadow-lg border border-slate-200 py-1 z-30 animate-in fade-in zoom-in-95 duration-100"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              setEditingContact(contact);
                              setIsContactModalOpen(true);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center space-x-2 cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5 text-slate-500" />
                            <span>Edit Contact</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              handleDeleteContact(contact.id, contact.name);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center space-x-2 cursor-pointer border-t border-slate-100"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            <span>Delete Contact</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Email & Phone */}
                  <div className="space-y-1 text-xs text-slate-600 pt-1">
                    {contact.email && (
                      <div className="flex items-center space-x-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <a 
                          href={`mailto:${contact.email}`}
                          className="text-slate-700 hover:text-blue-600 hover:underline truncate"
                        >
                          {contact.email}
                        </a>
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <a 
                          href={`tel:${contact.phone}`}
                          className="text-slate-700 hover:text-blue-600 hover:underline"
                        >
                          {contact.phone}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {contact.notes && (
                    <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 line-clamp-2">
                      {contact.notes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Locations Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <span>Locations & Deployment Records</span>
          </h2>

          <button
            type="button"
            onClick={() => setIsLocationModalOpen(true)}
            className="flex items-center space-x-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Location</span>
          </button>
        </div>

        {locations.length === 0 ? (
          <div className="py-14 text-center bg-white border border-slate-200 rounded-xl p-8 shadow-xs">
            <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800 mb-1">No Locations Configured</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-4">
              Add a datacenter, office, or facility location for {company.name} first, then start recording deployments inside it.
            </p>
            <button
              type="button"
              onClick={() => setIsLocationModalOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Location</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {locations.map((loc) => {
              const deps = locationDeployments[loc.id] || [];
              const isLoadingDeps = loadingDeployments[loc.id];
              const isCollapsed = Boolean(collapsedLocations[loc.id]);

              return (
                <div
                  key={loc.id}
                  className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden"
                >
                  {/* Location Header */}
                  <div className="px-6 py-4 bg-slate-50/90 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      {/* Collapse/Expand Toggle Chevron */}
                      <button
                        type="button"
                        onClick={() => toggleLocation(loc.id)}
                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors cursor-pointer"
                        title={isCollapsed ? "Expand location" : "Collapse location"}
                      >
                        {isCollapsed ? (
                          <ChevronRight className="w-5 h-5 text-slate-500" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-500" />
                        )}
                      </button>

                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span 
                            onClick={() => toggleLocation(loc.id)}
                            className="font-bold text-slate-900 text-base cursor-pointer hover:text-blue-600 transition-colors"
                          >
                            {loc.name}
                          </span>

                          {loc.datacenter_tier && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded">
                              {loc.datacenter_tier}
                            </span>
                          )}
                          {(loc.city || loc.country) && (
                            <span className="text-xs text-slate-500 flex items-center space-x-1">
                              <span>•</span>
                              <span>{[loc.city, loc.country].filter(Boolean).join(', ')}</span>
                            </span>
                          )}
                        </div>

                        {loc.address && (
                          <p className="text-xs text-slate-500">
                            {loc.address}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setDeploymentModalLocation(loc)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>New Deployment at this Location</span>
                      </button>

                      {/* Location Action Menu at the very right of the card */}
                      <div className="relative inline-block text-left">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(prev => prev === `loc-${loc.id}` ? null : `loc-${loc.id}`);
                          }}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer border border-slate-200 bg-white shadow-2xs"
                          title="Location options"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {openMenuId === `loc-${loc.id}` && (
                          <div 
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 mt-1 w-40 rounded-lg bg-white shadow-lg border border-slate-200 py-1 z-30 animate-in fade-in zoom-in-95 duration-100"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                setEditingLocation(loc);
                              }}
                              className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center space-x-2 cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5 text-slate-500" />
                              <span>Edit Location</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                handleDeleteLocation(loc.id, loc.name);
                              }}
                              className="w-full text-left px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center space-x-2 cursor-pointer border-t border-slate-100"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              <span>Delete Location</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Deployments List under this Location (Collapsible) */}
                  {!isCollapsed && (
                    <div className="p-6">
                      {isLoadingDeps ? (
                        <div className="py-8 text-center text-slate-400 text-xs">
                          Loading deployment records...
                        </div>
                      ) : deps.length === 0 ? (
                        <div className="py-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-lg p-4">
                          <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-xs text-slate-500 font-medium">
                            No deployment records recorded at {loc.name} yet.
                          </p>
                          <button
                            type="button"
                            onClick={() => setDeploymentModalLocation(loc)}
                            className="mt-2 text-xs font-semibold text-blue-600 hover:underline inline-flex items-center space-x-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Record First Deployment</span>
                          </button>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                                <th className="py-3 px-3">Deployed Product</th>
                                <th className="py-3 px-3">Deployment Date</th>
                                <th className="py-3 px-3">Account Owner</th>
                                <th className="py-3 px-3">Lifecycle Type</th>
                                <th className="py-3 px-3">Status</th>
                                <th className="py-3 px-3">Internal Group</th>
                                <th className="py-3 px-3 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                              {deps.map((dep) => {
                                const dateStr = dep.deployment_date 
                                  ? new Date(dep.deployment_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                                  : dep.created_at
                                  ? new Date(dep.created_at).toLocaleDateString()
                                  : 'N/A';

                                return (
                                  <tr key={dep.id} className="hover:bg-slate-50/60 transition-colors">
                                    {/* Deployed Product */}
                                    <td className="py-3 px-3 font-semibold text-slate-900">
                                      <div className="flex items-center space-x-2">
                                        <div className="w-7 h-7 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center shrink-0">
                                          <Package className="w-3.5 h-3.5" />
                                        </div>
                                        <div>
                                          <Link 
                                            to={`/deployments/${dep.id}`}
                                            className="font-semibold text-slate-900 hover:text-blue-600 transition-colors"
                                          >
                                            {dep.deployed_product || 'FieldOps Core Gateway'}
                                          </Link>
                                          {dep.notes && (
                                            <div className="text-[11px] text-slate-400 font-normal line-clamp-1">
                                              {dep.notes}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </td>

                                    {/* Deployment Date */}
                                    <td className="py-3 px-3 text-xs text-slate-600 whitespace-nowrap">
                                      <div className="flex items-center space-x-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                        <span className="font-medium text-slate-800">{dateStr}</span>
                                      </div>
                                    </td>

                                    {/* Account Owner */}
                                    <td className="py-3 px-3 text-xs text-slate-600 whitespace-nowrap">
                                      {dep.account_owner ? (
                                        <div className="flex items-center space-x-1.5">
                                          <User className="w-3.5 h-3.5 text-slate-400" />
                                          <span className="font-medium text-slate-800">{dep.account_owner}</span>
                                        </div>
                                      ) : (
                                        <span className="text-slate-400">—</span>
                                      )}
                                    </td>

                                    {/* Type */}
                                    <td className="py-3 px-3 whitespace-nowrap">
                                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                        <Tag className="w-3 h-3 text-slate-400" />
                                        <span>{dep.deployment_type || 'Deployment'}</span>
                                      </span>
                                    </td>

                                    {/* Status */}
                                    <td className="py-3 px-3 whitespace-nowrap">
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(dep.pre_poc_status)}`}>
                                        {dep.pre_poc_status || 'Active'}
                                      </span>
                                    </td>

                                    {/* Internal Group */}
                                    <td className="py-3 px-3 text-xs text-slate-600 whitespace-nowrap">
                                      {dep.internal_group_name || '—'}
                                    </td>

                                    {/* Actions */}
                                    <td className="py-3 px-3 text-right whitespace-nowrap">
                                      <div className="flex items-center justify-end">
                                        <Link
                                          to={`/deployments/${dep.id}`}
                                          className="inline-flex items-center space-x-1 text-xs font-semibold text-blue-600 hover:text-blue-800 px-2.5 py-1 rounded-md hover:bg-blue-50 transition-colors"
                                        >
                                          <span>Details</span>
                                          <ExternalLink className="w-3 h-3" />
                                        </Link>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <NewLocationModal
        isOpen={isLocationModalOpen}
        companyId={company.id}
        onClose={() => setIsLocationModalOpen(false)}
        onSuccess={() => {
          fetchCompanyData();
        }}
      />

      {deploymentModalLocation && (
        <NewDeploymentModal
          isOpen={Boolean(deploymentModalLocation)}
          defaultCompanyId={company.id}
          defaultLocationId={deploymentModalLocation.id}
          defaultCompanyName={company.name}
          defaultLocationName={deploymentModalLocation.name}
          onClose={() => setDeploymentModalLocation(null)}
          onSuccess={() => {
            fetchDeploymentsForLocation(deploymentModalLocation.id);
            fetchCompanyData();
          }}
        />
      )}

      <EditCompanyModal
        isOpen={isEditModalOpen}
        company={company}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={(updated) => {
          setCompany(prev => prev ? { ...prev, ...updated } : updated);
        }}
      />

      <EditLocationModal
        isOpen={Boolean(editingLocation)}
        location={editingLocation}
        onClose={() => setEditingLocation(null)}
        onSuccess={() => {
          fetchCompanyData();
        }}
      />

      {company && (
        <ContactModal
          isOpen={isContactModalOpen}
          companyId={company.id}
          companyName={company.name}
          contact={editingContact}
          onClose={() => {
            setIsContactModalOpen(false);
            setEditingContact(null);
          }}
          onSuccess={handleContactSuccess}
        />
      )}
    </div>
  );
};

export default CompanyDetailPage;
