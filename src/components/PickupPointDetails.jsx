import { useState, useEffect } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton } from '@mui/material'
import { deletePickupPoint, addAgencyToPickupPoint, removeAgencyFromPickupPoint, fetchActiveAgencies } from '../utils/api'

function PickupPointDetails({ point, open = true, onClose, onDeleted, onUpdated }) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [agencies, setAgencies] = useState([])
    const [selectedAgency, setSelectedAgency] = useState('')
    const [addingAgency, setAddingAgency] = useState(false)
    const [removingAgencyId, setRemovingAgencyId] = useState(null)
    const [loadingAgencies, setLoadingAgencies] = useState(true)

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
            await deletePickupPoint(point.id)
            if (onDeleted) onDeleted(point.id)
            onClose()
        } catch (err) {
            console.error('Failed to delete pickup point', err)
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
            const result = await addAgencyToPickupPoint(point.id, parseInt(selectedAgency, 10))
            
            // Find the agency details
            const agency = agencies.find(a => String(a.agenceId) === String(selectedAgency))
            
            // Update the point with new agency
            const newAgency = {
                pickupPointAgencyId: result.id,
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

    const handleRemoveAgency = async (pickupPointAgencyId) => {
        setError(null)
        setRemovingAgencyId(pickupPointAgencyId)
        try {
            const result = await removeAgencyFromPickupPoint(pickupPointAgencyId)
            
            if (result.pickupPointDeleted) {
                // The entire pickup point was deleted
                if (onDeleted) onDeleted(point.id)
                onClose()
            } else {
                // Just remove the agency from the list
                point.agencies = (point.agencies || []).filter(a => a.pickupPointAgencyId !== pickupPointAgencyId)
                if (onUpdated) onUpdated(point)
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

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ className: 'control-card pickup-control-card' }} BackdropProps={{ invisible: true }}>
            <DialogTitle style={{ padding: 0 }}>
                <div className="control-card__header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
                    <div className="control-card__icon">📍</div>
                    <div>
                        <div className="control-card__title">Pickup Point</div>
                        <div className="control-card__subtitle">Details</div>
                    </div>
                </div>
            </DialogTitle>

            <DialogContent>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <div style={{ fontWeight: 600, color: 'white', marginBottom: 4 }}>{point.name || 'Pickup Point'}</div>
                        <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.7)' }}>📌 {Number(point.latitude).toFixed(6)}, {Number(point.longitude).toFixed(6)}</div>
                        {point.createdAt && (
                            <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)', marginTop: 4 }}>Created: {new Date(point.createdAt).toLocaleString()}</div>
                        )}
                    </div>

                    <div>
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
                                        key={agency.pickupPointAgencyId} 
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
                                        <div style={{ color: 'white', fontSize: 14 }}>{agency.agencyName || 'Unknown Agency'}</div>
                                        <IconButton
                                            size="small"
                                            onClick={() => handleRemoveAgency(agency.pickupPointAgencyId)}
                                            disabled={removingAgencyId === agency.pickupPointAgencyId}
                                            style={{ 
                                                color: '#ef4444',
                                                padding: '4px'
                                            }}
                                            title="Remove agency"
                                        >
                                            {removingAgencyId === agency.pickupPointAgencyId ? '⏳' : '🗑️'}
                                        </IconButton>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'white', marginBottom: 8 }}>
                            Add Agency
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <select
                                value={selectedAgency}
                                onChange={(e) => setSelectedAgency(e.target.value)}
                                disabled={loadingAgencies || addingAgency}
                                style={{
                                    flex: 1,
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
                                    minWidth: '80px',
                                    textTransform: 'none',
                                    backgroundColor: addingAgency ? '#666' : '#3b82f6'
                                }}
                            >
                                {addingAgency ? 'Adding...' : 'Add'}
                            </Button>
                        </div>
                    </div>

                    {error && (
                        <div style={{ color: '#ef4444', fontSize: 13, padding: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '4px' }}>{error}</div>
                    )}
                </div>
            </DialogContent>

            <DialogActions style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)' }}>
                <Button onClick={onClose} disabled={loading} className="pickup-popup-btn cancel">Close</Button>
                <Button onClick={handleDelete} color="error" variant="contained" disabled={loading} className="pickup-popup-btn submit">
                    {loading ? 'Deleting...' : 'Delete Point'}
                </Button>
            </DialogActions>
        </Dialog>
    )
}

export default PickupPointDetails
