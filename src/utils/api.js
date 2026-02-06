const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3007/api/tunisia-regions'

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

export async function addAgencyToList(agencyId, workingZoneType, workingZoneId) {
    const payload = { agencyId, workingZoneType, workingZoneId }

    const response = await fetch(`${API_BASE_URL}/agency-working-zone`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload)
    })

    if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(text || 'Failed to add agency')
    }

    return response.json()
}

export async function removeAgencyFromList(agencyWorkingZoneId) {
    const url = `${API_BASE_URL}/agency-working-zone/${agencyWorkingZoneId}`

    const response = await fetch(url, { 
        method: 'DELETE',
        headers: getAuthHeaders()
    })

    if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(text || 'Failed to remove agency')
    }

    return response.json()
}

// ========== Pickup Points API ==========

export async function fetchPickupPoints(sectorId = null) {
    const params = new URLSearchParams()
    if (sectorId) params.append('sec_uid', sectorId)
    
    const queryString = params.toString()
    const url = queryString 
        ? `${API_BASE_URL}/pickup-points?${queryString}`
        : `${API_BASE_URL}/pickup-points`
    
    const response = await fetch(url, {
        headers: getAuthHeaders()
    })
    if (!response.ok) {
        throw new Error('Failed to fetch pickup points')
    }
    return response.json()
}

export async function createPickupPoint(pickupPointData) {
    const response = await fetch(`${API_BASE_URL}/pickup-points`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(pickupPointData)
    })

    if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(text || 'Failed to create pickup point')
    }

    return response.json()
}

export async function deletePickupPoint(pickupPointId) {
    const url = `${API_BASE_URL}/pickup-points/${pickupPointId}`

    const response = await fetch(url, { 
        method: 'DELETE',
        headers: getAuthHeaders()
    })

    if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(text || 'Failed to delete pickup point')
    }

    return response.json()
}

export async function addAgencyToPickupPoint(pickupPointId, agencyId) {
    const response = await fetch(`${API_BASE_URL}/pickup-points/add-agency`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ pickupPointId, agencyId })
    })

    if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(text || 'Failed to add agency to pickup point')
    }

    return response.json()
}

export async function removeAgencyFromPickupPoint(pickupPointAgencyId) {
    const url = `${API_BASE_URL}/pickup-points/remove-agency/${pickupPointAgencyId}`

    const response = await fetch(url, { 
        method: 'DELETE',
        headers: getAuthHeaders()
    })

    if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(text || 'Failed to remove agency from pickup point')
    }

    return response.json()
}

// export async function fetchAssignedAgencies(workingZoneType, workingZoneId) {
//     const params = new URLSearchParams()
//     params.append('workingZoneType', workingZoneType)
//     params.append('workingZoneId', workingZoneId)
    
//     const url = `${API_BASE_URL}/assigned-agencies?${params.toString()}`
    
//     const response = await fetch(url, {
//         headers: getAuthHeaders()
//     })
//     if (!response.ok) {
//         throw new Error('Failed to fetch assigned agencies')
//     }
//     return response.json()
// }