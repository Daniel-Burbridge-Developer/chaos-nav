import { createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy } from "react";

import { useState } from "react";
import { AppSidebar } from "~/components/app-sidebar";
import { BusMap } from "~/components/bus-map";
import { MapCanvas } from "./-components/map-view/MapCanvas";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { Separator } from "~/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";
import type { BusRoute } from "../../types/bus-routes";

export const Route = createFileRoute("/")({
  ssr: false,
  component: RouteComponent,
});

const LazyInteractiveMap = lazy(() =>
  import("./-components/map-view/MapCanvas").then((module) => ({
    default: module.MapCanvas,
  }))
);

export default function RouteComponent() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="align-middle w-full text-center">Search a Route</div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <Suspense fallback={<div>Loading Map...</div>}>
            <LazyInteractiveMap />
          </Suspense>
        </div>
        <footer className="mt-8 px-4 py-2 text-xs text-muted-foreground text-center border-t">
          TP-Scry is an independent project and is not affiliated with
          Transperth. All data is sourced from publicly accessible information.
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
