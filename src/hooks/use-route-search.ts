"use client"

import { useState, useEffect, useCallback } from "react"
import { useNavigate, useSearch } from "@tanstack/react-router"
import type { BusRoute } from "../types/bus-routes"

interface UseRouteSearchOptions {
  delay?: number
  onRouteSelect?: (route: BusRoute) => void
}

export function useRouteSearch({ delay = 300, onRouteSelect }: UseRouteSearchOptions = {}) {
  const navigate = useNavigate()
  const search = useSearch({ from: "/" })

  const [searchTerm, setSearchTerm] = useState(search?.q || "")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [routes, setRoutes] = useState<BusRoute[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Debounce search term
  useEffect(() => {
    if (searchTerm) {
      setIsSearching(true)
      const timer = setTimeout(() => {
        setDebouncedSearchTerm(searchTerm)
        setIsSearching(false)
      }, delay)

      return () => clearTimeout(timer)
    } else {
      setDebouncedSearchTerm("")
      setIsSearching(false)
    }
  }, [searchTerm, delay])

  // Update URL when search term changes
  useEffect(() => {
    if (searchTerm !== (search?.q || "")) {
      navigate({
        to: "/",
        search: searchTerm ? { q: searchTerm } : {},
        replace: true,
      })
    }
  }, [searchTerm, search?.q, navigate])

  // Fetch routes when debounced search term changes
  useEffect(() => {
    if (debouncedSearchTerm) {
      fetchRoutes(debouncedSearchTerm)
    } else {
      setRoutes([])
    }
  }, [debouncedSearchTerm])

  const fetchRoutes = async (query: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/v1/routes?q=${encodeURIComponent(query)}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Response is not JSON")
      }

      const data = await response.json()
      setRoutes(data.routes || [])
    } catch (error) {
      console.error("Error fetching routes:", error)
      setError("Failed to search routes. Please try again.")
      setRoutes([])
    } finally {
      setIsLoading(false)
    }
  }

  const updateSearchTerm = useCallback((term: string) => {
    setSearchTerm(term)
  }, [])

  const selectRoute = useCallback(
    (route: BusRoute) => {
      navigate({
        to: "/route/$routeId",
        params: { routeId: route.id },
      })
      onRouteSelect?.(route)
    },
    [navigate, onRouteSelect],
  )

  return {
    searchTerm,
    debouncedSearchTerm,
    routes,
    isSearching,
    isLoading,
    error,
    updateSearchTerm,
    selectRoute,
  }
}
