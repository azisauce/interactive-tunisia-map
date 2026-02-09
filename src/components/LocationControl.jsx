import { useState, useEffect } from 'react'

const LOCATION_TYPES = [
    { id: 'pickup_point', label: 'Pickup Points', icon: '📍' },
    { id: 'driving_school', label: 'Driving Schools', icon: '🏫' },
    { id: 'exam_center', label: 'Exam Centers', icon: '📝' }
]

function LocationControl({ 
    showLocations, 
    onToggleLocations, 
    locationTypeFilters, 
    onLocationTypeFilterChange,
    showDrivagoOnly,
    onToggleDrivagoOnly 
}) {
    const allTypesSelected = LOCATION_TYPES.every(type => locationTypeFilters[type.id])
    const noTypesSelected = LOCATION_TYPES.every(type => !locationTypeFilters[type.id])

    const handleToggleAll = () => {
        // Use the visible state to decide action so the button always toggles
        if (showLocations) {
            // Hide all locations and clear type filters
            const newFilters = {}
            LOCATION_TYPES.forEach(type => {
                newFilters[type.id] = false
            })
            onLocationTypeFilterChange(newFilters)
            onToggleLocations(false)
        } else {
            // Show all locations and enable all type filters
            const newFilters = {}
            LOCATION_TYPES.forEach(type => {
                newFilters[type.id] = true
            })
            onLocationTypeFilterChange(newFilters)
            onToggleLocations(true)
        }
    }

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
                <div className="location-control__title">📌 Location Filters</div>
            </div>

            {/* Master Toggle */}
            <div className="location-control__section">
                <button
                    className={`btn ${showLocations && !noTypesSelected ? 'btn--primary' : 'btn--secondary'}`}
                    onClick={handleToggleAll}
                    style={{ width: '100%' }}
                >
                    {showLocations && !noTypesSelected ? '👁️ Hide All Locations' : '👁️‍🗨️ Show All Locations'}
                </button>
            </div>

            {/* Location Type Filters */}
            {showLocations && (
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
                        <div className="location-control__hint">
                            Click icons to filter location types
                        </div>
                    </div>

                    {/* Drivago Filter */}
                    <div className="location-control__section">
                        <div className="location-control__label">
                            <span>🚗 Drivago Agencies:</span>
                        </div>
                        <button
                            className={`btn ${showDrivagoOnly ? 'btn--primary' : 'btn--secondary'}`}
                            onClick={onToggleDrivagoOnly}
                            style={{ width: '100%' }}
                        >
                            {showDrivagoOnly ? 'Showing Drivago Only' : 'Show All Agencies'}
                        </button>
                        <div className="location-control__hint">
                            Filter locations by Drivago agencies
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

export default LocationControl
