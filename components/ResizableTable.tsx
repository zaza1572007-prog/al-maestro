'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';

interface ColumnDef {
  key: string;
  label: string;
  defaultWidth?: number;
  minWidth?: number;
  className?: string;
  align?: 'right' | 'center' | 'left';
}

interface ResizableTableProps<T> {
  columns: ColumnDef[];
  data: T[];
  rowKey: (item: T) => string;
  renderCell: (item: T, columnKey: string, idx: number) => React.ReactNode;
  storageKey?: string;
  onRowClick?: (item: T) => void;
  selectedRowKey?: string;
  emptyState?: React.ReactNode;
  className?: string;
}

export default function ResizableTable<T>({
  columns,
  data,
  rowKey,
  renderCell,
  storageKey,
  onRowClick,
  selectedRowKey,
  emptyState,
  className = '',
}: ResizableTableProps<T>) {
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(`col_widths_${storageKey}`);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    const initial: Record<string, number> = {};
    columns.forEach((c) => {
      initial[c.key] = c.defaultWidth || 140;
    });
    return initial;
  });

  const resizingColKey = useRef<string | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);

  const handleMouseDown = (e: React.MouseEvent, colKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    resizingColKey.current = colKey;
    startX.current = e.clientX;
    startWidth.current = colWidths[colKey] || 140;

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!resizingColKey.current) return;
      const colKey = resizingColKey.current;
      // In RTL, dragging left increases width, dragging right decreases
      const deltaX = startX.current - e.clientX;
      const minW = columns.find((c) => c.key === colKey)?.minWidth || 60;
      const newWidth = Math.max(minW, startWidth.current + deltaX);

      setColWidths((prev) => {
        const next = { ...prev, [colKey]: newWidth };
        if (storageKey) {
          try {
            localStorage.setItem(`col_widths_${storageKey}`, JSON.stringify(next));
          } catch {}
        }
        return next;
      });
    },
    [columns, storageKey]
  );

  const handleMouseUp = useCallback(() => {
    resizingColKey.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div className={`w-full overflow-x-auto border border-slate-800/80 rounded-2xl bg-slate-950/40 select-none ${className}`}>
      <table className="w-full text-right border-collapse maestro-table" style={{ tableLayout: 'fixed' }}>
        <thead>
          <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400">
            {columns.map((col) => {
              const width = colWidths[col.key] || col.defaultWidth || 140;
              return (
                <th
                  key={col.key}
                  style={{ width: `${width}px` }}
                  className={`relative p-3.5 font-bold text-xs ${col.align === 'center' ? 'text-center' : col.align === 'left' ? 'text-left' : 'text-right'} ${col.className || ''}`}
                >
                  <span className="truncate block">{col.label}</span>

                  {/* Column Resizer Handle */}
                  <div
                    onMouseDown={(e) => handleMouseDown(e, col.key)}
                    className="absolute top-0 bottom-0 left-0 w-2 hover:w-3 cursor-col-resize z-20 group flex items-center justify-center transition-all"
                    title="سحب لتغيير عرض العمود"
                  >
                    <div className="w-[2px] h-4 bg-slate-700 group-hover:bg-purple-400 transition-colors rounded-full" />
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="p-4">
                {emptyState}
              </td>
            </tr>
          ) : (
            data.map((item, idx) => {
              const key = rowKey(item);
              const isSelected = selectedRowKey === key;
              return (
                <tr
                  key={key}
                  onClick={() => onRowClick && onRowClick(item)}
                  className={`stagger-row transition cursor-pointer ${
                    isSelected
                      ? 'bg-purple-600/15 border-r-2 border-purple-500'
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`p-3.5 ${col.align === 'center' ? 'text-center' : col.align === 'left' ? 'text-left' : 'text-right'}`}
                    >
                      {renderCell(item, col.key, idx)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
