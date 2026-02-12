// Choose API base depending on environment:
// - In test or production, use the same relative API path so requests go through the app backend.
// - When running locally (dev), call the backend directly at localhost:3007 to avoid proxying.
const API_BASE_URL = (() => {
    const defaultUrl = '/api/tunisia-regions'
    const localUrl = 'http://localhost:3007/api/tunisia-regions'

    const isLocalHost = typeof window !== 'undefined' && (
        window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    )

    const isDevMode = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.MODE === 'development'

    // Build-time override injected from Vite (`vite.config.js`) when running
    // `npm run build -- --config=...`. npm exposes that flag as
    // `process.env.npm_config_config` and we inject it as `__BUILD_CONFIG__`.
    const buildConfig = (typeof __BUILD_CONFIG__ !== 'undefined' && __BUILD_CONFIG__) || null

    if (buildConfig) {
        if (buildConfig === 'test' || buildConfig === 'prod' || buildConfig === 'production') {
            return defaultUrl
        }
        if (buildConfig === 'local' || buildConfig === 'dev' || buildConfig === 'development') {
            return localUrl
        }
        // unknown buildConfig -> fall through to default heuristics
    }

    return (isLocalHost || isDevMode) ? localUrl : defaultUrl
})()

/**
 * Helper to get headers with accessToken from localStorage
 */
const getAuthHeaders = (headers = {}) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
        return {
            ...headers,
            'Authorization': `Bearer ${token}`
        }
    }
    return headers
}

export async function fetchGovernorates() {
    const response = await fetch(`${API_BASE_URL}/governorates`, {
        headers: getAuthHeaders()
    })
    if (!response.ok) {
        throw new Error('Failed to fetch governorates')
    }
    return response.json()
}

export async function fetchMunicipalities(govId = null) {
    const url = govId 
        ? `${API_BASE_URL}/municipalities?gov_id=${govId}`
        : `${API_BASE_URL}/municipalities`
    
    const response = await fetch(url, {
        headers: getAuthHeaders()
    })
    if (!response.ok) {
        throw new Error('Failed to fetch municipalities')
    }
    return response.json()
}

export async function fetchSectors(munUid = null, govId = null) {
    const params = new URLSearchParams()
    if (munUid) params.append('mun_uid', munUid)
    if (govId) params.append('gov_id', govId)
    
    const queryString = params.toString()
    const url = queryString 
        ? `${API_BASE_URL}/sectors?${queryString}`
        : `${API_BASE_URL}/sectors`
    
    const response = await fetch(url, {
        headers: getAuthHeaders()
    })
    if (!response.ok) {
        throw new Error('Failed to fetch sectors')
    }
    return response.json()
}

export async function fetchStats() {
    const response = await fetch(`${API_BASE_URL}/stats`, {
        headers: getAuthHeaders()
    })
    if (!response.ok) {
        throw new Error('Failed to fetch stats')
    }
    return response.json()
}

export async function fetchActiveAgencies() {
    // Simple passthrough; a cached implementation is available via fetchActiveAgenciesCached
    const response = await fetch(`${API_BASE_URL}/active-agencies`, {
        headers: getAuthHeaders()
    })
    if (!response.ok) {
        throw new Error('Failed to fetch active agencies')
    }
    return response.json()
}

// ========== Cached Active Agencies ==========
// Module-level cache to avoid repeated network calls from multiple components.
let _activeAgenciesCache = null
let _activeAgenciesPromise = null
let _activeAgenciesLastFetched = 0
const ACTIVE_AGENCIES_TTL = 1000 * 60 * 5 // 5 minutes

export async function fetchActiveAgenciesCached({ forceRefresh = false } = {}) {
    const now = Date.now()

    if (!forceRefresh && _activeAgenciesCache && (now - _activeAgenciesLastFetched) < ACTIVE_AGENCIES_TTL) {
        return _activeAgenciesCache
    }

    if (!forceRefresh && _activeAgenciesPromise) {
        return _activeAgenciesPromise
    }

    _activeAgenciesPromise = (async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/active-agencies`, {
                headers: getAuthHeaders()
            })
            if (!response.ok) throw new Error('Failed to fetch active agencies')
            const data = await response.json()
            _activeAgenciesCache = data
            _activeAgenciesLastFetched = Date.now()
            return data
        } finally {
            _activeAgenciesPromise = null
        }
    })()

    return _activeAgenciesPromise
}

export function invalidateActiveAgenciesCache() {
    _activeAgenciesCache = null
    _activeAgenciesLastFetched = 0
}

export async function refreshActiveAgencies() {
    invalidateActiveAgenciesCache()
    return fetchActiveAgenciesCached({ forceRefresh: true })
}

// ========== Zone Coloring API ==========

// Module-level cache for zone coloring data
let _zoneColoringCache = null
let _zoneColoringPromise = null
let _zoneColoringLastFetched = 0
const ZONE_COLORING_TTL = 1000 * 60 * 5 // 5 minutes

export async function fetchZoneColoring({ forceRefresh = false } = {}) {
    const now = Date.now()

    if (!forceRefresh && _zoneColoringCache && (now - _zoneColoringLastFetched) < ZONE_COLORING_TTL) {
        return _zoneColoringCache
    }

    if (!forceRefresh && _zoneColoringPromise) {
        return _zoneColoringPromise
    }

    _zoneColoringPromise = (async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/zone-coloring`, {
                headers: getAuthHeaders()
            })
            if (!response.ok) throw new Error('Failed to fetch zone coloring')
            const data = await response.json()
            _zoneColoringCache = data
            _zoneColoringLastFetched = Date.now()
            return data
        } finally {
            _zoneColoringPromise = null
        }
    })()

    return _zoneColoringPromise
}

export function invalidateZoneColoringCache() {
    _zoneColoringCache = null
    _zoneColoringLastFetched = 0
}

// ========== Locations API (pickup points, driving schools, exam centers) ==========

export async function fetchLocations(sectorId = null, type = null) {
    const params = new URLSearchParams()
    if (sectorId) params.append('sec_uid', sectorId)
    if (type) params.append('type', type)
    
    const queryString = params.toString()
    const url = queryString 
        ? `${API_BASE_URL}/locations?${queryString}`
        : `${API_BASE_URL}/locations`
    
    const response = await fetch(url, {
        headers: getAuthHeaders()
    })
    if (!response.ok) {
        throw new Error('Failed to fetch locations')
    }
    return response.json()
}

export async function fetchExamCenters() {
    const url = `${API_BASE_URL}/exam-centers`
    
    const response = await fetch(url, {
        headers: getAuthHeaders()
    })
    if (!response.ok) {
        throw new Error('Failed to fetch exam centers')
    }
    return response.json()
}

export async function createLocation(locationData) {
    const response = await fetch(`${API_BASE_URL}/locations`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(locationData)
    })

    if (!response.ok) {
        // Try to parse JSON error body, otherwise fall back to plain text
        const contentType = response.headers.get('content-type') || ''
        let text = await response.text().catch(() => '')
        if (contentType.includes('application/json')) {
            try {
                const j = JSON.parse(text)
                text = j?.error || j?.message || text
            } catch (e) {
                // ignore JSON parse errors
            }
        }
        throw new Error(text || 'Failed to create location')
    }

    return response.json()
}

export async function deleteLocation(locationId, type) {
    const url = `${API_BASE_URL}/locations/${locationId}`

    const response = await fetch(url, { 
        method: 'DELETE',
        headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type })
    })

    if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(text || 'Failed to delete location')
    }

    return response.json()
}

export async function addAgencyToLocation(locationId, agencyId) {
    const response = await fetch(`${API_BASE_URL}/locations/add-agency`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ locationId, agencyId })
    })

    if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(text || 'Failed to add agency to location')
    }

    return response.json()
}

export async function removeAgencyFromLocation(locationAgencyId) {
    const url = `${API_BASE_URL}/locations/remove-agency/${locationAgencyId}`

    const response = await fetch(url, { 
        method: 'DELETE',
        headers: getAuthHeaders()
    })

    if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(text || 'Failed to remove agency from location')
    }

    return response.json()
}

export async function updateLocation(locationId, updateData) {
    const response = await fetch(`${API_BASE_URL}/locations/${locationId}`, {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(updateData)
    })

    if (!response.ok) {
        const contentType = response.headers.get('content-type') || ''
        let text = await response.text().catch(() => '')
        if (contentType.includes('application/json')) {
            try {
                const j = JSON.parse(text)
                text = j?.error || j?.message || text
            } catch (e) {
                // ignore JSON parse errors
            }
        }
        throw new Error(text || 'Failed to update location')
    }

    return response.json()
}

export async function updateAgencyShowInDrivago(agencyId, showInDrivago) {
    const response = await fetch(`${API_BASE_URL}/show-in-drivago/${agencyId}`, {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ showInDrivago: showInDrivago })
    })

    if (!response.ok) {
        const contentType = response.headers.get('content-type') || ''
        let text = await response.text().catch(() => '')
        if (contentType.includes('application/json')) {
            try {
                const j = JSON.parse(text)
                text = j?.error || j?.message || text
            } catch (e) {
                // ignore JSON parse errors
            }
        }
        throw new Error(text || 'Failed to update show_in_drivago')
    }

    return response.json()
}