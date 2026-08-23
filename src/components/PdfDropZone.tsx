"use client";

import type { DragEvent, RefObject } from "react";
import { useState } from "react";
import { FileText } from "lucide-react";

type BrowserFileWithPath = File & {
  path?: string;
  webkitRelativePath?: string;
};

type Props = {
  file: File | null;
  inputRef?: RefObject<HTMLInputElement | null>;
  onSelect: (file: File | null) => void;
  className?: string;
  placeholder?: string;
  helperText?: string;
  iconClassName?: string;
  paddingClassName?: string;
};

export function getFileDisplayPath(file: File | null) {
  if (!file) return "";
  const browserFile = file as BrowserFileWithPath;
  return browserFile.path || browserFile.webkitRelativePath || file.name;
}

export function PdfDropZone({
  file,
  inputRef,
  onSelect,
  className = "",
  placeholder = "PDFをドラッグ＆ドロップ",
  helperText = "クリックしてファイルを選択することもできます",
  iconClassName = "h-8 w-8 text-primary-500",
  paddingClassName = "p-8",
}: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const displayPath = getFileDisplayPath(file);

  const handleDrag = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(event.type !== "dragleave");
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    onSelect(event.dataTransfer.files?.[0] || null);
  };

  return (
    <label
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-center transition ${
        isDragging
          ? "border-primary-500 bg-primary-50"
          : "border-gray-300 hover:border-primary-400 hover:bg-primary-50/40"
      } ${paddingClassName} ${className}`}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
    >
      <FileText className={iconClassName} />
      <span className="max-w-full truncate text-sm font-medium text-gray-700">
        {displayPath || placeholder}
      </span>
      <span className="text-xs text-gray-500">{helperText}</span>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(event) => onSelect(event.target.files?.[0] || null)}
      />
    </label>
  );
}
