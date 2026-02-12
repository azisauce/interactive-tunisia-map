import React from 'react'
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material'

export default function ConfirmDialog({ open, title = 'Confirm', message = '', onCancel, onConfirm, confirmText = 'Confirm', cancelText = 'Cancel' }) {
    return (
        <Dialog open={open} onClose={onCancel} aria-labelledby="confirm-dialog-title">
            <DialogTitle id="confirm-dialog-title">{title}</DialogTitle>
            <DialogContent>
                <DialogContentText>{message}</DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel} color="inherit">{cancelText}</Button>
                <Button onClick={onConfirm} color="error" variant="contained">{confirmText}</Button>
            </DialogActions>
        </Dialog>
    )
}
