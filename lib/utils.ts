import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function createPageUrl(pageName: string) {
  return "/" + pageName.replace(/ /g, "-");
}

export function formatNumber(n: number): string {
  return n.toString().padStart(2, "0");
}
