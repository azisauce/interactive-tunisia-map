import { useState, useEffect, useRef } from 'react'
import { Button, Autocomplete, TextField } from '@mui/material'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import PushPinIcon from '@mui/icons-material/PushPin'
import { fetchActiveAgenciesCached as fetchActiveAgencies, fetchExamCenters, createLocation } from '../utils/api'

function PickupPointPopup({ position, onClose, onPickupPointCreated, onCoordinatesChange, initialType = 'pickup_point', initialCoords = null }) {
    const [agencies, setAgencies] = useState([])
    const [examCenters, setExamCenters] = useState([])
    const [selectedAgency, setSelectedAgency] = useState('')
    const [selectedExamCenter, setSelectedExamCenter] = useState('')
    const [selectedSubDivision, setSelectedSubDivision] = useState('')
    const [searchExamCenter, setSearchExamCenter] = useState('')
    const [searchAgency, setSearchAgency] = useState('')
    const [pickupPointNameFr, setPickupPointNameFr] = useState('')
    const [pickupPointNameAr, setPickupPointNameAr] = useState('')
    const [pickupPointAddressFr, setPickupPointAddressFr] = useState('')
    const [pickupPointAddressAr, setPickupPointAddressAr] = useState('')
    const [locationType, setLocationType] = useState(initialType)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState(null)

    // Prevent map interactions when cursor is over this panel
    const stopPropagation = (e) => {
        e.stopPropagation()
    }
    const stopWheel = (e) => {
        e.stopPropagation()
    }

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

    // Load exam centers when user selects exam_center type
    useEffect(() => {
        let mounted = true
        async function loadExamCenters() {
            try {
                setLoading(true)
                const data = await fetchExamCenters()
                if (!mounted) return
                setExamCenters(data)
            } catch (err) {
                console.error('Error fetching exam centers:', err)
            } finally {
                setLoading(false)
            }
        }

        if (locationType === 'exam_center') {
            loadExamCenters()
        }

        return () => { mounted = false }
    }, [locationType])

    // Helper to compute initial coords (from initialCoords prop or current position)
    const getInitialCoords = () => ({
        lat: initialCoords && typeof initialCoords.lat === 'number' ? initialCoords.lat : (position?.lat ?? null),
        lng: initialCoords && typeof initialCoords.lng === 'number' ? initialCoords.lng : (position?.lng ?? null)
    })

    // Reset all input fields to their initial state
    const resetFields = () => {
        setPickupPointNameFr('')
        setPickupPointNameAr('')
        setPickupPointAddressFr('')
        setPickupPointAddressAr('')
        setSelectedAgency('')
        setSelectedExamCenter('')
        setSelectedSubDivision('')
        setSearchAgency('')
        setSearchExamCenter('')
        setError(null)
        setSubmitting(false)
        setCoords({lat: null, lng: null})
    }

    // Reset fields when switching types
    useEffect(() => {
        resetFields()
    }, [locationType])

    const handleSubmit = async () => {
        const latNum = typeof coords.lat === 'number' ? coords.lat : parseFloat(coords.lat)
        const lngNum = typeof coords.lng === 'number' ? coords.lng : parseFloat(coords.lng)

        if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
            setError('Please provide valid latitude and longitude')
            return
        }

        // agency is required only for driving_school (backend constraint)
        if (locationType === 'driving_school' && !selectedAgency) {
            setError('Please select an agency')
            return
        }

        try {
            setSubmitting(true)
            setError(null)

            const latitude = typeof coords.lat === 'number' ? coords.lat : parseFloat(coords.lat)
            const longitude = typeof coords.lng === 'number' ? coords.lng : parseFloat(coords.lng)

            const locationData = {
                // Keep `name` for backwards compatibility (use French name first)
                name: pickupPointNameFr || pickupPointNameAr || 'Location',
                nameFr: pickupPointNameFr || null,
                nameAr: pickupPointNameAr || null,
                type: locationType,
                latitude,
                longitude
            }

            // Only include agencyId when appropriate (driving_school requires it,
            // pickup_point may have it optionally, exam_center must not include it)
            if (locationType == 'driving_school' && selectedAgency) {
                locationData.agencyId = parseInt(selectedAgency, 10)
            }

            if (locationType == 'exam_center' && selectedExamCenter) {
                locationData.examCenterId = parseInt(selectedExamCenter, 10)
            }

            // Include address fields for non-pickup_point types
            if (locationType !== 'pickup_point') {
                locationData.addressFr = pickupPointAddressFr || null
                locationData.addressAr = pickupPointAddressAr || null
            }

            const result = await createLocation(locationData)
            
            // Notify parent of new location with agencies array
            if (onPickupPointCreated) {
                const agency = agencies.find(a => String(a.agenceId) === String(selectedAgency))
                onPickupPointCreated({
                    ...result,
                    latitude: locationData.latitude || latitude,
                    longitude: locationData.longitude || longitude,
                    name: locationData.name,
                    nameFr: locationData.nameFr,
                    nameAr: locationData.nameAr,
                    type: locationData.type,
                    examCenterId: locationData.examCenterId || null,
                    agencies: [],
                    needsRefresh: true
                })
            }

            // reset local form state then close
            resetFields()
            onClose()
        } catch (err) {
            console.error('Error creating location:', err)
            setError(err.message || 'Failed to create location')
        } finally {
            setSubmitting(false)
        }
    }

    const handleCancel = () => {
        resetFields()
        onClose()
    }

    // Validation for required fields (used to disable Add button and show message)
    const isCoordsValid = Number.isFinite(coords.lat) && Number.isFinite(coords.lng)
    const missingRequired = []

    if (locationType === 'pickup_point') {
        if (!pickupPointNameFr) missingRequired.push('Name (FR)')
        if (!isCoordsValid) missingRequired.push('Coordinates')
    } else if (locationType === 'driving_school') {
        if (!isCoordsValid) missingRequired.push('Coordinates')
        if (!pickupPointAddressFr) missingRequired.push('Address (FR)')
        if (!selectedAgency) missingRequired.push('Assigned agency')
    } else if (locationType === 'exam_center') {
        if (!isCoordsValid) missingRequired.push('Coordinates')
        if (!selectedExamCenter) missingRequired.push('Selected exam center')
    }

    const isAddDisabled = submitting || loading || missingRequired.length > 0

    // Get unique subdivisions from exam centers
    const subDivisions = [...new Set(examCenters.map(c => c.subDivision).filter(Boolean))].sort()

    // Filter exam centers based on selected subdivision and search input
    const filteredExamCenters = examCenters
        .filter((c) => {
            // Filter by subdivision if one is selected
            if (selectedSubDivision && c.subDivision !== selectedSubDivision) {
                return false
            }
            // Filter by search term if one is entered
            if (searchExamCenter && !String(c.name).toLowerCase().includes(String(searchExamCenter).toLowerCase())) {
                return false
            }
            return true
        })

    // Filter agencies based on user search input
    const filteredAgencies = searchAgency
        ? agencies.filter((a) => String(a.nomAge).toLowerCase().includes(String(searchAgency).toLowerCase()))
        : agencies

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
                                onChange={(e) => {
                                    resetFields()
                                    setLocationType(e.target.value)
                                }}
                                className="pickup-popup-select"
                            >
                                <option value="pickup_point">Pickup Point</option>
                                <option value="driving_school">Driving School</option>
                                <option value="exam_center">Exam Center</option>
                            </select>
                        </div>

                        {locationType == 'pickup_point' && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                            <div style={{ flex: 1 }}>
                                <label 
                                    htmlFor="pickupNameFr" 
                                    style={{ 
                                        display: 'block',
                                        fontSize: '13px',
                                        fontWeight: '500',
                                        marginBottom: '8px',
                                        color: 'var(--text-primary)'
                                    }}
                                >
                                    Name (FR)
                                </label>
                                <input
                                    id="pickupNameFr"
                                    type="text"
                                    value={pickupPointNameFr}
                                    onChange={(e) => setPickupPointNameFr(e.target.value)}
                                    placeholder="Enter name (FR)"
                                    autoFocus
                                    className="pickup-popup-input"
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label 
                                    htmlFor="pickupNameAr" 
                                    style={{ 
                                        display: 'block',
                                        fontSize: '13px',
                                        fontWeight: '500',
                                        marginBottom: '8px',
                                        color: 'var(--text-primary)'
                                    }}
                                >
                                    Name (AR)
                                </label>
                                <input
                                    id="pickupNameAr"
                                    type="text"
                                    dir="rtl"
                                    value={pickupPointNameAr}
                                    onChange={(e) => setPickupPointNameAr(e.target.value)}
                                    placeholder="أدخل الإسم (AR)"
                                    className="pickup-popup-input"
                                    style={{ textAlign: 'right' }}
                                />
                            </div>
                        </div>
                        )}
                        {locationType == 'driving_school' && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <div style={{ flex: 1 }}>
                                    <label 
                                        htmlFor="pickupAddressFr" 
                                        style={{ 
                                            display: 'block',
                                            fontSize: '13px',
                                            fontWeight: '500',
                                            marginBottom: '8px',
                                            color: 'var(--text-primary)'
                                        }}
                                    >
                                        Address (FR)
                                    </label>
                                    <input
                                        id="pickupAddressFr"
                                        type="text"
                                        value={pickupPointAddressFr}
                                        onChange={(e) => setPickupPointAddressFr(e.target.value)}
                                        placeholder="Enter address (FR)"
                                        className="pickup-popup-input"
                                    />
                                </div>

                                <div style={{ flex: 1 }}>
                                    <label 
                                        htmlFor="pickupAddressAr" 
                                        style={{ 
                                            display: 'block',
                                            fontSize: '13px',
                                            fontWeight: '500',
                                            marginBottom: '8px',
                                            color: 'var(--text-primary)'
                                        }}
                                    >
                                        Address (AR)
                                    </label>
                                    <input
                                        id="pickupAddressAr"
                                        type="text"
                                        dir="rtl"
                                        value={pickupPointAddressAr}
                                        onChange={(e) => setPickupPointAddressAr(e.target.value)}
                                        placeholder="أدخل العنوان (AR)"
                                        className="pickup-popup-input"
                                        style={{ textAlign: 'right' }}
                                    />
                                </div>
                            </div>
                        )}

                        {locationType == 'exam_center' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div>
                                    <label 
                                        htmlFor="subDivisionSelect" 
                                        style={{ 
                                            display: 'block',
                                            fontSize: '13px',
                                            fontWeight: '500',
                                            marginBottom: '8px',
                                            color: 'var(--text-primary)'
                                        }}
                                    >
                                        Select Subdivision
                                    </label>
                                    <select
                                        id="subDivisionSelect"
                                        value={selectedSubDivision}
                                        onChange={(e) => {
                                            setSelectedSubDivision(e.target.value)
                                            // Reset exam center selection when subdivision changes
                                            setSelectedExamCenter('')
                                            setSearchExamCenter('')
                                        }}
                                        className="pickup-popup-select"
                                        autoFocus
                                    >
                                        <option value="">All Subdivisions</option>
                                        {subDivisions.map((division) => (
                                            <option key={division} value={division}>
                                                {division}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <Autocomplete
                                        options={filteredExamCenters}
                                        getOptionLabel={(option) => option.name || ''}
                                        value={filteredExamCenters.find(c => c.id === selectedExamCenter) || null}
                                        onChange={(event, newValue) => {
                                            if (newValue) {
                                                setSelectedExamCenter(newValue.id)
                                                setSearchExamCenter(newValue.name)
                                            } else {
                                                setSelectedExamCenter('')
                                                setSearchExamCenter('')
                                            }
                                        }}
                                        inputValue={searchExamCenter}
                                        onInputChange={(event, newInputValue) => {
                                            setSearchExamCenter(newInputValue)
                                        }}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Select Exam Center"
                                                placeholder="Search or select an exam center..."
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
                                        noOptionsText="No exam centers found"
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
                            </div>
                        )}

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
                                    onChange={(e) => {
                                        const newLat = e.target.value === '' ? null : parseFloat(e.target.value)
                                        const newCoords = { ...coords, lat: newLat }
                                        setCoords(newCoords)
                                        // Notify parent of coordinate change if both values are valid
                                        if (onCoordinatesChange && Number.isFinite(newLat) && Number.isFinite(newCoords.lng)) {
                                            onCoordinatesChange({ lat: newLat, lng: newCoords.lng })
                                        }
                                    }}
                                    placeholder="Latitude"
                                    className="pickup-popup-input"
                                    style={{ flex: 1 }}
                                />
                                <input
                                    id="coordsLng"
                                    type="number"
                                    step="0.000001"
                                    value={coords.lng ?? ''}
                                    onChange={(e) => {
                                        const newLng = e.target.value === '' ? null : parseFloat(e.target.value)
                                        const newCoords = { ...coords, lng: newLng }
                                        setCoords(newCoords)
                                        // Notify parent of coordinate change if both values are valid
                                        if (onCoordinatesChange && Number.isFinite(coords.lat) && Number.isFinite(newLng)) {
                                            onCoordinatesChange({ lat: coords.lat, lng: newLng })
                                        }
                                    }}
                                    placeholder="Longitude"
                                    className="pickup-popup-input"
                                    style={{ flex: 1 }}
                                />
                            </div>
                        </div>

                        {locationType == 'driving_school' && (
                            <div>
                                <Autocomplete
                                    options={filteredAgencies}
                                    getOptionLabel={(option) => option.nomAge || ''}
                                    value={filteredAgencies.find(a => a.agenceId === selectedAgency) || null}
                                    onChange={(event, newValue) => {
                                        if (newValue) {
                                            setSelectedAgency(newValue.agenceId)
                                            setSearchAgency(newValue.nomAge)
                                        } else {
                                            setSelectedAgency('')
                                            setSearchAgency('')
                                        }
                                    }}
                                    inputValue={searchAgency}
                                    onInputChange={(event, newInputValue) => {
                                        setSearchAgency(newInputValue)
                                    }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label={`Assign Agency ${locationType === 'driving_school' ? '*' : '(optional)'}`}
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
                                    sx={{
                                        '& .MuiAutocomplete-popper': {
                                            '& .MuiPaper-root': {
                                                backgroundColor: '#1e293b',
                                                color: 'var(--text-primary)',
                                                borderRadius: '8px',
                                                border: '1px solid var(--border-color)',
                                            },
                                            '& .MuiAutocomplete-option': {
                                                '&:hover': {
                                                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                                                },
                                                '&[aria-selected="true"]': {
                                                    backgroundColor: 'rgba(37, 99, 235, 0.2)',
                                                },
                                            },
                                        },
                                    }}
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

                        <div style={{
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                            padding: '8px',
                            backgroundColor: 'rgba(0, 0, 0, 0.03)',
                            borderRadius: '6px',
                            textAlign: 'center',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                        }}>
                            {position.lat && position.lng ? (
                                <>
                                    <PushPinIcon style={{ fontSize: 14 }} />
                                    {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
                                </>
                            ) : (
                                <>
                                    <LocationOnIcon style={{ fontSize: 14 }} />
                                    Click on the map to set coordinates
                                </>
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
            {/* Required fields message (shows when Add is disabled due to missing required fields) */}
            {missingRequired.length > 0 && (
                <div style={{
                    padding: '10px',
                    backgroundColor: 'rgba(255, 235, 205, 0.9)',
                    border: '1px solid rgba(234, 179, 8, 0.25)',
                    borderRadius: '8px',
                    color: '#92400e',
                    fontSize: '13px',
                    margin: '12px 16px'
                }}>
                    ⚠️ Required: {missingRequired.join(', ')}
                </div>
            )}

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
                    disabled={isAddDisabled}
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
