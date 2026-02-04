import { useState, useCallback } from 'react'
import TunisiaMap from './components/TunisiaMap'
import ControlCard from './components/ControlCard'
import 'leaflet/dist/leaflet.css'

function App() {
    const [currentLevel, setCurrentLevel] = useState('governorate')
    const [selectedRegion, setSelectedRegion] = useState(null)
    const [hoveredRegion, setHoveredRegion] = useState(null)
    const [navigationPath, setNavigationPath] = useState([])

    const handleRegionHover = useCallback((region) => {
        setHoveredRegion(region)
    }, [])

    const handleRegionSelect = useCallback((region, level) => {
        console.log('App: Region selected:', region.properties.gov_en || region.properties.mun_en || region.properties.sec_en, 'Level:', level)
        setSelectedRegion(region)

        // Only add to navigation path and drill down if not at sector level
        if (level === 'governorate') {
            console.log('App: Transitioning gov -> mun')
            setNavigationPath(prev => [...prev, { region, level }])
            setCurrentLevel('municipality')
        } else if (level === 'municipality') {
            console.log('App: Transitioning mun -> sec')
            setNavigationPath(prev => [...prev, { region, level }])
            setCurrentLevel('sector')
        }
        // At sector level, just update selectedRegion without changing navigation
    }, [])

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

    return (
        <div className="app">
            <TunisiaMap
                currentLevel={currentLevel}
                selectedRegion={selectedRegion}
                navigationPath={navigationPath}
                onRegionSelect={handleRegionSelect}
                onRegionHover={handleRegionHover}
            />
            <ControlCard
                currentLevel={currentLevel}
                selectedRegion={selectedRegion}
                hoveredRegion={hoveredRegion}
                navigationPath={navigationPath}
                onBack={handleBack}
                onReset={handleReset}
            />
        </div>
    )
}

export default App
