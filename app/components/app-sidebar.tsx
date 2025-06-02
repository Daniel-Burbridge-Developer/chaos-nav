import { Bus, Map, Route, Settings, Star, Clock, Home } from "lucide-react"
import { RouteSearch } from "./route-search"
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
} from "~/components/ui/sidebar"
import type { BusRoute } from "../types/bus-routes"

interface AppSidebarProps {
  onRouteSelect: (route: BusRoute) => void
  onSearchChange: (query: string) => void
}

const navigationItems = [
  {
    title: "Home",
    icon: Home,
    isActive: true,
  },
  {
    title: "Live Map",
    icon: Map,
    isActive: false,
  },
  {
    title: "All Routes",
    icon: Route,
    isActive: false,
  },
  {
    title: "Favorites",
    icon: Star,
    isActive: false,
  },
  {
    title: "Schedules",
    icon: Clock,
    isActive: false,
  },
]

export function AppSidebar({ onRouteSelect, onSearchChange }: AppSidebarProps) {
  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <div className="flex items-center gap-2">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Bus className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Bus Routes</span>
                  <span className="truncate text-xs text-muted-foreground">Transit System</span>
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
                  <SidebarMenuButton isActive={item.isActive}>
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
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
            <RouteSearch onRouteSelect={onRouteSelect} onSearchChange={onSearchChange} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <Settings className="size-4" />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
