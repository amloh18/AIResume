
import React from 'react';
import { ChevronUp, ChevronDown, Trash2 } from 'lucide-react';

// REUSABLE ENTRY WRAPPER
// ==========================================
const ListEntry = ({ collection, index, moveEntry, deleteEntry, children }: any) => (
  <div className="relative group/entry cv-item">
    <div className="absolute -left-10 top-0 opacity-0 group-hover/entry:opacity-100 flex flex-col gap-1 transition-opacity no-print z-50 bg-white shadow-xl border border-gray-200 rounded-md p-1 pointer-events-auto">
      <button onClick={(e: any) => { e.stopPropagation(); moveEntry(collection, index, -1); }} className="text-gray-500 hover:bg-gray-100 hover:text-emerald-600 p-1 rounded transition-colors" title="Move Up"><ChevronUp size={16}/></button>
      <button onClick={(e: any) => { e.stopPropagation(); moveEntry(collection, index, 1); }} className="text-gray-500 hover:bg-gray-100 hover:text-emerald-600 p-1 rounded transition-colors" title="Move Down"><ChevronDown size={16}/></button>
      <div className="w-full h-px bg-gray-200 my-0.5"></div>
      <button onClick={(e: any) => { e.stopPropagation(); deleteEntry(collection, index); }} className="text-gray-500 hover:bg-red-50 hover:text-red-600 p-1 rounded transition-colors" title="Delete Entry"><Trash2 size={16}/></button>
    </div>
    {children}
  </div>
);

// ==========================================
export default ListEntry;
