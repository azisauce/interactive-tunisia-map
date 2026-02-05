import { useEffect, useState, useMemo, useCallback, useRef, memo } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap, useMapEvents, Marker } from 'react-leaflet'
import { fetchGovernorates, fetchMunicipalities, fetchSectors, fetchPickupPoints, deletePickupPoint } from '../utils/api'
import PickupPointPopup from './PickupPointPopup'
import PickupPointDetails from './PickupPointDetails'
import L from 'leaflet'
import * as turf from '@turf/turf'

// Custom marker icon for pickup points
const pickupIcon = L.divIcon({
    className: 'pickup-marker-icon',
    html: '<div class="pickup-marker">📍</div>',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
})

// Component to handle map click events
function MapClickHandler({ currentLevel, onMapClick }) {
    useMapEvents({
        click: (e) => {
            if (currentLevel === 'sector') {
                onMapClick(e.latlng)
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

// Style configurations
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



function TunisiaMap({ currentLevel, selectedRegion, navigationPath, governorates, onRegionSelect, onRegionHover }) {
    const [municipalities, setMunicipalities] = useState(null)
    const [sectors, setSectors] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [bounds, setBounds] = useState(null)
    const [mapKey, setMapKey] = useState(0)
    const geoJsonRef = useRef()
    const layersRef = useRef(new Map())
    
    // Pickup point states
    const [pickupPopupPosition, setPickupPopupPosition] = useState(null)
    const [pickupPoints, setPickupPoints] = useState([])
    const [selectedPickupPoint, setSelectedPickupPoint] = useState(null)
    const [deletingPickupId, setDeletingPickupId] = useState(null)

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
        if (pickupPopupPosition || currentLevel !== 'sector') return

        // If we are in a specific municipality view, check if click is inside it
        if (parentFeatures && parentFeatures.features.length > 0) {
            const pt = turf.point([latlng.lng, latlng.lat])
            let isInside = false
            
            for (const feat of parentFeatures.features) {
                if (turf.booleanPointInPolygon(pt, feat)) {
                    isInside = true
                    break
                }
            }
            
            if (!isInside) {
                console.log('Click outside active municipality, ignoring')
                return
            }
        }

        setPickupPopupPosition({ lat: latlng.lat, lng: latlng.lng })
    }, [currentLevel, parentFeatures])

    // Close popup
    const handleClosePopup = useCallback(() => {
        setPickupPopupPosition(null)
    }, [])

    // Handle new pickup point created
    const handlePickupPointCreated = useCallback((newPickupPoint) => {
        setPickupPoints(prev => [...prev, newPickupPoint])
    }, [])

    // Load pickup points when at sector level
    useEffect(() => {
        const loadPickupPoints = async () => {
            if (currentLevel === 'sector') {
                try {
                    const data = await fetchPickupPoints()
                    setPickupPoints(data || [])
                } catch (err) {
                    console.error('Error loading pickup points:', err)
                }
            }
        }
        loadPickupPoints()
    }, [currentLevel])

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

    // Update layer styles when selection changes (especially for sectors)
    useEffect(() => {
        if (currentLevel === 'sector' && layersRef.current.size > 0) {
            const levelStyles = styles.sector
            layersRef.current.forEach((layer, featureId) => {
                const isSelected = selectedRegion && selectedRegion.properties.sec_uid === featureId
                layer.setStyle(isSelected ? levelStyles.selected : levelStyles.default)
            })
        }
    }, [selectedRegion, currentLevel])

    // Get style function for current level - highlights selected sector
    const getStyle = useCallback((feature) => {
        const levelStyles = styles[currentLevel] || styles.governorate

        // Check if this feature is the selected one at sector level
        if (currentLevel === 'sector' && selectedRegion) {
            const selectedId = selectedRegion.properties.sec_uid || selectedRegion.properties.mun_uid
            const featureId = feature.properties.sec_uid || feature.properties.mun_uid
            if (selectedId === featureId) {
                return levelStyles.selected
            }
        }

        // Check if feature has assigned agencies (direct or inherited) OR has children with agencies
        const hasAgencies = feature.properties.assigned_agencies && 
                           feature.properties.assigned_agencies.length > 0
        const hasChildrenWithAgencies = feature.properties.has_children_with_agencies === true
        
        if (hasAgencies || hasChildrenWithAgencies) {
            return levelStyles.withAgencies
        }

        return levelStyles.default
    }, [currentLevel, selectedRegion])

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

        layer.on({
            mouseover: (e) => {
                const target = e.target
                target.setStyle(levelStyles.hover)
                target.bringToFront()
                // Notify parent about hover - but only if no popup is open to avoid re-rendering
                // which causes input focus issues
                if (!pickupPopupPosition) {
                    onRegionHover(feature)
                }
            },
            mouseout: (e) => {
                const target = e.target
                // Restore the correct style (selected, withAgencies, or default)
                const isSelected = currentLevel === 'sector' && selectedRegion && 
                    (selectedRegion.properties.sec_uid === feature.properties.sec_uid)

                const hasAgencies = feature.properties.assigned_agencies && 
                                   feature.properties.assigned_agencies.length > 0

                const hasChildrenWithAgencies = feature.properties.has_children_with_agencies === true

                if (isSelected) {
                    target.setStyle(levelStyles.selected)
                } else if (hasAgencies || hasChildrenWithAgencies) {
                    // Keep parent regions colored if any child has agencies
                    target.setStyle(levelStyles.withAgencies)
                } else {
                    target.setStyle(levelStyles.default)
                }
                // Clear hover state
                if (!pickupPopupPosition) {
                    onRegionHover(null)
                }
            },
            click: (e) => {
                // If we are at sector level, we want to allow the map click to fire
                // so the user can add a pickup point. If we are NOT at sector level,
                // we stop propagation to avoid weird bubble issues.
                if (currentLevel !== 'sector') {
                    L.DomEvent.stopPropagation(e)
                    onRegionSelect(feature, currentLevel)

                    // Fit to clicked feature bounds
                    const clickedBounds = e.target.getBounds()
                    setBounds(clickedBounds)
                } else {
                    // For sectors, don't stop propagation so map click still works for pickup points
                    onRegionSelect(feature, currentLevel)
                }
            }
        })
    }, [currentLevel, onRegionSelect, onRegionHover, selectedRegion, pickupPopupPosition])

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
            <MapClickHandler currentLevel={currentLevel} onMapClick={handleMapClick} />

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

            {/* Existing pickup point markers */}
            {currentLevel === 'sector' && pickupPoints.map((point, index) => (
                <Marker
                    key={point.id || index}
                    position={[point.latitude, point.longitude]}
                    icon={pickupIcon}
                    eventHandlers={{
                        click: () => setSelectedPickupPoint(point)
                    }}
                />
            ))}

            {/* Pickup point popup */}
            {pickupPopupPosition && currentLevel === 'sector' && (
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
                    onDeleted={(id) => setPickupPoints(prev => prev.filter(p => String(p.id) !== String(id)))}
                />
            )}
        </MapContainer>
    )
}

export default memo(TunisiaMap)
