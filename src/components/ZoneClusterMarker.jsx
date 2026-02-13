import { Marker } from 'react-leaflet'
import L from 'leaflet'
import { getTypeConfig } from '../utils/zoneUtils'

/**
 * Create a custom cluster icon
 * @param {number} count - Number of locations in cluster
 * @param {string} type - Location type
 * @param {boolean} showName - Whether to show zone name
 * @param {string} zoneName - Zone name to display
 * @returns {L.DivIcon}
 */
function createClusterIcon(count, type, showName = false, zoneName = '') {
    const config = getTypeConfig(type)
    const size = count > 99 ? 50 : count > 9 ? 45 : 40

    let html = `
        <div class="cluster-inner" style="
            width: ${size}px;
            height: ${size}px;
            background: ${config.color}20;
            border: 2px solid ${config.color};
        ">
            <span class="cluster-icon">${config.icon}</span>
            <span class="cluster-count" style="background: ${config.color};">${count}</span>
        </div>
    `

    if (showName && zoneName) {
        html = `
            <div class="cluster-with-name">
                <div class="cluster-name">${zoneName}</div>
                ${html}
            </div>
        `
    }

    return L.divIcon({
        className: 'zone-cluster-marker',
        html,
        iconSize: showName ? [size, size + 25] : [size, size],
        iconAnchor: showName ? [size / 2, size + 25] : [size / 2, size / 2],
        popupAnchor: [0, -size / 2]
    })
}

/**
 * Single cluster marker component
 * @param {Object} props
 * @param {string} props.id - Unique cluster ID
 * @param {Object} props.position - { lat, lng }
 * @param {number} props.count - Number of locations
 * @param {string} props.type - Location type
 * @param {string} props.zoneName - Zone name
 * @param {string} props.zoneNameAr - Zone name in Arabic
 * @param {boolean} props.showName - Whether to show zone name
 * @param {Function} props.onClick - Click handler
 * @param {Function} props.onMouseOver - Mouse over handler
 * @param {Function} props.onMouseOut - Mouse out handler
 */
function ZoneClusterMarker({
    id,
    position,
    count,
    type,
    zoneName,
    zoneNameAr,
    showName = false,
    onClick,
    onMouseOver,
    onMouseOut
}) {
    const icon = createClusterIcon(count, type, showName, zoneName)

    const eventHandlers = {
        click: () => onClick && onClick({ id, position, count, type, zoneName, zoneNameAr }),
        mouseover: () => onMouseOver && onMouseOver({ id, position, count, type, zoneName, zoneNameAr }),
        mouseout: () => onMouseOut && onMouseOut()
    }

    return (
        <Marker
            position={[position.lat, position.lng]}
            icon={icon}
            eventHandlers={eventHandlers}
        />
    )
}

export default ZoneClusterMarker
