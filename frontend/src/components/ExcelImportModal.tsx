import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  X, 
  Check, 
  AlertCircle, 
  Loader2, 
  CheckCircle2, 
  ArrowRight,
  Layers,
  Building2,
  Package
} from 'lucide-react';
import { 
  previewExcelImport, 
  executeExcelImport, 
  type ExcelImportPreviewResult, 
  type ExcelImportExecuteResult 
} from '../api';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [step, setStep] = useState<'upload' | 'mapping' | 'result'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewData, setPreviewData] = useState<ExcelImportPreviewResult | null>(null);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [defaults, setDefaults] = useState<Record<string, string>>({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [importResult, setImportResult] = useState<ExcelImportExecuteResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setErrorMsg(null);
    try {
      setIsLoadingPreview(true);
      const res = await previewExcelImport(selectedFile);
      setPreviewData(res);
      setMappings(res.auto_mappings || {});
      setDefaults({});
      setStep('mapping');
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail || 'Failed to read Excel file. Please ensure it is a valid .xlsx, .xls, or .csv file.');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleMappingChange = (fieldKey: string, excelHeader: string) => {
    setMappings(prev => {
      const updated = { ...prev };
      if (!excelHeader) {
        delete updated[fieldKey];
      } else {
        updated[fieldKey] = excelHeader;
      }
      return updated;
    });
  };

  const handleDefaultChange = (fieldKey: string, val: string) => {
    setDefaults(prev => {
      const updated = { ...prev };
      if (!val) {
        delete updated[fieldKey];
      } else {
        updated[fieldKey] = val;
      }
      return updated;
    });
  };

  const handleExecuteImport = async () => {
    if (!file) return;
    if (!mappings.customer_name && !defaults.customer_name) {
      setErrorMsg('Please map or set a default Customer Name before importing.');
      return;
    }

    try {
      setIsExecuting(true);
      setErrorMsg(null);
      const res = await executeExcelImport(file, mappings, defaults);
      setImportResult(res);
      setStep('result');
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail || 'Import failed. Please check your column mappings.');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Import Deployments & POCs from Excel / CSV
              </h3>
              <p className="text-xs text-slate-500">
                Upload your spreadsheet to bulk import deployments, POCs, and extra hardware items.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50/60 hover:bg-emerald-50/20 rounded-xl p-10 text-center transition-all cursor-pointer group"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.xlsx,.xls,.csv';
                  input.onchange = (e: any) => {
                    if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                  };
                  input.click();
                }}
              >
                {isLoadingPreview ? (
                  <div className="space-y-3 py-4">
                    <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
                    <p className="text-sm font-semibold text-slate-800">Reading Excel sheet & column headers...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        Click to select or drag & drop your Excel file here
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Supports <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-700">.xlsx</code>, <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-700">.xls</code>, or <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-700">.csv</code> files (e.g. testDep.xlsx or testPOC.xlsx)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: COLUMN MAPPING */}
          {step === 'mapping' && previewData && (
            <div className="space-y-6">
              <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-lg p-3.5 flex items-center justify-between text-xs text-emerald-900">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Detected <strong>{previewData.row_count} rows</strong> in <strong className="font-semibold">{file?.name}</strong>. Column headers have been auto-matched below.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStep('upload');
                    setPreviewData(null);
                  }}
                  className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer ml-2 shrink-0"
                >
                  Change File
                </button>
              </div>

              {/* Mapping Form */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Map Excel Headers to FieldOps Fields
                </h4>
                
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs divide-y divide-slate-100 text-xs">
                  <div className="p-2.5 bg-slate-100/70 font-semibold text-slate-600 grid grid-cols-12 gap-3 text-[11px] uppercase tracking-wider">
                    <div className="col-span-4">FieldOps Target Field</div>
                    <div className="col-span-4">Excel Column Header</div>
                    <div className="col-span-4">Fixed / Default Value Override</div>
                  </div>
                  {previewData.field_definitions.map((field) => {
                    const mappedValue = mappings[field.key] || '';
                    const defaultValue = defaults[field.key] || '';
                    return (
                      <div key={field.key} className="p-3 grid grid-cols-12 gap-3 items-center hover:bg-slate-50/60 transition-colors">
                        <div className="col-span-4 space-y-0.5">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-semibold text-slate-900">{field.label}</span>
                            {field.required && (
                              <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-1.5 py-0.5 rounded">Required</span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 block font-mono">{field.key}</span>
                        </div>

                        <div className="col-span-4">
                          <select
                            value={mappedValue}
                            onChange={(e) => handleMappingChange(field.key, e.target.value)}
                            className="w-full text-xs text-slate-800 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                          >
                            <option value="">-- Ignore / Do Not Import --</option>
                            {previewData.headers.map((h) => (
                              <option key={h} value={h}>
                                Column: "{h}"
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="col-span-4">
                          {field.key === 'deployment_type' ? (
                            <select
                              value={defaultValue}
                              onChange={(e) => handleDefaultChange(field.key, e.target.value)}
                              className="w-full text-xs text-slate-800 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                            >
                              <option value="">-- Auto-detect --</option>
                              <option value="Deployment">Deployment</option>
                              <option value="POC">POC</option>
                            </select>
                          ) : field.key === 'collected' ? (
                            <select
                              value={defaultValue}
                              onChange={(e) => handleDefaultChange(field.key, e.target.value)}
                              className="w-full text-xs text-slate-800 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                            >
                              <option value="">-- None --</option>
                              <option value="true">Yes / Physical (True)</option>
                              <option value="false">No (False)</option>
                            </select>
                          ) : field.key === 'device_status' ? (
                            <select
                              value={defaultValue}
                              onChange={(e) => handleDefaultChange(field.key, e.target.value)}
                              className="w-full text-xs text-slate-800 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                            >
                              <option value="">-- None --</option>
                              <option value="On-Prem">On-Prem</option>
                              <option value="Hosted">Hosted</option>
                              <option value="In Warehouse">In Warehouse</option>
                              <option value="Delivered">Delivered</option>
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={defaultValue}
                              onChange={(e) => handleDefaultChange(field.key, e.target.value)}
                              placeholder="Fixed default override..."
                              className="w-full text-xs text-slate-800 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Data Preview Accordion */}
              {previewData.preview_rows.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Live Sample Preview (First 3 Rows)
                  </h4>
                  <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-40">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                          <th className="p-2 border-r border-slate-200">Customer</th>
                          <th className="p-2 border-r border-slate-200">Sales / Owner</th>
                          <th className="p-2 border-r border-slate-200">Product</th>
                          <th className="p-2 border-r border-slate-200">Dates</th>
                          <th className="p-2 border-r border-slate-200">Device Status</th>
                          <th className="p-2">Notes / Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {previewData.preview_rows.slice(0, 3).map((row, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-2 border-r border-slate-200 font-semibold text-slate-900">
                              {row[mappings.customer_name] || '-'}
                            </td>
                            <td className="p-2 border-r border-slate-200">
                              {row[mappings.account_owner] || '-'}
                            </td>
                            <td className="p-2 border-r border-slate-200 font-medium text-blue-700">
                              {row[mappings.product_1] || 'Default Gateway'}
                            </td>
                            <td className="p-2 border-r border-slate-200 text-slate-500 font-mono text-[11px]">
                              {row[mappings.deployment_date] || row[mappings.kickoff_date] || '-'}
                            </td>
                            <td className="p-2 border-r border-slate-200 text-slate-600">
                              {row[mappings.device_status] || '-'}
                            </td>
                            <td className="p-2 text-slate-500 truncate max-w-xs">
                              {row[mappings.notes] || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: RESULT SUMMARY */}
          {step === 'result' && importResult && (
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-in zoom-in-50 duration-200">
                <Check className="w-8 h-8 stroke-[2.5]" />
              </div>

              <div className="space-y-1">
                <h4 className="text-xl font-bold text-slate-900">
                  Spreadsheet Import Complete!
                </h4>
                <p className="text-xs text-slate-500">
                  Your Excel data has been validated and imported into FieldOps.
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4 text-left pt-2">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
                  <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-semibold">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span>Deployments Created</span>
                  </div>
                  <p className="text-2xl font-extrabold text-slate-900">{importResult.deployments_created}</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
                  <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-semibold">
                    <Building2 className="w-4 h-4 text-purple-600" />
                    <span>Companies Created</span>
                  </div>
                  <p className="text-2xl font-extrabold text-slate-900">{importResult.companies_created}</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
                  <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-semibold">
                    <Package className="w-4 h-4 text-amber-600" />
                    <span>Add-On Items Added</span>
                  </div>
                  <p className="text-2xl font-extrabold text-slate-900">{importResult.extra_items_created}</p>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="text-left bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-2 text-xs text-rose-800 max-h-36 overflow-y-auto">
                  <p className="font-bold">Warnings / Skipped Rows:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {importResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          {step === 'upload' && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer ml-auto"
            >
              Cancel
            </button>
          )}

          {step === 'mapping' && (
            <>
              <button
                type="button"
                onClick={() => setStep('upload')}
                disabled={isExecuting}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={isExecuting || !mappings.customer_name}
                className="inline-flex items-center space-x-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-sm transition-all cursor-pointer"
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Importing Records...</span>
                  </>
                ) : (
                  <>
                    <span>Execute Import ({previewData?.row_count || 0} rows)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </>
          )}

          {step === 'result' && (
            <button
              type="button"
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className="px-6 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all cursor-pointer mx-auto"
            >
              Done & View Deployments
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExcelImportModal;
