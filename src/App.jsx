import { useState, useCallback, useEffect, useRef } from 'react'
import TunisiaMap from './components/TunisiaMap'
import ControlCard from './components/ControlCard'
import PickupPointPopup from './components/PickupPointPopup'
import PickupPointDetails from './components/PickupPointDetails'
import { fetchGovernorates, fetchLocations, fetchZoneColoring, invalidateZoneColoringCache } from './utils/api'
import * as turf from '@turf/turf'
import 'leaflet/dist/leaflet.css'

// Helper to aggregate features by gov_id and union their geometries
const aggregateGovernorates = (data) => {
    if (!data || !data.features) return data

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
            const cleanedFeatures = features.map(f => turf.truncate(f, { precision: 6 }))
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
            }
        } catch (err) {
            console.error(`Error merging features for gov_id ${govId}:`, err)
        }
    })

    return {
        type: 'FeatureCollection',
        features: aggregatedFeatures
    }
}

function App() {
    const [currentLevel, setCurrentLevel] = useState('governorate')
    const [selectedRegion, setSelectedRegion] = useState(null)
    const [hoveredRegion, setHoveredRegion] = useState(null)
    const [navigationPath, setNavigationPath] = useState([])
    const [governorates, setGovernorates] = useState(null)
    const [showLocations, setShowLocations] = useState(true)
    const [locationTypeFilters, setLocationTypeFilters] = useState({
        pickup_point: true,
        driving_school_drivago: true,
        driving_school_non_drivago: true,
        exam_center: true
    })
    const [enableAddLocations, setEnableAddLocations] = useState(false)
    const [openPopupWithoutCoords, setOpenPopupWithoutCoords] = useState(0)
    const [selectedLocationType, setSelectedLocationType] = useState('pickup_point')

    // Zone coloring filters (multi-select)
    const [zoneColorFilters, setZoneColorFilters] = useState({
        drivago_ds: false,
        non_drivago_ds: false,
        pickup_points: false
    })
    const [zoneColoringData, setZoneColoringData] = useState(null)

    // Location-related state (lifted from TunisiaMap)
    const [locations, setLocations] = useState([])
    const [selectedPickupPoint, setSelectedPickupPoint] = useState(null)
    const [pickupPopupPosition, setPickupPopupPosition] = useState(null)
    const [tempMarkerPosition, setTempMarkerPosition] = useState(null)
    const [isEditingLocation, setIsEditingLocation] = useState(false)
    const [editMarkerPosition, setEditMarkerPosition] = useState(null)
    const [externalEditCoords, setExternalEditCoords] = useState(null)

    // Use ref to track the latest value of enableAddLocations to avoid stale closures
    const enableAddLocationsRef = useRef(enableAddLocations)
    useEffect(() => {
        enableAddLocationsRef.current = enableAddLocations
    }, [enableAddLocations])

    // Load governorates once at app level
    useEffect(() => {
        const loadGovs = async () => {
            try {
                const data = await fetchGovernorates()
                setGovernorates(aggregateGovernorates(data))
            } catch (err) {
                console.error('Failed to load governorates:', err)
            }
        }
        loadGovs()
    }, [])

    // Load zone coloring data once at app level
    useEffect(() => {
        const loadZoneColoring = async () => {
            try {
                const data = await fetchZoneColoring()
                setZoneColoringData(data)
            } catch (err) {
                console.error('Failed to load zone coloring:', err)
            }
        }
        loadZoneColoring()
    }, [])

    const handleRegionHover = useCallback((region) => {
        setHoveredRegion(region)
    }, [])

    const handleRegionSelect = useCallback((region, level) => {
        console.log('App: Region selected:', region.properties.gov_en || region.properties.mun_en || region.properties.sec_en, 'Level:', level)
        
        setSelectedRegion(region);

        if (enableAddLocationsRef.current) {
            return;
        }

        // Only add to navigation path and drill down if not at sector level
        if (level === 'governorate') {
            setNavigationPath([{ region, level }])
            setCurrentLevel('municipality')
        } else if (level === 'municipality') {
            let newPath = []
            
            // If we came from top-level "All Municipalities", reconstruct parent gov in path
            if (navigationPath.length === 0 || navigationPath[0].level !== 'governorate') {
                const govId = region.properties.gov_id
                const parentGov = governorates?.features?.find(f => f.properties.gov_id === govId)
                if (parentGov) {
                    newPath = [{ region: parentGov, level: 'governorate' }]
                }
            } else {
                newPath = [...navigationPath]
            }
            
            newPath.push({ region, level })
            setNavigationPath(newPath)
            setCurrentLevel('sector')
        } else if (level === 'sector') {
            // Reconstruct path if selecting from "All Sectors" view
            if (navigationPath.length < 2) {
                const govId = region.properties.gov_id
                const munUid = region.properties.mun_uid
                
                const newPath = []
                const parentGov = governorates?.features?.find(f => f.properties.gov_id === govId)
                if (parentGov) {
                    newPath.push({ region: parentGov, level: 'governorate' })
                    
                    // We don't have all municipalities list here easily, 
                    // but we can create a placeholder or just use what we have
                    // For now, if we are in "All Sectors", we at least get the Gov
                    newPath.push({ region, level: 'sector' }) // This is a bit simplified
                }
                setNavigationPath(newPath)
            }
        }
    }, [navigationPath, governorates])

    const handleBack = useCallback(() => {
        if (navigationPath.length > 0) {
            const newPath = [...navigationPath]
            newPath.pop()
            setNavigationPath(newPath)

            if (newPath.length === 0) {
                setCurrentLevel('governorate')
                setSelectedRegion(null)
            } else {
                const lastItem = newPath[newPath.length - 1]
                setSelectedRegion(lastItem.region)
                if (lastItem.level === 'governorate') {
                    setCurrentLevel('municipality')
                } else {
                    setCurrentLevel('governorate')
                }
            }
        }
    }, [navigationPath])

    const handleReset = useCallback(() => {
        setCurrentLevel('governorate')
        setSelectedRegion(null)
        setNavigationPath([])
    }, [])

    const handleNavigate = useCallback((index) => {
        if (index === 0) {
            handleReset()
            return
        }

        const newPath = navigationPath.slice(0, index)
        const lastItem = newPath[newPath.length - 1]
        
        setNavigationPath(newPath)
        setSelectedRegion(lastItem.region)
        
        if (lastItem.level === 'governorate') {
            setCurrentLevel('municipality')
        } else if (lastItem.level === 'municipality') {
            setCurrentLevel('sector')
        }
    }, [navigationPath, handleReset])

    const handleLevelChange = useCallback((level) => {
        setCurrentLevel(level)
    }, [])

    const handleToggleLocations = useCallback((value) => {
        setShowLocations(value)
    }, [])

    const handleLocationTypeFilterChange = useCallback((filters) => {
        setLocationTypeFilters(filters)
    }, [])

    const handleZoneColorFilterChange = useCallback((filters) => {
        setZoneColorFilters(filters)
    }, [])

    const handleToggleAddLocations = useCallback((value) => {
        setEnableAddLocations(value)
    }, [])

    const handleToggleAddLocationsOn = useCallback(() => {
        // Signal TunisiaMap to open popup without coordinates
        setOpenPopupWithoutCoords(prev => prev + 1)
    }, [])

    const handleTypeSelect = useCallback((type) => {
        setSelectedLocationType(type)
        // Also trigger opening the popup
        setOpenPopupWithoutCoords(prev => prev + 1)
    }, [])

    // Location-related callbacks for TunisiaMap
    const handleLocationsChange = useCallback((newLocations) => {
        if (typeof newLocations === 'function') {
            setLocations(newLocations)
        } else {
            setLocations(newLocations)
        }
    }, [])

    const handlePickupPointSelect = useCallback((point) => {
        setSelectedPickupPoint(point)
    }, [])

    const handlePopupPositionChange = useCallback((position) => {
        if (typeof position === 'function') {
            setPickupPopupPosition(position)
        } else {
            setPickupPopupPosition(position)
        }
    }, [])

    const handleTempMarkerPositionChange = useCallback((position) => {
        if (typeof position === 'function') {
            setTempMarkerPosition(position)
        } else {
            setTempMarkerPosition(position)
        }
    }, [])

    const handleEditModeChange = useCallback((isEditing) => {
        setIsEditingLocation(isEditing)
    }, [])

    const handleEditMarkerPositionChange = useCallback((position) => {
        setEditMarkerPosition(position)
    }, [])

    const handleExternalEditCoordsChange = useCallback((coords) => {
        setExternalEditCoords(coords)
    }, [])

    // Handler for resetting the popup (called from PickupPointPopup)
    const handleResetPopup = useCallback(() => {
        setPickupPopupPosition({ lat: null, lng: null })
        setTempMarkerPosition(null)
        setEnableAddLocations(false)
    }, [])

    // Handler for coordinate changes from PickupPointPopup
    const handleCoordinatesChange = useCallback((newCoords) => {
        setTempMarkerPosition(prev => prev ? { ...prev, ...newCoords } : newCoords)
        setPickupPopupPosition(prev => prev ? { ...prev, ...newCoords } : newCoords)
    }, [])

    // Handler for new pickup point created
    const handlePickupPointCreated = useCallback(async (newLocation) => {
        setPickupPopupPosition(null)
        setTempMarkerPosition(null)
        // Refresh all locations to get the full data with agencies
        try {
            const data = await fetchLocations()
            setLocations(data || [])
            
            // Invalidate and refresh zone coloring data since zones may have changed
            invalidateZoneColoringCache()
            const coloringData = await fetchZoneColoring({ forceRefresh: true })
            setZoneColoringData(coloringData)
        } catch (err) {
            console.error('Error refreshing locations:', err)
            // Fallback: add the location without agencies
            setLocations(prev => [...prev, newLocation])
        }
    }, [])

    // Handler for pickup point details close
    const handlePickupPointDetailsClose = useCallback(() => {
        setSelectedPickupPoint(null)
        setIsEditingLocation(false)
        setEditMarkerPosition(null)
    }, [])

    // Handler for pickup point deleted
    const handlePickupPointDeleted = useCallback(async (id) => {
        setLocations(prev => prev.filter(p => String(p.id) !== String(id)))
        
        // Refresh zone coloring since zones may have changed after deletion
        try {
            invalidateZoneColoringCache()
            const coloringData = await fetchZoneColoring({ forceRefresh: true })
            setZoneColoringData(coloringData)
        } catch (err) {
            console.error('Error refreshing zone coloring:', err)
        }
    }, [])

    // Handler for pickup point updated
    const handlePickupPointUpdated = useCallback(async (updatedPoint) => {
        setLocations(prev => prev.map(p => 
            String(p.id) === String(updatedPoint.id) ? updatedPoint : p
        ))
        setSelectedPickupPoint(updatedPoint)
        // Update edit marker position if still editing
        if (isEditingLocation) {
            setEditMarkerPosition({ lat: updatedPoint.latitude, lng: updatedPoint.longitude })
        }
        
        // Refresh zone coloring in case location type or agency changed
        try {
            invalidateZoneColoringCache()
            const coloringData = await fetchZoneColoring({ forceRefresh: true })
            setZoneColoringData(coloringData)
        } catch (err) {
            console.error('Error refreshing zone coloring:', err)
        }
    }, [isEditingLocation])

    // Handler for edit mode change from PickupPointDetails
    const handleDetailsEditModeChange = useCallback((isEditing, coords) => {
        setIsEditingLocation(isEditing)
        if (isEditing && coords) {
            setEditMarkerPosition({ lat: coords.latitude, lng: coords.longitude })
        } else {
            setEditMarkerPosition(null)
        }
        setExternalEditCoords(null)
    }, [])

    // Handler for edit coords change from PickupPointDetails
    const handleDetailsEditCoordsChange = useCallback((newCoords) => {
        if (newCoords && newCoords.latitude && newCoords.longitude) {
            setEditMarkerPosition({ lat: newCoords.latitude, lng: newCoords.longitude })
        }
    }, [])

    return (
        <div className="app">
            <TunisiaMap
                currentLevel={currentLevel}
                selectedRegion={selectedRegion}
                navigationPath={navigationPath}
                governorates={governorates}
                onRegionSelect={handleRegionSelect}
                onRegionHover={handleRegionHover}
                showLocations={showLocations}
                locationTypeFilters={locationTypeFilters}
                zoneColorFilters={zoneColorFilters}
                zoneColoringData={zoneColoringData}
                enableAddLocations={enableAddLocations}
                openPopupWithoutCoords={openPopupWithoutCoords}
                selectedLocationType={selectedLocationType}
                // Location state passed to TunisiaMap
                locations={locations}
                selectedPickupPoint={selectedPickupPoint}
                pickupPopupPosition={pickupPopupPosition}
                tempMarkerPosition={tempMarkerPosition}
                isEditingLocation={isEditingLocation}
                editMarkerPosition={editMarkerPosition}
                // Location callbacks
                onLocationsChange={handleLocationsChange}
                onPickupPointSelect={handlePickupPointSelect}
                onPopupPositionChange={handlePopupPositionChange}
                onTempMarkerPositionChange={handleTempMarkerPositionChange}
                onEditModeChange={handleEditModeChange}
                onEditMarkerPositionChange={handleEditMarkerPositionChange}
                onExternalEditCoordsChange={handleExternalEditCoordsChange}
            />
            <ControlCard
                currentLevel={currentLevel}
                selectedRegion={selectedRegion}
                hoveredRegion={hoveredRegion}
                navigationPath={navigationPath}
                onBack={handleBack}
                onReset={handleReset}
                onNavigate={handleNavigate}
                onLevelChange={handleLevelChange}
                showLocations={showLocations}
                onToggleLocations={handleToggleLocations}
                locationTypeFilters={locationTypeFilters}
                onLocationTypeFilterChange={handleLocationTypeFilterChange}
                enableAddLocations={enableAddLocations}
                onToggleAddLocations={handleToggleAddLocations}
                onToggleAddLocationsOn={handleToggleAddLocationsOn}
                onTypeSelect={handleTypeSelect}
                zoneColorFilters={zoneColorFilters}
                onZoneColorFilterChange={handleZoneColorFilterChange}
            />

            {/* Pickup point popup - now rendered in App */}
            {pickupPopupPosition && (
                <PickupPointPopup
                    position={pickupPopupPosition}
                    onClose={handleResetPopup}
                    onPickupPointCreated={handlePickupPointCreated}
                    onCoordinatesChange={handleCoordinatesChange}
                    initialType={selectedLocationType}
                    initialCoords={tempMarkerPosition}
                />
            )}

            {/* Pickup point details dialog - now rendered in App */}
            {selectedPickupPoint && (
                <PickupPointDetails
                    point={selectedPickupPoint}
                    open={true}
                    onClose={handlePickupPointDetailsClose}
                    onDeleted={handlePickupPointDeleted}
                    onUpdated={handlePickupPointUpdated}
                    onEditModeChange={handleDetailsEditModeChange}
                    onEditCoordsChange={handleDetailsEditCoordsChange}
                    externalEditCoords={externalEditCoords}
                />
            )}
        </div>
    )
}

export default App
