import re

with open("frontend/src/components/NewDeploymentModal.tsx", "r") as f:
    content = f.read()

# Add SearchableSelect import
if "SearchableSelect" not in content:
    content = content.replace(
        "import { X, Calendar, Server, MapPin, Building2, Tag, CheckCircle2, User, Users, FileText, FolderOpen } from 'lucide-react';",
        "import { X, Calendar, Server, MapPin, Building2, Tag, CheckCircle2, User, Users, FileText, FolderOpen } from 'lucide-react';\nimport { SearchableSelect } from './SearchableSelect';"
    )

# Change assistingEngineers state
content = content.replace(
    "const [assistingEngineers, setAssistingEngineers] = useState('');",
    "const [assistingEngineers, setAssistingEngineers] = useState<string[]>([]);"
)
content = content.replace(
    "setAssistingEngineers('');",
    "setAssistingEngineers([]);"
)
content = content.replace(
    "payload.assisting_engineers = assistingEngineers.trim() || null;",
    "payload.assisting_engineers = assistingEngineers.length > 0 ? assistingEngineers.join(', ') : null;"
)

# Product Dropdown replacement
prod_orig = """                    <select
                      value={deployedProduct}
                      required
                      onChange={e => {
                        setDeployedProduct(e.target.value);
                        if (e.target.value !== 'Other') {
                          setOtherValues(prev => ({ ...prev, deployed_product: '' }));
                        }
                      }}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white font-medium text-slate-800"
                    >
                      <option value="">-- Select Product --</option>
                      {(getField('deployed_product')?.options || ['FieldOps Core Gateway', 'FieldOps Edge Device']).map(opt => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>"""
prod_new = """                    <div className="pl-8">
                      <SearchableSelect
                        value={deployedProduct}
                        onChange={(v) => setDeployedProduct(v as string)}
                        options={getField('deployed_product')?.options || ['FieldOps Core Gateway', 'FieldOps Edge Device']}
                        allowOther={getField('deployed_product')?.allow_other ?? true}
                        placeholder="-- Select Product --"
                      />
                    </div>"""
content = content.replace(prod_orig, prod_new)

# Remove other product input (isOtherProduct block)
other_prod_orig = """                {deployedProduct === 'Other' && (
                  <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <input
                      type="text"
                      required
                      value={otherValues['deployed_product'] || ''}
                      onChange={(e) => setOtherValues(prev => ({ ...prev, deployed_product: e.target.value }))}
                      placeholder="Specify custom product name or SKU..."
                      className="w-full px-3 py-2 text-xs border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
                    />
                  </div>
                )}"""
content = content.replace(other_prod_orig, "")

# Same logic in submit payload for product
content = content.replace(
    "payload.deployed_product = deployedProduct === 'Other' ? (otherValues['deployed_product'] || '').trim() : deployedProduct;",
    "payload.deployed_product = deployedProduct.trim();"
)


# Deployment Type
dt_orig = """                      <select
                        value={deploymentType}
                        required={isFieldRequired('deployment_type')}
                        onChange={e => setDeploymentType(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="">-- Select Deployment Type --</option>
                        {(getField('deployment_type')?.options || ['Deployment', 'POC', 'Pilot', 'Trial', 'Staging']).map(opt => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>"""
dt_new = """                      <div className="pl-8">
                        <SearchableSelect
                          value={deploymentType}
                          onChange={(v) => setDeploymentType(v as string)}
                          options={getField('deployment_type')?.options || ['Deployment', 'POC', 'Pilot', 'Trial', 'Staging']}
                          allowOther={getField('deployment_type')?.allow_other ?? true}
                          placeholder="-- Select Deployment Type --"
                        />
                      </div>"""
content = content.replace(dt_orig, dt_new)


# Status
st_orig = """                    <select
                      value={status}
                      required={isFieldRequired('pre_poc_status')}
                      onChange={e => setStatus(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">-- Select Status --</option>
                      {(getField('pre_poc_status')?.options || ['Cancelled', 'Planning', 'Pre-POC', 'In Progress', 'On Hold', 'Completed']).map(opt => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>"""
st_new = """                    <SearchableSelect
                      value={status}
                      onChange={(v) => setStatus(v as string)}
                      options={getField('pre_poc_status')?.options || ['Cancelled', 'Planning', 'Pre-POC', 'In Progress', 'On Hold', 'Completed']}
                      allowOther={getField('pre_poc_status')?.allow_other ?? false}
                      placeholder="-- Select Status --"
                    />"""
content = content.replace(st_orig, st_new)


# Account Owner
ao_orig = """                      <input
                        type="text"
                        value={accountOwner}
                        required={isFieldRequired('account_owner')}
                        onChange={e => setAccountOwner(e.target.value)}
                        placeholder="e.g. Sarah Jenkins (Account Lead)"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                      />"""
ao_new = """                      <div className="pl-8">
                        <SearchableSelect
                          value={accountOwner}
                          onChange={(v) => setAccountOwner(v as string)}
                          options={getField('account_owner')?.options || []}
                          allowOther={getField('account_owner')?.allow_other ?? true}
                          placeholder={getField('account_owner')?.other_placeholder || "e.g. Sarah Jenkins"}
                        />
                      </div>"""
content = content.replace(ao_orig, ao_new)

# Lead Engineer
le_orig = """                      <input
                        type="text"
                        value={leadEngineer}
                        required={isFieldRequired('lead_engineer')}
                        onChange={e => setLeadEngineer(e.target.value)}
                        placeholder="e.g. Michael Chang"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                      />"""
le_new = """                      <div className="pl-8">
                        <SearchableSelect
                          value={leadEngineer}
                          onChange={(v) => setLeadEngineer(v as string)}
                          options={getField('lead_engineer')?.options || []}
                          allowOther={getField('lead_engineer')?.allow_other ?? true}
                          placeholder={getField('lead_engineer')?.other_placeholder || "e.g. Michael Chang"}
                        />
                      </div>"""
content = content.replace(le_orig, le_new)

# Assisting Engineers
ae_orig = """                      <input
                        type="text"
                        value={assistingEngineers}
                        required={isFieldRequired('assisting_engineers')}
                        onChange={e => setAssistingEngineers(e.target.value)}
                        placeholder="e.g. Sarah Miller, David Kim"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                      />"""
ae_new = """                      <div className="pl-8">
                        <SearchableSelect
                          multiple
                          value={assistingEngineers}
                          onChange={(v) => setAssistingEngineers(v as string[])}
                          options={getField('assisting_engineers')?.options || []}
                          allowOther={getField('assisting_engineers')?.allow_other ?? true}
                          placeholder={getField('assisting_engineers')?.other_placeholder || "e.g. Sarah Miller, David Kim"}
                        />
                      </div>"""
content = content.replace(ae_orig, ae_new)

with open("frontend/src/components/NewDeploymentModal.tsx", "w") as f:
    f.write(content)
print("Patched NewDeploymentModal")
