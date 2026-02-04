import { useState, useEffect } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material'
import { fetchActiveAgencies, addAgencyToList, removeAgencyFromList } from '../utils/api'

function ControlCard({ currentLevel, selectedRegion, hoveredRegion, navigationPath, onBack, onReset }) {
    const [agencies, setAgencies] = useState([])
    const [selectedAgency, setSelectedAgency] = useState('')
    const [loading, setLoading] = useState(true)
    const [addedAgencies, setAddedAgencies] = useState([])
    const [isAdding, setIsAdding] = useState(false)
    const [removingId, setRemovingId] = useState(null)
    const [errorOpen, setErrorOpen] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')

    const handleAddAgency = async () => {
        if (!selectedAgency) return
        if (addedAgencies.some(a => String(a.agenceId) === String(selectedAgency))) return
        setIsAdding(true)
        try {
            // derive zone info from selectedRegion
            const deriveZoneId = (region, level) => {
                console.log('region===========>', region);
                console.log('level===========>', level);
                
                if (!region || !region.properties) return null
                const p = region.properties
                // Extract the correct id based on the level
                if (level === 'municipality') return p.gov_id || null
                if (level === 'sector') return p.sec_uid || p.mun_uid || null
                return null
            }

            const zoneType = currentLevel
            const zoneId = deriveZoneId(selectedRegion, currentLevel)

            await addAgencyToList(selectedAgency, zoneType, zoneId)

            const agency = agencies.find(a => String(a.agenceId) === String(selectedAgency))
            if (agency) {
                // store zone info with the agency entry so removal can reuse it
                setAddedAgencies(prev => [...prev, { ...agency, zoneType, zoneId }])
                setSelectedAgency('')
            }
        } catch (err) {
            setErrorMessage(err?.message || 'Failed to add agency')
            setErrorOpen(true)
        } finally {
            setIsAdding(false)
        }
    }

    const handleRemoveAgency = async (agenceId) => {
        setRemovingId(agenceId)
        try {
            const existing = addedAgencies.find(a => String(a.agenceId) === String(agenceId)) || {}
            const zoneType = existing.zoneType || currentLevel
            const zoneId = existing.zoneId || (selectedRegion && selectedRegion.properties?.id) || null

            await removeAgencyFromList(agenceId, zoneType, zoneId)
            setAddedAgencies(prev => prev.filter(a => String(a.agenceId) !== String(agenceId)))
        } catch (err) {
            setErrorMessage(err?.message || 'Failed to remove agency')
            setErrorOpen(true)
        } finally {
            setRemovingId(null)
        }
    }

    useEffect(() => {
        async function loadAgencies() {
            try {
                setLoading(true)
                const data = await fetchActiveAgencies()
                setAgencies(data)
            } catch (error) {
                console.error('Error fetching agencies:', error)
            } finally {
                setLoading(false)
            }
        }
        loadAgencies()
    }, [])

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
            {/* Header */}
            <div className="control-card__header">
                <div className="control-card__icon">🇹🇳</div>
                <div>
                    <div className="control-card__title">Tunisia Map</div>
                    <div className="control-card__subtitle">Interactive Administrative Map</div>
                </div>
            </div>

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
                                    onClick={index === 0 ? onReset : undefined}
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

            {/* Agency Selector + Add Button */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                    <label htmlFor="agency-select" style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: '500',
                        color: 'var(--text-primary)',
                        marginBottom: '8px'
                    }}>
                        Select Agency
                    </label>
                    <select
                        id="agency-select"
                        value={selectedAgency}
                        onChange={(e) => setSelectedAgency(e.target.value)}
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            fontSize: '14px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color, #ddd)',
                            backgroundColor: 'var(--bg-secondary, white)',
                            color: 'black',
                            cursor: 'pointer',
                            transition: 'border-color 0.2s'
                        }}
                    >
                        <option value="">
                            {loading ? 'Loading agencies...' : 'All Agencies'}
                        </option>
                        {agencies.map((agency) => (
                            <option key={agency.agenceId} value={agency.agenceId}>
                                {agency.nomAge || agency.agenceName || agency.agence_name || `Agency ${agency.agenceId}`}
                            </option>
                        ))}
                    </select>
                </div>
                <button
                    type="button"
                    onClick={handleAddAgency}
                    disabled={!selectedAgency || loading || isAdding}
                    style={{
                        padding: '8px 12px',
                        fontSize: '18px',
                        borderRadius: '6px',
                        background: 'var(--primary, #007bff)',
                        color: 'white',
                        border: 'none',
                        cursor: (!selectedAgency || loading || isAdding) ? 'not-allowed' : 'pointer',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
                    }}
                    aria-label="Add agency"
                >
                    +
                </button>
            </div>

            {/* Added Agencies List */}
            <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>Selected Agencies:</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {addedAgencies.length === 0 ? (
                        <li style={{ color: '#888', fontSize: '13px' }}>No agencies added yet.</li>
                    ) : (
                        addedAgencies.map((agency) => (
                            <li key={agency.agenceId} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '6px 0',
                                borderBottom: '1px solid #eee',
                                fontSize: '14px',
                                color: 'var(--text-primary)'
                            }}>
                                <span>
                                    {agency.nomAge || agency.agenceName || agency.agence_name || agency.nom || `Agency ${agency.agenceId}`}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveAgency(agency.agenceId)}
                                    disabled={String(removingId) === String(agency.agenceId)}
                                    style={{
                                        marginLeft: '12px',
                                        padding: '2px 8px',
                                        fontSize: '16px',
                                        borderRadius: '4px',
                                        background: '#e74c3c',
                                        color: 'white',
                                        border: 'none',
                                        cursor: String(removingId) === String(agency.agenceId) ? 'not-allowed' : 'pointer',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.06)'
                                    }}
                                    aria-label={`Remove ${agency.nomAge || agency.agenceName || agency.agence_name || agency.nom || `Agency ${agency.agenceId}`}`}
                                >
                                    -
                                </button>
                            </li>
                        ))
                    )}
                </ul>
            </div>

            {/* Error Dialog */}
            <Dialog open={errorOpen} onClose={() => setErrorOpen(false)}>
                <DialogTitle>Error</DialogTitle>
                <DialogContent>
                    <div style={{ minWidth: 240 }}>{errorMessage}</div>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setErrorOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>

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

            {/* Stats */}
            {currentLevel === 'governorate' && (
                <div className="stats">
                    <div className="stat">
                        <div className="stat__value">24</div>
                        <div className="stat__label">Governorates</div>
                    </div>
                    <div className="stat">
                        <div className="stat__value">357</div>
                        <div className="stat__label">Municipalities</div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ControlCard
