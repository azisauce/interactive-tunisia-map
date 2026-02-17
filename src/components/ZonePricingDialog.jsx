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

    const getKey = (item, idx) => {
        if (item == null) return `item_${idx}`
        if (item.id != null) return String(item.id)
        const t = item.type != null ? item.type : 'type'
        const l = item.location_id != null ? String(item.location_id) : 'loc'
        return `${t}_${l}`
    }

    useEffect(() => {
        if (open) {
            const initial = {}
            // initialize from current items if we already fetched them
            if (items && items.length > 0) {
                items.forEach((i, idx) => {
                    const key = getKey(i, idx)
                    initial[`${key}_subscription_fee`] = i.subscription_fee != null ? i.subscription_fee : ''
                    initial[`${key}_conduit_exam_fee`] = i.conduit_exam_fee != null ? i.conduit_exam_fee : ''
                    initial[`${key}_conduit_session_fee`] = i.conduit_session_fee != null ? i.conduit_session_fee : ''
                    initial[`${key}_recyclage_session_fee`] = i.recyclage_session_fee != null ? i.recyclage_session_fee : ''
                    initial[`${key}_recyclage_session_count`] = i.recyclage_session_count != null ? i.recyclage_session_count : ''
                    initial[`${key}_conduit_session_count`] = i.conduit_session_count != null ? i.conduit_session_count : ''
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
                const resp = await fetchZonePricing(payload);
                console.log('ZonePricingDialog response:', resp);
                
                // resp can be an array of rows or a single object (general pricing)
                const rows = Array.isArray(resp) ? resp : (resp ? [resp] : [])
                setItems(rows)

                // initialize values from fetched data
                const initial = {}
                ;(rows || []).forEach((r, idx) => {
                    const key = getKey(r, idx)
                    initial[`${key}_subscription_fee`] = r.subscription_fee != null ? r.subscription_fee : ''
                    initial[`${key}_conduit_exam_fee`] = r.conduit_exam_fee != null ? r.conduit_exam_fee : ''
                    initial[`${key}_conduit_session_fee`] = r.conduit_session_fee != null ? r.conduit_session_fee : ''
                    initial[`${key}_recyclage_session_fee`] = r.recyclage_session_fee != null ? r.recyclage_session_fee : ''
                    initial[`${key}_recyclage_session_count`] = r.recyclage_session_count != null ? r.recyclage_session_count : ''
                    initial[`${key}_conduit_session_count`] = r.conduit_session_count != null ? r.conduit_session_count : ''
                })
                setValues(initial)
                setInitialValues(initial)
            } catch (err) {
                console.error('Failed to fetch zone pricing:', err)
            }
        })()
    }, [open])

    const handleChange = (id, raw) => {
        let v = raw === '' ? '' : Number(raw)
        if (v !== '' && (Number.isNaN(v) || v < 0)) v = 0
        setValues(prev => ({ ...prev, [id]: v }))
    }

    const hasChanges = (() => {
        if (!items || items.length === 0) return false
        for (let idx = 0; idx < items.length; idx++) {
            const item = items[idx]
            const key = getKey(item, idx)
            const fields = ['subscription_fee', 'conduit_exam_fee', 'conduit_session_fee', 'recyclage_session_fee', 'recyclage_session_count', 'conduit_session_count']
            
            for (const field of fields) {
                const fieldKey = `${key}_${field}`
                const cur = values[fieldKey]
                const orig = initialValues[fieldKey]
                const ncur = cur === '' ? '' : Number(cur)
                const norig = orig === '' ? '' : Number(orig)
                if (ncur !== norig) return true
            }
        }
        return false
    })()

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{ className: 'general-pricing-dialog__paper' }}
        >
            <DialogTitle className="general-pricing-dialog__title">{title}</DialogTitle>
            <DialogContent className="general-pricing-dialog__content">
                <ul className="general-pricing-dialog__list">
                    {items.length === 0 && (
                        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
                            No zone pricing data available
                        </p>
                    )}

                    {items.map((item, idx) => {
                        const key = getKey(item, idx)
                        return (
                            <li key={key} className="general-pricing-dialog__item">
                                <div className="general-pricing-dialog__row">
                                    <span className="general-pricing-dialog__label">Location {item.location_id} — {item.type}</span>
                                    <TextField
                                        className="general-pricing-dialog__number"
                                        type="number"
                                        size="small"
                                        inputProps={{ min: 0, step: 0.01 }}
                                        value={values[`${key}_subscription_fee`] ?? ''}
                                        onChange={e => handleChange(`${key}_subscription_fee`, e.target.value)}
                                    />
                                </div>

                                <div className="general-pricing-dialog__expanded">
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        <TextField
                                            label="Conduit Exam Fee"
                                            className="general-pricing-dialog__number"
                                            type="number"
                                            size="small"
                                            inputProps={{ min: 0, step: 0.01 }}
                                            value={values[`${key}_conduit_exam_fee`] ?? ''}
                                            onChange={e => handleChange(`${key}_conduit_exam_fee`, e.target.value)}
                                        />

                                        <TextField
                                            label="Conduit Session Fee"
                                            className="general-pricing-dialog__number"
                                            type="number"
                                            size="small"
                                            inputProps={{ min: 0, step: 0.01 }}
                                            value={values[`${key}_conduit_session_fee`] ?? ''}
                                            onChange={e => handleChange(`${key}_conduit_session_fee`, e.target.value)}
                                        />

                                        <TextField
                                            label="Conduit Session Count"
                                            className="general-pricing-dialog__default-count"
                                            type="number"
                                            size="small"
                                            inputProps={{ min: 0 }}
                                            value={values[`${key}_conduit_session_count`] ?? ''}
                                            onChange={e => handleChange(`${key}_conduit_session_count`, e.target.value)}
                                        />

                                        <TextField
                                            label="Recyclage Session Fee"
                                            className="general-pricing-dialog__number"
                                            type="number"
                                            size="small"
                                            inputProps={{ min: 0, step: 0.01 }}
                                            value={values[`${key}_recyclage_session_fee`] ?? ''}
                                            onChange={e => handleChange(`${key}_recyclage_session_fee`, e.target.value)}
                                        />

                                        <TextField
                                            label="Recyclage Session Count"
                                            className="general-pricing-dialog__default-count"
                                            type="number"
                                            size="small"
                                            inputProps={{ min: 0 }}
                                            value={values[`${key}_recyclage_session_count`] ?? ''}
                                            onChange={e => handleChange(`${key}_recyclage_session_count`, e.target.value)}
                                        />
                                    </div>
                                </div>
                            </li>
                        )
                    })}
                </ul>
            </DialogContent>
            <DialogActions className="general-pricing-dialog__actions">
                <Button onClick={onClose} className="general-pricing-dialog__cancel">Cancel</Button>
                <Button
                    variant="contained"
                    onClick={async () => {
                                if (isSaving) return

                                // Build payload with only changed fields
                                const updates = []
                                const fields = ['subscription_fee', 'conduit_exam_fee', 'conduit_session_fee', 'recyclage_session_fee', 'recyclage_session_count', 'conduit_session_count']
                                for (let idx = 0; idx < items.length; idx++) {
                                    const item = items[idx]
                                    const key = getKey(item, idx)

                                    const changed = {}
                                    for (const field of fields) {
                                        const fieldKey = `${key}_${field}`
                                        const cur = values[fieldKey]
                                        const orig = initialValues[fieldKey]
                                        const ncur = cur === '' ? '' : Number(cur)
                                        const norig = orig === '' ? '' : Number(orig)

                                        if (ncur !== norig) {
                                            changed[field] = ncur === '' ? null : ncur
                                        }
                                    }

                                    if (Object.keys(changed).length > 0) {
                                        const u = { type: item.type, location_id: item.location_id, ...changed }
                                        if (item.id != null) u.id = item.id
                                        updates.push(u)
                                    }
                                }

                                if (updates.length === 0) return

                                setIsSaving(true)
                        try {
                            const resp = await updateZonePricing({ updates })

                            // update initialValues to reflect saved values so Confirm disables
                            const nextInitial = { ...initialValues }
                            for (const u of updates) {
                                const key = u.id != null ? String(u.id) : `${u.type}_${u.location_id != null ? String(u.location_id) : 'loc'}`
                                const fields2 = ['subscription_fee', 'conduit_exam_fee', 'conduit_session_fee', 'recyclage_session_fee', 'recyclage_session_count', 'conduit_session_count']

                                for (const field of fields2) {
                                    if (field in u) {
                                        nextInitial[`${key}_${field}`] = u[field]
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
