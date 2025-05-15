// src/components/CheckInDialog.tsx
"use client";

import React, { useState, useRef } from "react";
import type { Place } from "@/types/places";
import type { LocationData } from "@/hooks/useGeolocation";
import { CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  // DialogOverlay, // Removed for simplicity
  DialogPortal,
} from "@/components/ui/dialog";
import { CheckInForm } from "./CheckInForm";

import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

interface CheckInDialogProps {
  place: Place;
  currentUserLocation: LocationData | null;
}

export function CheckInDialog({
  place,
  currentUserLocation,
}: CheckInDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const animationTimelineRef = useRef<gsap.core.Timeline | null>(null);

  const DURATION = 0.25;

  const { contextSafe } = useGSAP();

  const animateOutAndSetClosed = contextSafe(() => {
    if (animationTimelineRef.current?.isActive()) {
      animationTimelineRef.current.progress(1); // Fast-forward if already animating
    }
    if (!isOpen || !dialogContentRef.current) {
      // Check if it was even open or ref is missing
      if (!isOpen) document.body.style.overflow = "";
      setIsOpen(false); // Ensure state is false if called when already closed/unmounted
      return;
    }

    const tl = gsap.timeline({
      onComplete: () => {
        setIsOpen(false);
        document.body.style.overflow = "";
        animationTimelineRef.current = null;
      },
    });
    animationTimelineRef.current = tl;

    tl.to(
      dialogContentRef.current,
      {
        autoAlpha: 0,
        scale: 0.95,
        y: "10px",
        duration: DURATION * 0.8,
        ease: "power1.in",
      },
      0,
    );
  });

  useGSAP(
    () => {
      const contentEl = dialogContentRef.current;

      if (isOpen) {
        if (!contentEl) {
          // Element not yet in DOM for GSAP to target
          return;
        }
        // Ensure any previous animation is killed to prevent conflicts
        animationTimelineRef.current?.kill();
        document.body.style.overflow = "hidden";

        // Explicitly set the starting state for GSAP, then animate TO the final state.
        // GSAP's autoAlpha handles both opacity and visibility.
        gsap.fromTo(
          contentEl,
          {
            // FROM state
            autoAlpha: 0, // Start invisible and non-interactive
            scale: 0.92,
            y: "15px",
            transformOrigin: "center center",
          },
          {
            // TO state
            autoAlpha: 1, // End visible and interactive
            scale: 1,
            y: "0px",
            duration: DURATION,
            ease: "power1.out",
            delay: 0.01, // Tiny delay to ensure element is fully ready after isOpen=true
            onComplete: () => {
              animationTimelineRef.current = null;
            },
          },
        );
        // Store the current animation if you need to interact with it (e.g. kill it)
        // animationTimelineRef.current = ... result of the gsap.fromTo if it returns a timeline/tween
        // For a single fromTo, direct assignment isn't standard. Timelines are better for this.
        // Let's ensure it's clear:
        animationTimelineRef.current =
          gsap.getTweensOf(contentEl)[0]?.timeline || null;
      }
      // Exit animation is handled by animateOutAndSetClosed
    },
    { dependencies: [isOpen] },
  ); // This effect runs when isOpen changes

  const handleOpenChange = (openState: boolean) => {
    if (openState) {
      if (animationTimelineRef.current?.isActive()) {
        animationTimelineRef.current.progress(1); // Complete any outgoing animation
      }
      setIsOpen(true);
    } else {
      animateOutAndSetClosed();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          className="hover:bg-muted hover:border-border focus:ring-primary focus:border-primary w-full rounded border border-transparent p-2 text-left focus:ring-1 focus:outline-none"
          aria-label={`Check in at ${place.name}`}
        >
          <div className="flex items-center gap-1">
            <span className="font-medium">{place.name}</span>
            {place.isVerified && (
              <span title="Verified by overHere">
                <CheckCircle2 className="text-primary h-4 w-4 shrink-0" />
              </span>
            )}
          </div>
          <br />
          <span className="text-muted-foreground text-xs">{place.address}</span>
        </button>
      </DialogTrigger>
      {isOpen && (
        <DialogPortal>
          {/* No explicit DialogOverlay here for the sanity check */}
          <DialogContent
            ref={dialogContentRef}
            onOpenAutoFocus={(e) => e.preventDefault()}
            className="opacity-0" // Start with opacity-0; GSAP will take over with autoAlpha
            // This class helps prevent flash of unstyled content if GSAP is slow
          >
            <DialogHeader className="p-6 pb-4">
              <DialogTitle>
                Check in at: {place.name}
                {place.isVerified && (
                  <span
                    title="Verified by overHere"
                    className="text-primary ml-2 inline-flex items-center gap-1"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  </span>
                )}
              </DialogTitle>
              <DialogDescription>{place.address}</DialogDescription>
            </DialogHeader>
            <div className="px-6 pt-0 pb-6">
              <CheckInForm
                place={place}
                currentUserLocation={currentUserLocation}
                onSuccessfulCheckin={animateOutAndSetClosed}
                onCancel={animateOutAndSetClosed}
              />
            </div>
          </DialogContent>
        </DialogPortal>
      )}
    </Dialog>
  );
}
