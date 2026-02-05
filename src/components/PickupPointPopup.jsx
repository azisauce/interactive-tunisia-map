import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material'
import { fetchActiveAgencies, createPickupPoint } from '../utils/api'

function PickupPointPopup({ position, onClose, onPickupPointCreated }) {
    const [agencies, setAgencies] = useState([])
    const [selectedAgency, setSelectedAgency] = useState('')
    const [pickupPointName, setPickupPointName] = useState('')
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState(null)

    // Load agencies on mount
    useEffect(() => {
        async function loadAgencies() {
            try {
                setLoading(true)
                const data = await fetchActiveAgencies()
                setAgencies(data)
            } catch (err) {
                console.error('Error fetching agencies:', err)
                setError('Failed to load agencies')
            } finally {
                setLoading(false)
            }
        }
        loadAgencies()
    }, [])

    const handleSubmit = async () => {
        if (!selectedAgency) {
            setError('Please select an agency')
            return
        }

        try {
            setSubmitting(true)
            setError(null)

            const pickupPointData = {
                name: pickupPointName || `Pickup Point`,
                latitude: position.lat,
                longitude: position.lng,
                agencyId: parseInt(selectedAgency, 10)
            }

            const result = await createPickupPoint(pickupPointData)
            
            // Notify parent of new pickup point with agencies array
            if (onPickupPointCreated) {
                const agency = agencies.find(a => String(a.agenceId) === String(selectedAgency))
                // Note: The backend returns the pickup point without agencies, 
                // so we need to refresh the data or construct it manually
                // For now, we'll trigger a refresh by closing and letting the parent reload
                onPickupPointCreated({
                    ...result,
                    latitude: pickupPointData.latitude,
                    longitude: pickupPointData.longitude,
                    name: pickupPointData.name,
                    agencies: [], // Parent should refresh pickup points to get full data
                    needsRefresh: true
                })
            }
            
            onClose()
        } catch (err) {
            console.error('Error creating pickup point:', err)
            setError(err.message || 'Failed to create pickup point')
        } finally {
            setSubmitting(false)
        }
    }

    const handleCancel = () => {
        onClose()
    }

    return (
        <Dialog 
            open={true} 
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{ className: 'control-card pickup-control-card' }}
            BackdropProps={{ invisible: true }}
        >
            <DialogTitle style={{ padding: 0 }}>
                <div className="control-card__header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
                    <div className="control-card__icon">📍</div>
                    <div>
                        <div className="control-card__title">Add Pickup Point</div>
                        <div className="control-card__subtitle">Assign an agency to this location</div>
                    </div>
                </div>
            </DialogTitle>

            <DialogContent style={{ paddingTop: '16px' }}>
                {loading ? (
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        padding: '20px 0',
                        justifyContent: 'center' 
                    }}>
                        <div className="loading__spinner small"></div>
                        <span>Loading agencies...</span>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label 
                                htmlFor="pickupName" 
                                style={{ 
                                    display: 'block',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    marginBottom: '8px',
                                    color: 'var(--text-primary)'
                                }}
                            >
                                Name (optional)
                            </label>
                            <input
                                id="pickupName"
                                type="text"
                                value={pickupPointName}
                                onChange={(e) => setPickupPointName(e.target.value)}
                                placeholder="Enter pickup point name"
                                autoFocus
                                className="pickup-popup-input"
                            />
                        </div>

                        <div>
                            <label 
                                htmlFor="agencySelect" 
                                style={{ 
                                    display: 'block',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    marginBottom: '8px',
                                    color: 'var(--text-primary)'
                                }}
                            >
                                Assign Agency *
                            </label>
                            <select
                                id="agencySelect"
                                value={selectedAgency}
                                onChange={(e) => setSelectedAgency(e.target.value)}
                                required
                                className="pickup-popup-select"
                            >
                                <option value="">Select an agency...</option>
                                {agencies.map((agency) => (
                                    <option key={agency.agenceId} value={agency.agenceId}>
                                        {agency.nomAge}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                            padding: '8px',
                            backgroundColor: 'rgba(0, 0, 0, 0.03)',
                            borderRadius: '6px',
                            textAlign: 'center'
                        }}>
                            📌 {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
                        </div>

                        {error && (
                            <div style={{
                                padding: '10px',
                                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '8px',
                                color: '#ef4444',
                                fontSize: '13px'
                            }}>
                                ⚠️ {error}
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
            
            <DialogActions style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)' }}>
                <Button 
                    onClick={handleCancel}
                    disabled={submitting}
                    className="pickup-popup-btn cancel"
                    style={{ textTransform: 'none' }}
                >
                    Cancel
                </Button>
                <Button 
                    onClick={handleSubmit}
                    disabled={submitting || !selectedAgency || loading}
                    variant="contained"
                    className="pickup-popup-btn submit"
                    style={{ textTransform: 'none' }}
                >
                    {submitting ? 'Adding...' : 'Add Pickup Point'}
                </Button>
            </DialogActions>
        </Dialog>
    )
}

export default PickupPointPopup
