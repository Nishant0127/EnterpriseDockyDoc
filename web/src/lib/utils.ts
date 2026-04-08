import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility for composing Tailwind class names safely.
 * Uses clsx for conditional logic + tailwind-merge to resolve conflicts.
 *
 * Usage:
 *   cn('px-4 py-2', isActive && 'bg-brand-600', className)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
