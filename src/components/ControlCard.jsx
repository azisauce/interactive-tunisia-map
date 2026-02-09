import AgencyAssignment from './AgencyAssignment'
import LocationControl from './LocationControl'
import AddLocationsToggle from './AddLocationsToggle'

function ControlCard({ 
    currentLevel, 
    selectedRegion, 
    hoveredRegion, 
    navigationPath, 
    onBack, 
    onReset, 
    onNavigate, 
    onLevelChange, 
    showLocations = true, 
    onToggleLocations,
    locationTypeFilters,
    onLocationTypeFilterChange,
    showDrivagoOnly,
    onToggleDrivagoOnly,
    enableAddLocations = false,
    onToggleAddLocations,
    hasTempMarker = false,
    onCancelTempMarker
}) {
    const getLevelInfo = () => {
        switch (currentLevel) {
            case 'governorate':
                return { label: 'Governorates', icon: '🏛️', count: 24 }
            case 'municipality':
                return { label: 'Municipalities', icon: '🏘️', count: null }
            case 'sector':
                return { label: 'Sectors', icon: '📍', count: null }
            default:
                return { label: 'Regions', icon: '🗺️', count: null }
        }
    }

    const levelInfo = getLevelInfo()

    // Get the correct name based on the level context
    const getRegionNameForLevel = (region, level) => {
        if (!region) return null
        const props = region.properties
        
        if (level === 'governorate') {
            return {
                en: props.gov_en || 'Unknown',
                ar: props.gov_ar || ''
            }
        } else if (level === 'municipality') {
            return {
                en: props.mun_en || 'Unknown',
                ar: props.mun_ar || ''
            }
        } else if (level === 'sector') {
            return {
                en: props.sec_en || 'Unknown',
                ar: props.sec_ar || ''
            }
        }
        
        return {
            en: props.gov_en || props.mun_en || props.sec_en || 'Unknown',
            ar: props.gov_ar || props.mun_ar || props.sec_ar || ''
        }
    }

    const getRegionType = (level) => {
        if (level === 'governorate') return 'Governorate'
        if (level === 'municipality') return 'Municipality'
        if (level === 'sector') return 'Sector'
        return 'Region'
    }

    // Get the selected region name - show the parent region name for drill-down levels
    // or the selected item itself for sectors
    const selectedName = selectedRegion ? (
        currentLevel === 'governorate' 
            ? getRegionNameForLevel(selectedRegion, 'governorate')
            : currentLevel === 'municipality'
            ? getRegionNameForLevel(selectedRegion, 'governorate')
            : getRegionNameForLevel(selectedRegion, 'sector') // Show sector name at sector level
    ) : null
    
    const hoveredName = hoveredRegion ? getRegionNameForLevel(hoveredRegion, currentLevel) : null
    const hoveredType = hoveredRegion ? getRegionType(currentLevel) : null

    // Get parent info for breadcrumb
    const getBreadcrumbs = () => {
        const crumbs = [{ label: 'Tunisia', level: 'country' }]

        navigationPath.forEach(item => {
            const name = getRegionNameForLevel(item.region, item.level)
            if (name) {
                crumbs.push({
                    label: name.en,
                    level: item.level,
                    region: item.region
                })
            }
        })

        return crumbs
    }

    const breadcrumbs = getBreadcrumbs()

    return (
        <div className="control-card">
            {/* Breadcrumb Navigation */}
            {breadcrumbs.length > 1 && (
                <div className="breadcrumb">
                    {breadcrumbs.map((crumb, index) => (
                        <div key={index} className="breadcrumb__item">
                            {index > 0 && <span className="breadcrumb__separator">›</span>}
                            {index === breadcrumbs.length - 1 ? (
                                <span className="breadcrumb__current">{crumb.label}</span>
                            ) : (
                                <button
                                    className="breadcrumb__link"
                                    onClick={() => onNavigate(index)}
                                >
                                    {crumb.label}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Current Level Badge */}
            <div className={`level-badge level-badge--${currentLevel}`}>
                <span>{levelInfo.icon}</span>
                <span>Viewing {levelInfo.label}</span>
            </div>

            {/* Hovered Region Info */}
            {hoveredName && (
                <div className="region-info region-info--hover">
                    <div className="region-info__label">Hovering: {hoveredType}</div>
                    <div className="region-info__name">{hoveredName.en}</div>
                    <div className="region-info__name-ar">{hoveredName.ar}</div>
                </div>
            )}

            {/* Selected Region Info - show when not hovering or when at sector level */}
            {selectedName && (!hoveredName || currentLevel === 'sector') && (
                <div className={`region-info ${hoveredName ? 'region-info--selected-small' : ''}`}>
                    <div className="region-info__label">
                        {currentLevel === 'sector' ? 'Selected Sector' : 'Selected Region'}
                    </div>
                    <div className="region-info__name">{selectedName.en}</div>
                    <div className="region-info__name-ar">{selectedName.ar}</div>
                </div>
            )}

            {/* Level Selector - only in big view */}
            {navigationPath.length === 0 && (
                <div className="view-selector">
                    <div className="view-selector__label">Split Map By:</div>
                    <div className="view-selector__group">
                        <button 
                            className={`view-selector__btn ${currentLevel === 'governorate' ? 'view-selector__btn--active' : ''}`}
                            onClick={() => onLevelChange('governorate')}
                        >
                            🏛️ Governorates
                        </button>
                        <button 
                            className={`view-selector__btn ${currentLevel === 'municipality' ? 'view-selector__btn--active' : ''}`}
                            onClick={() => onLevelChange('municipality')}
                        >
                            🏘️ Municipalities
                        </button>
                        <button 
                            className={`view-selector__btn ${currentLevel === 'sector' ? 'view-selector__btn--active' : ''}`}
                            onClick={() => onLevelChange('sector')}
                        >
                            📍 Sectors
                        </button>
                    </div>
                </div>
            )}

            {/* Location Control Component */}
            <LocationControl 
                showLocations={showLocations}
                onToggleLocations={onToggleLocations}
                locationTypeFilters={locationTypeFilters}
                onLocationTypeFilterChange={onLocationTypeFilterChange}
                showDrivagoOnly={showDrivagoOnly}
                onToggleDrivagoOnly={onToggleDrivagoOnly}
            />

            {/* Add Locations Toggle (applies to all layers) */}
            <AddLocationsToggle 
                value={enableAddLocations}
                onChange={onToggleAddLocations}
            />

            {/* Instruction */}
            {currentLevel !== 'sector' && (
                <p style={{
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    marginBottom: '16px',
                    lineHeight: '1.5'
                }}>
                    {currentLevel === 'governorate'
                        ? 'Click on a governorate to explore its municipalities'
                        : 'Click on a municipality to explore its sectors'
                    }
                </p>
            )}

            {currentLevel === 'sector' && (
                <p style={{
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    marginBottom: '16px',
                    lineHeight: '1.5'
                }}>
                    Viewing sectors. Click to select.
                </p>
            )}

            {/* Agency Assignment Component */}
            <AgencyAssignment currentLevel={currentLevel} selectedRegion={selectedRegion} />

            {/* Cancel Marker Button - only visible when a draggable marker is placed */}
            {hasTempMarker && (
                <button
                    className="btn btn--cancel-marker"
                    onClick={onCancelTempMarker}
                >
                    ✕ Cancel Marker
                </button>
            )}

            {/* Navigation Buttons */}
            <div className="btn-group">
                {navigationPath.length > 0 && (
                    <button className="btn btn--secondary" onClick={onBack}>
                        ← Back
                    </button>
                )}
                {navigationPath.length > 0 && (
                    <button className="btn btn--primary" onClick={onReset}>
                        🏠 Home
                    </button>
                )}
            </div>
        </div>
    )
}

export default ControlCard
