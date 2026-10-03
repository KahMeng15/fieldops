import React from 'react';
import { LayoutGrid, List, Table2, AlignJustify } from 'lucide-react';

export type ViewMode = 'grid' | 'list' | 'table' | 'table-compact';

interface ViewToggleProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({ viewMode, setViewMode }) => {
  return (
    <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
      <button
        onClick={() => setViewMode('grid')}
        className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        title="Grid Cards"
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button
        onClick={() => setViewMode('list')}
        className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        title="List Cards"
      >
        <List className="w-4 h-4" />
      </button>
      <button
        onClick={() => setViewMode('table')}
        className={`p-1.5 rounded-md transition-colors ${viewMode === 'table' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        title="Table"
      >
        <Table2 className="w-4 h-4" />
      </button>
      <button
        onClick={() => setViewMode('table-compact')}
        className={`p-1.5 rounded-md transition-colors ${viewMode === 'table-compact' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        title="Table Compact"
      >
        <AlignJustify className="w-4 h-4" />
      </button>
    </div>
  );
};
