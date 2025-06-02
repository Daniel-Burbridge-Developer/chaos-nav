export interface BusRoute {
  id: string
  routeNumber: string
  routeName: string
  origin: string
  destination: string
  stops: BusStop[]
  color: string
  isActive: boolean
  schedule: RouteSchedule[]
}

export interface BusStop {
  id: string
  name: string
  latitude: number
  longitude: number
  arrivalTime?: string
}

export interface RouteSchedule {
  departureTime: string
  arrivalTime: string
  frequency: string
}

export interface SearchFilters {
  routeNumber?: string
  origin?: string
  destination?: string
  isActive?: boolean
}
