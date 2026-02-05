import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import { fetchGovernorates, fetchMunicipalities, fetchSectors } from '../utils/api'
import * as turf from '@turf/turf'

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

// Helper to aggregate features by gov_id and union their geometries
const aggregateGovernorates = (data) => {
    if (!data || !data.features) return data

    console.log('Aggregating governorates from', data.features.length, 'features...')
    // Group features by gov_id
    const govMap = new Map()
    data.features.forEach(feature => {
        const govId = feature.properties.gov_id
        if (!govMap.has(govId)) {
            govMap.set(govId, [])
        }
        govMap.get(govId).push(feature)
    })

    const aggregatedFeatures = []
    govMap.forEach((features, govId) => {
        try {
            // 1. Clean up coordinates to fix precision issues that prevent merging
            // 6 decimal places is ~10cm precision, enough for administrative boundaries
            const cleanedFeatures = features.map(f => turf.truncate(f, { precision: 6 }))
            
            // 2. Extract only Polygon/MultiPolygon features and flatten them
            // This ensures we have a clean collection of individual polygons for merging
            const polygons = []
            cleanedFeatures.forEach(f => {
                const flattened = turf.flatten(f)
                flattened.features.forEach(poly => {
                    if (poly.geometry && (poly.geometry.type === 'Polygon' || poly.geometry.type === 'MultiPolygon')) {
                        polygons.push(poly)
                    }
                })
            })

            let unified = null
            if (polygons.length > 0) {
                if (polygons.length === 1) {
                    unified = polygons[0]
                } else {
                    // 3. Perform the union on the collection of polygons
                    const fc = turf.featureCollection(polygons)
                    unified = turf.union(fc)
                }
            }

            if (unified) {
                aggregatedFeatures.push({
                    ...unified,
                    properties: {
                        gov_id: govId,
                        gov_en: features[0].properties.gov_en,
                        gov_ar: features[0].properties.gov_ar,
                        reg: features[0].properties.reg,
                        reg_en: features[0].properties.reg_en,
                        reg_ar: features[0].properties.reg_ar
                    }
                })
            } else {
                console.warn(`Could not unify features for gov_id ${govId}, no valid polygons found`)
            }
        } catch (err) {
            console.error(`Error merging features for gov_id ${govId}:`, err)
            // Fallback: create a MultiPolygon manually (will have internal borders)
            const multiPolygonCoords = []
            features.forEach(f => {
                if (f.geometry.type === 'Polygon') {
                    multiPolygonCoords.push(f.geometry.coordinates)
                } else if (f.geometry.type === 'MultiPolygon') {
                    f.geometry.coordinates.forEach(poly => {
                        multiPolygonCoords.push(poly)
                    })
                }
            })
            aggregatedFeatures.push({
                type: 'Feature',
                properties: {
                    gov_id: govId,
                    gov_en: features[0].properties.gov_en,
                    gov_ar: features[0].properties.gov_ar
                },
                geometry: {
                    type: 'MultiPolygon',
                    coordinates: multiPolygonCoords
                }
            })
        }
    })

    console.log('Aggregation complete. Total governorates:', aggregatedFeatures.length)
    return {
        type: 'FeatureCollection',
        features: aggregatedFeatures
    }
}

function TunisiaMap({ currentLevel, selectedRegion, navigationPath, onRegionSelect, onRegionHover }) {
    const [governorates, setGovernorates] = useState(null)
    const [municipalities, setMunicipalities] = useState(null)
    const [sectors, setSectors] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [bounds, setBounds] = useState(null)
    const [mapKey, setMapKey] = useState(0)
    const geoJsonRef = useRef()
    const layersRef = useRef(new Map())

    // Load governorates on mount
    useEffect(() => {
        const loadGovernorates = async () => {
            try {
                setLoading(true)
                const data = await fetchGovernorates()
                // Process data to merge delegations into governorates
                setGovernorates(aggregateGovernorates(data))
                setError(null)
            } catch (err) {
                console.error('Error loading governorates:', err)
                setError('Failed to load map data')
            } finally {
                setLoading(false)
            }
        }
        loadGovernorates()
    }, [])

    // Load municipalities when drilling down to municipality level
    useEffect(() => {
        const loadMunicipalities = async () => {
            if (currentLevel === 'municipality' && selectedRegion) {
                try {
                    setLoading(true)
                    const data = await fetchMunicipalities(selectedRegion.properties.gov_id)
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

    // Load sectors when drilling down to sector level
    useEffect(() => {
        const loadSectors = async () => {
            if (currentLevel === 'sector' && selectedRegion) {
                try {
                    setLoading(true)
                    const data = await fetchSectors(selectedRegion.properties.mun_uid)
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
    }, [currentLevel, selectedRegion?.properties?.mun_uid])

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

    // Parent region for context display
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

    // Update map key to force re-render on level change
    useEffect(() => {
        setMapKey(prev => prev + 1)
    }, [currentLevel, selectedRegion])

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

        // Check if feature has assigned agencies (direct or inherited)
        const hasAgencies = feature.properties.assigned_agencies && 
                           feature.properties.assigned_agencies.length > 0
        
        if (hasAgencies) {
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
                // Notify parent about hover
                onRegionHover(feature)
            },
            mouseout: (e) => {
                const target = e.target
                // Restore the correct style (selected, withAgencies, or default)
                const isSelected = currentLevel === 'sector' && selectedRegion && 
                    (selectedRegion.properties.sec_uid === feature.properties.sec_uid)
                
                const hasAgencies = feature.properties.assigned_agencies && 
                                   feature.properties.assigned_agencies.length > 0
                
                if (isSelected) {
                    target.setStyle(levelStyles.selected)
                } else if (hasAgencies) {
                    target.setStyle(levelStyles.withAgencies)
                } else {
                    target.setStyle(levelStyles.default)
                }
                // Clear hover state
                onRegionHover(null)
            },
            click: (e) => {
                if (currentLevel !== 'sector') {
                    onRegionSelect(feature, currentLevel)

                    // Fit to clicked feature bounds
                    const clickedBounds = e.target.getBounds()
                    setBounds(clickedBounds)
                } else {
                    // For sectors, show selection without drill-down
                    onRegionSelect(feature, currentLevel)
                }
            }
        })
    }, [currentLevel, onRegionSelect, onRegionHover, selectedRegion])

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
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />

            <BoundsFitter bounds={bounds || tunisiaBounds} />

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
        </MapContainer>
    )
}

export default TunisiaMap
