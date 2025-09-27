// src/components/ui/error.tsx
import * as React from "react";
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export type ErrorType =
  | "network"
  | "server"
  | "validation"
  | "permission"
  | "not-found"
  | "rate-limit"
  | "unknown";

interface BaseErrorProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  showIcon?: boolean;
}

// Generic error display
export function ErrorDisplay({
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  onRetry,
  retryLabel = "Try Again",
  className,
  showIcon = true,
}: BaseErrorProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 p-6 text-center",
        className,
      )}
    >
      {showIcon && <AlertTriangle className="text-destructive h-12 w-12" />}
      <div className="space-y-2">
        <h3 className="text-foreground text-lg font-semibold">{title}</h3>
        <p className="text-muted-foreground max-w-md text-sm">{message}</p>
      </div>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

// Inline error (for form fields, small components)
export function InlineError({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <Alert variant="destructive" className={cn("my-2", className)}>
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

// Network error specific
export function NetworkError({
  onRetry,
  className,
}: {
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 p-6 text-center",
        className,
      )}
    >
      <WifiOff className="text-muted-foreground h-12 w-12" />
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Connection Problem</h3>
        <p className="text-muted-foreground max-w-md text-sm">
          Unable to connect to the internet. Please check your connection and
          try again.
        </p>
      </div>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="gap-2">
          <Wifi className="h-4 w-4" />
          Try Again
        </Button>
      )}
    </div>
  );
}

// Location error specific
export function LocationError({
  onRetry,
  className,
}: {
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 p-6 text-center",
        className,
      )}
    >
      <AlertTriangle className="h-12 w-12 text-amber-500" />
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Location Required</h3>
        <p className="text-muted-foreground max-w-md text-sm">
          We need your location to show nearby places. Please enable location
          access in your browser.
        </p>
      </div>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          Enable Location
        </Button>
      )}
    </div>
  );
}

// Empty state
export function EmptyState({
  title = "Nothing here yet",
  message = "No items to display at the moment.",
  icon: Icon,
  action,
  className,
}: {
  title?: string;
  message?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 p-8 text-center",
        className,
      )}
    >
      {Icon && <Icon className="text-muted-foreground/50 h-16 w-16" />}
      <div className="space-y-2">
        <h3 className="text-muted-foreground text-lg font-medium">{title}</h3>
        <p className="text-muted-foreground/80 max-w-md text-sm">{message}</p>
      </div>
      {action}
    </div>
  );
}

// Error boundary fallback
export function ErrorBoundaryFallback({
  error,
  resetError,
  className,
}: {
  error: Error;
  resetError: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-destructive/20 bg-destructive/5 rounded-lg border p-6",
        className,
      )}
    >
      <ErrorDisplay
        title="Oops! Something went wrong"
        message={
          process.env.NODE_ENV === "development"
            ? error.message
            : "An unexpected error occurred. Please refresh the page."
        }
        onRetry={resetError}
        retryLabel="Refresh"
        showIcon={false}
      />
    </div>
  );
}

// Typed error component that adapts based on error type
export function TypedError({
  error,
  onRetry,
  className,
}: {
  error: {
    type: ErrorType;
    message?: string;
    title?: string;
  };
  onRetry?: () => void;
  className?: string;
}) {
  const getErrorConfig = (type: ErrorType) => {
    switch (type) {
      case "network":
        return {
          title: "Connection Problem",
          message: "Unable to connect. Please check your internet connection.",
          icon: WifiOff,
        };
      case "permission":
        return {
          title: "Permission Denied",
          message: "You don't have permission to access this resource.",
          icon: AlertTriangle,
        };
      case "not-found":
        return {
          title: "Not Found",
          message: "The requested resource could not be found.",
          icon: AlertTriangle,
        };
      case "rate-limit":
        return {
          title: "Too Many Requests",
          message: "Please wait a moment before trying again.",
          icon: AlertTriangle,
        };
      case "server":
        return {
          title: "Server Error",
          message: "Our servers are having trouble. Please try again later.",
          icon: AlertTriangle,
        };
      case "validation":
        return {
          title: "Invalid Input",
          message: error.message || "Please check your input and try again.",
          icon: AlertTriangle,
        };
      default:
        return {
          title: "Something went wrong",
          message: error.message || "An unexpected error occurred.",
          icon: AlertTriangle,
        };
    }
  };

  if (error.type === "network") {
    return <NetworkError onRetry={onRetry} className={className} />;
  }

  const config = getErrorConfig(error.type);

  return (
    <ErrorDisplay
      title={error.title || config.title}
      message={error.message || config.message}
      onRetry={onRetry}
      className={className}
    />
  );
}
