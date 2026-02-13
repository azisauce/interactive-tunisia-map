import * as turf from '@turf/turf'

/**
 * Calculate the centroid of a GeoJSON feature
 * @param {Object} feature - GeoJSON feature
 * @returns {Object} { lat, lng }
 */
export function getZoneCentroid(feature) {
    try {
        const centroid = turf.centroid(feature)
        return {
            lat: centroid.geometry.coordinates[1],
            lng: centroid.geometry.coordinates[0]
        }
    } catch (err) {
        console.warn('Error calculating centroid:', err)
        return null
    }
}

/**
 * Find which zone a point belongs to
 * @param {Object} point - { latitude, longitude }
 * @param {Object} zonesGeoJSON - GeoJSON FeatureCollection
 * @returns {Object|null} The feature containing the point
 */
export function findZoneForPoint(point, zonesGeoJSON) {
    if (!zonesGeoJSON || !zonesGeoJSON.features) return null

    try {
        const pt = turf.point([Number(point.longitude), Number(point.latitude)])

        for (const feature of zonesGeoJSON.features) {
            try {
                if (turf.booleanPointInPolygon(pt, feature)) {
                    return feature
                }
            } catch (err) {
                // Skip invalid geometries
                continue
            }
        }
    } catch (err) {
        console.warn('Error finding zone for point:', err)
    }

    return null
}

/**
 * Get zone ID from a feature based on current level
 * @param {Object} feature - GeoJSON feature
 * @param {string} level - 'governorate', 'municipality', or 'sector'
 * @returns {string|null}
 */
export function getZoneId(feature, level) {
    if (!feature || !feature.properties) return null

    const props = feature.properties

    switch (level) {
        case 'governorate':
            return props.gov_id != null ? String(props.gov_id) : null
        case 'municipality':
            return props.mun_uid != null ? String(props.mun_uid) : null
        case 'sector':
            return props.sec_uid != null ? String(props.sec_uid) : null
        default:
            return null
    }
}

/**
 * Get zone name from a feature based on current level
 * @param {Object} feature - GeoJSON feature
 * @param {string} level - 'governorate', 'municipality', or 'sector'
 * @returns {Object} { nameEn, nameAr }
 */
export function getZoneName(feature, level) {
    if (!feature || !feature.properties) {
        return { nameEn: 'Unknown', nameAr: '' }
    }

    const props = feature.properties

    switch (level) {
        case 'governorate':
            return {
                nameEn: props.gov_en || 'Unknown',
                nameAr: props.gov_ar || ''
            }
        case 'municipality':
            return {
                nameEn: props.mun_en || 'Unknown',
                nameAr: props.mun_ar || ''
            }
        case 'sector':
            return {
                nameEn: props.sec_en || 'Unknown',
                nameAr: props.sec_ar || ''
            }
        default:
            return { nameEn: 'Unknown', nameAr: '' }
    }
}

/**
 * Assign locations to zones and return enriched location data
 * @param {Array} locations - Array of location objects
 * @param {Object} zonesGeoJSON - GeoJSON FeatureCollection of zones
 * @param {string} level - Current zone level
 * @returns {Array} Locations with zoneId added
 */
export function assignLocationsToZones(locations, zonesGeoJSON, level) {
    if (!locations || !zonesGeoJSON) return locations

    return locations.map(location => {
        const zone = findZoneForPoint(location, zonesGeoJSON)
        const zoneId = zone ? getZoneId(zone, level) : null

        return {
            ...location,
            _zoneId: zoneId,
            _zone: zone
        }
    })
}

/**
 * Group locations by zone and then by type
 * @param {Array} locations - Array of location objects (should have _zoneId from assignLocationsToZones)
 * @param {string} level - Current zone level
 * @returns {Object} { zoneId: { zone, types: { type: [locations] } } }
 */
export function groupLocationsByZoneAndType(locations, level) {
    const grouped = {}

    locations.forEach(location => {
        const zoneId = location._zoneId
        if (!zoneId) return

        // Initialize zone group if not exists
        if (!grouped[zoneId]) {
            grouped[zoneId] = {
                zone: location._zone,
                types: {}
            }
        }

        // Get location type
        let type = location.type || 'pickup_point'

        // Handle driving school sub-types
        if (type === 'driving_school') {
            const isDrivago = location.agencies?.some(agency => agency.show_in_drivago === true)
            type = isDrivago ? 'driving_school_drivago' : 'driving_school_non_drivago'
        }

        // Initialize type group if not exists
        if (!grouped[zoneId].types[type]) {
            grouped[zoneId].types[type] = []
        }

        grouped[zoneId].types[type].push(location)
    })

    return grouped
}

/**
 * Calculate offset position for cluster icons to spread them horizontally
 * @param {Object} centroid - { lat, lng }
 * @param {number} index - Index of the cluster type (0, 1, 2, 3)
 * @param {number} total - Total number of clusters in this zone
 * @param {number} spreadDistance - Distance in degrees between clusters (default: 0.025)
 * @returns {Object} { lat, lng }
 */
export function getClusterOffsetPosition(centroid, index, total, spreadDistance = 0.1) {
    if (total <= 1) return centroid

    // Horizontal layout: arrange clusters in a horizontal line
    // Calculate the total width and start position to center the group
    const totalWidth = (total - 1) * spreadDistance
    const startX = -totalWidth / 2

    // Calculate offset for this index
    const offsetX = startX + (index * spreadDistance)
    const offsetY = 0 // Keep all at same latitude for horizontal line

    return {
        lat: centroid.lat + offsetY,
        lng: centroid.lng + offsetX
    }
}

/**
 * Create cluster data structure for rendering
 * @param {Object} groupedLocations - Output from groupLocationsByZoneAndType
 * @returns {Array} Array of cluster objects
 */
export function createClusters(groupedLocations) {
    const clusters = []

    Object.entries(groupedLocations).forEach(([zoneId, data]) => {
        const { zone, types } = data
        if (!zone) return

        const centroid = getZoneCentroid(zone)
        if (!centroid) return

        const zoneName = getZoneName(zone, 'governorate') // Level doesn't matter here, zone has all props
        const typeEntries = Object.entries(types)
        const totalTypes = typeEntries.length

        typeEntries.forEach(([type, locations], index) => {
            // Calculate offset position so clusters don't overlap
            const position = getClusterOffsetPosition(centroid, index, totalTypes)

            clusters.push({
                id: `${zoneId}-${type}`,
                zoneId,
                type,
                count: locations.length,
                locations,
                position,
                originalCentroid: centroid,
                zoneName: zoneName.nameEn,
                zoneNameAr: zoneName.nameAr,
                zone
            })
        })
    })

    return clusters
}

/**
 * Get icon configuration for a location type
 * @param {string} type - Location type
 * @returns {Object} { icon, label, color }
 */
export function getTypeConfig(type) {
    const configs = {
        pickup_point: {
            icon: '📍',
            label: 'Pickup Point',
            color: '#f59e0b'
        },
        driving_school_drivago: {
            icon: '🚗',
            label: 'Drivago School',
            color: '#2196f3'
        },
        driving_school_non_drivago: {
            icon: '🏫',
            label: 'Driving School',
            color: '#4b5563'
        },
        exam_center: {
            icon: '📝',
            label: 'Exam Center',
            color: '#10b981'
        }
    }

    return configs[type] || configs.pickup_point
}
