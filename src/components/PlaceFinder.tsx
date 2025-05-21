"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LocateFixed, Loader2 } from "lucide-react"; // Kept for placeholder controls
import dynamic from "next/dynamic";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  // DrawerTrigger, // We will control 'open' via state for this pattern
} from "@/components/ui/drawer";

const UserMap = dynamic(() => import("@/components/UserMap"), {
  ssr: false,
  loading: () => (
    <div className="bg-muted absolute inset-0 z-0 flex h-full w-full items-center justify-center">
      <Loader2 className="text-muted-foreground mr-2 h-6 w-6 animate-spin" />
      <span className="text-muted-foreground">Loading map...</span>
    </div>
  ),
});

export default function PlaceFinder() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="relative flex h-full w-full flex-col gap-4 overflow-hidden">
      <div className="bg-background/80 flex flex-shrink-0 flex-col items-center gap-2 rounded-lg p-4 shadow-md backdrop-blur-sm">
        <p className="text-lg font-semibold">Map Controls & Drawer Toggle</p>
        <div className="flex gap-2">
          <input
            type="search"
            placeholder="Search (disabled)"
            className="w-60 rounded-md border p-2"
            disabled
          />
          <Button variant="outline" disabled>
            <LocateFixed className="mr-2 h-5 w-5" />
            Nearby (disabled)
          </Button>
        </div>
        <Button
          variant="secondary"
          onClick={() => setIsDrawerOpen((prev) => !prev)}
        >
          {isDrawerOpen
            ? "Force Close Drawer (Test)"
            : "Force Open Drawer (Test)"}
        </Button>
      </div>

      <div className="bg-muted relative z-0 flex-grow rounded-md">
        <UserMap places={[]} selectedPlace={null} userLocation={null} />
      </div>

      <Drawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen} // Allows Esc, overlay click, swipe to close
        modal={false} // Allows map interaction while drawer is open
      >
        {/* No DrawerTrigger needed if 'open' is controlled by external state for initial appearance */}
        <DrawerContent className="focus:outline-none">
          <div className="mx-auto flex h-full w-full max-w-sm flex-col">
            {/* This div acts as the visual grab handle and part of the "top bar" */}
            <div className="bg-muted mx-auto mt-2 h-1.5 w-12 flex-shrink-0 cursor-grab rounded-full active:cursor-grabbing" />
            <DrawerHeader className="pt-2 text-center">
              <DrawerTitle>Drawer Title</DrawerTitle>
              <DrawerDescription>Drag or swipe this drawer.</DrawerDescription>
            </DrawerHeader>
            <div className="flex-grow overflow-y-auto p-4 pb-0">
              <p>Some content inside the drawer.</p>
              {Array.from({ length: 20 }).map((_, i) => (
                <p key={i}>Scrollable item {i + 1}</p>
              ))}
            </div>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="outline">Close Drawer</Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
