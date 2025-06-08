import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb"
import { Separator } from "~/components/ui/separator"
import { SidebarTrigger } from "~/components/ui/sidebar"
import type { BusRoute } from "../types/bus-routes"

interface PageHeaderProps {
  title: string
  description?: string
  searchQuery?: string
  selectedRoute?: BusRoute | null
}

export function PageHeader({ title, description, searchQuery, selectedRoute }: PageHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem className="hidden md:block">
            <BreadcrumbLink href="/">Bus Routes</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="hidden md:block" />
          <BreadcrumbItem>
            <BreadcrumbPage>
              {selectedRoute ? `Route ${selectedRoute.routeNumber}` : searchQuery ? `Search: ${searchQuery}` : title}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      {description && <div className="ml-auto hidden md:block text-sm text-muted-foreground">{description}</div>}
    </header>
  )
}
