import re

with open("frontend/src/components/EditDeploymentModal.tsx", "r") as f:
    content = f.read()

# Add getDeploymentFieldSettings and SearchableSelect
if "SearchableSelect" not in content:
    content = content.replace(
        "import { X, Calendar, MapPin, Building2, Tag, CheckCircle2, User, Users, FileText, FolderOpen } from 'lucide-react';",
        "import { X, Calendar, MapPin, Building2, Tag, CheckCircle2, User, Users, FileText, FolderOpen } from 'lucide-react';\nimport { SearchableSelect } from './SearchableSelect';"
    )
    content = content.replace(
        "import { updateDeployment, type DeploymentData } from '../api';",
        "import { updateDeployment, getDeploymentFieldSettings, type DeploymentData, type DeploymentFieldsSettings } from '../api';"
    )

# Add settings state
if "settings, setSettings" not in content:
    content = content.replace(
        "const [error, setError] = useState<string | null>(null);",
        "const [error, setError] = useState<string | null>(null);\n  const [settings, setSettings] = useState<DeploymentFieldsSettings | null>(null);"
    )
    
# Add settings fetch
settings_fetch = """  useEffect(() => {
    getDeploymentFieldSettings().then(setSettings).catch(() => {});
  }, []);"""
if "getDeploymentFieldSettings" not in content.split("const [error")[1]:
    content = content.replace(
        "useEffect(() => {",
        settings_fetch + "\n\n  useEffect(() => {"
    )

# Get Field helper
get_field_helper = """  const getField = (key: string) => settings?.fields.find(f => f.key === key);"""
if "getField(" not in content:
    content = content.replace(
        "if (!isOpen || !deployment) return null;",
        get_field_helper + "\n\n  if (!isOpen || !deployment) return null;"
    )

# Product Dropdown replacement
prod_orig = """            {/* Deployed Product */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Deployed Product
              </label>
              <div className="relative">
                <Package className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={deployedProduct}
                  onChange={e => setDeployedProduct(e.target.value)}
                  placeholder="e.g. FieldOps Core Gateway"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>"""
prod_new = """            {/* Deployed Product */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Deployed Product
              </label>
              <div className="pl-8">
                <SearchableSelect
                  value={deployedProduct}
                  onChange={(v) => setDeployedProduct(v as string)}
                  options={getField('deployed_product')?.options || ['FieldOps Core Gateway', 'FieldOps Edge Device']}
                  allowOther={getField('deployed_product')?.allow_other ?? true}
                  placeholder="-- Select Product --"
                />
              </div>
            </div>"""
if "SearchableSelect\n                  value={deployedProduct}" not in content:
    content = content.replace(prod_orig, prod_new)


# Account Owner
ao_orig = """            {/* Account Owner */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Account Owner
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={accountOwner}
                  onChange={e => setAccountOwner(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>"""
ao_new = """            {/* Account Owner */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Account Owner
              </label>
              <div className="pl-8">
                <SearchableSelect
                  value={accountOwner}
                  onChange={(v) => setAccountOwner(v as string)}
                  options={getField('account_owner')?.options || []}
                  allowOther={getField('account_owner')?.allow_other ?? true}
                  placeholder={getField('account_owner')?.other_placeholder || "e.g. Sarah Jenkins"}
                />
              </div>
            </div>"""
if "SearchableSelect\n                  value={accountOwner}" not in content:
    content = content.replace(ao_orig, ao_new)

# Lead Engineer
le_orig = """            {/* Lead Engineer */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Lead Engineer
              </label>
              <div className="relative">
                <Wrench className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={leadEngineer}
                  onChange={e => setLeadEngineer(e.target.value)}
                  placeholder="e.g. John Smith"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>"""
le_new = """            {/* Lead Engineer */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Lead Engineer
              </label>
              <div className="pl-8">
                <SearchableSelect
                  value={leadEngineer}
                  onChange={(v) => setLeadEngineer(v as string)}
                  options={getField('lead_engineer')?.options || []}
                  allowOther={getField('lead_engineer')?.allow_other ?? true}
                  placeholder={getField('lead_engineer')?.other_placeholder || "e.g. Michael Chang"}
                />
              </div>
            </div>"""
if "SearchableSelect\n                  value={leadEngineer}" not in content:
    content = content.replace(le_orig, le_new)

# Assisting Engineers
ae_orig = """            {/* Assisting Engineers */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Assisting Engineer(s)
              </label>
              <div className="relative">
                <Users className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={assistingEngineers}
                  onChange={e => setAssistingEngineers(e.target.value)}
                  placeholder="e.g. Alex Wong"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>"""
ae_new = """            {/* Assisting Engineers */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Assisting Engineer(s)
              </label>
              <div className="pl-8">
                <SearchableSelect
                  multiple
                  value={assistingEngineers}
                  onChange={(v) => setAssistingEngineers(v as string[])}
                  options={getField('assisting_engineers')?.options || []}
                  allowOther={getField('assisting_engineers')?.allow_other ?? true}
                  placeholder={getField('assisting_engineers')?.other_placeholder || "e.g. Sarah Miller, David Kim"}
                />
              </div>
            </div>"""
if "SearchableSelect\n                  multiple" not in content:
    content = content.replace(ae_orig, ae_new)

with open("frontend/src/components/EditDeploymentModal.tsx", "w") as f:
    f.write(content)
print("Patched EditDeploymentModal")
