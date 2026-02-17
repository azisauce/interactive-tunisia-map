import { useState, useEffect } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import { fetchZonePricing, updateZonePricing } from '../utils/api'

function ZonePricingDialog({ open = false, payload = null, onClose, onConfirm, title = 'Zone Pricing', body = 'Confirm the zone pricing action.' }) {
    const [items, setItems] = useState([])
    const [values, setValues] = useState({})
    const [initialValues, setInitialValues] = useState({})
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (open) {
            const initial = {}
            // initialize from current items if we already fetched them
            if (items && items.length > 0) {
                items.forEach(i => {
                    initial[i.key] = i.price != null ? i.price : ''
                    // initialize editable default count key as well
                    initial[`${i.key}_count`] = i.default_count != null ? i.default_count : ''
                })
            }
            setValues(initial)
        }
    }, [open])

    useEffect(() => {
        if (open && payload) {
            console.log('ZonePricingDialog payload:', payload)
        }
    }, [open, payload])

    useEffect(() => {
        if (!open) return

        ;(async () => {
            try {
                const resp = await fetchZonePricing(payload)
                console.log('ZonePricingDialog response:', resp)
                
                // resp can be an array of rows or a single object
                const rows = Array.isArray(resp) ? resp : (resp ? [resp] : [])
                
                // Map zone pricing data into a flat structure similar to GeneralPricingDialog
                // Each row can have multiple pricing fields, so we create multiple items
                const mapped = []
                rows.forEach((r, idx) => {
                    const baseKey = r.id != null ? String(r.id) : `${r.type || 'type'}_${r.location_id || 'loc'}`
                    
                    // Create items for each pricing field
                    const fields = [
                        { field: 'subscription_fee', label: 'Subscription Fee', hasCount: false },
                        { field: 'conduit_exam_fee', label: 'Conduit Exam Fee', hasCount: false },
                        { field: 'conduit_session_fee', label: 'Conduite Session', hasCount: true, countField: 'conduit_session_count' },
                        { field: 'recyclage_session_fee', label: 'Recyclage Session', hasCount: true, countField: 'recyclage_session_count' }
                    ]
                    
                    fields.forEach(({ field, label, hasCount, countField }) => {
                        mapped.push({
                            key: `${baseKey}_${field}`,
                            id: r.id,
                            type: r.type,
                            location_id: r.location_id,
                            field: field,
                            label: label,
                            price: r[field],
                            default_count: hasCount ? r[countField] : null
                        })
                    })
                })
                
                console.log('Mapped items:', mapped)
                setItems(mapped)
                
                // initialize values from fetched data
                const initial = {}
                mapped.forEach(m => {
                    initial[m.key] = m.price != null ? m.price : ''
                    initial[`${m.key}_count`] = m.default_count != null ? m.default_count : ''
                })
                setValues(initial)
                setInitialValues(initial)
            } catch (err) {
                console.error('Failed to fetch zone pricing:', err)
            }
        })()
    }, [open, payload])

    const handleChange = (id, raw) => {
        let v = raw === '' ? '' : Number(raw)
        if (v !== '' && (Number.isNaN(v) || v < 0)) v = 0
        setValues(prev => ({ ...prev, [id]: v }))
    }

    const hasChanges = (() => {
        if (!items || items.length === 0) return false
        for (const item of items) {
            const k = item.key
            const cur = values[k]
            const orig = initialValues[k]
            const ncur = cur === '' ? '' : Number(cur)
            const norig = orig === '' ? '' : Number(orig)
            if (ncur !== norig) return true
            // also check default count field
            const curCount = values[`${k}_count`]
            const origCount = initialValues[`${k}_count`]
            const ncurCount = curCount === '' ? '' : Number(curCount)
            const norigCount = origCount === '' ? '' : Number(origCount)
            if (ncurCount !== norigCount) return true
        }
        return false
    })()

    return (
        <Dialog
            open={open}
            onClose={onClose}
            PaperProps={{ className: 'general-pricing-dialog__paper' }}
        >
            <DialogTitle className="general-pricing-dialog__title">{title}</DialogTitle>
            <DialogContent className="general-pricing-dialog__content">
                <ul className="general-pricing-dialog__list">
                    {items.map(item => (
                        <li key={item.key} className="general-pricing-dialog__item">
                            <div className="general-pricing-dialog__row">
                                {item.default_count != null && null}
                                <span className="general-pricing-dialog__label">{item.label}</span>
                                <TextField
                                    className="general-pricing-dialog__number"
                                    type="number"
                                    size="small"
                                    inputProps={{ min: 0 }}
                                    value={values[item.key] ?? ''}
                                    onChange={e => handleChange(item.key, e.target.value)}
                                />
                            </div>
                            {item.default_count != null && (
                                <div className="general-pricing-dialog__expanded">
                                    <TextField
                                        label="Default count"
                                        className="general-pricing-dialog__default-count"
                                        type="number"
                                        size="small"
                                        inputProps={{ min: 0 }}
                                        value={values[`${item.key}_count`] ?? ''}
                                        onChange={e => handleChange(`${item.key}_count`, e.target.value)}
                                    />
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            </DialogContent>
            <DialogActions className="general-pricing-dialog__actions">
                <Button onClick={onClose} className="general-pricing-dialog__cancel">Cancel</Button>
                <Button
                    variant="contained"
                    onClick={async () => {
                        if (isSaving) return
                        // Build payload with only changed fields
                        // Group changes by zone (id/type/location_id combination)
                        const changesMap = new Map()
                        
                        for (const item of items) {
                            const k = item.key
                            const cur = values[k]
                            const orig = initialValues[k]
                            const ncur = cur === '' ? '' : Number(cur)
                            const norig = orig === '' ? '' : Number(orig)

                            const curCount = values[`${k}_count`]
                            const origCount = initialValues[`${k}_count`]
                            const ncurCount = curCount === '' ? '' : Number(curCount)
                            const norigCount = origCount === '' ? '' : Number(origCount)

                            if (ncur !== norig || ncurCount !== norigCount) {
                                const zoneKey = item.id != null ? String(item.id) : `${item.type}_${item.location_id}`
                                
                                if (!changesMap.has(zoneKey)) {
                                    changesMap.set(zoneKey, {
                                        id: item.id,
                                        type: item.type,
                                        location_id: item.location_id
                                    })
                                }
                                
                                const zone = changesMap.get(zoneKey)
                                if (ncur !== norig) {
                                    zone[item.field] = ncur === '' ? null : ncur
                                }
                                if (ncurCount !== norigCount && item.default_count != null) {
                                    // Map count field names
                                    const countField = item.field === 'conduit_session_fee' ? 'conduit_session_count' : 'recyclage_session_count'
                                    zone[countField] = ncurCount === '' ? null : ncurCount
                                }
                            }
                        }

                        const updates = Array.from(changesMap.values())
                        if (updates.length === 0) return

                        setIsSaving(true)
                        try {
                            const resp = await updateZonePricing({ updates })
                            // update initialValues to reflect saved values so Confirm disables
                            const nextInitial = { ...initialValues }
                            for (const item of items) {
                                const k = item.key
                                const zoneKey = item.id != null ? String(item.id) : `${item.type}_${item.location_id}`
                                const update = changesMap.get(zoneKey)
                                if (update && item.field in update) {
                                    nextInitial[k] = update[item.field]
                                }
                                if (update && item.default_count != null) {
                                    const countField = item.field === 'conduit_session_fee' ? 'conduit_session_count' : 'recyclage_session_count'
                                    if (countField in update) {
                                        nextInitial[`${k}_count`] = update[countField]
                                    }
                                }
                            }
                            setInitialValues(nextInitial)
                            // reflect saved initial values in values as well (keep inputs)
                            setValues(prev => ({ ...prev, ...nextInitial }))
                            if (onConfirm && typeof onConfirm === 'function') onConfirm(resp)
                            // do NOT close the dialog per request
                        } catch (err) {
                            console.error('Failed to update zone pricing:', err)
                        } finally {
                            setIsSaving(false)
                        }
                    }}
                    className="general-pricing-dialog__confirm"
                    disabled={!hasChanges || isSaving}
                >
                    {isSaving ? 'Saving...' : 'Confirm'}
                </Button>
            </DialogActions>
        </Dialog>
    )
}

export default ZonePricingDialog
