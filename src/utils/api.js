const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/tunisia-regions'

export async function fetchGovernorates() {
    const response = await fetch(`${API_BASE_URL}/governorates`)
    if (!response.ok) {
        throw new Error('Failed to fetch governorates')
    }
    return response.json()
}

export async function fetchMunicipalities(govId = null) {
    const url = govId 
        ? `${API_BASE_URL}/municipalities?gov_id=${govId}`
        : `${API_BASE_URL}/municipalities`
    
    const response = await fetch(url)
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
    
    const response = await fetch(url)
    if (!response.ok) {
        throw new Error('Failed to fetch sectors')
    }
    return response.json()
}

export async function fetchStats() {
    const response = await fetch(`${API_BASE_URL}/stats`)
    if (!response.ok) {
        throw new Error('Failed to fetch stats')
    }
    return response.json()
}

export async function fetchActiveAgencies() {
    const response = await fetch(`${API_BASE_URL}/active-agencies`)
    if (!response.ok) {
        throw new Error('Failed to fetch active agencies')
    }
    return response.json()
}