import { useState, useEffect, useCallback } from "react"

export function useDebouncedSearch(delay = 300) {
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [isSearching, setIsSearching] = useState(false)

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

  const updateSearchTerm = useCallback((term: string) => {
    setSearchTerm(term)
  }, [])

  return {
    searchTerm,
    debouncedSearchTerm,
    isSearching,
    updateSearchTerm,
  }
}
