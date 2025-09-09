// API Integration Functions
async function apiRequest(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(API_CONFIG.BASE_URL + endpoint, options);
        if (!response.ok) throw new Error('API request failed');
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        showNotification('An error occurred. Please try again.', 'error');
        throw error;
    }
}

// Authentication Functions
async function loginUser(phone, password) {
    try {
        const response = await apiRequest(API_CONFIG.ENDPOINTS.LOGIN, 'POST', {
            phone,
            password
        });
        if (response.success) {
            currentUser = response.user;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            return true;
        }
        return false;
    } catch (error) {
        return false;
    }
}

async function loginOfficial(emp_id, password) {
    try {
        const response = await apiRequest(API_CONFIG.ENDPOINTS.OFFICIAL_LOGIN, 'POST', {
            emp_id,
            password
        });
        if (response.success) {
            return response.official;
        }
        return null;
    } catch (error) {
        return null;
    }
}

async function registerUser(userData) {
    try {
        const response = await apiRequest(API_CONFIG.ENDPOINTS.REGISTER, 'POST', userData);
        return response.success;
    } catch (error) {
        return false;
    }
}

async function registerOfficial(officialData) {
    try {
        const response = await apiRequest(API_CONFIG.ENDPOINTS.OFFICIAL_REGISTER, 'POST', officialData);
        return response.success;
    } catch (error) {
        return false;
    }
}

// Complaints Functions
async function fetchComplaints(username) {
    try {
        return await apiRequest(API_CONFIG.ENDPOINTS.COMPLAINTS + `?username=${username}`);
    } catch (error) {
        return [];
    }
}

async function submitComplaint(complaintData) {
    try {
        return await apiRequest(API_CONFIG.ENDPOINTS.COMPLAINTS, 'POST', complaintData);
    } catch (error) {
        return false;
    }
}

// Location Functions
async function getCurrentLocation() {
    try {
        return await apiRequest(API_CONFIG.ENDPOINTS.LOCATION);
    } catch (error) {
        return null;
    }
}

// Notifications Functions
async function fetchNotifications(username) {
    try {
        return await apiRequest(API_CONFIG.ENDPOINTS.NOTIFICATIONS + `?username=${username}`);
    } catch (error) {
        return [];
    }
}

// Voice Processing Functions
async function processVoiceInput(audioBlob) {
    try {
        const formData = new FormData();
        formData.append('audio', audioBlob);
        
        const response = await fetch(API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.VOICE, {
            method: 'POST',
            body: formData
        });
        
        return await response.json();
    } catch (error) {
        console.error('Voice Processing Error:', error);
        return null;
    }
}

// Documents API
async function listDocuments(userId) {
    try {
        return await apiRequest(`${API_CONFIG.ENDPOINTS.DOCUMENTS}?user_id=${encodeURIComponent(userId)}`);
    } catch (e) {
        return { success: false, documents: [] };
    }
}

async function uploadDocumentApi(userId, file, type = '') {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('user_id', userId);
        formData.append('type', type);
        const res = await fetch(API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.DOCUMENTS, {
            method: 'POST',
            body: formData
        });
        if (!res.ok) throw new Error('Upload failed');
        return await res.json();
    } catch (e) {
        console.error('Upload error:', e);
        return { success: false };
    }
}

function documentViewUrl(docId) {
    return API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.DOCUMENTS + `/${docId}/view`;
}

function documentDownloadUrl(docId) {
    return API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.DOCUMENTS + `/${docId}/download`;
}
