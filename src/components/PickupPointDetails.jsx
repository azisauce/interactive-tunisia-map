import { useState, useEffect } from 'react'
import { Button, IconButton } from '@mui/material'
import ArrowOutwardIcon from '@mui/icons-material/ArrowOutward'
import { deleteLocation, addAgencyToLocation, removeAgencyFromLocation, fetchActiveAgenciesCached as fetchActiveAgencies } from '../utils/api'

function PickupPointDetails({ point, open = true, onClose, onDeleted, onUpdated }) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [agencies, setAgencies] = useState([])
    const [selectedAgency, setSelectedAgency] = useState('')
    const [addingAgency, setAddingAgency] = useState(false)
    const [removingAgencyId, setRemovingAgencyId] = useState(null)
    const [loadingAgencies, setLoadingAgencies] = useState(true)

    console.log('point==============>',point);
    

    // Prevent map interactions when cursor is over this panel
    const stopPropagation = (e) => {
        e.stopPropagation()
    }
    const stopWheel = (e) => {
        e.stopPropagation()
    }

    if (!point) return null

    // Load available agencies on mount
    useEffect(() => {
        async function loadAgencies() {
            try {
                setLoadingAgencies(true)
                const data = await fetchActiveAgencies()
                setAgencies(data)
            } catch (err) {
                console.error('Error fetching agencies:', err)
                setError('Failed to load agencies')
            } finally {
                setLoadingAgencies(false)
            }
        }
        loadAgencies()
    }, [])

    const handleDelete = async () => {
        setError(null)
        setLoading(true)
        try {
            await deleteLocation(point.id)
            if (onDeleted) onDeleted(point.id)
            onClose()
        } catch (err) {
            console.error('Failed to delete location', err)
            setError(err?.message || 'Failed to delete')
        } finally {
            setLoading(false)
        }
    }

    const handleAddAgency = async () => {
        if (!selectedAgency) {
            setError('Please select an agency')
            return
        }

        setError(null)
        setAddingAgency(true)
        try {
            const result = await addAgencyToLocation(point.id, parseInt(selectedAgency, 10))
            
            // Find the agency details
            const agency = agencies.find(a => String(a.agenceId) === String(selectedAgency))
            
            // Update the point with new agency
            const newAgency = {
                locationAgencyId: result.id,
                agencyId: parseInt(selectedAgency, 10),
                agencyName: agency?.nomAge || 'Unknown Agency'
            }
            
            point.agencies = [...(point.agencies || []), newAgency]
            
            if (onUpdated) onUpdated(point)
            setSelectedAgency('')
        } catch (err) {
            console.error('Failed to add agency', err)
            setError(err?.message || 'Failed to add agency')
        } finally {
            setAddingAgency(false)
        }
    }

    const handleRemoveAgency = async (locationAgencyId) => {
        setError(null)
        setRemovingAgencyId(locationAgencyId)
        try {
            // For driving schools, we delete the entire location since they're in agency_location table
            if (point.type === 'driving_school') {
                await deleteLocation(point.id)
                if (onDeleted) onDeleted(point.id)
                onClose()
            } else {
                // For pickup_point and exam_center, use removeAgencyFromLocation
                const result = await removeAgencyFromLocation(locationAgencyId)
                
                if (result.locationDeleted) {
                    // The entire location was deleted
                    if (onDeleted) onDeleted(point.id)
                    onClose()
                } else {
                    // Just remove the agency from the list
                    point.agencies = (point.agencies || []).filter(a => a.locationAgencyId !== locationAgencyId)
                    if (onUpdated) onUpdated(point)
                }
            }
        } catch (err) {
            console.error('Failed to remove agency', err)
            setError(err?.message || 'Failed to remove agency')
        } finally {
            setRemovingAgencyId(null)
        }
    }

    const pointAgencies = point.agencies || []
    const assignedAgencyIds = pointAgencies.map(a => String(a.agencyId))
    const availableAgencies = agencies.filter(a => !assignedAgencyIds.includes(String(a.agenceId)))

    const typeLabels = {
        pickup_point: '📍 Pickup Point',
        driving_school: '🏫 Driving School',
        exam_center: '📝 Exam Center'
    }
    const typeLabel = typeLabels[point.type] || typeLabels.pickup_point
    
    const handleDrivingSchoolClick = () => {
        if (point.type !== 'driving_school') return
        
        // Get the driving school agency ID
        const drivingSchoolId = point.agencies?.[0]?.agencyId || point.id
        
        // Determine base URL based on environment
        const hostname = window.location.hostname
        const isProduction = hostname.includes('autoecoleplus.tn') && !hostname.includes('test')
        const baseUrl = isProduction 
            ? 'https://cloud.autoecoleplus.tn'
            : 'https://testadmin.autoecoleplus.tn'
        
        const url = `${baseUrl}/agences/detailsagence/${drivingSchoolId}`
        window.open(url, '_blank', 'noopener,noreferrer')
    }
    
    if (!open) return null

    return (
        <div
            className="control-card pickup-control-card"
            onMouseDown={stopPropagation}
            onMouseUp={stopPropagation}
            onMouseMove={stopPropagation}
            onWheel={stopWheel}
            onTouchStart={stopPropagation}
            onTouchMove={stopPropagation}
            onPointerDown={stopPropagation}
            style={{
                cursor: 'default',
            position: 'fixed',
            top: '20px',
            right: '20px',
            width: '400px',
            maxHeight: 'calc(100vh - 40px)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000
        }}>
            <div style={{ overflowX: 'hidden', overflowY: 'auto', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <div 
                            style={{ 
                                fontWeight: 600, 
                                color: 'white', 
                                marginBottom: 8, 
                                fontSize: 20, 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 6, 
                                textDecoration: point.type === 'driving_school' ? 'underline' : 'none',
                                cursor: point.type === 'driving_school' ? 'pointer' : 'default'
                            }}
                            onClick={point.type === 'driving_school' ? handleDrivingSchoolClick : undefined}
                        >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{point.name || 'Location'}</span>
                            {point.type === 'driving_school' && (
                                <ArrowOutwardIcon style={{ fontSize: 18, marginLeft: 6 }} />
                            )}
                        </div>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                            <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)', marginBottom: 4, display: 'inline-block', padding: '2px 8px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4 }}>{typeLabel}</div>
                            <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.7)' }}>📌 {Number(point.latitude).toFixed(6)}, {Number(point.longitude).toFixed(6)}</div>
                        </div>
                        {point?.nameFr && (
                            <div style={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.8)', marginBlock: 12 }}>{point.nameFr}</div>
                        )}
                        {point?.nameAr && (
                            <div style={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.8)', marginBlock: 12, direction: 'rtl' }}>{point.nameAr}</div>
                        )}

                        {point?.addressFr && (
                            <div style={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.8)', marginBlock: 12 }}>{point.addressFr}</div>
                        )}
                        {point?.addressAr && (
                            <div style={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.8)', marginBlock: 12, direction: 'rtl' }}>{point.addressAr}</div>
                        )}

                        {point.createdAt && (
                            <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)', marginTop: 4, textAlign: 'right' }}>Created: {new Date(point.createdAt).toLocaleString()}</div>
                        )}
                    </div>

                    {point.type == 'pickup_point' && (
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'white', marginBottom: 8 }}>
                                Add Agency
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                <select
                                    value={selectedAgency}
                                    onChange={(e) => setSelectedAgency(e.target.value)}
                                    disabled={loadingAgencies || addingAgency}
                                    style={{
                                        flex: 1,
                                        minWidth: 0,
                                        maxWidth: '100%',
                                        boxSizing: 'border-box',
                                        padding: '8px 12px',
                                        fontSize: '14px',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border-color, #ddd)',
                                        backgroundColor: 'var(--bg-secondary, white)',
                                        color: 'black',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="">
                                        {loadingAgencies ? 'Loading...' : availableAgencies.length === 0 ? 'All agencies assigned' : 'Select an agency...'}
                                    </option>
                                    {availableAgencies.map((agency) => (
                                        <option key={agency.agenceId} value={agency.agenceId}>
                                            {agency.nomAge}
                                        </option>
                                    ))}
                                </select>
                                <Button
                                    variant="contained"
                                    onClick={handleAddAgency}
                                    disabled={!selectedAgency || addingAgency || loadingAgencies}
                                    style={{
                                        textTransform: 'none',
                                        backgroundColor: addingAgency ? '#666' : '#3b82f6'
                                    }}
                                >
                                    +
                                </Button>
                            </div>
                        </div>
                    )}
                    <div>
                        {point.type == 'pickup_point' && (
                            <>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'white', marginBottom: 8 }}>
                                Assigned Agencies ({pointAgencies.length})
                            </div>
                            {pointAgencies.length === 0 ? (
                                <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.5)', fontStyle: 'italic', padding: '8px 0' }}>
                                    No agencies assigned
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {pointAgencies.map((agency) => (
                                        <div 
                                            key={agency.locationAgencyId} 
                                            style={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'space-between',
                                                padding: '8px 12px',
                                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                borderRadius: '6px',
                                                border: '1px solid rgba(255, 255, 255, 0.1)'
                                            }}
                                        >
                                            <div style={{ color: 'white', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{agency.agencyName || 'Unknown Agency'}</div>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleRemoveAgency(agency.locationAgencyId)}
                                                disabled={removingAgencyId === agency.locationAgencyId}
                                                style={{ 
                                                    color: '#ef4444',
                                                    padding: '4px'
                                                }}
                                                title="Remove agency"
                                            >
                                                {removingAgencyId === agency.locationAgencyId ? '⏳' : '🗑️'}
                                            </IconButton>
                                        </div>
                                    ))}
                                </div>
                            )}
                            </>
                        )}
                        
                    </div>

                    

                    {error && (
                        <div style={{ color: '#ef4444', fontSize: 13, padding: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '4px' }}>{error}</div>
                    )}
                </div>
            </div>

            <div style={{ padding: '12px 0px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <Button onClick={onClose} disabled={loading} className="pickup-popup-btn cancel">Close</Button>
                <Button onClick={handleDelete} color="error" variant="contained" disabled={loading} className="pickup-popup-btn submit">
                    {loading ? 'Deleting...' : 'Delete Location'}
                </Button>
            </div>
        </div>
    )
}

export default PickupPointDetails
