import { useState } from 'react'
import Dialog from '@mui/material/Dialog'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'

function PricingDialog({ open, onClose, selectedRegion }) {
    const [pricingData, setPricingData] = useState({
        frai_inscri: { price: '' },
        examen_conduit: {
            enabled: false,
            examen_circulation: { price: '' },
            examen_manoeuvre: { price: '' }
        },
        seance_code: { price: '' },
        seance_conduit: {
            base_price: '25',
            tier_25: { price: '23' },
            tier_35: { price: '22' }
        },
        seance_recyclage: { price: '' }
    })

    const [expandedItems, setExpandedItems] = useState({
        examen_conduit: false,
        seance_code: false,
        seance_conduit: false,
        seance_recyclage: false
    })

    const toggleExpand = (itemKey) => {
        setExpandedItems(prev => ({
            ...prev,
            [itemKey]: !prev[itemKey]
        }))
    }

    const updatePrice = (path, value) => {
        setPricingData(prev => {
            const newData = { ...prev }
            const keys = path.split('.')
            let current = newData

            for (let i = 0; i < keys.length - 1; i++) {
                current = current[keys[i]]
            }

            current[keys[keys.length - 1]] = value
            return newData
        })
    }

    const toggleEnabled = (itemKey) => {
        setPricingData(prev => ({
            ...prev,
            [itemKey]: {
                ...prev[itemKey],
                enabled: !prev[itemKey].enabled
            }
        }))
    }

    return (
        <Dialog
            open={open}
            onClose={onClose}
            PaperProps={{
                className: 'pricing-dialog'
            }}
        >
            <div className="pricing-dialog__container">
                {/* Header */}
                <div className="pricing-dialog__header">
                    <h2 className="pricing-dialog__title">Pricing Control</h2>
                    <IconButton
                        onClick={onClose}
                        size="small"
                        sx={{
                            color: 'var(--text-primary)',
                            '&:hover': { background: 'rgba(255, 255, 255, 0.1)' }
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                </div>

                {/* Pricing Items List */}
                <div className="pricing-dialog__list">
                    {/* Frai d'inscri - Simple item */}
                    <div className="pricing-dialog__item">
                        <div className="pricing-dialog__item-header">
                            <span className="pricing-dialog__item-label">Frai d'inscri</span>
                            <input
                                type="text"
                                className="pricing-dialog__input"
                                value={pricingData.frai_inscri.price}
                                onChange={(e) => updatePrice('frai_inscri.price', e.target.value)}
                                placeholder=""
                            />
                        </div>
                    </div>

                    {/* Examen Conduit - Expandable */}
                    <div className="pricing-dialog__item pricing-dialog__item--expandable">
                        <div
                            className="pricing-dialog__item-header"
                            onClick={() => toggleExpand('examen_conduit')}
                        >
                            <div className="pricing-dialog__item-label-wrapper">
                                {expandedItems.examen_conduit ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                                <span className="pricing-dialog__item-label">Examen Conduit</span>
                            </div>
                            <input
                                type="text"
                                className="pricing-dialog__input"
                                onClick={(e) => e.stopPropagation()}
                                placeholder=""
                            />
                        </div>
                        {expandedItems.examen_conduit && (
                            <div className="pricing-dialog__sub-items">
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={pricingData.examen_conduit.enabled}
                                            onChange={() => toggleEnabled('examen_conduit')}
                                            sx={{
                                                color: 'var(--text-secondary)',
                                                '&.Mui-checked': { color: 'var(--primary-light)' }
                                            }}
                                        />
                                    }
                                    label="Enable details"
                                    sx={{ color: 'var(--text-primary)', marginBottom: '8px' }}
                                />
                                <div className="pricing-dialog__sub-item">
                                    <span className="pricing-dialog__sub-item-label">Examen Circulation</span>
                                    <input
                                        type="text"
                                        className="pricing-dialog__input pricing-dialog__input--small"
                                        value={pricingData.examen_conduit.examen_circulation.price}
                                        onChange={(e) => updatePrice('examen_conduit.examen_circulation.price', e.target.value)}
                                        placeholder=""
                                    />
                                </div>
                                <div className="pricing-dialog__sub-item">
                                    <span className="pricing-dialog__sub-item-label">Examen Manoeuvre</span>
                                    <input
                                        type="text"
                                        className="pricing-dialog__input pricing-dialog__input--small"
                                        value={pricingData.examen_conduit.examen_manoeuvre.price}
                                        onChange={(e) => updatePrice('examen_conduit.examen_manoeuvre.price', e.target.value)}
                                        placeholder=""
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Seance Code - Expandable */}
                    <div className="pricing-dialog__item pricing-dialog__item--expandable">
                        <div
                            className="pricing-dialog__item-header"
                            onClick={() => toggleExpand('seance_code')}
                        >
                            <div className="pricing-dialog__item-label-wrapper">
                                {expandedItems.seance_code ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                                <span className="pricing-dialog__item-label">Seance Code</span>
                            </div>
                            <input
                                type="text"
                                className="pricing-dialog__input"
                                onClick={(e) => e.stopPropagation()}
                                value={pricingData.seance_code.price}
                                onChange={(e) => updatePrice('seance_code.price', e.target.value)}
                                placeholder=""
                            />
                        </div>
                    </div>

                    {/* Seance Conduit - Expandable with tiers */}
                    <div className="pricing-dialog__item pricing-dialog__item--expandable">
                        <div
                            className="pricing-dialog__item-header"
                            onClick={() => toggleExpand('seance_conduit')}
                        >
                            <div className="pricing-dialog__item-label-wrapper">
                                {expandedItems.seance_conduit ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                                <span className="pricing-dialog__item-label">Seance Conduit</span>
                            </div>
                            <input
                                type="text"
                                className="pricing-dialog__input"
                                onClick={(e) => e.stopPropagation()}
                                value={pricingData.seance_conduit.base_price}
                                onChange={(e) => updatePrice('seance_conduit.base_price', e.target.value)}
                                placeholder=""
                            />
                        </div>
                        {expandedItems.seance_conduit && (
                            <div className="pricing-dialog__sub-items">
                                <div className="pricing-dialog__sub-item-note">
                                    Price per number of seances
                                </div>
                                <div className="pricing-dialog__sub-item">
                                    <span className="pricing-dialog__sub-item-label">+25 Seances</span>
                                    <input
                                        type="text"
                                        className="pricing-dialog__input pricing-dialog__input--small"
                                        value={pricingData.seance_conduit.tier_25.price}
                                        onChange={(e) => updatePrice('seance_conduit.tier_25.price', e.target.value)}
                                        placeholder=""
                                    />
                                </div>
                                <div className="pricing-dialog__sub-item">
                                    <span className="pricing-dialog__sub-item-label">+35 Seances</span>
                                    <input
                                        type="text"
                                        className="pricing-dialog__input pricing-dialog__input--small"
                                        value={pricingData.seance_conduit.tier_35.price}
                                        onChange={(e) => updatePrice('seance_conduit.tier_35.price', e.target.value)}
                                        placeholder=""
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Seance Recyclage - Expandable */}
                    <div className="pricing-dialog__item pricing-dialog__item--expandable">
                        <div
                            className="pricing-dialog__item-header"
                            onClick={() => toggleExpand('seance_recyclage')}
                        >
                            <div className="pricing-dialog__item-label-wrapper">
                                {expandedItems.seance_recyclage ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                                <span className="pricing-dialog__item-label">Seance Recyclage</span>
                            </div>
                            <input
                                type="text"
                                className="pricing-dialog__input"
                                onClick={(e) => e.stopPropagation()}
                                placeholder=""
                            />
                        </div>
                    </div>
                </div>
            </div>
        </Dialog>
    )
}

export default PricingDialog
