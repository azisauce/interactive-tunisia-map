import { useState, useEffect } from 'react'
import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
// import AgencyAssignment from './AgencyAssignment'
import LocationControl from './LocationControl'
import AddLocationsToggle from './AddLocationsToggle'
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import GeneralPricingDialog from './GeneralPricingDialog'

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
    enableAddLocations = false,
    onToggleAddLocations,
    onToggleAddLocationsOn,
    onTypeSelect,
    zoneColorFilters,
    onZoneColorFilterChange,
    onAgencySelect,
    onMoneyClick,
    locations = []
}) {
    const getLevelInfo = () => {
        switch (currentLevel) {
            case 'governorate':
                return { label: 'Governorates', icon: '🏛️', count: 24 }
            case 'municipality':
                return { label: 'Municipalities', icon: '🏘️', count: null }
            case 'sector':
                return { label: 'Sectors', icon: '🛣️', count: null }
            default:
                return { label: 'Regions', icon: '🗺️', count: null }
        }
    }

    const levelInfo = getLevelInfo()

    const [showSearchBox, setShowSearchBox] = useState(false)
    const [agenciesSearch, setAgenciesSearch] = useState('')
    const [selectedAgency, setSelectedAgency] = useState('')
    const [agencies, setAgencies] = useState([])
    const [loadingAgencies, setLoadingAgencies] = useState(false)
    const [agenciesError, setAgenciesError] = useState(null)
    const [moneyDialogOpen, setMoneyDialogOpen] = useState(false)

    // Load active agencies and filter to those with coordinates
    useEffect(() => {
        async function loadAgencies() {
            try {
                setLoadingAgencies(true)
                const data = await (await import('../utils/api')).fetchActiveAgencies()
                console.log('data from API:', data);
                
                // Filter agencies that have coordinate info (latitude/longitude or lat/lng)
                const filtered = (data || []).filter(a => {
                    const lat = a.lat
                    const lng = a.long
                    return (lat !== undefined && lat !== null && lat !== '') && (lng !== undefined && lng !== null && lng !== '')
                })
                setAgencies(filtered)
            } catch (err) {
                console.error('Error fetching agencies:', err)
                setAgenciesError('Failed to load agencies')
            } finally {
                setLoadingAgencies(false)
            }
        }
        loadAgencies()
    }, [])

    // Get the correct name based on the level context
    const getRegionNameForLevel = (region, level) => {
        if (!region) return null
        const props = region.properties
        
        if (level === 'governorate') {
            return {
                en: props.gov_en || 'Unknown',
                ar: props.gov_ar || ''
            }
        } else {
            if (!props.sec_uid) {
                return {
                    en: props.mun_en || 'Unknown',
                    ar: props.mun_ar || ''
                }
            } else {
                return {
                    en: props.sec_en || 'Unknown',
                    ar: props.sec_ar || ''
                }
            }
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
    // const selectedName = selectedRegion ? (
    //     currentLevel === 'governorate' 
    //         ? getRegionNameForLevel(selectedRegion, 'governorate')
    //         : currentLevel === 'municipality'
    //         ? getRegionNameForLevel(selectedRegion, 'governorate')
    //         : getRegionNameForLevel(selectedRegion, 'sector') // Show sector name at sector level
    // ) : null;
    let selectedName = null;
    switch (currentLevel) {
        case 'municipality':
            selectedName = selectedRegion ? getRegionNameForLevel(selectedRegion, 'governorate') : null
            break;
        case 'sector':
            selectedName = selectedRegion ? getRegionNameForLevel(selectedRegion, 'municipality') : null
            break;
    }
    console.log('currentLevel:', currentLevel, 'Selected Region:', selectedRegion, 'Selected Name:', selectedName);
    
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
            <div className='header-card'>
               {/* Breadcrumb Navigation */}
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

                {/* Add Locations Toggle (applies to all layers) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AddLocationsToggle 
                        value={enableAddLocations}
                        onChange={onToggleAddLocations}
                        onToggleOn={onToggleAddLocationsOn}
                        onTypeSelect={onTypeSelect}
                    />
                    <button
                        type="button"
                        className="add-toggle-button"
                        onClick={() => setMoneyDialogOpen(true)}
                        aria-label="Money"
                        title="Money"
                    >
                        <AttachMoneyIcon style={{ fontSize: 20 }} />
                    </button>
                </div>
            </div>
            <GeneralPricingDialog
                open={moneyDialogOpen}
                onClose={() => setMoneyDialogOpen(false)}
                onConfirm={() => { if (onMoneyClick) onMoneyClick() }}
                title="General Pricing"
            />

            {/* Current Level Badge */}
            <div style={{display:"flex", justifyContent: "space-between", alignItems: "center", marginBlock: "12px"}}>
                <div className={`level-badge level-badge--${currentLevel}`}>
                    <span>{levelInfo.icon}</span>
                    <span>Viewing {levelInfo.label}</span>
                </div>
                <div>
                    <button
                        className="search-btn"
                        onClick={() => setShowSearchBox(prev => !prev)}
                        aria-expanded={showSearchBox}
                        aria-label="Toggle search"
                    >
                        {showSearchBox ? <CloseIcon style={{ fontSize: 18 }} /> : <SearchIcon style={{ fontSize: 18 }} />}
                    </button>
                </div>
            </div>

            {showSearchBox && (
                <div className="search-panel" style={{ border: '1px solid var(--border)', padding: '8px', marginBottom: '12px', borderRadius: '6px' }}>
                    <Autocomplete
                        options={agencies}
                        getOptionLabel={(option) => `${option.nomAge}${option.lat ? ` (${option.lat}, ${option.long})` : ''}` || ''}
                        value={agencies.find(a => a.id === selectedAgency) || null}
                        onChange={(event, newValue) => {
                            if (newValue) {
                                setSelectedAgency(newValue.id)
                                setAgenciesSearch(newValue.name)
                                if (onAgencySelect) onAgencySelect(newValue)
                            } else {
                                setSelectedAgency('')
                                setAgenciesSearch('')
                                if (onAgencySelect) onAgencySelect(null)
                            }
                        }}
                        inputValue={agenciesSearch}
                        onInputChange={(event, newInputValue) => {
                            setAgenciesSearch(newInputValue)
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Select Agency"
                                placeholder="Search or select an agency..."
                                variant="outlined"
                                size="small"
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                        color: 'var(--text-primary)',
                                        '& fieldset': {
                                            borderColor: 'var(--border-color)',
                                        },
                                        '&:hover fieldset': {
                                            borderColor: 'var(--primary-light)',
                                        },
                                        '&.Mui-focused fieldset': {
                                            borderColor: 'var(--primary-light)',
                                        },
                                    },
                                    '& .MuiInputLabel-root': {
                                        color: 'var(--text-primary)',
                                        fontSize: '14px',
                                        '&.Mui-focused': {
                                            color: 'var(--primary-light)',
                                        },
                                    },
                                    '& .MuiInputBase-input': {
                                        color: 'var(--text-primary)',
                                    },
                                    '& .MuiSvgIcon-root': {
                                        color: 'var(--text-secondary)',
                                    },
                                }}
                            />
                        )}
                        noOptionsText="No agencies found"
                        clearOnEscape
                        componentsProps={{
                            popper: {
                                sx: {
                                    '& .MuiPaper-root': {
                                        backgroundColor: '#1e293b',
                                        color: 'var(--text-primary)',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-color)',
                                    },
                                    '& .MuiAutocomplete-option': {
                                        color: 'var(--text-primary)',
                                        '&:hover': {
                                            backgroundColor: 'rgba(37, 99, 235, 0.1)',
                                        },
                                        '&[aria-selected="true"]': {
                                            backgroundColor: 'rgba(37, 99, 235, 0.2)',
                                        },
                                    },
                                    '& .MuiAutocomplete-noOptions': {
                                        color: 'var(--text-secondary)',
                                    },
                                },
                            },
                        }}
                    />
                </div>
            )}

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
                    <div className='region-info__content'>
                        <div className='region-info__details'>
                            <div className="region-info__name">{selectedName.en}</div>
                            <div className="region-info__name-ar">{selectedName.ar}</div>
                        </div>
                        <button
                            type="button"
                            className="region-info__button add-toggle-button"
                            onClick={() => setMoneyDialogOpen(true)}
                            aria-label="Region action"
                            title="Region action"
                        >
                            <AttachMoneyIcon style={{ fontSize: 20 }} />
                        </button>

                    </div>
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
                            🛣️ Sectors
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
                zoneColorFilters={zoneColorFilters}
                onZoneColorFilterChange={onZoneColorFilterChange}
                locations={locations}
                selectedRegion={selectedRegion}
            />

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
            {/* <AgencyAssignment currentLevel={currentLevel} selectedRegion={selectedRegion} /> */}

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
