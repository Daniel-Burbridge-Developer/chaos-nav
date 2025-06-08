import { json } from '@tanstack/react-start'
import { createAPIFileRoute } from '@tanstack/react-start/api'

export const APIRoute = createAPIFileRoute('/api/v1/route-data/$busNumber')({
  GET: ({ request, params }) => {
    return json({ message: 'Hello "/api/v1/route-data/$busNumber"!' })
  },
})
