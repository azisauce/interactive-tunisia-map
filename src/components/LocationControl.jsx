import { useState, useEffect } from 'react'
import PushPinIcon from '@mui/icons-material/PushPin'

const LOCATION_TYPES = [
    { id: 'driving_school_non_drivago', label: 'Non-Drivago Driving Schools', icon: 'ND' },
    { id: 'driving_school_drivago', label: 'Drivago Driving Schools', icon: 'D' },
    { id: 'pickup_point', label: 'Pickup Points', icon: '📍' },
    { id: 'exam_center', label: 'Exam Centers', icon: '📝' }
]

function LocationControl({ 
    showLocations, 
    onToggleLocations, 
    locationTypeFilters, 
    onLocationTypeFilterChange
}) {
    const [expanded, setExpanded] = useState(true)
    // const allTypesSelected = LOCATION_TYPES.every(type => locationTypeFilters[type.id])
    // const noTypesSelected = LOCATION_TYPES.every(type => !locationTypeFilters[type.id])

    // const handleToggleAll = () => {
    //     // Use the visible state to decide action so the button always toggles
    //     if (showLocations) {
    //         // Hide all locations and clear type filters
    //         const newFilters = {}
    //         LOCATION_TYPES.forEach(type => {
    //             newFilters[type.id] = false
    //         })
    //         onLocationTypeFilterChange(newFilters)
    //         onToggleLocations(false)
    //     } else {
    //         // Show all locations and enable all type filters
    //         const newFilters = {}
    //         LOCATION_TYPES.forEach(type => {
    //             newFilters[type.id] = true
    //         })
    //         onLocationTypeFilterChange(newFilters)
    //         onToggleLocations(true)
    //     }
    // }

    const handleTypeToggle = (typeId) => {
        const newFilters = {
            ...locationTypeFilters,
            [typeId]: !locationTypeFilters[typeId]
        }
        onLocationTypeFilterChange(newFilters)
        
        // If at least one type is enabled, ensure showLocations is true
        const anyEnabled = Object.values(newFilters).some(v => v)
        if (anyEnabled && !showLocations) {
            onToggleLocations(true)
        } else if (!anyEnabled) {
            onToggleLocations(false)
        }
    }

    return (
        <div className="location-control">
            <div className="location-control__header">
                <div className="location-control__title"><PushPinIcon style={{ fontSize: 16 }} /> Location Filters</div>
                <button
                    className={`location-control__expand-btn ${expanded ? 'expanded' : ''}`}
                    onClick={() => setExpanded(prev => !prev)}
                    aria-expanded={expanded}
                    title={expanded ? 'Collapse' : 'Expand'}
                >
                    {expanded ? (
                        <svg className="caret" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
                        </svg>
                    ) : (
                        <svg className="caret" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
                        </svg>
                    )}
                </button>
            </div>

            {/* Details dropdown - visible when expanded */}
            {expanded && (
                <>
                    <div className="location-control__section">
                        <div className="location-control__label">Location Types:</div>
                        <div className="location-type-filters">
                            {LOCATION_TYPES.map(type => (
                                <button
                                    key={type.id}
                                    className={`location-type-btn ${locationTypeFilters[type.id] ? 'location-type-btn--active' : ''}`}
                                    onClick={() => handleTypeToggle(type.id)}
                                    title={type.label}
                                >
                                    <span className="location-type-btn__icon">{type.icon}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

export default LocationControl
