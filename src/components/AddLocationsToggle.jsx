function AddLocationsToggle({ value = false, onChange }) {
    const handleToggle = (checked) => {
        if (onChange) {
            onChange(checked)
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
