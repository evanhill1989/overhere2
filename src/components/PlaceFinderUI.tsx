"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { usePlaceFinder } from "@/context/PlaceFinderProvider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search as SearchIcon } from "lucide-react";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import PlacesList from "./PlacesList";

// Dynamically import map
const UserMap = dynamic(() => import("./UserMap"), {
  ssr: false,
  loading: () => (
    <div className="bg-muted absolute inset-0 z-0 flex h-full w-full items-center justify-center">
      <Loader2 className="text-muted-foreground mr-2 h-6 w-6 animate-spin" />
      <span className="text-muted-foreground">Loading map...</span>
    </div>
  ),
});

export default function PlaceFinderUI() {
  const {
    derivedDisplayedPlaces,
    isLoadingOverall,
    searchFormAction,
    isSearchPending,
    searchQuery,
    setSearchQuery,
  } = usePlaceFinder();

  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="relative h-full w-full">
      {/* Background Map Layer */}
      <div className="absolute inset-0 z-0">
        <UserMap places={derivedDisplayedPlaces} selectedPlace={null} />
      </div>

      {/* Floating Search Bar */}
      <div className="pointer-events-none absolute top-0 right-0 left-0 z-100 flex justify-center p-3 sm:p-4">
        <div className="bg-accent/80 pointer-events-auto flex w-full max-w-md flex-col items-center gap-2 rounded-lg border-1 p-3 sm:p-4">
          <form action={searchFormAction} className="flex w-full items-center">
            <Input
              className="bg-foreground text-muted rounded-none border-none"
              name="searchQuery"
              type="search"
              placeholder="Search place by name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isLoadingOverall}
            />
            <Button
              className="rounded-none border-white"
              type="submit"
              size="icon"
              variant="outline"
              disabled={isLoadingOverall || !searchQuery.trim()}
            >
              {isSearchPending && searchQuery ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SearchIcon className="h-4 w-4 font-bold" />
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* Drawer Trigger Button */}

      {/* Places Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <div className="pointer-events-none absolute right-0 bottom-4 left-0 z-20 flex justify-center p-3 sm:p-4">
          <div className="pointer-events-auto w-full max-w-md">
            <DrawerTrigger asChild>
              <Button
                className="hover:bg-primary font-heading w-full border-white p-8 text-3xl font-extrabold hover:text-white"
                variant="outline"
                size="sm"
                onClick={() => setDrawerOpen(true)}
              >
                Browse Nearby Places
              </Button>
            </DrawerTrigger>
          </div>
        </div>
        <DrawerContent className="bg-background-trans max-h-[80vh]">
          <div className="mx-auto w-full max-w-md">
            {/* !!! Edited drawer.tsx style directly on tab element to white */}
            <DrawerHeader className="border-b-1 px-4">
              <DrawerTitle className="text-2xl">Nearby Places</DrawerTitle>
              <DrawerDescription>
                Popular overhere locations close to you.
              </DrawerDescription>
            </DrawerHeader>

            <div className="h-[60vh] overflow-y-auto">
              {isLoadingOverall ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <PlacesList />
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
