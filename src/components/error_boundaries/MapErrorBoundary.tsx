// src/components/MapErrorBoundary.tsx
"use client";

import React from "react";

export class MapErrorBoundary extends React.Component<
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
        <div className="bg-muted flex h-full w-full items-center justify-center">
          <p className="text-muted-foreground text-sm">Map unavailable</p>
        </div>
      );
    }

    return this.props.children;
  }
}
