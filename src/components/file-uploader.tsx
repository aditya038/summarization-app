"use client";

import { useState, useRef, type DragEvent } from "react";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export function FileUploader({ onFileSelect, disabled }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = (file: File | null | undefined) => {
    if (file && (file.type.startsWith("audio/") || file.type.startsWith("video/"))) {
      onFileSelect(file);
    } else if (file) {
      toast({
        variant: "destructive",
        title: "Invalid File Type",
        description: "Please upload a valid audio or video file.",
      });
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleButtonClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  return (
    <div
      className={cn(
        "flex h-48 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-card/50 transition-colors",
        { "border-primary bg-primary/10": isDragging && !disabled },
        { "cursor-pointer hover:border-primary/80": !disabled },
        { "cursor-not-allowed opacity-60": disabled }
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleButtonClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="audio/*,video/*"
        onChange={(e) => handleFile(e.target.files?.[0])}
        disabled={disabled}
      />
      <div className="flex flex-col items-center gap-2 text-center text-muted-foreground sm:gap-4">
        <UploadCloud className="size-10 sm:size-12" />
        <p className="font-semibold">Drag & drop or click to browse</p>
        <p className="text-xs sm:text-sm">Supports audio and video files</p>
      </div>
    </div>
  );
}

    