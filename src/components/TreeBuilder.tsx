'use client';

import React from 'react';
import { Plus, Trash2, GitMerge, Cpu } from 'lucide-react';

export interface TreeNode {
  temp_id: string;
  name: string;
  children: TreeNode[];
}

interface TreeBuilderProps {
  nodes: TreeNode[];
  onChange: (nodes: TreeNode[]) => void;
}

export default function TreeBuilder({ nodes, onChange }: TreeBuilderProps) {
  const handleAddRoot = () => {
    const newNode: TreeNode = {
      temp_id: `temp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: '',
      children: [],
    };
    onChange([...nodes, newNode]);
  };

  const updateNodeName = (targetId: string, newName: string, tree: TreeNode[]): TreeNode[] => {
    return tree.map((node) => {
      if (node.temp_id === targetId) {
        return { ...node, name: newName };
      }
      if (node.children.length > 0) {
        return { ...node, children: updateNodeName(targetId, newName, node.children) };
      }
      return node;
    });
  };

  const addChildNode = (parentId: string, tree: TreeNode[]): TreeNode[] => {
    return tree.map((node) => {
      if (node.temp_id === parentId) {
        const child: TreeNode = {
          temp_id: `temp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: '',
          children: [],
        };
        return { ...node, children: [...node.children, child] };
      }
      if (node.children.length > 0) {
        return { ...node, children: addChildNode(parentId, node.children) };
      }
      return node;
    });
  };

  const deleteNode = (targetId: string, tree: TreeNode[]): TreeNode[] => {
    return tree
      .filter((node) => node.temp_id !== targetId)
      .map((node) => ({
        ...node,
        children: deleteNode(targetId, node.children),
      }));
  };

  const renderRecursiveNode = (node: TreeNode, depth: number = 0) => {
    return (
      <div key={node.temp_id} className="space-y-2 relative" style={{ marginLeft: `${depth * 24}px` }}>
        <div className="flex items-center space-x-2 p-2.5 bg-white border border-[#E0E3E8] rounded-[6px] shadow-sm hover:border-[#1E63C4] transition-colors">
          <div className="flex items-center space-x-1.5 text-[#2E3A87]">
            <Cpu className="w-4 h-4 text-[#1E63C4]" />
            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-50 text-[#1E63C4] rounded">
              L{depth}
            </span>
          </div>

          <input
            type="text"
            placeholder={depth === 0 ? "e.g. Fabrication Line 1" : "e.g. Shear Machine A"}
            value={node.name}
            onChange={(e) => onChange(updateNodeName(node.temp_id, e.target.value, nodes))}
            className="flex-1 px-3 py-1.5 bg-[#F5F7FB] border border-[#E0E3E8] rounded-[4px] text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1E63C4]"
          />

          <button
            type="button"
            onClick={() => onChange(addChildNode(node.temp_id, nodes))}
            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#1E63C4] text-xs font-semibold rounded-[4px] border border-blue-200 flex items-center space-x-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Child</span>
          </button>

          <button
            type="button"
            onClick={() => onChange(deleteNode(node.temp_id, nodes))}
            className="p-1.5 text-[#D93025] hover:bg-red-50 rounded transition-colors"
            title="Delete Node"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {node.children.length > 0 && (
          <div className="space-y-2 border-l-2 border-blue-200 pl-2">
            {node.children.map((child) => renderRecursiveNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 p-4 bg-[#F5F7FB] border border-[#E0E3E8] rounded-[6px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs font-semibold text-[#2E3A87]">
          <GitMerge className="w-4 h-4 text-[#1E63C4]" />
          <span>ISA-95 Machine Tree Structure Builder</span>
        </div>

        <button
          type="button"
          onClick={handleAddRoot}
          className="px-3 py-1.5 bg-[#2E3A87] hover:bg-[#232d69] text-white text-xs font-semibold rounded-[4px] flex items-center space-x-1 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Root Machine Node</span>
        </button>
      </div>

      {nodes.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-300 rounded-[6px] bg-white">
          No machine nodes added yet. Click &quot;Add Root Machine Node&quot; to begin building your machine hierarchy.
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto p-1">
          {nodes.map((rootNode) => renderRecursiveNode(rootNode, 0))}
        </div>
      )}
    </div>
  );
}

// Utility function to flatten tree nodes for POST /api/v1/machines (§4.5)
export function flattenTree(nodes: TreeNode[], parentTempId: string | null = null): Array<{ temp_id: string; name: string; parent_temp_id: string | null }> {
  let result: Array<{ temp_id: string; name: string; parent_temp_id: string | null }> = [];
  for (const node of nodes) {
    if (node.name.trim()) {
      result.push({
        temp_id: node.temp_id,
        name: node.name.trim(),
        parent_temp_id: parentTempId,
      });
      if (node.children.length > 0) {
        result = result.concat(flattenTree(node.children, node.temp_id));
      }
    }
  }
  return result;
}
