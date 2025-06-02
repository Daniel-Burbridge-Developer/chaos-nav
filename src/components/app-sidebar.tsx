"use client";

import type * as React from "react";
import { Bus, Map, Route, Settings, Star, Clock } from "lucide-react";
import { RouteSearch } from "./route-search";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "~/components/ui/sidebar";
import type { BusRoute } from "types/bus-routes";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  onRouteSelect: (route: BusRoute) => void;
  selectedRoute?: BusRoute | null;
  featuredRoutes?: BusRoute[];
}

const navigationItems = [
  {
    title: "Map",
    url: "#map",
    icon: Map,
    isActive: true,
  },
  {
    title: "Routes",
    url: "#routes",
    icon: Route,
    isActive: false,
  },
  {
    title: "Favorites",
    url: "#favorites",
    icon: Star,
    isActive: false,
  },
  {
    title: "History",
    url: "#history",
    icon: Clock,
    isActive: false,
  },
];

export function AppSidebar({
  onRouteSelect,
  selectedRoute,
  featuredRoutes,
  ...props
}: AppSidebarProps) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <div className="flex items-center gap-2">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Bus className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">TP Scry</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Transperth Simplified
                  </span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={item.isActive}>
                    <a href={item.url} className="flex items-center gap-2">
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Route Search */}
        <SidebarGroup>
          <SidebarGroupLabel>Search Routes</SidebarGroupLabel>
          <SidebarGroupContent>
            <RouteSearch onRouteSelect={onRouteSelect} onSearchChange={} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href="#settings" className="flex items-center gap-2">
                <Settings className="size-4" />
                <span>Settings</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
