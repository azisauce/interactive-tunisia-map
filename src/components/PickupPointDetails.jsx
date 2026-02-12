import { useState, useEffect } from 'react'
import { Button, IconButton, Switch } from '@mui/material'
import ArrowOutwardIcon from '@mui/icons-material/ArrowOutward'
import EditIcon from '@mui/icons-material/Edit'
import CloseIcon from '@mui/icons-material/Close'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import SchoolIcon from '@mui/icons-material/School'
import DescriptionIcon from '@mui/icons-material/Description'
import PushPinIcon from '@mui/icons-material/PushPin'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import DeleteIcon from '@mui/icons-material/Delete'
import LoyaltyIcon from '@mui/icons-material/Loyalty';
import { deleteLocation, addAgencyToLocation, removeAgencyFromLocation, fetchActiveAgenciesCached as fetchActiveAgencies, updateLocation, updateAgencyShowInDrivago } from '../utils/api'
import ConfirmDialog from './ConfirmDialog'

function PickupPointDetails({ point, open = true, onClose, onDeleted, onUpdated, onEditModeChange, onEditCoordsChange, externalEditCoords }) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [agencies, setAgencies] = useState([])
    const [selectedAgency, setSelectedAgency] = useState('')
    const [addingAgency, setAddingAgency] = useState(false)
    const [removingAgencyId, setRemovingAgencyId] = useState(null)
    const [loadingAgencies, setLoadingAgencies] = useState(true)
    const [confirm, setConfirm] = useState({ open: false, title: '', message: '', onConfirm: null, confirmText: 'Confirm', cancelText: 'Cancel' })
    
    // Edit mode states
    const [isEditMode, setIsEditMode] = useState(false)
    const [saving, setSaving] = useState(false)
    const [editForm, setEditForm] = useState({
        nameFr: '',
        nameAr: '',
        addressFr: '',
        addressAr: '',
        latitude: '',
        longitude: ''
    })

    console.log('point==============>',point);
    

    // Prevent map interactions when cursor is over this panel
    const stopPropagation = (e) => {
        e.stopPropagation()
    }
    const stopWheel = (e) => {
        e.stopPropagation()
    }

    if (!point) return null

    // Initialize edit form when point changes or entering edit mode
    useEffect(() => {
        if (point) {
            setEditForm({
                nameFr: point.nameFr || '',
                nameAr: point.nameAr || '',
                addressFr: point.addressFr || '',
                addressAr: point.addressAr || '',
                latitude: point.latitude || '',
                longitude: point.longitude || ''
            })
        }
    }, [point])

    // Reset edit mode when a different location is selected
    useEffect(() => {
        setIsEditMode(false)
        setError(null)
        // Notify parent that edit mode is off
        if (onEditModeChange) onEditModeChange(false, null)
    }, [point?.id])

    // Update form coordinates when marker is dragged (external coordinates)
    useEffect(() => {
        if (externalEditCoords && isEditMode) {
            setEditForm(prev => ({
                ...prev,
                latitude: externalEditCoords.latitude,
                longitude: externalEditCoords.longitude
            }))
        }
    }, [externalEditCoords])

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

    const performDelete = async () => {
        setError(null)
        setLoading(true)
        try {
            await deleteLocation(point.id, point.type)
            if (onDeleted) onDeleted(point.id)
            onClose()
        } catch (err) {
            console.error('Failed to delete location', err)
            setError(err?.message || 'Failed to delete')
        } finally {
            setLoading(false)
        }
    }

    const requestDelete = () => {
        setConfirm({ open: true, title: 'Delete location', message: 'Are you sure you want to delete this location? This action cannot be undone.', onConfirm: performDelete, confirmText: 'Delete', cancelText: 'Cancel' })
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

    const performRemoveAgency = async (locationAgencyId) => {
        setError(null)
        setRemovingAgencyId(locationAgencyId)
        try {
            // For driving schools, we delete the entire location since they're in agency_location table
            if (point.type === 'driving_school') {
                await deleteLocation(point.id, point.type)
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

    const requestRemoveAgency = (locationAgencyId) => {
        setConfirm({ open: true, title: 'Remove agency', message: 'Are you sure you want to remove this agency from the location?', onConfirm: () => performRemoveAgency(locationAgencyId), confirmText: 'Remove', cancelText: 'Cancel' })
    }

    const closeConfirm = () => setConfirm(prev => ({ ...prev, open: false }))
    const executeConfirm = () => {
        if (confirm.onConfirm) {
            Promise.resolve(confirm.onConfirm()).finally(() => closeConfirm())
        } else {
            closeConfirm()
        }
    }

    const handleEditFormChange = (field, value) => {
        const newForm = { ...editForm, [field]: value }
        setEditForm(newForm)
        
        // Notify parent when coordinates change
        if ((field === 'latitude' || field === 'longitude') && onEditCoordsChange) {
            const lat = field === 'latitude' ? parseFloat(value) : parseFloat(newForm.latitude)
            const lng = field === 'longitude' ? parseFloat(value) : parseFloat(newForm.longitude)
            if (!isNaN(lat) && !isNaN(lng)) {
                onEditCoordsChange({ latitude: lat, longitude: lng })
            }
        }
    }

    const handleEnterEditMode = () => {
        const newEditForm = {
            nameFr: point.nameFr || '',
            nameAr: point.nameAr || '',
            addressFr: point.addressFr || '',
            addressAr: point.addressAr || '',
            latitude: point.latitude || '',
            longitude: point.longitude || ''
        }
        setEditForm(newEditForm)
        setIsEditMode(true)
        setError(null)
        // Notify parent immediately with correct coordinates
        if (onEditModeChange) {
            onEditModeChange(true, { 
                latitude: point.latitude, 
                longitude: point.longitude 
            })
        }
    }

    const handleCancelEdit = () => {
        setIsEditMode(false)
        setError(null)
        // Reset form to original values
        setEditForm({
            nameFr: point.nameFr || '',
            nameAr: point.nameAr || '',
            addressFr: point.addressFr || '',
            addressAr: point.addressAr || '',
            latitude: point.latitude || '',
            longitude: point.longitude || ''
        })
        // Notify parent that edit mode is off
        if (onEditModeChange) onEditModeChange(false, null)
    }

    const handleSaveEdit = async () => {
        setError(null)
        setSaving(true)
        try {
            const updateData = {
                type: point.type
            }

            // Only include fields that are editable for this type
            if (point.type === 'pickup_point') {
                updateData.nameFr = editForm.nameFr || null
                updateData.nameAr = editForm.nameAr || null
            }
            
            if (point.type === 'driving_school') {
                updateData.addressFr = editForm.addressFr || null
                updateData.addressAr = editForm.addressAr || null
            }

            // Coordinates are editable for all types
            const lat = parseFloat(editForm.latitude)
            const lng = parseFloat(editForm.longitude)
            
            if (!isNaN(lat)) updateData.latitude = lat
            if (!isNaN(lng)) updateData.longitude = lng

            const result = await updateLocation(point.id, updateData)
            
            // Update the point with new values
            const updatedPoint = {
                ...point,
                ...result,
                agencies: point.agencies // Keep agencies from original point
            }
            
            if (onUpdated) onUpdated(updatedPoint)
            setIsEditMode(false)
            // Notify parent that edit mode is off
            if (onEditModeChange) onEditModeChange(false, null)
        } catch (err) {
            console.error('Failed to save changes', err)
            setError(err?.message || 'Failed to save changes')
        } finally {
            setSaving(false)
        }
    }

    const pointAgencies = point.agencies || []
    const assignedAgencyIds = pointAgencies.map(a => String(a.agencyId))
    const availableAgencies = agencies.filter(a => !assignedAgencyIds.includes(String(a.agenceId)))

    const getTypeLabel = (type) => {
        const labels = {
            pickup_point: { icon: <LocationOnIcon style={{ fontSize: 16 }} />, text: 'Pickup Point' },
            driving_school: { icon: <SchoolIcon style={{ fontSize: 16 }} />, text: 'Driving School' },
            exam_center: { icon: <DescriptionIcon style={{ fontSize: 16 }} />, text: 'Exam Center' }
        }
        return labels[type] || labels.pickup_point
    }
    const typeLabel = getTypeLabel(point.type)
    
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

    const handleToggleDrivago = async (e) => {
        e.stopPropagation()
        const newValue = !point.showInDrivago
        
        // Get the first agency's profile ID
        const agency = point.agencies?.[0]
        if (!agency || !agency.agencyId) {
            setError('No agency profile found to update')
            return
        }
        
        try {
            await updateAgencyShowInDrivago(agency.agencyId, newValue)
            
            // Update the point's top-level showInDrivago property
            point.showInDrivago = newValue
            
            if (onUpdated) onUpdated(point)
        } catch (err) {
            console.error('Failed to update showInDrivago', err)
            setError(err?.message || 'Failed to update')
        }
    }
    
    if (!open) return null

    return (
        <div
            className="control-card pickup-control-card"
            style={{
                cursor: 'default',
            position: 'fixed',
            top: '20px',
            right: '20px',
            width: '440px',
            maxHeight: 'calc(100vh - 40px)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000
        }}>
            {/* Toggle for showInDrivago - only show if not null */}
            {point.showInDrivago !== null && point.showInDrivago !== undefined && (
                <div
                    style={{
                        position: 'absolute',
                        top: 8,
                        right: 56,
                        display: 'flex',
                        alignItems: 'center',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: 20,
                        padding: '4px 8px'
                    }}
                    title={`Show in Drivago: ${point.showInDrivago ? 'On' : 'Off'}`}
                >
                    <Switch
                        checked={point.showInDrivago === true}
                        onChange={handleToggleDrivago}
                        size="small"
                        sx={{
                            '& .MuiSwitch-switchBase.Mui-checked': {
                                color: '#3b82f6',
                            },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                backgroundColor: '#3b82f6',
                            },
                        }}
                    />
                </div>
            )}

            {/* Edit button in top right corner */}
            <IconButton
                onClick={isEditMode ? handleCancelEdit : handleEnterEditMode}
                style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    color: isEditMode ? '#ef4444' : 'rgba(255, 255, 255, 0.7)',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    padding: 8
                }}
                title={isEditMode ? 'Cancel edit' : 'Edit location'}
            >
                {isEditMode ? <CloseIcon style={{ fontSize: 20 }} /> : <EditIcon style={{ fontSize: 20 }} />}
            </IconButton>

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
                                cursor: point.type === 'driving_school' ? 'pointer' : 'default',
                                paddingRight: 40,
                                maxWidth: '300px',
                                textWrap: 'auto',
                            }}
                            onClick={point.type === 'driving_school' ? handleDrivingSchoolClick : undefined}
                        >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{point.name || 'Location'}</span>
                            {point.type === 'driving_school' && (
                                <ArrowOutwardIcon style={{ fontSize: 18, marginLeft: 6 }} />
                            )}
                        </div>
                        <div style={{display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 8, marginBottom: 8}}>
                            <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)', marginBottom: 4, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4 }}>
                                {typeLabel.icon}
                                {typeLabel.text}
                            </div>
                            { point.subDivision && (
                                <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)', marginBottom: 4, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4 }}>
                                    <LoyaltyIcon style={{ fontSize: 12 }} />
                                    {point.subDivision}
                                </div>
                            )}
                        </div>
                            {!isEditMode && (
                                <div style={{ fontSize: 15, color: 'rgba(255, 255, 255, 0.7)', textAlign: 'right' }}>
                                    <PushPinIcon style={{ fontSize: 16 }} />
                                    {Number(point.latitude).toFixed(6)}, {Number(point.longitude).toFixed(6)}
                                </div>
                            )}
                        
                        {/* Edit Mode Fields */}
                        {isEditMode ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                                {/* Coordinates */}
                                <div>
                                    <label style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)', marginBottom: 4, display: 'block' }}>Coordinates</label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input
                                            type="number"
                                            step="any"
                                            value={editForm.latitude}
                                            onChange={(e) => handleEditFormChange('latitude', e.target.value)}
                                            placeholder="Latitude"
                                            style={{
                                                flex: 1,
                                                padding: '8px 12px',
                                                fontSize: 14,
                                                borderRadius: 6,
                                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                color: 'white'
                                            }}
                                        />
                                        <input
                                            type="number"
                                            step="any"
                                            value={editForm.longitude}
                                            onChange={(e) => handleEditFormChange('longitude', e.target.value)}
                                            placeholder="Longitude"
                                            style={{
                                                flex: 1,
                                                padding: '8px 12px',
                                                fontSize: 14,
                                                borderRadius: 6,
                                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                color: 'white'
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Name fields - for pickup_point */}
                                {point.type === 'pickup_point' && (
                                    <>
                                        <div>
                                            <label style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)', marginBottom: 4, display: 'block' }}>Name (French)</label>
                                            <input
                                                type="text"
                                                value={editForm.nameFr}
                                                onChange={(e) => handleEditFormChange('nameFr', e.target.value)}
                                                placeholder="Name in French"
                                                style={{
                                                    width: '100%',
                                                    boxSizing: 'border-box',
                                                    padding: '8px 12px',
                                                    fontSize: 14,
                                                    borderRadius: 6,
                                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                    color: 'white'
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)', marginBottom: 4, display: 'block' }}>Name (Arabic)</label>
                                            <input
                                                type="text"
                                                value={editForm.nameAr}
                                                onChange={(e) => handleEditFormChange('nameAr', e.target.value)}
                                                placeholder="الاسم بالعربية"
                                                dir="rtl"
                                                style={{
                                                    width: '100%',
                                                    boxSizing: 'border-box',
                                                    padding: '8px 12px',
                                                    fontSize: 14,
                                                    borderRadius: 6,
                                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                    color: 'white'
                                                }}
                                            />
                                        </div>
                                    </>
                                )}

                                {/* Address fields - for driving_school */}
                                {point.type === 'driving_school' && (
                                    <>
                                        <div>
                                            <label style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)', marginBottom: 4, display: 'block' }}>Address (French)</label>
                                            <input
                                                type="text"
                                                value={editForm.addressFr}
                                                onChange={(e) => handleEditFormChange('addressFr', e.target.value)}
                                                placeholder="Address in French"
                                                style={{
                                                    width: '100%',
                                                    boxSizing: 'border-box',
                                                    padding: '8px 12px',
                                                    fontSize: 14,
                                                    borderRadius: 6,
                                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                    color: 'white'
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)', marginBottom: 4, display: 'block' }}>Address (Arabic)</label>
                                            <input
                                                type="text"
                                                value={editForm.addressAr}
                                                onChange={(e) => handleEditFormChange('addressAr', e.target.value)}
                                                placeholder="العنوان بالعربية"
                                                dir="rtl"
                                                style={{
                                                    width: '100%',
                                                    boxSizing: 'border-box',
                                                    padding: '8px 12px',
                                                    fontSize: 14,
                                                    borderRadius: 6,
                                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                    color: 'white'
                                                }}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <>
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
                            </>
                        )}

                        {point.createdAt && (
                            <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)', marginTop: 4, textAlign: 'right' }}>Created: {new Date(point.createdAt).toLocaleString()}</div>
                        )}
                    </div>

                    {point.type == 'pickup_point' && !isEditMode && (
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
                        {point.type == 'pickup_point' && !isEditMode && (
                            <>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'white', marginBottom: 8 }}>
                                Assigned Agencies ({pointAgencies.length})
                            </div>
                            {pointAgencies.length === 0 ? (
                                <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.5)', fontStyle: 'italic', padding: '8px 0' }}>
                                    No agencies assigned
                                </div>
                            ) : (
                                <div className="point-assigned-agencies-list" style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '133px', overflow: 'auto', scrollbarWidth: 'thin', overscrollBehavior: 'contain' }}>
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
                                                onClick={() => requestRemoveAgency(agency.locationAgencyId)}
                                                disabled={removingAgencyId === agency.locationAgencyId}
                                                style={{ 
                                                    color: '#ef4444',
                                                    padding: '4px'
                                                }}
                                                title="Remove agency"
                                            >
                                                {removingAgencyId === agency.locationAgencyId ? <HourglassEmptyIcon style={{ fontSize: 18 }} /> : <DeleteIcon style={{ fontSize: 18 }} />}
                                            </IconButton>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <style>{`
.point-assigned-agencies-list::-webkit-scrollbar { width: 8px; height: 8px; }
.point-assigned-agencies-list::-webkit-scrollbar-track { background: transparent; }
.point-assigned-agencies-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 6px; transition: background 0.2s; }
.point-assigned-agencies-list::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.14); }
.point-assigned-agencies-list { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.08) transparent; }
                            `}</style>
                            </>
                        )}
                        
                    </div>

                    

                    {error && (
                        <div style={{ color: '#ef4444', fontSize: 13, padding: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '4px' }}>{error}</div>
                    )}
                </div>
            </div>

            <div style={{ padding: '12px 0px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                {isEditMode ? (
                    <>
                        <Button onClick={handleCancelEdit} disabled={saving} className="pickup-popup-btn cancel">Cancel</Button>
                        <Button onClick={handleSaveEdit} variant="contained" disabled={saving} className="pickup-popup-btn submit" style={{ backgroundColor: saving ? '#666' : '#3b82f6' }}>
                            {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </>
                ) : (
                    <>
                        <Button onClick={onClose} disabled={loading} className="pickup-popup-btn cancel">Close</Button>
                        <Button onClick={requestDelete} color="error" variant="contained" disabled={loading} className="pickup-popup-btn submit">
                            {loading ? 'Deleting...' : 'Delete Location'}
                        </Button>
                    </>
                )}
            </div>
            <ConfirmDialog
                open={confirm.open}
                title={confirm.title}
                message={confirm.message}
                onCancel={closeConfirm}
                onConfirm={executeConfirm}
                confirmText={confirm.confirmText}
                cancelText={confirm.cancelText}
            />
        </div>
    )
}

export default PickupPointDetails
