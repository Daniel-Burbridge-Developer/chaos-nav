import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
import { BusMap } from "../components/bus-map"
import { PageHeader } from "../components/page-header"

const searchSchema = z.object({
  q: z.string().optional(),
})

export const Route = createFileRoute("/")({
  component: IndexComponent,
  validateSearch: searchSchema,
})

function IndexComponent() {
  const search = Route.useSearch()

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="Live Map" description="Real-time bus tracking and route information" searchQuery={search.q} />
      <div className="flex-1 p-4">
        <BusMap />
      </div>
    </div>
  )
}
