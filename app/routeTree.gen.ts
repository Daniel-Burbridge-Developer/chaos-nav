import { Route as rootRoute } from "./routes/__root"
import { Route as IndexImport } from "./routes/index"
import { Route as RouteRouteIdImport } from "./routes/route/$routeId"

// Create/Update Routes

const IndexRoute = IndexImport.update({
  path: "/",
  getParentRoute: () => rootRoute,
} as any)

const RouteRouteIdRoute = RouteRouteIdImport.update({
  path: "/route/$routeId",
  getParentRoute: () => rootRoute,
} as any)

// Populate the FileRoutesByPath interface

declare module "@tanstack/react-router" {
  interface FileRoutesByPath {
    "/": {
      id: "/"
      path: "/"
      fullPath: "/"
      preLoaderRoute: typeof IndexImport
      parentRoute: typeof rootRoute
    }
    "/route/$routeId": {
      id: "/route/$routeId"
      path: "/route/$routeId"
      fullPath: "/route/$routeId"
      preLoaderRoute: typeof RouteRouteIdImport
      parentRoute: typeof rootRoute
    }
  }
}

// Create and export the route tree

export const routeTree = rootRoute.addChildren({
  IndexRoute,
  RouteRouteIdRoute,
})

/* prettier-ignore-end */
