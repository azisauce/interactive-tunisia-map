import { useState, useEffect, useRef } from 'react'
import { Button } from '@mui/material'
import { fetchActiveAgenciesCached as fetchActiveAgencies, createLocation } from '../utils/api'

function PickupPointPopup({ position, onClose, onPickupPointCreated, initialType = 'pickup_point', initialCoords = null }) {
    const [agencies, setAgencies] = useState([])
    const [selectedAgency, setSelectedAgency] = useState('')
    const [pickupPointName, setPickupPointName] = useState('')
    const [locationType, setLocationType] = useState(initialType)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState(null)

    // Local editable coordinates. Initialize from `initialCoords` if provided, otherwise from `position`.
    const [coords, setCoords] = useState({
        lat: initialCoords && typeof initialCoords.lat === 'number' ? initialCoords.lat : (position?.lat ?? null),
        lng: initialCoords && typeof initialCoords.lng === 'number' ? initialCoords.lng : (position?.lng ?? null)
    })

    // Sync local coords when parent `position` or `initialCoords` changes
    useEffect(() => {
        setCoords({
            lat: initialCoords && typeof initialCoords.lat === 'number' ? initialCoords.lat : (position?.lat ?? null),
            lng: initialCoords && typeof initialCoords.lng === 'number' ? initialCoords.lng : (position?.lng ?? null)
        })
    }, [position, initialCoords])

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

        const latNum = typeof coords.lat === 'number' ? coords.lat : parseFloat(coords.lat)
        const lngNum = typeof coords.lng === 'number' ? coords.lng : parseFloat(coords.lng)

        if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
            setError('Please provide valid latitude and longitude')
            return
        }

        try {
            setSubmitting(true)
            setError(null)

            const locationData = {
                name: pickupPointName || 'Location',
                type: locationType,
                latitude: typeof coords.lat === 'number' ? coords.lat : parseFloat(coords.lat),
                longitude: typeof coords.lng === 'number' ? coords.lng : parseFloat(coords.lng),
                agencyId: parseInt(selectedAgency, 10)
            }

            const result = await createLocation(locationData)
            
            // Notify parent of new location with agencies array
            if (onPickupPointCreated) {
                const agency = agencies.find(a => String(a.agenceId) === String(selectedAgency))
                onPickupPointCreated({
                    ...result,
                    latitude: locationData.latitude,
                    longitude: locationData.longitude,
                    name: locationData.name,
                    type: locationData.type,
                    agencies: [],
                    needsRefresh: true
                })
            }
            
            onClose()
        } catch (err) {
            console.error('Error creating location:', err)
            setError(err.message || 'Failed to create location')
        } finally {
            setSubmitting(false)
        }
    }

    const handleCancel = () => {
        onClose()
    }

    return (
        <div className="control-card pickup-control-card" style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            width: '400px',
            maxHeight: 'calc(100vh - 40px)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000
        }}>
            <div style={{ paddingTop: '16px', overflowY: 'auto', flex: 1, padding: '16px' }}>
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
                                htmlFor="locationType" 
                                style={{ 
                                    display: 'block',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    marginBottom: '8px',
                                    color: 'var(--text-primary)'
                                }}
                            >
                                Location Type *
                            </label>
                            <select
                                id="locationType"
                                value={locationType}
                                onChange={(e) => setLocationType(e.target.value)}
                                className="pickup-popup-select"
                            >
                                <option value="pickup_point">📍 Pickup Point</option>
                                <option value="driving_school">🏫 Driving School</option>
                                <option value="exam_center">📝 Exam Center</option>
                            </select>
                        </div>

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
                                placeholder="Enter location name"
                                autoFocus
                                className="pickup-popup-input"
                            />
                        </div>

                        <div>
                            <label 
                                htmlFor="coordsManual" 
                                style={{ 
                                    display: 'block',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    marginBottom: '8px',
                                    color: 'var(--text-primary)'
                                }}
                            >
                                Coordinates (latitude / longitude)
                            </label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    id="coordsLat"
                                    type="number"
                                    step="0.000001"
                                    value={coords.lat ?? ''}
                                    onChange={(e) => setCoords(prev => ({ ...prev, lat: e.target.value === '' ? null : parseFloat(e.target.value) }))}
                                    placeholder="Latitude"
                                    className="pickup-popup-input"
                                    style={{ flex: 1 }}
                                />
                                <input
                                    id="coordsLng"
                                    type="number"
                                    step="0.000001"
                                    value={coords.lng ?? ''}
                                    onChange={(e) => setCoords(prev => ({ ...prev, lng: e.target.value === '' ? null : parseFloat(e.target.value) }))}
                                    placeholder="Longitude"
                                    className="pickup-popup-input"
                                    style={{ flex: 1 }}
                                />
                            </div>
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
                            {position.lat && position.lng ? (
                                <>📌 {position.lat.toFixed(6)}, {position.lng.toFixed(6)}</>
                            ) : (
                                <>📍 Click on the map to set coordinates</>
                            )}
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
            </div>
            
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
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
                    disabled={submitting || !selectedAgency || loading || !position.lat || !position.lng}
                    variant="contained"
                    className="pickup-popup-btn submit"
                    style={{ textTransform: 'none' }}
                >
                    {submitting ? 'Adding...' : 'Add Location'}
                </Button>
            </div>
        </div>
    )
}

export default PickupPointPopup
