// src/components/PlaceDetailsErrorBoundary.tsx
"use client";

import React from "react";
import { Button } from "@/components/ui/button";

export class PlaceDetailsErrorBoundary extends React.Component<
  React.PropsWithChildren<unknown>,
  { hasError: boolean }
> {
  constructor(props: React.PropsWithChildren<unknown>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="space-y-2 p-4 text-center">
          <p className="text-muted-foreground text-sm">
            Unable to load place details
          </p>
          <Button size="sm" onClick={() => this.setState({ hasError: false })}>
            Retry
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
