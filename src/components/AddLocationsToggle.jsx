import { useState } from 'react'

function AddLocationsToggle({ value = false, onChange }) {
    const [enabled, setEnabled] = useState(value)

    const handleToggle = (checked) => {
        setEnabled(checked)
        if (onChange) {
            onChange(checked)
        }
    }

    return (
        <div className="add-locations-toggle">
            <div style={{ flex: 1, marginRight: '12px' }}>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>Enable adding locations</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Allow adding pickup points, driving schools and exam centers across all layers
                </div>
            </div>
            <label className="switch" aria-checked={enabled} role="switch">
                <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => handleToggle(e.target.checked)}
                    aria-label="Enable adding locations"
                />
                <span className={`slider ${enabled ? 'slider--checked' : ''}`} />
            </label>
        </div>
    )
}

export default AddLocationsToggle
