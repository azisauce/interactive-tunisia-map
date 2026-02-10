function AddLocationsToggle({ value = false, onChange }) {
    const handleToggle = (checked) => {
        if (onChange) {
            onChange(checked)
        }
    }

    return (
        <div className="add-locations-toggle">
            <div style={{ flex: 1, marginRight: '12px' }}>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>Enable adding locations</div>
            </div>
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
