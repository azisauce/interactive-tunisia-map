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
    const items = [
        { id: 'frais_code', label: "Frai d'inscription (Code)" },
        { id: 'frais_conduit', label: "Frai d'inscription (Conduit)" },
        { id: 'seance_code', label: 'Séance Code' },
        { id: 'seance_conduit', label: 'Séance Conduit' },
        { id: 'seance_recyclage', label: 'Séance Recyclage' },
    ]

    const [values, setValues] = useState({})

    useEffect(() => {
        if (open) {
            const initial = {}
            items.forEach(i => { initial[i.id] = '' })
            setValues(initial)
        }
    }, [open])

    useEffect(() => {
        if (!open) return

        ;(async () => {
            try {
                const resp = await fetchGeneralPricing()
                console.log('general pricing response:', resp)
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
                        <li key={item.id} className="general-pricing-dialog__item">
                            <span className="general-pricing-dialog__label">{item.label}</span>
                            <TextField
                                className="general-pricing-dialog__number"
                                type="number"
                                size="small"
                                inputProps={{ min: 0 }}
                                value={values[item.id] ?? ''}
                                onChange={e => handleChange(item.id, e.target.value)}
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
