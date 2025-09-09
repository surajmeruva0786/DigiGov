// API Configuration
const API_CONFIG = {
    BASE_URL: 'http://localhost:5000/api',
    ENDPOINTS: {
        LOGIN: '/login',
        REGISTER: '/register',
        OFFICIAL_LOGIN: '/official/login',
        OFFICIAL_REGISTER: '/official/register',
        COMPLAINTS: '/complaints',
        LOCATION: '/location',
        NOTIFICATIONS: '/notifications',
        VOICE: '/voice',
        HEALTH: '/health',
        DOCUMENTS: '/documents'
    }
};

function buildDocUrl(path) {
    // path is a relative server path like uploads/<user>/<file>
    if (!path) return '';
    // Normalize slashes for URL
    const normalized = path.replaceAll('\\', '/');
    return `${API_CONFIG.BASE_URL.replace('/api','')}/${normalized}`;
}

// API Helper Functions
function handleApiError(error) {
    console.error('API Error:', error);
    if (error.message.includes('Failed to fetch')) {
        showNotification('Server connection failed. Please ensure the server is running.', 'error');
    } else {
        showNotification('An error occurred. Please try again.', 'error');
    }
}
