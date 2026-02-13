import { useState, useRef, useEffect, useCallback } from 'react'
import { useMap } from 'react-leaflet'
import SearchIcon from '@mui/icons-material/Search'
import CloseIcon from '@mui/icons-material/Close'
import LocationOnIcon from '@mui/icons-material/LocationOn'

// Nominatim geocoding API
const NOMINATIM_API = 'https://nominatim.openstreetmap.org/search'

// Tunisia bounding box for limiting search results
const TUNISIA_BOUNDS = {
  minLon: 7.5,
  minLat: 30.2,
  maxLon: 11.6,
  maxLat: 37.5
}

// Debounce utility
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

function SearchControl() {
  const map = useMap()
  const [isExpanded, setIsExpanded] = useState(false)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef(null)
  const containerRef = useRef(null)

  const debouncedQuery = useDebounce(query, 300)

  // Fetch suggestions from Nominatim
  const fetchSuggestions = useCallback(async (searchQuery) => {
    if (!searchQuery || searchQuery.length < 2) {
      setSuggestions([])
      return
    }

    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        format: 'json',
        limit: '5',
        countrycodes: 'tn', // Limit to Tunisia
        bounded: '1',
        viewbox: `${TUNISIA_BOUNDS.minLon},${TUNISIA_BOUNDS.maxLat},${TUNISIA_BOUNDS.maxLon},${TUNISIA_BOUNDS.minLat}`
      })

      const response = await fetch(`${NOMINATIM_API}?${params}`, {
        headers: {
          'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8'
        }
      })

      if (!response.ok) throw new Error('Failed to fetch suggestions')

      const data = await response.json()
      setSuggestions(data)
    } catch (error) {
      console.error('Geocoding error:', error)
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch suggestions when debounced query changes
  useEffect(() => {
    fetchSuggestions(debouncedQuery)
  }, [debouncedQuery, fetchSuggestions])

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isExpanded])

  // Handle click outside to collapse
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsExpanded(false)
        setSuggestions([])
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fly to location
  const flyToLocation = useCallback((lat, lon, displayName) => {
    const latitude = parseFloat(lat)
    const longitude = parseFloat(lon)

    if (!isNaN(latitude) && !isNaN(longitude)) {
      map.flyTo([latitude, longitude], 16, {
        duration: 1.5,
        easeLinearity: 0.25
      })
    }

    // Collapse and clear after selection
    setIsExpanded(false)
    setQuery('')
    setSuggestions([])
    setSelectedIndex(-1)
  }, [map])

  // Handle suggestion selection
  const handleSelectSuggestion = useCallback((suggestion) => {
    flyToLocation(suggestion.lat, suggestion.lon, suggestion.display_name)
  }, [flyToLocation])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleSelectSuggestion(suggestions[selectedIndex])
      } else if (suggestions.length > 0) {
        handleSelectSuggestion(suggestions[0])
      }
    } else if (e.key === 'Escape') {
      setIsExpanded(false)
      setSuggestions([])
      setSelectedIndex(-1)
    }
  }, [suggestions, selectedIndex, handleSelectSuggestion])

  // Handle search icon click
  const handleToggle = useCallback(() => {
    setIsExpanded(prev => !prev)
    if (isExpanded) {
      setQuery('')
      setSuggestions([])
      setSelectedIndex(-1)
    }
  }, [isExpanded])

  // Clear search
  const handleClear = useCallback(() => {
    setQuery('')
    setSuggestions([])
    setSelectedIndex(-1)
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  return (
    <div 
      ref={containerRef}
      className={`search-control ${isExpanded ? 'search-control--expanded' : ''}`}
    >
      {!isExpanded ? (
        <button 
          className="search-control__icon-btn"
          onClick={handleToggle}
          title="Search location"
        >
          <SearchIcon />
        </button>
      ) : (
        <div className="search-control__container">
          <div className="search-control__input-wrapper">
            <SearchIcon className="search-control__input-icon" />
            <input
              ref={inputRef}
              type="text"
              className="search-control__input"
              placeholder="Search location in Tunisia..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSelectedIndex(-1)
              }}
              onKeyDown={handleKeyDown}
            />
            {query && (
              <button 
                className="search-control__clear-btn"
                onClick={handleClear}
                title="Clear"
              >
                <CloseIcon fontSize="small" />
              </button>
            )}
            <button 
              className="search-control__close-btn"
              onClick={handleToggle}
              title="Close"
            >
              <CloseIcon fontSize="small" />
            </button>
          </div>

          {/* Suggestions dropdown */}
          {(suggestions.length > 0 || isLoading) && (
            <div className="search-control__suggestions">
              {isLoading && suggestions.length === 0 && (
                <div className="search-control__loading">
                  <div className="search-control__spinner"></div>
                  <span>Searching...</span>
                </div>
              )}
              
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.place_id}
                  className={`search-control__suggestion ${
                    index === selectedIndex ? 'search-control__suggestion--selected' : ''
                  }`}
                  onClick={() => handleSelectSuggestion(suggestion)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <LocationOnIcon className="search-control__suggestion-icon" />
                  <div className="search-control__suggestion-content">
                    <div className="search-control__suggestion-name">
                      {suggestion.display_name.split(',')[0]}
                    </div>
                    <div className="search-control__suggestion-address">
                      {suggestion.display_name.split(',').slice(1).join(',').trim()}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No results message */}
          {query.length >= 2 && !isLoading && suggestions.length === 0 && (
            <div className="search-control__no-results">
              No locations found
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SearchControl
