import { useEffect, useRef, useState } from 'react'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import SchoolIcon from '@mui/icons-material/School'
import DescriptionIcon from '@mui/icons-material/Description'

function AddLocationsToggle({ value = false, onChange, onToggleOn, onTypeSelect }) {
    const wrapperRef = useRef(null)
    const buttonRef = useRef(null)
    const popupRef = useRef(null)
    const [open, setOpen] = useState(value)
    const [pos, setPos] = useState({ top: 0, left: 0 })

    useEffect(() => setOpen(value), [value])

    const handleToggle = (next) => {
        if (onChange) onChange(next)
        setOpen(next)
    }

    const updatePosition = () => {
        const btn = buttonRef.current
        const wrap = wrapperRef.current
        if (!btn || !wrap) return
        const btnRect = btn.getBoundingClientRect()
        const wrapRect = wrap.getBoundingClientRect()
        setPos({ top: btnRect.top - wrapRect.top, left: btnRect.right - wrapRect.left + 8 })
    }

    useEffect(() => {
        if (open) updatePosition()
    }, [open])

    useEffect(() => {
        const onResize = () => open && updatePosition()
        window.addEventListener('resize', onResize)
        window.addEventListener('scroll', onResize, true)
        return () => {
            window.removeEventListener('resize', onResize)
            window.removeEventListener('scroll', onResize, true)
        }
    }, [open])

    // close on outside click
    useEffect(() => {
        const onDocClick = (e) => {
            if (!open) return
            if (buttonRef.current && buttonRef.current.contains(e.target)) return
            if (popupRef.current && popupRef.current.contains(e.target)) return
            handleToggle(false)
        }
        document.addEventListener('mousedown', onDocClick)
        return () => document.removeEventListener('mousedown', onDocClick)
    }, [open])

    return (
        <div className="add-locations-toggle" ref={wrapperRef} style={{ position: 'relative' }}>
            <div>
                <button
                    ref={buttonRef}
                    type="button"
                    className={`add-toggle-button ${value ? 'add-toggle-button--active' : ''}`}
                    aria-pressed={value}
                    aria-label={value ? 'Disable adding locations' : 'Enable adding locations'}
                    onClick={() => handleToggle(!(open || value))}
                    >
                    {(open || value) ? '×' : '+'}
                </button>
            </div>

            {open && (
                <div
                    ref={popupRef}
                    className="add-toggle-popup"
                    style={{ position: 'absolute', top: `${pos.top}px`, left: `${pos.left}px` }}
                >
                    <div className="add-toggle-popup__content">
                        <div className="add-toggle-popup__actions">
                            <button className="btn btn--secondary" onClick={() => {
                                if (onTypeSelect) onTypeSelect('pickup_point')
                                if (onChange) onChange(true)
                                if (onToggleOn) onToggleOn()
                                setOpen(false)
                            }}>
                                <LocationOnIcon style={{ fontSize: 20 }} />
                            </button>
                            <button className="btn btn--secondary" onClick={() => {
                                if (onTypeSelect) onTypeSelect('driving_school')
                                if (onChange) onChange(true)
                                if (onToggleOn) onToggleOn()
                                setOpen(false)
                            }}>
                                <SchoolIcon style={{ fontSize: 20 }} />
                            </button>
                            <button className="btn btn--secondary" onClick={() => {
                                if (onTypeSelect) onTypeSelect('exam_center')
                                if (onChange) onChange(true)
                                if (onToggleOn) onToggleOn()
                                setOpen(false)
                            }}>
                                <DescriptionIcon style={{ fontSize: 20 }} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AddLocationsToggle
