// src/components/ui/loading.tsx
import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Base loading spinner
export function LoadingSpinner({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & {
  size?: "sm" | "default" | "lg";
}) {
  const sizeClasses = {
    sm: "h-4 w-4",
    default: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <div
      className={cn("flex items-center justify-center", className)}
      {...props}
    >
      <Loader2 className={cn("animate-spin", sizeClasses[size])} />
    </div>
  );
}

// Inline loading (for buttons, small components)
export function InlineLoading({
  text = "Loading...",
  className,
  size = "sm",
}: {
  text?: string;
  className?: string;
  size?: "sm" | "default";
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <LoadingSpinner size={size} />
      <span className="text-muted-foreground text-sm">{text}</span>
    </div>
  );
}

// Full page loading
export function PageLoading({
  message = "Loading...",
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-[400px] w-full flex-col items-center justify-center gap-4",
        className,
      )}
    >
      <LoadingSpinner size="lg" />
      <p className="text-muted-foreground text-lg">{message}</p>
    </div>
  );
}

// Section loading (for specific sections of a page)
export function SectionLoading({
  message = "Loading...",
  className,
  height = "200px",
}: {
  message?: string;
  className?: string;
  height?: string;
}) {
  return (
    <div
      className={cn("flex items-center justify-center", className)}
      style={{ minHeight: height }}
    >
      <InlineLoading text={message} />
    </div>
  );
}

// Skeleton loader for lists
export function SkeletonList({
  count = 3,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse space-y-2">
          <div className="bg-muted h-4 w-3/4 rounded"></div>
          <div className="bg-muted h-3 w-1/2 rounded"></div>
        </div>
      ))}
    </div>
  );
}

// Card skeleton
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-lg border p-4", className)}>
      <div className="space-y-3">
        <div className="bg-muted h-5 w-3/4 rounded"></div>
        <div className="bg-muted h-4 w-full rounded"></div>
        <div className="bg-muted h-4 w-2/3 rounded"></div>
      </div>
    </div>
  );
}
