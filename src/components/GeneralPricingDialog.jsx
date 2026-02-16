import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

function GeneralPricingDialog({ open = false, onClose, onConfirm, title = 'Pricing', body = 'Confirm the pricing action.' }) {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            PaperProps={{ className: 'general-pricing-dialog__paper' }}
        >
            <DialogTitle className="general-pricing-dialog__title">{title}</DialogTitle>
            <DialogContent className="general-pricing-dialog__content">
                <ul className="general-pricing-dialog__list">
                    <li className="general-pricing-dialog__item">Frai d'inscription (Code)</li>
                    <li className="general-pricing-dialog__item">Frai d'inscription (Conduit)</li>
                    <li className="general-pricing-dialog__item">Séance Code</li>
                    <li className="general-pricing-dialog__item">Séance Conduit</li>
                    <li className="general-pricing-dialog__item">Séance Recyclage</li>
                </ul>
            </DialogContent>
            <DialogActions className="general-pricing-dialog__actions">
                <Button onClick={onClose} className="general-pricing-dialog__cancel">Cancel</Button>
                <Button
                    variant="contained"
                    onClick={() => {
                        if (onConfirm && typeof onConfirm === 'function') onConfirm()
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
