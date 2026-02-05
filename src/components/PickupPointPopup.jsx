import { useState, useEffect } from 'react'
import { Popup } from 'react-leaflet'
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

    const handleSubmit = async (e) => {
        e.preventDefault()
        
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
            
            // Notify parent of new pickup point
            if (onPickupPointCreated) {
                const agency = agencies.find(a => String(a.agenceId) === String(selectedAgency))
                onPickupPointCreated({
                    ...result,
                    ...pickupPointData,
                    agencyName: agency?.nomAge || 'Unknown Agency'
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
        <Popup
            position={[position.lat, position.lng]}
            onClose={onClose}
            closeOnClick={false}
            autoClose={false}
            className="pickup-point-popup"
        >
            <div className="pickup-popup-content">
                <h3 className="pickup-popup-title">
                    📍 Add Pickup Point
                </h3>
                
                {loading ? (
                    <div className="pickup-popup-loading">
                        <div className="loading__spinner small"></div>
                        <span>Loading agencies...</span>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="pickup-popup-form">
                        <div className="pickup-popup-field">
                            <label htmlFor="pickupName">Name (optional)</label>
                            <input
                                id="pickupName"
                                type="text"
                                value={pickupPointName}
                                onChange={(e) => setPickupPointName(e.target.value)}
                                placeholder="Enter pickup point name"
                                className="pickup-popup-input"
                            />
                        </div>

                        <div className="pickup-popup-field">
                            <label htmlFor="agencySelect">Assign Agency *</label>
                            <select
                                id="agencySelect"
                                value={selectedAgency}
                                onChange={(e) => setSelectedAgency(e.target.value)}
                                className="pickup-popup-select"
                                required
                            >
                                <option value="">Select an agency...</option>
                                {agencies.map((agency) => (
                                    <option key={agency.agenceId} value={agency.agenceId}>
                                        {agency.nomAge}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="pickup-popup-coordinates">
                            <span>📌 {position.lat.toFixed(6)}, {position.lng.toFixed(6)}</span>
                        </div>

                        {error && (
                            <div className="pickup-popup-error">
                                ⚠️ {error}
                            </div>
                        )}

                        <div className="pickup-popup-actions">
                            <button 
                                type="button" 
                                onClick={handleCancel}
                                className="pickup-popup-btn cancel"
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                className="pickup-popup-btn submit"
                                disabled={submitting || !selectedAgency}
                            >
                                {submitting ? 'Adding...' : 'Add Pickup Point'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </Popup>
    )
}

export default PickupPointPopup
