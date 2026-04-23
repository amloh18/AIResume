
import React from 'react';
import { ChevronUp, ChevronDown, Trash2 } from 'lucide-react';

// REUSABLE ENTRY WRAPPER
// ==========================================
const ListEntry = ({ collection, index, moveEntry, deleteEntry, children }: any) => (
  <div className="relative group/entry cv-item transition-all duration-200 hover:bg-[#10b981]/[0.02] rounded-md shadow-none hover:shadow-[0_2px_8px_rgba(16,185,129,0.05)] group-hover/snippet:z-30 hover:z-40 border border-transparent hover:border-transparent">
    <div className="absolute -left-[30px] top-0 bottom-0 flex flex-col items-center justify-center opacity-0 group-hover/entry:opacity-100 pointer-events-none group-hover/entry:pointer-events-auto transition-opacity duration-200 no-print z-50">
      <div className="flex flex-col gap-0.5 bg-white shadow-[0_2px_8px_rgba(16,185,129,0.05)] border border-gray-200 rounded-md p-0.5 pointer-events-auto relative group-hover/entry:bg-white">
        <button onClick={(e: any) => { e.stopPropagation(); moveEntry(collection, index, -1); }} className="text-gray-400 hover:bg-gray-50 hover:text-[#10b981] p-0.5 rounded transition-colors" title="Move Up"><ChevronUp size={14}/></button>
        <button onClick={(e: any) => { e.stopPropagation(); moveEntry(collection, index, 1); }} className="text-gray-400 hover:bg-gray-50 hover:text-[#10b981] p-0.5 rounded transition-colors" title="Move Down"><ChevronDown size={14}/></button>
        <div className="w-full h-px bg-gray-100 my-0.5"></div>
        <button onClick={(e: any) => { e.stopPropagation(); deleteEntry(collection, index); }} className="text-gray-400 hover:bg-red-50 hover:text-red-500 p-0.5 rounded transition-colors" title="Delete Entry"><Trash2 size={14}/></button>
      </div>
    </div>
    {children}
  </div>
);

// ==========================================
export default ListEntry;
