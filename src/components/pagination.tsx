"use client";

import { memo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type PaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  label?: string;
  className?: string;
};

export const Pagination = memo(function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  label = "registros",
  className
}: PaginationProps) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const windowSize = 5;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  let end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  const pages = Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);

  return (
    <div className={cn("flex flex-col gap-2 border-t border-slate-100 px-4 py-3 dark:border-white/[0.06] sm:flex-row sm:items-center sm:justify-between sm:px-5", className)}>
      <p className="text-[10px] text-slate-400 dark:text-slate-500">
        Mostrando <span className="font-semibold text-slate-600 dark:text-slate-300">{from}–{to}</span> de{" "}
        <span className="font-semibold text-slate-600 dark:text-slate-300">{total}</span> {label}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="inline-flex h-7 items-center gap-0.5 rounded-md border border-slate-200 bg-white px-2 text-[10px] font-semibold text-slate-500 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400"
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-3 w-3" /> Anterior
        </button>
        {pages.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            aria-current={item === page ? "page" : undefined}
            className={cn(
              "h-7 min-w-7 rounded-md border px-1.5 text-[10px] font-semibold transition",
              item === page
                ? "border-slate-900 bg-slate-900 text-white dark:border-brand-500 dark:bg-brand-500"
                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400"
            )}
          >
            {item}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="inline-flex h-7 items-center gap-0.5 rounded-md border border-slate-200 bg-white px-2 text-[10px] font-semibold text-slate-500 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400"
          aria-label="Página siguiente"
        >
          Siguiente <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
});
