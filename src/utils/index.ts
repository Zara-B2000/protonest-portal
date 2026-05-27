import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format LKR currency */
export function formatLKR(amount: number): string {
  return `LKR ${amount.toLocaleString("en-LK", { minimumFractionDigits: 2 })}`;
}

/** Format a date string for display */
export function formatDate(date: string | null, fallback = "—"): string {
  if (!date) return fallback;
  return new Date(date).toLocaleDateString("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Format a timestamp for display */
export function formatDateTime(date: string | null, fallback = "—"): string {
  if (!date) return fallback;
  return new Date(date).toLocaleString("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Generate a random discount token code */
export function generateTokenCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

/** File size in human-readable format */
export function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Check if a discount token is still valid */
export function isTokenValid(validUntil: string, used: boolean): boolean {
  return !used && new Date(validUntil) > new Date();
}

/** Validate file type against accepted extensions */
export function validateFileType(file: File, accepted: string): boolean {
  const extensions = accepted.split(",").map((e) => e.trim().toLowerCase());
  const fileExt = "." + file.name.split(".").pop()?.toLowerCase();
  return extensions.includes(fileExt);
}

/** Validate file size */
export function validateFileSize(file: File, maxMB: number): boolean {
  return file.size <= maxMB * 1024 * 1024;
}
