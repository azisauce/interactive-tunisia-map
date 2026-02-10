import { useState, useCallback, useEffect, useRef } from 'react'
import TunisiaMap from './components/TunisiaMap'
import ControlCard from './components/ControlCard'
import { fetchGovernorates } from './utils/api'
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
                        reg_ar: features[0].properties.reg_ar,
                        assigned_agencies: features[0].properties.assigned_agencies || [],
                        has_children_with_agencies: features[0].properties.has_children_with_agencies || false
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
        driving_school: true,
        exam_center: true
    })
    const [showDrivagoOnly, setShowDrivagoOnly] = useState(false)
    const [enableAddLocations, setEnableAddLocations] = useState(false)
    const [openPopupWithoutCoords, setOpenPopupWithoutCoords] = useState(0)
    const [selectedLocationType, setSelectedLocationType] = useState('pickup_point')

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

    const handleToggleDrivagoOnly = useCallback(() => {
        setShowDrivagoOnly(prev => !prev)
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
                showDrivagoOnly={showDrivagoOnly}
                enableAddLocations={enableAddLocations}
                openPopupWithoutCoords={openPopupWithoutCoords}
                selectedLocationType={selectedLocationType}
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
                showDrivagoOnly={showDrivagoOnly}
                onToggleDrivagoOnly={handleToggleDrivagoOnly}
                enableAddLocations={enableAddLocations}
                onToggleAddLocations={handleToggleAddLocations}
                onToggleAddLocationsOn={handleToggleAddLocationsOn}
                onTypeSelect={handleTypeSelect}
            />
        </div>
    )
}

export default App
