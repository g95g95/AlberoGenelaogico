import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-2xl bg-white p-4 shadow-sm border border-gray-100 dark:bg-surface-dark dark:border-gray-800 ${className}`}
    >
      {children}
    </div>
  );
}
