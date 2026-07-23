"use client";

import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Provide to make the column sortable (click the header). */
  sortValue?: (row: T) => string | number;
  align?: "left" | "right" | "center";
  /** Extra classes for both header + cells (e.g. width, whitespace). */
  className?: string;
  /**
   * The greedy primary column (usually the name/title). It absorbs the leftover
   * width so every other column is snug and evenly padded — keeps spacing
   * consistent across all tables instead of drifting with content width.
   */
  primary?: boolean;
}

type SortState = { key: string; dir: "asc" | "desc" } | null;

const alignClass = { left: "text-left", right: "text-right", center: "text-center" } as const;

/**
 * A compact, JIRA-style data table: sticky-feel header, hover rows, optional
 * client-side sorting per column, and clickable rows. Horizontally scrollable
 * on small screens so it never breaks the layout.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  initialSort,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  initialSort?: { key: string; dir: "asc" | "desc" };
}) {
  const [sort, setSort] = useState<SortState>(initialSort ?? null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [rows, sort, columns]);

  const toggleSort = (key: string) =>
    setSort((cur) => (cur?.key === key ? { key, dir: cur.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-2/50 text-xs text-muted">
            {columns.map((c) => {
              const active = sort?.key === c.key;
              return (
                <th
                  key={c.key}
                  className={cn(
                    "whitespace-nowrap px-4 py-3 font-medium",
                    c.primary ? "w-full" : "w-px",
                    alignClass[c.align ?? "left"],
                    c.className,
                  )}
                >
                  {c.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(c.key)}
                      className={cn("inline-flex items-center gap-1 hover:text-fg", active && "text-fg")}
                    >
                      {c.header}
                      <span className={cn("text-[9px] leading-none", active ? "opacity-100" : "opacity-30")}>
                        {active ? (sort!.dir === "asc" ? "▲" : "▼") : "▲"}
                      </span>
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                "border-b border-border last:border-0 transition-colors",
                onRowClick && "cursor-pointer hover:bg-surface-2/50",
              )}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    "px-4 py-3 align-middle",
                    c.primary ? "w-full" : "w-px whitespace-nowrap",
                    alignClass[c.align ?? "left"],
                    c.className,
                  )}
                >
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
