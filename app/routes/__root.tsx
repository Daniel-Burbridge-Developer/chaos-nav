import { createRootRoute, Outlet } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/router-devtools"
import { AppSidebar } from "../components/app-sidebar"
import { SidebarProvider, SidebarInset } from "~/components/ui/sidebar"

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-1 flex-col">
          <Outlet />
        </div>
      </SidebarInset>
      <TanStackRouterDevtools />
    </SidebarProvider>
  )
}
