import { useEffect, useState, useMemo, useCallback, useRef, memo } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap, useMapEvents, Marker } from 'react-leaflet'
import { fetchMunicipalities, fetchSectors, fetchLocations, deleteLocation } from '../utils/api'
import PickupPointPopup from './PickupPointPopup'
import PickupPointDetails from './PickupPointDetails'
import L from 'leaflet'
import * as turf from '@turf/turf'

// Custom marker icons for different location types
const locationIcons = {
    pickup_point: L.divIcon({
        className: 'pickup-marker-icon',
        html: '<div class="pickup-marker">📍</div>',
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
function MapClickHandler({ onMapClick, selectedRegion }) {
    useMapEvents({
        click: (e) => {
            // Allow creating pickup points when a region is selected (any level).
            if (selectedRegion && selectedRegion.type === 'Feature') {
                const pt = turf.point([e.latlng.lng, e.latlng.lat])
                try {
                    if (turf.booleanPointInPolygon(pt, selectedRegion)) {
                        onMapClick(e.latlng)
                    } else {
                        console.log('Click outside selected region, ignoring')
                    }
                } catch (err) {
                    console.warn('Error checking point-in-polygon:', err)
                }
            } else {
                // No region selected => ignore clicks for pickup creation
                console.log('No region selected, ignoring click')
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
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 })
        }
    }, [map, bounds])

    return null
}

// Style configurations - unified light-green baseline
const styles = {
    governorate: {
        default: {
            fillColor: '#22c55e',
            weight: 2,
            opacity: 1,
            color: '#16a34a',
            fillOpacity: 0.3
        },
        withAgencies: {
            fillColor: '#16a34a',
            weight: 4,
            opacity: 1,
            color: '#15803d',
            fillOpacity: 0.5
        },
        selectedWithAgencies: {
            fillColor: '#15803d',
            weight: 4,
            opacity: 1,
            color: '#4ade80',
            fillOpacity: 0.6
        },
        hover: {
            fillOpacity: 0.5,
            weight: 3,
            color: '#4ade80'
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
            fillColor: '#3b82f6',
            weight: 2,
            opacity: 1,
            color: '#2563eb',
            fillOpacity: 0.3
        },
        withAgencies: {
            fillColor: '#2563eb',
            weight: 4,
            opacity: 1,
            color: '#1e40af',
            fillOpacity: 0.5
        },
        selectedWithAgencies: {
            fillColor: '#1e40af',
            weight: 4,
            opacity: 1,
            color: '#60a5fa',
            fillOpacity: 0.6
        },
        hover: {
            fillOpacity: 0.5,
            weight: 3,
            color: '#60a5fa'
        },
        inactive: {
            fillColor: '#64748b',
            weight: 1,
            opacity: 0.5,
            color: '#475569',
            fillOpacity: 0.15
        },
        selected: {
            fillColor: '#3b82f6',
            weight: 3,
            opacity: 1,
            color: '#60a5fa',
            fillOpacity: 0.4
        }
    },
    sector: {
        default: {
            fillColor: '#f59e0b',
            weight: 1.5,
            opacity: 1,
            color: '#d97706',
            fillOpacity: 0.3
        },
        withAgencies: {
            fillColor: '#d97706',
            weight: 3.5,
            opacity: 1,
            color: '#b45309',
            fillOpacity: 0.5
        },
        selectedWithAgencies: {
            fillColor: '#b45309',
            weight: 3.5,
            opacity: 1,
            color: '#fbbf24',
            fillOpacity: 0.7
        },
        hover: {
            fillOpacity: 0.5,
            weight: 2,
            color: '#fbbf24'
        },
        selected: {
            fillColor: '#f59e0b',
            weight: 3,
            opacity: 1,
            color: '#fbbf24',
            fillOpacity: 0.6
        }
    }
}



function TunisiaMap({ currentLevel, selectedRegion, navigationPath, governorates, onRegionSelect, onRegionHover, showLocations = true }) {
    const [municipalities, setMunicipalities] = useState(null)
    const [sectors, setSectors] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [bounds, setBounds] = useState(null)
    const [mapKey, setMapKey] = useState(0)
    const geoJsonRef = useRef()
    const layersRef = useRef(new Map())
    
    // Location states (pickup points, driving schools, exam centers)
    const [pickupPopupPosition, setPickupPopupPosition] = useState(null)
    const [locations, setLocations] = useState([])
    const [selectedPickupPoint, setSelectedPickupPoint] = useState(null)

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

    // Handle map click for pickup points - now even more strictly validated
    const handleMapClick = useCallback((latlng) => {
        // If popup is already open, don't update position (prevents re-renders while typing)
        if (pickupPopupPosition) return

        // MapClickHandler already validates the click is inside the selected region.
        setPickupPopupPosition({ lat: latlng.lat, lng: latlng.lng })
    }, [pickupPopupPosition])

    // Close popup
    const handleClosePopup = useCallback(() => {
        setPickupPopupPosition(null)
    }, [])

    // Handle new location created
    const handlePickupPointCreated = useCallback(async (newLocation) => {
        // Refresh all locations to get the full data with agencies
        try {
            const data = await fetchLocations()
            setLocations(data || [])
        } catch (err) {
            console.error('Error refreshing locations:', err)
            // Fallback: add the location without agencies
            setLocations(prev => [...prev, newLocation])
        }
    }, [])

    // Load locations once (we'll filter them by view when rendering)
    useEffect(() => {
        const loadLocations = async () => {
            try {
                const data = await fetchLocations()
                setLocations(data || [])
            } catch (err) {
                console.error('Error loading locations:', err)
            }
        }
        loadLocations()
    }, [])

    // Clear pickup popup when level changes
    useEffect(() => {
        setPickupPopupPosition(null)
    }, [currentLevel])

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


    // Update bounds when selection changes
    useEffect(() => {
        if (selectedRegion && geoJsonRef.current) {
            const layer = geoJsonRef.current
            if (layer.getBounds) {
                setBounds(layer.getBounds())
            }
        } else if (tunisiaBounds) {
            setBounds(tunisiaBounds)
        }
    }, [selectedRegion, tunisiaBounds])

    // Update map key to force re-render ONLY on level change
    useEffect(() => {
        setMapKey(prev => prev + 1)
        // Reset pickup popup on level change too
        setPickupPopupPosition(null)
    }, [currentLevel])

    // Helper: check if a feature has agencies (direct, inherited, or via children)
    const checkHasAgencies = useCallback((feature) => {
        const props = feature.properties || {}
        const hasDirectAgencies = Array.isArray(props.assigned_agencies) && props.assigned_agencies.length > 0
        const hasInheritedAgencies = (Array.isArray(props.inherited_agencies) && props.inherited_agencies.length > 0)
            || (Array.isArray(props.inherited_assigned_agencies) && props.inherited_assigned_agencies.length > 0)
            || (Array.isArray(props.parent_assigned_agencies) && props.parent_assigned_agencies.length > 0)
        const hasChildrenWithAgencies = props.has_children_with_agencies === true || (Number(props.children_with_agencies_count) > 0)
        return hasDirectAgencies || hasInheritedAgencies || hasChildrenWithAgencies
    }, [])

    // Update layer styles when selection changes (especially for sectors)
    useEffect(() => {
        if (currentLevel === 'sector' && layersRef.current.size > 0 && filteredFeatures) {
            const levelStyles = styles.sector
            layersRef.current.forEach((layer, featureId) => {
                // Find the feature data for this layer to check agencies
                const feature = filteredFeatures.features?.find(f => {
                    const fid = f.properties.sec_uid || f.properties.mun_uid || f.properties.gov_id
                    return fid === featureId
                })
                const hasAgencies = feature ? checkHasAgencies(feature) : false
                const isSelected = selectedRegion && selectedRegion.properties.sec_uid === featureId

                let newStyle
                if (isSelected && hasAgencies) {
                    newStyle = levelStyles.selectedWithAgencies
                } else if (isSelected) {
                    newStyle = levelStyles.selected
                } else if (hasAgencies) {
                    newStyle = levelStyles.withAgencies
                } else {
                    newStyle = levelStyles.default
                }
                layer.setStyle(newStyle)
                layer.__baseStyle = newStyle
            })
        }
    }, [selectedRegion, currentLevel, filteredFeatures, checkHasAgencies])

    // Get style function for current level - highlights selected sector and checks for direct, inherited or child agencies
    const getStyle = useCallback((feature) => {
        const levelStyles = styles[currentLevel] || styles.governorate
        const hasAgencies = checkHasAgencies(feature)

        // Check if this feature is the selected one
        if (selectedRegion) {
            const selectedId = selectedRegion.properties.sec_uid || selectedRegion.properties.mun_uid || selectedRegion.properties.gov_id
            const featureId = feature.properties.sec_uid || feature.properties.mun_uid || feature.properties.gov_id
            if (selectedId === featureId) {
                return hasAgencies ? levelStyles.selectedWithAgencies : levelStyles.selected
            }
        }

        if (hasAgencies) {
            return levelStyles.withAgencies
        }

        return levelStyles.default
    }, [currentLevel, selectedRegion, checkHasAgencies])

    // Get style for parent/context layer
    const getParentStyle = useCallback(() => {
        const levelStyles = currentLevel === 'municipality'
            ? styles.governorate
            : styles.municipality
        return levelStyles.selected
    }, [currentLevel])

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
                const target = e.target
                const baseStyle = target.__baseStyle || getStyle(feature) || levelStyles.default
                const hoverStyle = Object.assign({}, baseStyle, levelStyles.hover || {})
                try { target.setStyle(hoverStyle) } catch (err) {}
                try { target.bringToFront() } catch (err) {}
                try { target.openTooltip() } catch (err) {}
                // Notify parent about hover - but only if no popup is open to avoid re-rendering
                // which causes input focus issues
                if (!pickupPopupPosition) {
                    onRegionHover(feature)
                }
            },
            mouseout: (e) => {
                const target = e.target
                const originalStyle = target.__baseStyle || getStyle(feature) || levelStyles.default
                try { target.setStyle(originalStyle) } catch (err) {}
                try { target.closeTooltip() } catch (err) {}

                // Clear hover state
                if (!pickupPopupPosition) {
                    onRegionHover(null)
                }
            },
            click: (e) => {
                // Allow map clicks to propagate for addable levels so pickup creation works
                if (!addableLevels.has(currentLevel)) {
                    L.DomEvent.stopPropagation(e)
                    onRegionSelect(feature, currentLevel)

                    // Fit to clicked feature bounds
                    const clickedBounds = e.target.getBounds()
                    setBounds(clickedBounds)
                } else {
                    // For addable levels (sector/municipality/governorate), allow propagation
                    onRegionSelect(feature, currentLevel)
                }
            }
        })
    }, [currentLevel, onRegionSelect, onRegionHover, selectedRegion, pickupPopupPosition])

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

            {/* Map click handler for pickup points */}
            <MapClickHandler currentLevel={currentLevel} onMapClick={handleMapClick} selectedRegion={selectedRegion} />

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
            {showLocations && locations.filter(isPointVisible).map((point, index) => (
                <Marker
                    key={point.id || index}
                    position={[point.latitude, point.longitude]}
                    icon={locationIcons[point.type] || locationIcons.pickup_point}
                    eventHandlers={{
                        click: () => setSelectedPickupPoint(point)
                    }}
                />
            ))}

            {/* Pickup point popup */}
            {pickupPopupPosition && (
                <PickupPointPopup
                    key={`pickup-${pickupPopupPosition.lat}-${pickupPopupPosition.lng}`}
                    position={pickupPopupPosition}
                    onClose={handleClosePopup}
                    onPickupPointCreated={handlePickupPointCreated}
                />
            )}

            {/* Pickup point details dialog for existing points */}
            {selectedPickupPoint && (
                <PickupPointDetails
                    point={selectedPickupPoint}
                    open={true}
                    onClose={() => setSelectedPickupPoint(null)}
                    onDeleted={(id) => setLocations(prev => prev.filter(p => String(p.id) !== String(id)))}
                    onUpdated={(updatedPoint) => {
                        setLocations(prev => prev.map(p => 
                            String(p.id) === String(updatedPoint.id) ? updatedPoint : p
                        ))
                        setSelectedPickupPoint(updatedPoint)
                    }}
                />
            )}
        </MapContainer>
    )
}

export default memo(TunisiaMap)
