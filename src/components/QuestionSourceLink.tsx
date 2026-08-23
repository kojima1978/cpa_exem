"use client";

import { ExternalLink, FileText } from "lucide-react";

type SourceMaterial = {
  id: number;
  title: string;
} | null;

type Props = {
  material: SourceMaterial;
  sourcePage: number | null;
  className?: string;
  compact?: boolean;
};

export function QuestionSourceLink({
  material,
  sourcePage,
  className = "",
  compact = false,
}: Props) {
  if (!material) return null;

  const href = `/api/materials/${material.id}/file${
    sourcePage ? `#page=${sourcePage}` : ""
  }`;
  const pageLabel = sourcePage ? ` p.${sourcePage}` : "";

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={`${material.title}${pageLabel}`}
      className={`inline-flex max-w-full items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-100 ${className}`}
    >
      <FileText className="h-3.5 w-3.5 shrink-0" />
      <span className="shrink-0">元資料PDF{pageLabel}</span>
      {!compact && (
        <span className="min-w-0 truncate text-gray-500">/ {material.title}</span>
      )}
      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
    </a>
  );
}
