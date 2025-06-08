import { createFileRoute, notFound } from "@tanstack/react-router"
import { BusMap } from "../../components/bus-map"
import { PageHeader } from "../../components/page-header"

export const Route = createFileRoute("/route/$routeId")({
  component: RouteComponent,
  loader: async ({ params }) => {
    // Fetch route data
    try {
      const response = await fetch(`/api/v1/routes/${params.routeId}`)
      if (!response.ok) {
        throw notFound()
      }
      const route = await response.json()
      return { route }
    } catch (error) {
      throw notFound()
    }
  },
})

function RouteComponent() {
  const { route } = Route.useLoaderData()
  const { routeId } = Route.useParams()

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title={`Route ${route.routeNumber}`}
        description={`${route.routeName} - ${route.origin} to ${route.destination}`}
      />
      <div className="flex-1 p-4">
        <BusMap selectedRoute={route} />
      </div>
    </div>
  )
}
