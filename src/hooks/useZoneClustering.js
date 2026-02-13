import { useMemo } from 'react'
import {
    assignLocationsToZones,
    groupLocationsByZoneAndType,
    createClusters
} from '../utils/zoneUtils'

/**
 * Hook to compute zone-based clustering for locations
 * @param {Array} locations - Array of location objects
 * @param {string} currentLevel - Current zone level ('governorate', 'municipality', 'sector')
 * @param {Object} zonesGeoJSON - GeoJSON FeatureCollection of current level zones
 * @returns {Object} { clusters, totalClusters, totalLocations }
 */
export function useZoneClustering(locations, currentLevel, zonesGeoJSON) {
    return useMemo(() => {
        // Return empty if no data
        if (!locations || !zonesGeoJSON || !currentLevel) {
            return {
                clusters: [],
                totalClusters: 0,
                totalLocations: 0
            }
        }

        // Step 1: Assign each location to its zone
        const locationsWithZones = assignLocationsToZones(
            locations,
            zonesGeoJSON,
            currentLevel
        )

        // Step 2: Group by zone and type
        const grouped = groupLocationsByZoneAndType(locationsWithZones, currentLevel)

        // Step 3: Create cluster data structure
        const clusters = createClusters(grouped)

        // Calculate totals
        const totalLocations = clusters.reduce((sum, cluster) => sum + cluster.count, 0)

        return {
            clusters,
            totalClusters: clusters.length,
            totalLocations
        }
    }, [locations, currentLevel, zonesGeoJSON])
}
