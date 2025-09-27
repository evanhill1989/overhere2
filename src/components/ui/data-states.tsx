// src/components/ui/data-states.tsx
import * as React from "react";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Loading state
export function LoadingState({
  message = "Loading...",
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-muted-foreground text-sm">{message}</span>
    </div>
  );
}

// Error state with retry
export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  className,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-destructive/5 border-destructive/20 flex flex-col items-center gap-3 rounded-lg border p-4 text-center",
        className,
      )}
    >
      <AlertTriangle className="text-destructive h-8 w-8" />
      <div>
        <p className="text-sm font-medium">{title}</p>
        {message && <p className="text-muted-foreground text-xs">{message}</p>}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="mr-1 h-3 w-3" />
          Try again
        </Button>
      )}
    </div>
  );
}

// Empty state
export function EmptyState({
  title,
  description,
  icon: Icon,
  action,
  className,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 p-8 text-center",
        className,
      )}
    >
      {Icon && <Icon className="text-muted-foreground/50 h-12 w-12" />}
      <div>
        <p className="text-muted-foreground text-sm font-medium">{title}</p>
        {description && (
          <p className="text-muted-foreground/80 text-xs">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

// Section wrapper with title + state
export function DataSection({
  title,
  isLoading,
  error,
  onRetry,
  isEmpty,
  emptyState,
  children,
  className,
}: {
  title: string;
  isLoading: boolean;
  error?: Error | null;
  onRetry?: () => void;
  isEmpty?: boolean;
  emptyState?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        {isLoading && (
          <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
        )}
      </div>

      {error ? (
        <ErrorState
          title={`Failed to load ${title.toLowerCase()}`}
          message={error.message}
          onRetry={onRetry}
        />
      ) : isEmpty ? (
        emptyState
      ) : (
        children
      )}
    </div>
  );
}
