'use client';

import React, { useState, useEffect } from 'react';
import TreeBuilder, { TreeNode, flattenTree } from '@/components/TreeBuilder';
import { Cpu, Plus, Trash2, ChevronRight, Activity, Sliders, CheckCircle2, ArrowRight, Edit } from 'lucide-react';

interface MachineTreeItem {
  id: string;
  name: string;
  level: number;
  path: string;
  warehouse_id?: string;
  warehouse?: { name: string };
  production_params?: Array<{ id: string; metricName: string; unit: string }>;
  parameters?: Array<{ id: string; parameterName: string; minValue?: number; maxValue?: number; unit?: string }>;
  children: MachineTreeItem[];
}

export default function MachinesMasterPage() {
  const [viewMode, setViewMode] = useState<'TREE' | 'WIZARD'>('TREE');
  const [treeData, setTreeData] = useState<MachineTreeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sites, setSites] = useState<any[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [warehouses, setWarehouses] = useState<any[]>([]);

  // Edit Node Modal State
  const [editingNode, setEditingNode] = useState<MachineTreeItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editWhId, setEditWhId] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Wizard State (Steps 1 - 3)
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [wizardSiteId, setWizardSiteId] = useState<string>('');
  const [wizardWarehouseId, setWizardWarehouseId] = useState<string>('');
  const [wizardTreeNodes, setWizardTreeNodes] = useState<TreeNode[]>([
    { temp_id: 'root_1', name: 'Fabrication Line 1', children: [] },
  ]);

  const [prodParams, setProdParams] = useState<Array<{ metric_name: string; unit: string }>>([
    { metric_name: 'units_per_hour', unit: 'pcs/hr' },
  ]);

  const [operParams, setOperParams] = useState<Array<{ parameter_name: string; min_value: string; max_value: string; unit: string }>>([
    { parameter_name: 'Rated Line Voltage', min_value: '400', max_value: '440', unit: 'V' },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [createdMachineIds, setCreatedMachineIds] = useState<string[]>([]);

  const fetchTree = async () => {
    setLoading(true);
    try {
      const url = selectedSiteId ? `/api/v1/machines/tree?site_id=${selectedSiteId}` : '/api/v1/machines/tree';
      const res = await fetch(url);
      if (res.ok) {
        const result = await res.json();
        setTreeData(result.data || []);
      }
    } catch (err) {
      console.error('Fetch tree error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLookups = async () => {
    try {
      const [siteRes, whRes] = await Promise.all([fetch('/api/v1/sites'), fetch('/api/v1/warehouses')]);
      if (siteRes.ok) {
        const result = await siteRes.json();
        const list = result.data || [];
        setSites(list);
        if (list.length > 0) {
          setSelectedSiteId(list[0].id);
          setWizardSiteId(list[0].id);
        }
      }
      if (whRes.ok) {
        setWarehouses((await whRes.json()).data || []);
      }
    } catch (err) {
      console.error('Fetch lookups error:', err);
    }
  };

  useEffect(() => {
    fetchLookups();
  }, []);

  useEffect(() => {
    fetchTree();
  }, [selectedSiteId]);

  const handleOpenEditNode = (item: MachineTreeItem) => {
    setEditingNode(item);
    setEditName(item.name);
    setEditWhId(item.warehouse_id || '');
  };

  const handleSaveEditNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNode) return;
    setSubmittingEdit(true);

    try {
      const res = await fetch(`/api/v1/machines/${editingNode.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          warehouse_id: editWhId || null,
        }),
      });

      if (res.ok) {
        setEditingNode(null);
        fetchTree();
      }
    } catch (err) {
      console.error('Save node edit error:', err);
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDeleteMachine = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete machine "${name}" and all its sub-nodes?`)) return;
    try {
      await fetch(`/api/v1/machines/${id}?cascade=true`, { method: 'DELETE' });
      fetchTree();
    } catch (err) {
      console.error('Delete machine error:', err);
    }
  };

  const handleWizardStep1Submit = async () => {
    const flattened = flattenTree(wizardTreeNodes);
    if (flattened.length === 0) {
      alert('Please enter at least one machine node name.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/machines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_id: wizardSiteId,
          warehouse_id: wizardWarehouseId || null,
          nodes: flattened,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error?.message || 'Failed to create machines');
        return;
      }

      const result = await res.json();
      const ids = (result.created || []).map((item: any) => item.id);
      setCreatedMachineIds(ids);
      setWizardStep(2);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleWizardStep2Submit = async () => {
    setSubmitting(true);
    try {
      if (createdMachineIds.length > 0 && prodParams.length > 0) {
        await Promise.all(
          createdMachineIds.map((mId) =>
            fetch(`/api/v1/machines/${mId}/production-params`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ params: prodParams }),
            })
          )
        );
      }
      setWizardStep(3);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleWizardStep3Submit = async () => {
    setSubmitting(true);
    try {
      if (createdMachineIds.length > 0 && operParams.length > 0) {
        await Promise.all(
          createdMachineIds.map((mId) =>
            fetch(`/api/v1/machines/${mId}/parameters`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ parameters: operParams }),
            })
          )
        );
      }
      setViewMode('TREE');
      setWizardStep(1);
      fetchTree();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderRecursiveTreeItem = (item: MachineTreeItem) => {
    return (
      <div key={item.id} className="p-3.5 bg-white border border-[#E0E3E8] rounded-[6px] shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 bg-blue-50 text-[#1E63C4] text-[10px] font-extrabold rounded">
              L{item.level}
            </span>
            <span className="font-bold text-slate-800 text-sm">{item.name}</span>
            {item.warehouse && (
              <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                WH: {item.warehouse.name}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => handleOpenEditNode(item)}
              className="p-1 text-[#1E63C4] hover:bg-blue-50 rounded transition-colors"
              title="Edit Node"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDeleteMachine(item.id, item.name)}
              className="p-1 text-[#D93025] hover:bg-red-50 rounded transition-colors"
              title="Delete Branch"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 font-mono">Path: {item.path}</p>

        {((item.production_params && item.production_params.length > 0) ||
          (item.parameters && item.parameters.length > 0)) && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-[#E0E3E8]/60 text-[11px]">
            {item.production_params?.map((pp) => (
              <span key={pp.id} className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded">
                Metric: <strong>{pp.metricName}</strong> ({pp.unit})
              </span>
            ))}
            {item.parameters?.map((p) => (
              <span key={p.id} className="px-2 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 rounded">
                Param: <strong>{p.parameterName}</strong> ({p.minValue}-{p.maxValue} {p.unit})
              </span>
            ))}
          </div>
        )}

        {item.children.length > 0 && (
          <div className="pl-4 border-l-2 border-blue-200 space-y-2 mt-2">
            {item.children.map((child) => renderRecursiveTreeItem(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-[6px] border border-[#E0E3E8] shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-[6px] text-[#1E63C4]">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#2E3A87]">Machines Master Registry & Tree Builder</h1>
            <p className="text-xs text-slate-500">ISA-95 Work Center / Unit Equipment Tree & Parameter Wizard</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {viewMode === 'TREE' ? (
            <button
              onClick={() => setViewMode('WIZARD')}
              className="px-4 py-2 bg-[#2E3A87] hover:bg-[#232d69] text-white text-xs font-bold rounded-[4px] shadow-sm flex items-center space-x-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>+ LAUNCH MACHINE WIZARD</span>
            </button>
          ) : (
            <button
              onClick={() => setViewMode('TREE')}
              className="px-4 py-2 border border-[#E0E3E8] bg-white text-slate-700 text-xs font-semibold rounded-[4px]"
            >
              Back to Tree View
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: MACHINE HIERARCHY TREE */}
      {viewMode === 'TREE' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-[6px] border border-[#E0E3E8]">
            <div className="flex items-center space-x-3 text-xs">
              <span className="font-semibold text-slate-700">Filter by Plant Site:</span>
              <select
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                className="px-3 py-1.5 bg-[#F5F7FB] border border-[#E0E3E8] rounded-[4px] font-semibold text-slate-800 focus:outline-none"
              >
                <option value="">All Sites</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
            <span className="text-xs text-slate-500 font-semibold">
              Root Lines: {treeData.length}
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-[6px] border">Loading Machine Tree...</div>
          ) : treeData.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-[6px] border border-dashed">
              No machine nodes found for this site. Launch the Wizard to build your machine hierarchy.
            </div>
          ) : (
            <div className="space-y-4">{treeData.map((item) => renderRecursiveTreeItem(item))}</div>
          )}
        </div>
      )}

      {/* EDIT NODE MODAL */}
      {editingNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-[#E0E3E8] rounded-[6px] w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E0E3E8] pb-3">
              <h3 className="text-base font-bold text-[#2E3A87]">Edit Machine Node</h3>
              <button onClick={() => setEditingNode(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveEditNode} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Machine Node Name *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E0E3E8] rounded-[4px] focus:outline-none focus:border-[#1E63C4]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Warehouse</label>
                <select
                  value={editWhId}
                  onChange={(e) => setEditWhId(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E0E3E8] rounded-[4px]"
                >
                  <option value="">None / Site Level</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#E0E3E8]">
                <button
                  type="button"
                  onClick={() => setEditingNode(null)}
                  className="px-4 py-2 border border-[#E0E3E8] text-slate-600 rounded-[4px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-5 py-2 bg-[#2E3A87] text-white font-bold rounded-[4px]"
                >
                  {submittingEdit ? 'Updating...' : 'Save Node'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW 2: 3-STEP MACHINE WIZARD */}
      {viewMode === 'WIZARD' && (
        <div className="bg-white border border-[#E0E3E8] rounded-[6px] shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-[#E0E3E8] pb-4">
            <div className={`flex items-center space-x-2 text-xs font-bold ${wizardStep === 1 ? 'text-[#1E63C4]' : 'text-slate-400'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${wizardStep === 1 ? 'bg-blue-100 text-[#1E63C4]' : 'bg-slate-100'}`}>1</span>
              <span>Step 1: Machine Tree Hierarchy</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300" />

            <div className={`flex items-center space-x-2 text-xs font-bold ${wizardStep === 2 ? 'text-[#1E63C4]' : 'text-slate-400'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${wizardStep === 2 ? 'bg-blue-100 text-[#1E63C4]' : 'bg-slate-100'}`}>2</span>
              <span>Step 2: Record Production Params</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300" />

            <div className={`flex items-center space-x-2 text-xs font-bold ${wizardStep === 3 ? 'text-[#1E63C4]' : 'text-slate-400'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${wizardStep === 3 ? 'bg-blue-100 text-[#1E63C4]' : 'bg-slate-100'}`}>3</span>
              <span>Step 3: Set Operating Parameters</span>
            </div>
          </div>

          {wizardStep === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Plant Site *</label>
                  <select
                    value={wizardSiteId}
                    onChange={(e) => setWizardSiteId(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E0E3E8] rounded-[4px] font-semibold text-slate-800"
                  >
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Warehouse (Optional)</label>
                  <select
                    value={wizardWarehouseId}
                    onChange={(e) => setWizardWarehouseId(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E0E3E8] rounded-[4px]"
                  >
                    <option value="">Select Warehouse...</option>
                    {warehouses
                      .filter((w) => w.siteId === wizardSiteId)
                      .map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.type})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <TreeBuilder nodes={wizardTreeNodes} onChange={(n) => setWizardTreeNodes(n)} />

              <div className="flex justify-end pt-4 border-t border-[#E0E3E8]">
                <button
                  type="button"
                  onClick={handleWizardStep1Submit}
                  disabled={submitting}
                  className="px-6 py-2 bg-[#2E3A87] hover:bg-[#232d69] text-white text-xs font-bold rounded-[4px] flex items-center space-x-1"
                >
                  <span>Save Tree & Next to Step 2</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="space-y-6">
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-[4px] text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>Step 1 Complete: Created {createdMachineIds.length} machine nodes in database!</span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-[#2E3A87]">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-[#1E63C4]" />
                    <span>Define Production Metrics for Machines</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProdParams([...prodParams, { metric_name: '', unit: '' }])}
                    className="px-3 py-1 bg-blue-50 text-[#1E63C4] border border-blue-200 rounded-[4px]"
                  >
                    + Add Metric
                  </button>
                </div>

                {prodParams.map((p, idx) => (
                  <div key={idx} className="flex items-center space-x-3">
                    <input
                      type="text"
                      placeholder="Metric Name (e.g. units_per_hour)"
                      value={p.metric_name}
                      onChange={(e) => {
                        const updated = [...prodParams];
                        updated[idx].metric_name = e.target.value;
                        setProdParams(updated);
                      }}
                      className="flex-1 px-3 py-1.5 border border-[#E0E3E8] rounded-[4px] text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Unit (e.g. pcs/hr)"
                      value={p.unit}
                      onChange={(e) => {
                        const updated = [...prodParams];
                        updated[idx].unit = e.target.value;
                        setProdParams(updated);
                      }}
                      className="w-32 px-3 py-1.5 border border-[#E0E3E8] rounded-[4px] text-xs"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-4 border-t border-[#E0E3E8]">
                <button
                  type="button"
                  onClick={() => setWizardStep(3)}
                  className="px-4 py-2 border border-[#E0E3E8] text-slate-600 text-xs rounded-[4px]"
                >
                  Skip Step 2
                </button>
                <button
                  type="button"
                  onClick={handleWizardStep2Submit}
                  disabled={submitting}
                  className="px-6 py-2 bg-[#2E3A87] text-white text-xs font-bold rounded-[4px] flex items-center space-x-1"
                >
                  <span>Save Metrics & Next to Step 3</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          )}

          {wizardStep === 3 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-[#2E3A87]">
                  <div className="flex items-center space-x-2">
                    <Sliders className="w-4 h-4 text-[#1E63C4]" />
                    <span>Set Machine Min/Max Operating Parameters</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setOperParams([...operParams, { parameter_name: '', min_value: '', max_value: '', unit: '' }])
                    }
                    className="px-3 py-1 bg-blue-50 text-[#1E63C4] border border-blue-200 rounded-[4px]"
                  >
                    + Add Parameter Range
                  </button>
                </div>

                {operParams.map((p, idx) => (
                  <div key={idx} className="flex items-center space-x-3">
                    <input
                      type="text"
                      placeholder="Parameter Name (e.g. Hydraulic Pressure)"
                      value={p.parameter_name}
                      onChange={(e) => {
                        const updated = [...operParams];
                        updated[idx].parameter_name = e.target.value;
                        setOperParams(updated);
                      }}
                      className="flex-1 px-3 py-1.5 border border-[#E0E3E8] rounded-[4px] text-xs"
                    />
                    <input
                      type="number"
                      placeholder="Min"
                      value={p.min_value}
                      onChange={(e) => {
                        const updated = [...operParams];
                        updated[idx].min_value = e.target.value;
                        setOperParams(updated);
                      }}
                      className="w-24 px-3 py-1.5 border border-[#E0E3E8] rounded-[4px] text-xs"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={p.max_value}
                      onChange={(e) => {
                        const updated = [...operParams];
                        updated[idx].max_value = e.target.value;
                        setOperParams(updated);
                      }}
                      className="w-24 px-3 py-1.5 border border-[#E0E3E8] rounded-[4px] text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Unit (bar)"
                      value={p.unit}
                      onChange={(e) => {
                        const updated = [...operParams];
                        updated[idx].unit = e.target.value;
                        setOperParams(updated);
                      }}
                      className="w-24 px-3 py-1.5 border border-[#E0E3E8] rounded-[4px] text-xs"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-4 border-t border-[#E0E3E8]">
                <button
                  type="button"
                  onClick={handleWizardStep3Submit}
                  disabled={submitting}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-[4px] shadow-sm flex items-center space-x-1"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  <span>Complete Machine Wizard</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
