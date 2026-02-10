function AddLocationsToggle({ value = false, onChange, onToggleOn }) {
    const handleToggle = (checked) => {
        if (onChange) {
            onChange(checked)
        }
        // When toggled ON, notify parent to open popup
        if (checked && onToggleOn) {
            onToggleOn()
        }
    }

    return (
        <div className="add-locations-toggle">
            <label className="switch" aria-checked={value} role="switch">
                <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => handleToggle(e.target.checked)}
                    aria-label="Enable adding locations"
                />
                <span className={`slider ${value ? 'slider--checked' : ''}`} />
            </label>
        </div>
    )
}

export default AddLocationsToggle
