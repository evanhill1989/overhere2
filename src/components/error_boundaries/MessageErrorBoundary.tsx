// src/components/MessageErrorBoundary.tsx
"use client";

import React from "react";
import { Button } from "@/components/ui/button";

export class MessageErrorBoundary extends React.Component<
  React.PropsWithChildren<{ onReset?: () => void }>,
  { hasError: boolean }
> {
  constructor(props: React.PropsWithChildren<{ onReset?: () => void }>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("Messaging error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="border-destructive/20 bg-destructive/5 rounded border p-4 text-center">
          <p className="text-destructive mb-2 text-sm font-medium">
            Messaging temporarily unavailable
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              this.setState({ hasError: false });
              this.props.onReset?.();
            }}
          >
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
