import { useState, useCallback } from 'react'
import { useMap } from 'react-leaflet'
import ZoneClusterMarker from './ZoneClusterMarker'

/**
 * Container component for all zone cluster markers
 * @param {Object} props
 * @param {Array} props.clusters - Array of cluster objects from useZoneClustering
 * @param {Function} props.onClusterClick - Handler when cluster is clicked
 * @param {number} props.zoom - Current map zoom level
 * @param {number} props.showNamesZoom - Zoom threshold to show zone names (default: 10)
 */
function ZoneClusterMarkers({
    clusters,
    onClusterClick,
    zoom,
    showNamesZoom = 10
}) {
    const map = useMap()
    const [hoveredCluster, setHoveredCluster] = useState(null)

    const showNames = zoom >= showNamesZoom

    const handleClusterClick = useCallback((cluster) => {
        // Fly to the cluster position with increased zoom
        if (map && cluster.position) {
            const currentZoom = map.getZoom()
            const targetZoom = Math.min(currentZoom + 2, 16)
            map.flyTo([cluster.position.lat, cluster.position.lng], targetZoom, {
                duration: 0.5
            })
        }

        // Call the parent's click handler
        if (onClusterClick) {
            onClusterClick(cluster)
        }
    }, [map, onClusterClick])

    const handleMouseOver = useCallback((cluster) => {
        setHoveredCluster(cluster)
    }, [])

    const handleMouseOut = useCallback(() => {
        setHoveredCluster(null)
    }, [])

    if (!clusters || clusters.length === 0) {
        return null
    }

    return (
        <>
            {clusters.map((cluster) => (
                <ZoneClusterMarker
                    key={cluster.id}
                    id={cluster.id}
                    position={cluster.position}
                    count={cluster.count}
                    type={cluster.type}
                    zoneName={cluster.zoneName}
                    zoneNameAr={cluster.zoneNameAr}
                    showName={showNames || hoveredCluster?.id === cluster.id}
                    onClick={handleClusterClick}
                    onMouseOver={handleMouseOver}
                    onMouseOut={handleMouseOut}
                />
            ))}
        </>
    )
}

export default ZoneClusterMarkers
