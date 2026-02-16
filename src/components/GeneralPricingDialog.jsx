import { useState, useEffect } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
// Expand toggle removed — expanded area is always visible when applicable
import { fetchGeneralPricing, updateGeneralPricing } from '../utils/api'

function GeneralPricingDialog({ open = false, onClose, onConfirm, title = 'Pricing', body = 'Confirm the pricing action.' }) {
    const [items, setItems] = useState([])
    const [values, setValues] = useState({})
    const [initialValues, setInitialValues] = useState({})
    // expanded state removed; expanded area will always render when item.default_count is present

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
        if (!open) return

        ;(async () => {
            try {
                const resp = await fetchGeneralPricing()
                // resp is expected to be an array of rows: { id, label, price, reference, category }
                const mapped = (resp || []).map(r => ({
                    key: r.reference || String(r.id),
                    reference: r.reference || null,
                    id: r.id,
                    default_count: r.default_count ?? null,
                    label: r.label,
                    price: r.price
                }))
                // Desired custom ordering by reference
                const order = ['enrollement-fees', 'conduit-exam-fees', 'conduite-session', 'recyclage-session']
                mapped.sort((a, b) => {
                    const ia = order.indexOf(a.reference)
                    const ib = order.indexOf(b.reference)
                    const va = ia === -1 ? Number.POSITIVE_INFINITY : ia
                    const vb = ib === -1 ? Number.POSITIVE_INFINITY : ib
                    return va - vb
                })
                setItems(mapped)
                // initialize values from fetched prices and default counts
                const initial = {}
                mapped.forEach(m => {
                    initial[m.key] = m.price != null ? m.price : ''
                    initial[`${m.key}_count`] = m.default_count != null ? m.default_count : ''
                })
                setValues(initial)
                setInitialValues(initial)
                // no expanded state to initialize
            } catch (err) {
                console.error('Failed to fetch general pricing:', err)
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

    const [isSaving, setIsSaving] = useState(false)

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
                            const updates = []
                            for (const item of items) {
                                const k = item.key
                                const curPrice = values[k]
                                const origPrice = initialValues[k]
                                const ncurPrice = curPrice === '' ? '' : Number(curPrice)
                                const norigPrice = origPrice === '' ? '' : Number(origPrice)

                                const curCount = values[`${k}_count`]
                                const origCount = initialValues[`${k}_count`]
                                const ncurCount = curCount === '' ? '' : Number(curCount)
                                const norigCount = origCount === '' ? '' : Number(origCount)

                                const changed = {}
                                if (ncurPrice !== norigPrice) changed.price = (ncurPrice === '' ? null : ncurPrice)
                                if (ncurCount !== norigCount) changed.default_count = (ncurCount === '' ? null : ncurCount)
                                if (Object.keys(changed).length > 0) {
                                    updates.push({ id: item.id, reference: item.reference, ...changed })
                                }
                            }

                            if (updates.length === 0) return

                            setIsSaving(true)
                            try {
                                const resp = await updateGeneralPricing({ updates })
                                // update initialValues to reflect saved values so Confirm disables
                                const nextInitial = { ...initialValues }
                                for (const u of updates) {
                                    const key = u.reference || String(u.id)
                                    if ('price' in u) nextInitial[key] = u.price
                                    if ('default_count' in u) nextInitial[`${key}_count`] = u.default_count
                                }
                                setInitialValues(nextInitial)
                                // reflect saved initial values in values as well (keep inputs)
                                setValues(prev => ({ ...prev, ...nextInitial }))
                                if (onConfirm && typeof onConfirm === 'function') onConfirm(resp)
                                // do NOT close the dialog per request
                            } catch (err) {
                                console.error('Failed to update general pricing:', err)
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

export default GeneralPricingDialog
