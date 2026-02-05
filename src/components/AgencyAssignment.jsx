import { useState, useEffect } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material'
import { fetchActiveAgencies, addAgencyToList, removeAgencyFromList, fetchAssignedAgencies } from '../utils/api'

function AgencyAssignment({ currentLevel, selectedRegion }) {
    const [allAgencies, setAllAgencies] = useState([])
    const [selectedAgency, setSelectedAgency] = useState('')
    const [loadingAgencies, setLoadingAgencies] = useState(true)
    const [assignedAgencies, setAssignedAgencies] = useState([])
    const [loadingAssigned, setLoadingAssigned] = useState(false)
    const [isAdding, setIsAdding] = useState(false)
    const [removingId, setRemovingId] = useState(null)
    const [errorOpen, setErrorOpen] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')

    // Load all available agencies on mount
    useEffect(() => {
        async function loadAgencies() {
            try {
                setLoadingAgencies(true)
                const data = await fetchActiveAgencies()
                setAllAgencies(data)
            } catch (error) {
                console.error('Error fetching agencies:', error)
                setErrorMessage('Failed to load agencies')
                setErrorOpen(true)
            } finally {
                setLoadingAgencies(false)
            }
        }
        loadAgencies()
    }, [])

    // Load assigned agencies when region changes
    useEffect(() => {
        async function loadAssignedAgencies() {
            if (!selectedRegion) {
                setAssignedAgencies([])
                return
            }

            try {
                setLoadingAssigned(true)
                const { zoneType, zoneId } = deriveZoneInfo(selectedRegion, currentLevel)
                if (!zoneId) {
                    setAssignedAgencies([])
                    return
                }
                
                const data = await fetchAssignedAgencies(zoneType, zoneId)
                setAssignedAgencies(data)
            } catch (error) {
                console.error('Error fetching assigned agencies:', error)
                setAssignedAgencies([])
            } finally {
                setLoadingAssigned(false)
            }
        }
        loadAssignedAgencies()
    }, [selectedRegion, currentLevel])

    const deriveZoneInfo = (region, level) => {
        if (!region || !region.properties) return { zoneType: null, zoneId: null }
        
        const p = region.properties
        
        // Navigation pattern:
        // - When currentLevel is 'municipality', selectedRegion contains the governorate
        // - When currentLevel is 'sector', selectedRegion contains either:
        //   - The municipality (when we just drilled down from municipality)
        //   - A sector (when a specific sector was clicked)
        
        if (level === 'municipality') {
            // At municipality level, we're viewing municipalities of a governorate
            // So assign agencies to the selected governorate
            return { zoneType: 'governorate', zoneId: p.gov_id }
        }
        
        if (level === 'sector') {
            // At sector level, check if a specific sector was selected
            if (p.sec_uid) {
                // A sector was selected, assign to the sector
                return { zoneType: 'sector', zoneId: p.sec_uid }
            } else if (p.mun_uid) {
                // We drilled down from municipality, assign to the municipality
                return { zoneType: 'municipality', zoneId: p.mun_uid }
            }
        }
        
        return { zoneType: null, zoneId: null }
    }

    const handleAddAgency = async () => {
        if (!selectedAgency || !selectedRegion) return
        
        // Check if agency is already assigned
        if (assignedAgencies.some(a => String(a.agenceId) === String(selectedAgency))) {
            setErrorMessage('Agency is already assigned to this region')
            setErrorOpen(true)
            return
        }
        
        setIsAdding(true)
        try {
            const { zoneType, zoneId } = deriveZoneInfo(selectedRegion, currentLevel)
            
            if (!zoneId) {
                throw new Error('Invalid region selected')
            }

            const result = await addAgencyToList(selectedAgency, zoneType, zoneId)

            const agency = allAgencies.find(a => String(a.agenceId) === String(selectedAgency))
            if (agency) {
                // Add the new assignment with the returned id
                setAssignedAgencies(prev => [...prev, { 
                    ...agency, 
                    agencyWorkingZoneId: result.id,
                    zoneType, 
                    zoneId 
                }])
                setSelectedAgency('')
            }
        } catch (err) {
            setErrorMessage(err?.message || 'Failed to add agency')
            setErrorOpen(true)
        } finally {
            setIsAdding(false)
        }
    }

    const handleRemoveAgency = async (agencyWorkingZoneId, agenceId) => {
        setRemovingId(agenceId)
        try {
            await removeAgencyFromList(agencyWorkingZoneId)
            setAssignedAgencies(prev => prev.filter(a => a.agencyWorkingZoneId !== agencyWorkingZoneId))
        } catch (err) {
            setErrorMessage(err?.message || 'Failed to remove agency')
            setErrorOpen(true)
        } finally {
            setRemovingId(null)
        }
    }

    // Don't show component if no region is selected
    if (!selectedRegion) {
        return null
    }

    const { zoneId } = deriveZoneInfo(selectedRegion, currentLevel)
    if (!zoneId) {
        return null
    }

    return (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color, #ddd)' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
                🏢 Agency Assignment
            </div>

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
                        disabled={loadingAgencies}
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
                            {loadingAgencies ? 'Loading agencies...' : '-- Select an agency --'}
                        </option>
                        {allAgencies.map((agency) => (
                            <option key={agency.agenceId} value={agency.agenceId}>
                                {agency.nomAge || `Agency ${agency.agenceId}`}
                            </option>
                        ))}
                    </select>
                </div>
                <button
                    type="button"
                    onClick={handleAddAgency}
                    disabled={!selectedAgency || loadingAgencies || isAdding}
                    style={{
                        padding: '8px 16px',
                        fontSize: '14px',
                        fontWeight: '500',
                        borderRadius: '6px',
                        background: (!selectedAgency || loadingAgencies || isAdding) ? '#ccc' : 'var(--primary, #007bff)',
                        color: 'white',
                        border: 'none',
                        cursor: (!selectedAgency || loadingAgencies || isAdding) ? 'not-allowed' : 'pointer',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                        transition: 'background 0.2s'
                    }}
                    aria-label="Add agency"
                >
                    {isAdding ? 'Adding...' : 'Add'}
                </button>
            </div>

            {/* Assigned Agencies List */}
            <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: 'var(--text-primary)' }}>
                    Assigned Agencies:
                </div>
                {loadingAssigned ? (
                    <div style={{ color: '#888', fontSize: '13px', padding: '8px 0' }}>Loading...</div>
                ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {assignedAgencies.length === 0 ? (
                            <li style={{ color: '#888', fontSize: '13px', padding: '8px 0' }}>
                                No agencies assigned to this region yet.
                            </li>
                        ) : (
                            assignedAgencies.map((agency) => (
                                <li key={agency.agencyWorkingZoneId || agency.agenceId} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '8px 12px',
                                    marginBottom: '4px',
                                    borderRadius: '4px',
                                    backgroundColor: 'var(--bg-secondary, #f8f9fa)',
                                    border: '1px solid var(--border-color, #e9ecef)',
                                    fontSize: '14px',
                                    color: 'black'
                                }}>
                                    <span style={{ fontWeight: '500' }}>
                                        {agency.nomAge || agency.agenceName || `Agency ${agency.agenceId}`}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveAgency(agency.agencyWorkingZoneId, agency.agenceId)}
                                        disabled={String(removingId) === String(agency.agenceId)}
                                        style={{
                                            marginLeft: '12px',
                                            padding: '4px 12px',
                                            fontSize: '13px',
                                            fontWeight: '500',
                                            borderRadius: '4px',
                                            background: String(removingId) === String(agency.agenceId) ? '#ccc' : '#e74c3c',
                                            color: 'white',
                                            border: 'none',
                                            cursor: String(removingId) === String(agency.agenceId) ? 'not-allowed' : 'pointer',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                                            transition: 'background 0.2s'
                                        }}
                                        aria-label={`Remove ${agency.nomAge || `Agency ${agency.agenceId}`}`}
                                    >
                                        {String(removingId) === String(agency.agenceId) ? 'Removing...' : 'Delete'}
                                    </button>
                                </li>
                            ))
                        )}
                    </ul>
                )}
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
        </div>
    )
}

export default AgencyAssignment
