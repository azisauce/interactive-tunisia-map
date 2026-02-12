import React from 'react'
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material'

export default function ConfirmDialog({ open, title = 'Confirm', message = '', onCancel, onConfirm, confirmText = 'Confirm', cancelText = 'Cancel' }) {
    return (
        <Dialog
            open={open}
            onClose={onCancel}
            aria-labelledby="confirm-dialog-title"
            PaperProps={{ className: 'pickup-control-card' }}
        >
            <DialogTitle id="confirm-dialog-title">
                <div className="control-card__header" style={{ padding: 0, borderBottom: 'none' }}>
                    <div className="control-card__title">{title}</div>
                </div>
            </DialogTitle>
            <DialogContent>
                <DialogContentText>
                    <div className="control-card__subtitle" style={{ marginTop: 8 }}>{message}</div>
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel} color="inherit" style={{ color: 'white' }}>{cancelText}</Button>
                <Button onClick={onConfirm} color="primary" variant="contained">{confirmText}</Button>
            </DialogActions>
        </Dialog>
    )
}
