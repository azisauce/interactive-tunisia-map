import { useState } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material'
import { deletePickupPoint } from '../utils/api'

function PickupPointDetails({ point, open = true, onClose, onDeleted }) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    if (!point) return null

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

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ className: 'control-card pickup-control-card' }} BackdropProps={{ invisible: true }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontWeight: 600, color: 'white' }}>{point.name || 'Pickup Point'}</div>
                    <div style={{ color: 'white' }}>{point.agencyName || 'No agency'}</div>
                    <div style={{ fontSize: 13, color: 'white' }}>📌 {Number(point.latitude).toFixed(6)}, {Number(point.longitude).toFixed(6)}</div>
                    {point.createdAt && (
                        <div style={{ fontSize: 12, color: 'white' }}>Created: {new Date(point.createdAt).toLocaleString()}</div>
                    )}
                    {error && (
                        <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>
                    )}
                </div>
            </DialogContent>

            <DialogActions style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)' }}>
                <Button onClick={onClose} disabled={loading} className="pickup-popup-btn cancel">Close</Button>
                <Button onClick={handleDelete} color="error" variant="contained" disabled={loading} className="pickup-popup-btn submit">
                    {loading ? 'Deleting...' : 'Delete'}
                </Button>
            </DialogActions>
        </Dialog>
    )
}

export default PickupPointDetails
