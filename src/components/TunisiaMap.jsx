import { useEffect, useState, useMemo, useCallback, useRef, memo } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap, useMapEvents, Marker } from 'react-leaflet'
import { fetchMunicipalities, fetchSectors, fetchLocations } from '../utils/api'
import L from 'leaflet'
import * as turf from '@turf/turf'

// Custom marker icons for different location types
const locationIcons = {
    pickup_point: L.divIcon({
        className: 'pickup-marker-icon',
        html: '<div class="pickup-marker pickup-marker--default">📍</div>',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
    }),
    pickup_point_with_agency: L.divIcon({
        className: 'pickup-marker-icon',
        html: '<div class="pickup-marker pickup-marker--with-agency">📍</div>',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
    }),
    pickup_point_without_agency: L.divIcon({
        className: 'pickup-marker-icon',
        html: '<div class="pickup-marker pickup-marker--without-agency">📍</div>',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
    }),
    driving_school: L.divIcon({
        className: 'pickup-marker-icon',
        html: '<div class="pickup-marker">🏫</div>',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
    }),
    exam_center: L.divIcon({
        className: 'pickup-marker-icon',
        html: '<div class="pickup-marker">📝</div>',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
    })
}

// Component to handle map click events
function MapClickHandler({ onMapClick, selectedRegion, enableAddLocations, currentGeoData }) {
    useMapEvents({
        click: (e) => {
            // If enableAddLocations toggle is ON, allow clicks anywhere.
            // Pass the feature that contains the click when available, otherwise null.
            console.log('enableAddLocations:', enableAddLocations);

            if (enableAddLocations) {
                let clickedFeature = null
                if (currentGeoData && currentGeoData.features) {
                    const pt = turf.point([e.latlng.lng, e.latlng.lat])
                    clickedFeature = currentGeoData.features.find(feature => {
                        try {
                            return turf.booleanPointInPolygon(pt, feature)
                        } catch (err) {
                            return false
                        }
                    }) || null
                }
                onMapClick(e.latlng, clickedFeature)
                // Original behavior: Allow creating pickup points when a region is selected (any level).
                console.log('selectedRegion', selectedRegion);

                if (selectedRegion && selectedRegion.type === 'Feature') {
                    const pt = turf.point([e.latlng.lng, e.latlng.lat])
                    try {
                        if (turf.booleanPointInPolygon(pt, selectedRegion)) {
                            onMapClick(e.latlng);
                        } else {
                            console.log('Click outside selected region, ignoring')
                            onMapClick(e.latlng);
                        }
                    } catch (err) {
                        console.warn('Error checking point-in-polygon:', err)
                    }
                } else {
                    // No region selected => ignore clicks for pickup creation
                    console.log('No region selected, ignoring click')
                }
            }

        }
    })
    return null
}

// Bounds fitter component
function BoundsFitter({ bounds }) {
    const map = useMap()

    useEffect(() => {
        if (bounds) {
            map.fitBounds(bounds, { padding: [50, 50] })
        }
    }, [map, bounds])

    return null
}

// Map controller for programmatic zoom/pan
function MapController({ flyToLocation }) {
    const map = useMap()

    useEffect(() => {
        if (flyToLocation && flyToLocation.latitude && flyToLocation.longitude) {
            const targetZoom = Math.max(map.getZoom(), 15) // Zoom to at least 15, or keep current if higher
            map.flyTo([flyToLocation.latitude, flyToLocation.longitude], targetZoom, {
                duration: 0.8
            })
        }
    }, [map, flyToLocation])

    return null
}

// Component to fly map to a given position (used when coordinates are edited manually)
function FlyToPosition({ position }) {
    const map = useMap()
    const prevPositionRef = useRef(null)

    useEffect(() => {
        if (position && position.lat && position.lng) {
            const prev = prevPositionRef.current
            if (!prev || prev.lat !== position.lat || prev.lng !== position.lng) {
                prevPositionRef.current = position
                const currentZoom = map.getZoom()
                const targetZoom = Math.max(currentZoom, 15)
                map.flyTo([position.lat, position.lng], targetZoom, { duration: 0.5 })
            }
        }
    }, [map, position])

    return null
}

// Component to zoom to selected agency location
function AgencyZoom({ agency }) {
    const map = useMap()
    const prevAgencyRef = useRef(null)

    useEffect(() => {
        if (agency && agency.lat && agency.long) {
            const prev = prevAgencyRef.current
            // Only zoom if this is a different agency or first selection
            if (!prev || prev.id !== agency.id) {
                prevAgencyRef.current = agency
                map.flyTo([agency.lat, agency.long], 16, { duration: 1 })
            }
        } else if (!agency && prevAgencyRef.current) {
            // Agency deselected - zoom back out to default view
            prevAgencyRef.current = null
            map.setView([34.0, 9.5], 6, { duration: 1 })
        }
    }, [map, agency])

    return null
}



// Style configurations - unified light-green baseline
const styles = {
    governorate: {
        default: {
            fillColor: '#c52222',
            weight: 2,
            opacity: 1,
            color: '#a31616',
            fillOpacity: 0.3
        },
        hover: {
            fillOpacity: 0.5,
            weight: 3,
            color: '#000000'
        },
        inactive: {
            fillColor: '#64748b',
            weight: 1,
            opacity: 0.5,
            color: '#475569',
            fillOpacity: 0.15
        },
        selected: {
            fillColor: '#22c55e',
            weight: 3,
            opacity: 1,
            color: '#4ade80',
            fillOpacity: 0.4
        }
    },
    municipality: {
        default: {
            fillColor: '#c52222',
            weight: 2,
            opacity: 1,
            color: '#a31616',
            fillOpacity: 0.3
        },
        hover: {
            fillOpacity: 0.5,
            weight: 3,
            color: '#000000'
        },
        inactive: {
            fillColor: '#64748b',
            weight: 1,
            opacity: 0.5,
            color: '#475569',
            fillOpacity: 0.15
        },
        selected: {
            fillColor: '#22c55e',
            weight: 3,
            opacity: 1,
            color: '#4ade80',
            fillOpacity: 0.4
        }
    },
    sector: {
        default: {
            fillColor: '#c52222',
            weight: 2,
            opacity: 1,
            color: '#a31616',
            fillOpacity: 0.3
        },
        hover: {
            fillOpacity: 0.5,
            weight: 3,
            color: '#000000'
        },
        inactive: {
            fillColor: '#64748b',
            weight: 1,
            opacity: 0.5,
            color: '#475569',
            fillOpacity: 0.15
        },
        selected: {
            fillColor: '#c5ba22',
            weight: 3,
            opacity: 1,
            color: '#de9e4a',
            fillOpacity: 0.4
        }
    }
}



function TunisiaMap({
    currentLevel,
    selectedRegion,
    navigationPath,
    governorates,
    onRegionSelect,
    onRegionHover,
    showLocations = true,
    locationTypeFilters = { pickup_point: true, driving_school_drivago: true, driving_school_non_drivago: true, exam_center: true },
    zoneColorFilters = { drivago_ds: false, non_drivago_ds: false, pickup_points: false },
    zoneColoringData = null,
    enableAddLocations = false,
    openPopupWithoutCoords,
    selectedLocationType = 'pickup_point',
    selectedAgency = null,
    // Location state from parent
    locations = [],
    selectedPickupPoint = null,
    pickupPopupPosition = null,
    tempMarkerPosition = null,
    isEditingLocation = false,
    editMarkerPosition = null,
    // Callbacks to parent
    onLocationsChange,
    onPickupPointSelect,
    onPopupPositionChange,
    onTempMarkerPositionChange,
    onEditModeChange,
    onEditMarkerPositionChange,
    onExternalEditCoordsChange
}) {
    const [municipalities, setMunicipalities] = useState(null)
    const [sectors, setSectors] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [bounds, setBounds] = useState(null)
    const [mapKey, setMapKey] = useState(0)
    const geoJsonRef = useRef()
    const layersRef = useRef(new Map())

    // Refs to track current mode state for event handlers
    const enableAddLocationsRef = useRef(enableAddLocations)
    const isEditingLocationRef = useRef(isEditingLocation)
    const zoneColorFiltersRef = useRef(zoneColorFilters)
    const zoneColoringDataRef = useRef(zoneColoringData)

    // Position to fly the map to (triggered by manual coordinate edits)
    const [flyToTarget, setFlyToTarget] = useState(null)

    // Keep refs in sync with mode state
    useEffect(() => {
        enableAddLocationsRef.current = enableAddLocations
        isEditingLocationRef.current = isEditingLocation
        zoneColorFiltersRef.current = zoneColorFilters
        zoneColoringDataRef.current = zoneColoringData
    }, [enableAddLocations, isEditingLocation, zoneColorFilters, zoneColoringData])

    // Parent region for context display (needed for click validation)
    const parentFeatures = useMemo(() => {
        if (!governorates) return null

        if (currentLevel === 'municipality' && navigationPath.length > 0) {
            const selectedGov = navigationPath.find(p => p.level === 'governorate')
            if (selectedGov) {
                return {
                    type: 'FeatureCollection',
                    features: governorates.features.filter(
                        f => f.properties.gov_id === selectedGov.region.properties.gov_id
                    )
                }
            }
        }

        if (currentLevel === 'sector' && navigationPath.length > 1) {
            const selectedMun = navigationPath.find(p => p.level === 'municipality')
            if (selectedMun && municipalities) {
                return {
                    type: 'FeatureCollection',
                    features: municipalities.features.filter(
                        f => f.properties.mun_uid === selectedMun.region.properties.mun_uid
                    )
                }
            }
        }

        return null
    }, [currentLevel, navigationPath, governorates, municipalities])

    // Handle map click for pickup points - places a draggable marker
    const handleMapClick = useCallback((latlng, clickedFeature = null) => {

        console.log('clickedFeature======>', clickedFeature);

        // If popup is open with null position, update it with clicked coordinates
        if (pickupPopupPosition && !pickupPopupPosition.lat && !pickupPopupPosition.lng) {
            if (onPopupPositionChange) onPopupPositionChange({ lat: latlng.lat, lng: latlng.lng })
            if (onTempMarkerPositionChange) onTempMarkerPositionChange({ lat: latlng.lat, lng: latlng.lng })
            return
        }

        // If popup is already open, don't update position (prevents re-renders while typing)
        if (pickupPopupPosition) return

        // Set marker position at clicked point (marker is draggable)
        const markerData = { lat: latlng.lat, lng: latlng.lng }
        if (clickedFeature) markerData.feature = clickedFeature

        if (onTempMarkerPositionChange) onTempMarkerPositionChange(markerData)
    }, [pickupPopupPosition, onPopupPositionChange, onTempMarkerPositionChange])

    // Handle temp marker drag end - update marker position (NOT the map)
    const handleTempMarkerDrag = useCallback((e) => {
        const { lat, lng } = e.target.getLatLng()
        const updatedPosition = { ...tempMarkerPosition, lat, lng }
        if (onTempMarkerPositionChange) onTempMarkerPositionChange(updatedPosition)
        // Also update popup position if it's open
        if (onPopupPositionChange && pickupPopupPosition && pickupPopupPosition.lat) {
            onPopupPositionChange({ lat, lng })
        }
    }, [tempMarkerPosition, onTempMarkerPositionChange, onPopupPositionChange, pickupPopupPosition])

    // Handle edit marker drag end - update marker position (NOT the map)
    const handleEditMarkerDrag = useCallback((e) => {
        const { lat, lng } = e.target.getLatLng()
        if (onEditMarkerPositionChange) onEditMarkerPositionChange({ lat, lng })
        if (onExternalEditCoordsChange) onExternalEditCoordsChange({ latitude: lat, longitude: lng })
    }, [onEditMarkerPositionChange, onExternalEditCoordsChange])

    // Handle temp marker click - show popup with current marker position
    const handleTempMarkerClick = useCallback(() => {
        if (tempMarkerPosition && onPopupPositionChange) {
            onPopupPositionChange({ ...tempMarkerPosition })
        }
    }, [tempMarkerPosition, onPopupPositionChange])

    // When edit mode is activated, fly map to show the edited location
    useEffect(() => {
        if (isEditingLocation && editMarkerPosition) {
            setFlyToTarget({ lat: editMarkerPosition.lat, lng: editMarkerPosition.lng })
        } else if (!isEditingLocation) {
            setFlyToTarget(null)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEditingLocation]) // Only react to edit mode toggle, not position changes

    // When editMarkerPosition changes externally (manual coord input in PickupPointDetails),
    // fly the map to show the new position. The marker moves because editMarkerPosition is its position prop.
    const prevEditCoordsRef = useRef(null)
    useEffect(() => {
        if (!isEditingLocation || !editMarkerPosition) return
        const prev = prevEditCoordsRef.current
        if (prev && (prev.lat !== editMarkerPosition.lat || prev.lng !== editMarkerPosition.lng)) {
            // Coordinates changed externally (form edit) → fly map to show the marker
            setFlyToTarget({ lat: editMarkerPosition.lat, lng: editMarkerPosition.lng })
        }
        prevEditCoordsRef.current = editMarkerPosition ? { lat: editMarkerPosition.lat, lng: editMarkerPosition.lng } : null
    }, [editMarkerPosition?.lat, editMarkerPosition?.lng, isEditingLocation])

    // When tempMarkerPosition changes externally (manual coord input in PickupPointPopup),
    // fly the map to show the new position.
    const prevTempCoordsRef = useRef(null)
    useEffect(() => {
        if (!tempMarkerPosition || !tempMarkerPosition.lat || !tempMarkerPosition.lng) {
            prevTempCoordsRef.current = null
            return
        }
        const prev = prevTempCoordsRef.current
        if (prev && (prev.lat !== tempMarkerPosition.lat || prev.lng !== tempMarkerPosition.lng)) {
            // Coordinates changed (could be from form edit) → fly map to show the marker
            setFlyToTarget({ lat: tempMarkerPosition.lat, lng: tempMarkerPosition.lng })
        }
        prevTempCoordsRef.current = { lat: tempMarkerPosition.lat, lng: tempMarkerPosition.lng }
    }, [tempMarkerPosition?.lat, tempMarkerPosition?.lng])

    // Open popup without coordinates when toggle is turned on
    const prevOpenPopupWithoutCoordsRef = useRef(openPopupWithoutCoords)
    useEffect(() => {
        // Only trigger when openPopupWithoutCoords actually changes (increments)
        if (openPopupWithoutCoords > prevOpenPopupWithoutCoordsRef.current) {
            // Open popup with null coordinates - will be set when map is clicked
            if (onPopupPositionChange) onPopupPositionChange({ lat: null, lng: null })
            if (onTempMarkerPositionChange) onTempMarkerPositionChange(null)
            setFlyToTarget(null)
        }
        prevOpenPopupWithoutCoordsRef.current = openPopupWithoutCoords
    }, [openPopupWithoutCoords, onPopupPositionChange, onTempMarkerPositionChange])

    // Close popup when toggle is turned off (but not on initial mount)
    const enableAddLocationsInitializedRef = useRef(false)
    useEffect(() => {
        if (!enableAddLocationsInitializedRef.current) {
            enableAddLocationsInitializedRef.current = true
            return // Skip first run
        }
        if (!enableAddLocations) {
            if (onPopupPositionChange) onPopupPositionChange(null)
            if (onTempMarkerPositionChange) onTempMarkerPositionChange(null)
            setFlyToTarget(null)
        }
    }, [enableAddLocations, onPopupPositionChange, onTempMarkerPositionChange])

    // Load locations once on mount
    useEffect(() => {
        const loadLocations = async () => {
            try {
                const data = await fetchLocations()
                if (onLocationsChange) onLocationsChange(data || [])
            } catch (err) {
                console.error('Error loading locations:', err)
            }
        }
        loadLocations()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // Only run once on mount

    // Note: Popup clearing on level change is now handled by App.jsx if needed

    // Load municipalities when drilling down or switching level
    useEffect(() => {
        const loadMunicipalities = async () => {
            if (currentLevel === 'municipality') {
                try {
                    setLoading(true)
                    const govId = selectedRegion?.properties?.gov_id
                    const data = await fetchMunicipalities(govId)
                    setMunicipalities(data)
                    setError(null)
                } catch (err) {
                    console.error('Error loading municipalities:', err)
                    setError('Failed to load municipalities')
                } finally {
                    setLoading(false)
                }
            }
        }
        loadMunicipalities()
    }, [currentLevel, selectedRegion?.properties?.gov_id])

    // Load sectors when drilling down or switching level
    useEffect(() => {
        const loadSectors = async () => {
            if (currentLevel === 'sector') {
                try {
                    setLoading(true)
                    const munUid = selectedRegion?.properties?.mun_uid
                    const govId = selectedRegion?.properties?.gov_id
                    const data = await fetchSectors(munUid, govId)
                    setSectors(data)
                    setError(null)
                } catch (err) {
                    console.error('Error loading sectors:', err)
                    setError('Failed to load sectors')
                } finally {
                    setLoading(false)
                }
            }
        }
        loadSectors()
    }, [currentLevel, selectedRegion?.properties?.mun_uid, selectedRegion?.properties?.gov_id])

    // Calculate bounds for Tunisia
    const tunisiaBounds = useMemo(() => {
        return [[30.2, 7.5], [37.5, 11.6]]
    }, [])

    // Filter features based on current level and selection
    const filteredFeatures = useMemo(() => {
        console.log('filteredFeatures called. Level:', currentLevel)

        if (currentLevel === 'governorate') {
            return governorates
        }

        if (currentLevel === 'municipality') {
            return municipalities
        }

        if (currentLevel === 'sector') {
            return sectors
        }

        return governorates
    }, [currentLevel, governorates, municipalities, sectors])


    // Update bounds when selection or navigation changes.
    // Compute bbox of the selected region (or the last item in navigationPath) and set bounds accordingly.
    useEffect(() => {
        try {
            // If we have an explicit selected region, use its bbox
            const targetFeature = selectedRegion || (navigationPath && navigationPath.length > 0 ? navigationPath[navigationPath.length - 1].region : null)

            if (targetFeature) {
                const bb = turf.bbox(targetFeature) // [minX, minY, maxX, maxY] (lon/lat)
                const southWest = [bb[1], bb[0]]
                const northEast = [bb[3], bb[2]]
                const leafletBounds = L.latLngBounds(southWest, northEast)
                setBounds(leafletBounds)
                return
            }

            // Fallback to full Tunisia bounds
            if (tunisiaBounds) {
                setBounds(tunisiaBounds)
            }
        } catch (err) {
            console.warn('Failed to compute bounds for selected region, falling back to Tunisia bounds', err)
            if (tunisiaBounds) setBounds(tunisiaBounds)
        }
    }, [selectedRegion, navigationPath, currentLevel, tunisiaBounds])

    // Update map key to force re-render on level change
    useEffect(() => {
        setMapKey(prev => prev + 1)
    }, [currentLevel])

    // Clear stored layer references when the map key or level changes so
    // stale layers from previous GeoJSON mounts aren't reused.
    useEffect(() => {
        if (layersRef.current && layersRef.current.size > 0) {
            layersRef.current.clear()
        }
    }, [mapKey, currentLevel])

    // Check if any zone color filter is active
    const isZoneColoringActive = useMemo(() => {
        return Object.values(zoneColorFilters).some(v => v)
    }, [zoneColorFilters])

    // Helper: check if a feature matches any active zone color filter.
    // Returns true if the feature's zone matches at least one active filter.
    // Only checks at the CURRENT level (governorate/municipality/sector).
    const doesFeatureMatchZoneFilters = useCallback((feature) => {
        if (!isZoneColoringActive || !zoneColoringData) return false

        const props = feature.properties || {}
        // Use String() for reliable comparison – backend may return numbers,
        // GeoJSON properties may be strings or vice-versa.
        const govId = props.gov_id != null ? String(props.gov_id) : null
        const munUid = props.mun_uid != null ? String(props.mun_uid) : null
        const secUid = props.sec_uid != null ? String(props.sec_uid) : null

        // Determine which zone ID to check based on current level
        let zoneIdToCheck = null
        let zoneArrayKey = null

        if (currentLevel === 'governorate') {
            zoneIdToCheck = govId
            zoneArrayKey = 'gov_ids'
        } else if (currentLevel === 'municipality') {
            zoneIdToCheck = munUid
            zoneArrayKey = 'mun_uids'
        } else if (currentLevel === 'sector') {
            zoneIdToCheck = secUid
            zoneArrayKey = 'sec_uids'
        }

        if (!zoneIdToCheck || !zoneArrayKey) return false

        // Check each active filter – if ANY active filter matches at this level, the feature is "matched"
        for (const [filterKey, isActive] of Object.entries(zoneColorFilters)) {
            if (!isActive) continue
            const zoneData = zoneColoringData[filterKey]
            if (!zoneData) continue

            const zoneArray = zoneData[zoneArrayKey]
            if (zoneArray && zoneArray.map(String).includes(zoneIdToCheck)) {
                return true
            }
        }

        return false
    }, [isZoneColoringActive, zoneColorFilters, zoneColoringData, currentLevel])

    // Get style function for current level
    const getStyle = useCallback((feature) => {
        // When in edit or add mode, show only borders (no fill, no selection, no hover)
        if (enableAddLocations || isEditingLocation) {
            return {
                fillColor: 'transparent',
                fillOpacity: 0,
                weight: 2,
                opacity: 1,
                color: '#666666'
            }
        }

        const levelStyles = styles[currentLevel] || styles.governorate

        const selectedId = selectedRegion?.properties?.sec_uid || selectedRegion?.properties?.mun_uid || selectedRegion?.properties?.gov_id
        const featureId = feature.properties?.sec_uid || feature.properties?.mun_uid || feature.properties?.gov_id
        const isSelected = selectedId != null && featureId != null && String(selectedId) === String(featureId)

        // Zone coloring: when any filter is active, matched regions → green, unmatched → stay red
        if (isZoneColoringActive) {
            const matched = doesFeatureMatchZoneFilters(feature)

            if (matched) {
                // Green for matched zones
                return {
                    fillColor: '#22c55e',
                    weight: isSelected ? 3 : 2,
                    opacity: 1,
                    color: isSelected ? '#ffffff' : '#16a34a',
                    fillOpacity: isSelected ? 0.6 : 0.45
                }
            }
            // Unmatched → red (default style), with slightly reduced opacity
            return {
                fillColor: '#c52222',
                weight: isSelected ? 2 : 1.5,
                opacity: isSelected ? 1 : 0.7,
                color: isSelected ? '#ffffff' : '#a31616',
                fillOpacity: isSelected ? 0.35 : 0.2
            }
        }

        // No zone filter active → default red / selected green
        return isSelected ? levelStyles.selected : levelStyles.default
    }, [currentLevel, selectedRegion, enableAddLocations, isEditingLocation, isZoneColoringActive, doesFeatureMatchZoneFilters])

    // Get style for parent/context layer
    const getParentStyle = useCallback(() => {
        const levelStyles = currentLevel === 'municipality'
            ? styles.governorate
            : styles.municipality
        // Render the parent/context layer primarily as an outline (no fill)
        // to avoid visual stacking when child layers are also filled.
        const base = levelStyles.selected || {}
        return Object.assign({}, base, {
            fillOpacity: 0,
            opacity: 1,
            weight: Math.max(base.weight || 2, 2)
        })
    }, [currentLevel])

    // Update layer styles when selection, zone coloring filters, or zone data changes.
    // This avoids remounting the GeoJSON component – instead we update each layer in place.
    useEffect(() => {
        if (layersRef.current.size > 0 && filteredFeatures) {
            layersRef.current.forEach((layer, featureId) => {
                const feature = filteredFeatures.features?.find(f => {
                    const fid = f.properties.sec_uid || f.properties.mun_uid || f.properties.gov_id
                    return String(fid) === String(featureId)
                })
                if (!feature) return

                const newStyle = getStyle(feature)
                layer.setStyle(newStyle)
                layer.__baseStyle = newStyle
            })
        }
    }, [selectedRegion, currentLevel, filteredFeatures, getStyle, zoneColorFilters, zoneColoringData])

    // Event handlers for each feature
    const onEachFeature = useCallback((feature, layer) => {
        const levelStyles = styles[currentLevel] || styles.governorate

        // Store layer reference for later updates
        const featureId = feature.properties.sec_uid || feature.properties.mun_uid || feature.properties.gov_id
        layersRef.current.set(featureId, layer)

        // Compute and store the base style for this layer so hover can merge
        try {
            const base = getStyle(feature) || levelStyles.default
            // store it directly on the layer so event handlers can access a reliable baseline
            layer.__baseStyle = base
            layer.setStyle(base)
        } catch (err) {
            // ignore style set errors
        }

        // Get the correct name based on current level
        let nameEn, nameAr
        if (currentLevel === 'governorate') {
            nameEn = feature.properties.gov_en || 'Unknown'
            nameAr = feature.properties.gov_ar || ''
        } else if (currentLevel === 'municipality') {
            nameEn = feature.properties.mun_en || 'Unknown'
            nameAr = feature.properties.mun_ar || ''
        } else if (currentLevel === 'sector') {
            nameEn = feature.properties.sec_en || 'Unknown'
            nameAr = feature.properties.sec_ar || ''
        } else {
            nameEn = 'Unknown'
            nameAr = ''
        }

        layer.bindTooltip(`${nameEn}<br/><span style="direction:rtl">${nameAr}</span>`, {
            permanent: false,
            direction: 'top',
            className: 'custom-tooltip'
        })

        const addableLevels = new Set(['sector', 'municipality', 'governorate'])

        layer.on({
            mouseover: (e) => {
                // Skip hover effects when in edit or add mode
                if (enableAddLocationsRef.current || isEditingLocationRef.current) return

                const target = e.target
                const baseStyle = target.__baseStyle || getStyle(feature) || levelStyles.default
                const hoverStyle = Object.assign({}, baseStyle, levelStyles.hover || {})
                try { target.setStyle(hoverStyle) } catch (err) { }
                try { target.bringToFront() } catch (err) { }
                try { target.openTooltip() } catch (err) { }
                // Notify parent about hover - but only if no popup or temp marker is open to avoid re-rendering
                // which causes input focus issues
                if (!pickupPopupPosition && !tempMarkerPosition) {
                    onRegionHover(feature)
                }
            },
            mouseout: (e) => {
                // Skip when in edit or add mode
                if (enableAddLocationsRef.current || isEditingLocationRef.current) return

                const target = e.target
                const originalStyle = target.__baseStyle || getStyle(feature) || levelStyles.default
                try { target.setStyle(originalStyle) } catch (err) { }
                try { target.closeTooltip() } catch (err) { }

                // Clear hover state
                if (!pickupPopupPosition && !tempMarkerPosition) {
                    onRegionHover(null)
                }
            },
            click: (e) => {
                // Skip region selection when in edit or add mode
                if (enableAddLocationsRef.current || isEditingLocationRef.current) return
                // Notify selection for any level
                onRegionSelect(feature, currentLevel)

                // Fit to clicked feature bounds (centers and zooms the map)
                try {
                    const clickedBounds = e.target.getBounds()
                    setBounds(clickedBounds)
                } catch (err) {
                    // Fallback: nothing
                }

                // Allow click events to propagate to the map so adding locations is always possible.
                // Previously clicks were stopped for non-addable levels; removed to permit adding anywhere.
            }
        })
    }, [currentLevel, onRegionSelect, onRegionHover, selectedRegion, pickupPopupPosition, tempMarkerPosition])

    // Helper: determine if a pickup point should be visible given the current view
    // Always show all points within the currently visible features (filteredFeatures),
    // not just the selected region. Selecting a sector should NOT hide other sectors' points.
    const isPointVisible = useCallback((point) => {
        try {
            if (!point || !point.longitude || !point.latitude) return false
            const pt = turf.point([Number(point.longitude), Number(point.latitude)])

            // Check if the point is inside any of the currently visible features
            if (filteredFeatures && filteredFeatures.type === 'FeatureCollection') {
                for (const feat of filteredFeatures.features || []) {
                    if (turf.booleanPointInPolygon(pt, feat)) return true
                }
                return false
            }

            // Fallback: show the point
            return true
        } catch (err) {
            console.warn('Error checking pickup visibility:', err)
            return false
        }
    }, [filteredFeatures])

    // Filter locations based on type filters with separate Drivago/Non-Drivago handling
    const filteredLocations = useMemo(() => {
        let filtered = locations

        // If an agency is selected, only show that specific agency's location
        if (selectedAgency && selectedAgency.lat && selectedAgency.long) {
            // Create a virtual location object for the selected agency
            const agencyLocation = {
                id: `agency-${selectedAgency.id}`,
                type: 'driving_school', // or determine based on agency type
                name: selectedAgency.nomAge,
                latitude: selectedAgency.lat,
                longitude: selectedAgency.long,
                agencies: [selectedAgency]
            }
            return [agencyLocation]
        }

        // Filter by location type
        filtered = filtered.filter(location => {
            const locationType = location.type || 'pickup_point'
            
            // For driving schools, check if they should be shown based on Drivago status
            if (locationType === 'driving_school') {
                const isDrivago = location.agencies?.some(agency => agency.show_in_drivago === true)
                const filterKey = isDrivago ? 'driving_school_drivago' : 'driving_school_non_drivago'
                return locationTypeFilters[filterKey] === true
            }
            
            // For other location types, use the type directly
            return locationTypeFilters[locationType] === true
        })

        return filtered
    }, [locations, locationTypeFilters, selectedAgency])

    // Zoom-aware markers: only show driving school title above the icon when zoomed in
    const ZoomAwareMarkers = ({ locations, isPointVisible, onSelect, editingLocationId }) => {
        const map = useMap()
        const [zoom, setZoom] = useState(map ? map.getZoom() : 0)

        useEffect(() => {
            if (!map) return
            const onZoom = () => setZoom(map.getZoom())
            map.on('zoomend', onZoom)
            return () => map.off('zoomend', onZoom)
        }, [map])

        const SHOW_TITLE_ZOOM = 13

        const escapeHtml = (str) => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

        return (
            <>
                {showLocations && locations.filter(isPointVisible).filter(point => {
                    // Hide the original marker if we're editing this location (edit marker will be shown instead)
                    if (editingLocationId && String(point.id) === String(editingLocationId)) {
                        return false
                    }
                    return true
                }).map((point, index) => {
                    let icon = locationIcons[point.type] || locationIcons.pickup_point

                    // Handle pickup points with agency differentiation
                    if (point.type === 'pickup_point') {
                        const hasAgencies = point.agencies && point.agencies.length > 0
                        icon = hasAgencies ? locationIcons.pickup_point_with_agency : locationIcons.pickup_point_without_agency
                    } else if (point.type === 'driving_school') {
                        const rawTitle = point.name || 'Driving School'
                        const title = escapeHtml(rawTitle.length > 30 ? `${rawTitle.slice(0, 27)}...` : rawTitle)
                        const isDrivago = point.agencies?.some(agency => agency.show_in_drivago === true)
                        const schoolIcon = isDrivago ? '🚗' : '🏫'
                        const bgColor = isDrivago ? 'rgba(33, 150, 243, 0.85)' : 'rgba(0, 0, 0, 0.6)'

                        if (zoom >= SHOW_TITLE_ZOOM) {
                            icon = L.divIcon({
                                className: 'driving-school-icon',
                                html: `
                                    <div style="display:flex;flex-direction:column;align-items:center;">
                                        <div style="background:${bgColor};color:white;padding:2px 6px;border-radius:4px;font-size:12px;margin-bottom:4px;white-space:nowrap;">${title}</div>
                                        <div class="pickup-marker" style="font-size:20px;">${schoolIcon}</div>
                                    </div>
                                `,
                                iconSize: [100, 40],
                                iconAnchor: [50, 40],
                                popupAnchor: [0, -40]
                            })
                        } else {
                            // Small icon without title when zoomed out
                            icon = L.divIcon({
                                className: 'pickup-marker-icon',
                                html: `<div class="pickup-marker">${schoolIcon}</div>`,
                                iconSize: [30, 30],
                                iconAnchor: [15, 30],
                                popupAnchor: [0, -30]
                            })
                        }
                    }

                    return (
                        <Marker
                            key={point.id || index}
                            position={[point.latitude, point.longitude]}
                            icon={icon}
                            eventHandlers={{ click: () => onSelect(point) }}
                        />
                    )
                })}
            </>
        )
    }

    if (error) {
        return (
            <div className="loading">
                <span style={{ color: '#ef4444' }}>⚠️ {error}</span>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>Make sure the backend server is running</p>
            </div>
        )
    }

    if (!governorates || loading) {
        return (
            <div className="loading">
                <div className="loading__spinner"></div>
                <span>Loading map data...</span>
            </div>
        )
    }

    return (
        <MapContainer
            center={[34.0, 9.5]}
            zoom={6}
            className="map-container"
            zoomControl={true}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <BoundsFitter bounds={bounds || tunisiaBounds} />

            {/* Controller for programmatic map movements (zoom to location) */}
            <MapController flyToLocation={selectedPickupPoint} />

            {/* Fly to position when coordinates are edited manually */}
            <FlyToPosition position={flyToTarget} />

            {/* Zoom to selected agency */}
            <AgencyZoom agency={selectedAgency} />

            {/* Map click handler for pickup points */}
            <MapClickHandler
                currentLevel={currentLevel}
                onMapClick={handleMapClick}
                selectedRegion={selectedRegion}
                enableAddLocations={enableAddLocations}
                currentGeoData={filteredFeatures}
            />

            {/* Parent/context layer */}
            {parentFeatures && (
                <GeoJSON
                    data={parentFeatures}
                    style={getParentStyle}
                />
            )}

            {/* Main interactive layer */}
            {filteredFeatures && (
                <GeoJSON
                    key={mapKey}
                    ref={geoJsonRef}
                    data={filteredFeatures}
                    style={getStyle}
                    onEachFeature={onEachFeature}
                />
            )}

            {/* Existing location markers (visible for current view) */}
            <ZoomAwareMarkers
                locations={filteredLocations}
                isPointVisible={isPointVisible}
                onSelect={(p) => {
                    // Reset edit mode when selecting a different location
                    if (onEditModeChange) onEditModeChange(false)
                    if (onEditMarkerPositionChange) onEditMarkerPositionChange(null)
                    if (onExternalEditCoordsChange) onExternalEditCoordsChange(null)
                    if (onPickupPointSelect) onPickupPointSelect(p)
                }}
                editingLocationId={isEditingLocation ? selectedPickupPoint?.id : null}
            />

            {/* Draggable marker for new location placement */}
            {tempMarkerPosition && tempMarkerPosition.lat && tempMarkerPosition.lng && !isEditingLocation && (
                <Marker
                    position={[tempMarkerPosition.lat, tempMarkerPosition.lng]}
                    icon={selectedLocationType === 'pickup_point' ? locationIcons.pickup_point_without_agency : (locationIcons[selectedLocationType] || locationIcons.pickup_point)}
                    draggable={true}
                    eventHandlers={{
                        dragend: handleTempMarkerDrag,
                        click: handleTempMarkerClick
                    }}
                />
            )}

            {/* Draggable marker for editing an existing location */}
            {isEditingLocation && editMarkerPosition && editMarkerPosition.lat && editMarkerPosition.lng && (
                <Marker
                    position={[editMarkerPosition.lat, editMarkerPosition.lng]}
                    icon={
                        selectedPickupPoint?.type === 'pickup_point' 
                            ? (selectedPickupPoint?.agencies && selectedPickupPoint.agencies.length > 0 
                                ? locationIcons.pickup_point_with_agency 
                                : locationIcons.pickup_point_without_agency)
                            : (locationIcons[selectedPickupPoint?.type] || locationIcons.pickup_point)
                    }
                    draggable={true}
                    eventHandlers={{
                        dragend: handleEditMarkerDrag
                    }}
                />
            )}
        </MapContainer>
    )
}

export default memo(TunisiaMap)
