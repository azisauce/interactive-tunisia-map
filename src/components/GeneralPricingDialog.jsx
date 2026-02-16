import { useState, useEffect } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import { fetchGeneralPricing } from '../utils/api'

function GeneralPricingDialog({ open = false, onClose, onConfirm, title = 'Pricing', body = 'Confirm the pricing action.' }) {
    const [items, setItems] = useState([])

    const [values, setValues] = useState({})

    useEffect(() => {
        if (open) {
            const initial = {}
            // initialize from current items if we already fetched them
            if (items && items.length > 0) {
                items.forEach(i => { initial[i.key] = i.price != null ? i.price : '' })
            }
            setValues(initial)
        }
    }, [open])

    useEffect(() => {
        if (!open) return

        ;(async () => {
            try {
                const resp = await fetchGeneralPricing()
                console.log('general pricing response:', resp)
                // resp is expected to be an array of rows: { id, label, price, reference, category }
                const mapped = (resp || []).map(r => ({
                    key: r.reference || String(r.id),
                    reference: r.reference || null,
                    id: r.id,
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
                // initialize values from fetched prices
                const initial = {}
                mapped.forEach(m => { initial[m.key] = m.price != null ? m.price : '' })
                setValues(initial)
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
                            <span className="general-pricing-dialog__label">{item.label}</span>
                            <TextField
                                className="general-pricing-dialog__number"
                                type="number"
                                size="small"
                                inputProps={{ min: 0 }}
                                value={values[item.key] ?? ''}
                                onChange={e => handleChange(item.key, e.target.value)}
                            />
                        </li>
                    ))}
                </ul>
            </DialogContent>
            <DialogActions className="general-pricing-dialog__actions">
                <Button onClick={onClose} className="general-pricing-dialog__cancel">Cancel</Button>
                <Button
                    variant="contained"
                    onClick={() => {
                        if (onConfirm && typeof onConfirm === 'function') onConfirm(values)
                        if (onClose) onClose()
                    }}
                    className="general-pricing-dialog__confirm"
                >
                    Confirm
                </Button>
            </DialogActions>
        </Dialog>
    )
}

export default GeneralPricingDialog
