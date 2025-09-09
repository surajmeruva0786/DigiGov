// Global Variables
let currentUser = null;
let currentScreen = 'home-screen';
let previousScreen = null;
let navigationHistory = [];
let isVoiceEnabled = false;
let recognition = null;
let synthesis = window.speechSynthesis;
let complaints = [];
let schemes = [];
let documents = [];
let currentComplaintSector = null;

// Server connection check
async function checkServerConnection() {
    try {
        const response = await fetch('http://localhost:5000/api/health');
        if (!response.ok) throw new Error('Server not responding');
        const data = await response.json();
        console.log('Server status:', data);
    } catch (error) {
        console.error('Server connection error:', error);
        showNotification('Server connection failed. Please ensure the server is running.', 'error');
    }
}

// User Registration
async function registerUser() {
    try {
        console.log("Starting registration process"); // Debug log
        
        // Get form values
        const userData = {
            name: document.getElementById('reg-name').value,
            aadhaar: document.getElementById('aadhaar').value,
            phone: document.getElementById('reg-phone').value,
            password: document.getElementById('reg-password').value,
            confirmPassword: document.getElementById('confirm-password').value,
            email: document.getElementById('reg-email')?.value || '',
            address: document.getElementById('reg-address')?.value || ''
        };
        
        console.log("Form data collected:", userData); // Debug log

        // Validate form
        if (!userData.name || !userData.aadhaar || !userData.phone || !userData.password) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }

        // Validate Aadhaar format (12 digits)
        if (!/^\d{12}$/.test(userData.aadhaar)) {
            showNotification('Please enter a valid 12-digit Aadhaar number', 'error');
            return;
        }

        // Validate phone format (10 digits)
        if (!/^\d{10}$/.test(userData.phone)) {
            showNotification('Please enter a valid 10-digit phone number', 'error');
            return;
        }

        // Validate password match
        if (userData.password !== userData.confirmPassword) {
            showNotification('Passwords do not match', 'error');
            return;
        }

        console.log("Sending request to server..."); // Debug log
        
        const response = await fetch('http://localhost:5000/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                name: userData.name,
                aadhaar: userData.aadhaar,
                phone: userData.phone,
                password: userData.password,
                email: userData.email,
                address: userData.address
            })
        });

        console.log("Server responded with status:", response.status); // Debug log
        const result = await response.json();
        console.log('Registration response:', result);

        if (result.success) {
            showNotification('Registration successful! Please login.', 'success');
            switchTab('login');
        } else {
            showNotification(result.message || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('Connection error. Please try again.', 'error');
    }
}

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupVoiceRecognition();
    
    // Check API server availability
    checkServerConnection();
    
    // Hide loading screen after 2 seconds
    setTimeout(() => {
        document.getElementById('loading').style.display = 'none';
    }, 2000);
});

// On load, prefer sessionStorage session if present
window.addEventListener('load', function() {
    const sessionUser = sessionStorage.getItem('currentUser');
    if (sessionUser) {
        try {
            const parsed = JSON.parse(sessionUser);
            if (parsed && parsed.type) {
                currentUser = parsed;
                if (parsed.type === 'user') {
                    showUserDashboard();
                } else if (parsed.type === 'official') {
                    showOfficialDashboard();
                }
            }
        } catch (e) {}
    }
});

// Initialize App
function initializeApp() {
    // Check for saved user session with validation
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        try {
            const parsed = JSON.parse(savedUser);
            // Basic validation: must have id and role/type
            if (parsed && (parsed.id || parsed.empId || parsed.phone)) {
                currentUser = parsed;
                if (currentUser.type === 'user') {
                    showUserDashboard();
                } else if (currentUser.type === 'official') {
                    showOfficialDashboard();
                } else {
                    // Unknown type -> clear
                    localStorage.removeItem('currentUser');
                }
            } else {
                localStorage.removeItem('currentUser');
            }
        } catch (e) {
            localStorage.removeItem('currentUser');
        }
    }
    
    // Load saved settings
    const voiceEnabled = localStorage.getItem('voiceEnabled');
    if (voiceEnabled === 'true') {
        isVoiceEnabled = true;
        document.getElementById('voice-toggle').classList.add('active');
    }
    
    // Load saved data
    loadLocalData();
}

// Voice Recognition Setup
function setupVoiceRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            handleVoiceCommand(transcript);
        };
        
        recognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
            showNotification('Voice recognition error. Please try again.', 'error');
        };
    } else {
        console.log('Speech recognition not supported');
        showNotification('Voice recognition not supported in this browser.', 'warning');
    }
}

// Voice Commands Handler
function handleVoiceCommand(command) {
    const lowerCommand = command.toLowerCase();
    
    // Navigation commands
    if (lowerCommand.includes('home') || lowerCommand.includes('dashboard')) {
        if (currentUser?.type === 'user') {
            showUserDashboard();
        } else if (currentUser?.type === 'official') {
            showOfficialDashboard();
        } else {
            showHome();
        }
        speak('Navigating to dashboard');
    }
    else if (lowerCommand.includes('scheme')) {
        showSchemes();
        speak('Opening government schemes');
    }
    else if (lowerCommand.includes('complaint')) {
        showComplaints();
        speak('Opening complaints section');
    }
    else if (lowerCommand.includes('children') || lowerCommand.includes('child')) {
        showChildren();
        speak('Opening children module');
    }
    else if (lowerCommand.includes('bill') || lowerCommand.includes('payment')) {
        showBillPayments();
        speak('Opening bill payments');
    }
    else if (lowerCommand.includes('document')) {
        showDocuments();
        speak('Opening documents');
    }
    else if (lowerCommand.includes('logout') || lowerCommand.includes('sign out')) {
        logout();
        speak('Logging out');
    }
    else if (lowerCommand.includes('search')) {
        const searchTerm = lowerCommand.replace('search', '').trim();
        if (currentScreen === 'schemes-screen') {
            document.getElementById('scheme-search').value = searchTerm;
            searchSchemes();
            speak(`Searching for ${searchTerm}`);
        }
    }
    else {
        speak('Command not recognized. Please try again.');
    }
}

// Text to Speech
function speak(text) {
    if (!isVoiceEnabled || !synthesis) return;
    
    // Cancel any ongoing speech
    synthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.8;
    utterance.pitch = 1;
    utterance.volume = 0.8;
    
    // Use Hindi voice if available for better accessibility
    const voices = synthesis.getVoices();
    const hindiVoice = voices.find(voice => voice.lang.includes('hi') || voice.lang.includes('en-IN'));
    if (hindiVoice) {
        utterance.voice = hindiVoice;
    }
    
    synthesis.speak(utterance);
}

// Screen Navigation with History
function showScreen(screenId, addToHistory = true) {
    // Add current screen to history if navigating forward
    if (addToHistory && currentScreen && currentScreen !== screenId) {
        previousScreen = currentScreen;
        navigationHistory.push(currentScreen);
    }
    
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Show target screen
    document.getElementById(screenId).classList.add('active');
    currentScreen = screenId;
    
    // Update page title based on screen
    updatePageTitle(screenId);
    
    console.log('Navigated to:', screenId, 'Previous:', previousScreen);
}

// Go Back Function
function goBack() {
    let targetScreen;
    
    // Determine where to go back based on current screen and user state
    if (currentScreen === 'schemes-screen' || currentScreen === 'complaints-screen' || 
        currentScreen === 'children-screen' || currentScreen === 'bills-screen' || 
        currentScreen === 'documents-screen') {
        // Go back to dashboard from main feature screens
        targetScreen = currentUser?.type === 'user' ? 'user-dashboard' : 'official-dashboard';
    } else if (currentScreen === 'complaint-form') {
        // Go back to complaints from complaint form
        targetScreen = 'complaints-screen';
    } else if (currentScreen === 'user-login' || currentScreen === 'official-login') {
        // Go back to home from login screens
        targetScreen = 'home-screen';
    } else if (navigationHistory.length > 0) {
        // Use navigation history
        targetScreen = navigationHistory.pop();
    } else {
        // Default fallback
        if (currentUser?.type === 'user') {
            targetScreen = 'user-dashboard';
        } else if (currentUser?.type === 'official') {
            targetScreen = 'official-dashboard';
        } else {
            targetScreen = 'home-screen';
        }
    }
    
    showScreen(targetScreen, false);
    speak('Going back');
}

function updatePageTitle(screenId) {
    const titles = {
        'home-screen': 'Government Services - Home',
        'user-login': 'Government Services - Citizen Login',
        'official-login': 'Government Services - Official Login',
        'user-dashboard': 'Government Services - Dashboard',
        'schemes-screen': 'Government Services - Schemes',
        'complaints-screen': 'Government Services - Complaints',
        'children-screen': 'Government Services - Children',
        'bills-screen': 'Government Services - Bill Payments',
        'documents-screen': 'Government Services - Documents',
        'official-dashboard': 'Government Services - Official Dashboard'
    };
    document.title = titles[screenId] || 'Government Services';
}

// Navigation Functions
function showHome() {
    navigationHistory = []; // Clear history when going home
    showScreen('home-screen');
    speak('Welcome to Government Services');
}

function showUserLogin() {
    showScreen('user-login');
    speak('Opening citizen login');
}

function showOfficialLogin() {
    showScreen('official-login');
    speak('Opening official login');
}

function showUserDashboard() {
    showScreen('user-dashboard');
    updateUserDashboard();
    speak('Welcome to your dashboard');
}

function showOfficialDashboard() {
    showScreen('official-dashboard');
    updateOfficialDashboard();
    speak('Welcome to official dashboard');
}

function showSchemes() {
    showScreen('schemes-screen');
    loadSchemes();
    speak('Loading government schemes');
}

function showComplaints() {
    showScreen('complaints-screen');
    speak('Select a department to file complaint');
}

function showChildren() {
    showScreen('children-screen');
    updateChildrenDashboard();
    speak('Opening children education module');
}

function showBillPayments() {
    showScreen('bills-screen');
    speak('Select a bill type to pay');
}

function showDocuments() {
    showScreen('documents-screen');
    loadDocuments();
    speak('Loading your documents');
}

// Authentication Functions
function switchTab(tab) {
    document.querySelectorAll('#user-login .tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('#user-login .auth-form').forEach(form => form.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(tab + '-form').classList.add('active');
}

function switchOfficialTab(tab) {
    document.querySelectorAll('#official-login .tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('#official-login .auth-form').forEach(form => form.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById('official-' + tab + '-form').classList.add('active');
}

async function userLogin() {
    const phone = document.getElementById('login-phone').value;
    const password = document.getElementById('login-password').value;
    
    if (!phone || !password) {
        showNotification('Please fill in all fields', 'error');
        speak('Please fill in all required fields');
        return;
    }
    
    const ok = await loginUser(phone, password);
    if (ok) {
        const saved = localStorage.getItem('currentUser');
        if (saved) {
            currentUser = JSON.parse(saved);
            currentUser.type = 'user';
        }
        // Persist session only if remember is checked
        if (!document.getElementById('remember-user').checked) {
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            localStorage.removeItem('currentUser');
        }
        showNotification('Login successful!', 'success');
        speak('Login successful. Welcome to your dashboard');
        showUserDashboard();
    } else {
        showNotification('Invalid credentials', 'error');
        speak('Login failed');
    }
}

function userRegister() {
    const aadhaar = document.getElementById('aadhaar').value;
    const phone = document.getElementById('reg-phone').value;
    const email = document.getElementById('email').value;
    const address = document.getElementById('address').value;
    const password = document.getElementById('reg-password').value;
    
    if (!aadhaar || !phone || !email || !address || !password) {
        showNotification('Please fill in all fields', 'error');
        speak('Please fill in all required fields');
        return;
    }
    
    if (aadhaar.length !== 12) {
        showNotification('Please enter a valid 12-digit Aadhaar number', 'error');
        speak('Please enter a valid Aadhaar number');
        return;
    }
    
    // Simulate registration
    const user = {
        id: Date.now(),
        type: 'user',
        phone: phone,
        email: email,
        name: 'New User',
        location: address,
        aadhaar: aadhaar
    };
    
    currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
    
    showNotification('Registration successful!', 'success');
    speak('Registration successful. Welcome to your dashboard');
    showUserDashboard();
}

async function officialLogin() {
    const empId = document.getElementById('emp-id').value;
    const password = document.getElementById('official-password').value;
    
    if (!empId || !password) {
        showNotification('Please fill in all fields', 'error');
        speak('Please fill in all required fields');
        return;
    }
    
    const official = await loginOfficial(empId, password);
    if (official) {
        currentUser = { ...official, type: 'official' };
        if (document.getElementById('remember-official').checked) {
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        } else {
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            localStorage.removeItem('currentUser');
        }
        showNotification('Official login successful!', 'success');
        speak('Login successful. Welcome to official dashboard');
        showOfficialDashboard();
    } else {
        showNotification('Invalid credentials', 'error');
    }
}

async function officialRegister() {
    const emp_id = document.getElementById('new-emp-id').value;
    const name = document.getElementById('official-name').value;
    const department = document.getElementById('department').value;
    const category = document.getElementById('official-category').value;
    const password = document.getElementById('new-official-password').value;
    
    if (!emp_id || !name || !department || !category || !password) {
        showNotification('Please fill in all fields', 'error');
        speak('Please fill in all required fields');
        return;
    }
    
    const ok = await registerOfficial({ emp_id, name, department, category, password });
    if (ok) {
        showNotification('Official registration successful! Please login.', 'success');
        speak('Registration successful');
        switchOfficialTab('login');
    } else {
        showNotification('Registration failed', 'error');
    }
}

function sendOTP() {
    const phone = document.getElementById('login-phone').value;
    if (!phone) {
        showNotification('Please enter phone number', 'error');
        return;
    }
    
    showNotification('OTP sent to your phone number', 'success');
    speak('OTP has been sent to your phone number');
    
    // Simulate OTP verification after 3 seconds
    setTimeout(() => {
        showNotification('OTP verified successfully!', 'success');
        userLogin();
    }, 3000);
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentUser');
    showHome();
    showNotification('Logged out successfully', 'success');
    speak('You have been logged out');
}

// Dashboard Updates
function updateUserDashboard() {
    if (!currentUser) return;
    
    document.getElementById('user-name').textContent = `Welcome ${currentUser.name}`;
    document.getElementById('user-location').textContent = currentUser.location;
    
    // Update complaint counts
    const userComplaints = complaints.filter(c => c.userId === currentUser.id);
    const pending = userComplaints.filter(c => c.status === 'pending').length;
    const resolved = userComplaints.filter(c => c.status === 'resolved').length;
    
    document.getElementById('pending-complaints').textContent = pending;
    document.getElementById('resolved-complaints').textContent = resolved;
}

function updateOfficialDashboard() {
    if (!currentUser) return;
    
    document.getElementById('official-name').textContent = currentUser.name;
    document.getElementById('official-dept').textContent = currentUser.department;
}

function updateChildrenDashboard() {
    // Update children stats with sample data
    // In real app, this would fetch from backend
}

// Voice Features
function toggleVoiceAssistant() {
    isVoiceEnabled = !isVoiceEnabled;
    localStorage.setItem('voiceEnabled', isVoiceEnabled);
    
    const btn = document.getElementById('voice-toggle') || document.getElementById('voice-assistant-btn');
    if (btn) {
        btn.classList.toggle('active', isVoiceEnabled);
    }
    
    if (isVoiceEnabled) {
        showNotification('Voice assistant enabled', 'success');
        speak('Voice assistant is now enabled. You can use voice commands to navigate.');
    } else {
        showNotification('Voice assistant disabled', 'info');
    }
}

function startVoiceSearch() {
    if (!recognition) {
        showNotification('Voice recognition not available', 'error');
        return;
    }
    
    showVoiceModal();
    recognition.start();
    document.getElementById('voice-text').textContent = 'Listening for search terms...';
    speak('Please speak your search terms');
}

function startVoiceComplaint() {
    if (!recognition) {
        showNotification('Voice recognition not available', 'error');
        return;
    }
    
    showVoiceModal();
    recognition.start();
    document.getElementById('voice-text').textContent = 'Recording your complaint...';
    speak('Please describe your complaint');
    
    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        document.getElementById('quick-complaint-text').value = transcript;
        closeVoiceModal();
        speak('Your complaint has been recorded');
    };
}

function startComplaintVoice() {
    if (!recognition) {
        showNotification('Voice recognition not available', 'error');
        return;
    }
    
    const voiceStatus = document.getElementById('voice-status');
    voiceStatus.classList.add('active');
    voiceStatus.textContent = 'Recording...';
    
    recognition.start();
    speak('Please describe your complaint in detail');
    
    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        document.getElementById('complaint-description').value = transcript;
        voiceStatus.textContent = 'Recording complete!';
        speak('Your complaint has been recorded');
        setTimeout(() => {
            voiceStatus.classList.remove('active');
        }, 3000);
    };
}

function showVoiceModal() {
    document.getElementById('voice-modal').classList.add('active');
}

function closeVoiceModal() {
    document.getElementById('voice-modal').classList.remove('active');
    if (recognition) {
        recognition.stop();
    }
}

// Schemes Management
function loadSchemes() {
    const schemesList = document.getElementById('schemes-list');
    
    if (schemes.length === 0) {
        // Load sample schemes
        loadSampleSchemes();
    }
    
    displaySchemes(schemes);
}

function displaySchemes(schemesToShow) {
    const schemesList = document.getElementById('schemes-list');
    schemesList.innerHTML = '';
    
    schemesToShow.forEach(scheme => {
        const schemeCard = createSchemeCard(scheme);
        schemesList.appendChild(schemeCard);
    });
}

function createSchemeCard(scheme) {
    const card = document.createElement('div');
    card.className = 'scheme-card';
    card.innerHTML = `
        <div class="scheme-header">
            <div class="scheme-title">${scheme.title}</div>
            <div class="scheme-type">${scheme.type}</div>
        </div>
        <div class="scheme-description">${scheme.description}</div>
        <div class="scheme-details">
            <div class="scheme-eligibility">${scheme.eligibility}</div>
            <div class="scheme-amount">${scheme.amount}</div>
        </div>
    `;
    
    card.onclick = () => {
        showSchemeDetails(scheme);
    };
    
    return card;
}

function searchSchemes() {
    const query = document.getElementById('scheme-search').value.toLowerCase();
    if (!query) {
        displaySchemes(schemes);
        return;
    }
    
    const filtered = schemes.filter(scheme => 
        scheme.title.toLowerCase().includes(query) ||
        scheme.description.toLowerCase().includes(query) ||
        scheme.category.toLowerCase().includes(query)
    );
    
    displaySchemes(filtered);
    speak(`Found ${filtered.length} schemes matching your search`);
}

function filterSchemes(category) {
    // Update active category button
    document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    if (category === 'all') {
        displaySchemes(schemes);
    } else {
        const filtered = schemes.filter(scheme => 
            scheme.type.toLowerCase() === category || 
            scheme.category.toLowerCase() === category
        );
        displaySchemes(filtered);
    }
    
    speak(`Showing ${category} schemes`);
}

function showSchemeDetails(scheme) {
    showNotification(`${scheme.title}: ${scheme.description}`, 'info');
    speak(`${scheme.title}. ${scheme.description}. Eligibility: ${scheme.eligibility}. Amount: ${scheme.amount}`);
}

// Quick Complaint
function submitQuickComplaint() {
    const complaintText = document.getElementById('quick-complaint-text').value;
    if (!complaintText.trim()) {
        showNotification('Please enter your complaint', 'error');
        return;
    }
    
    const complaint = {
        id: Date.now(),
        userId: currentUser?.id,
        sector: 'general',
        subject: 'Quick Complaint',
        description: complaintText,
        priority: 'medium',
        status: 'pending',
        createdAt: new Date().toISOString()
    };
    
    complaints.push(complaint);
    saveLocalData();
    
    document.getElementById('quick-complaint-text').value = '';
    showNotification('Complaint submitted successfully!', 'success');
    speak('Your complaint has been submitted successfully');
}

// Complaint Management
function selectSector(sector) {
    currentComplaintSector = sector;
    showScreen('complaint-form');
    document.getElementById('complaint-sector-title').textContent = 
        `File ${sector.charAt(0).toUpperCase() + sector.slice(1)} Complaint`;
    speak(`Filing complaint for ${sector} department`);
}

function submitComplaint() {
    const subject = document.getElementById('complaint-subject').value;
    const description = document.getElementById('complaint-description').value;
    const location = document.getElementById('complaint-location').value;
    const priority = document.getElementById('complaint-priority').value;
    
    if (!subject || !description || !location) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    const complaint = {
        id: Date.now(),
        userId: currentUser?.id,
        sector: currentComplaintSector,
        subject: subject,
        description: description,
        location: location,
        priority: priority,
        status: 'pending',
        createdAt: new Date().toISOString()
    };
    
    complaints.push(complaint);
    saveLocalData();
    
    // Clear form
    document.getElementById('complaint-subject').value = '';
    document.getElementById('complaint-description').value = '';
    document.getElementById('complaint-location').value = '';
    
    showNotification('Complaint submitted successfully!', 'success');
    speak('Your complaint has been submitted successfully. You will receive updates on its progress.');
    
    setTimeout(() => {
        showUserDashboard();
    }, 2000);
}

// Children Module Functions
function showAddChild() {
    showNotification('Add child functionality would open here', 'info');
    speak('Opening add child form');
}

function showAttendance() {
    showNotification('Attendance tracker would open here', 'info');
    speak('Opening attendance tracker');
}

function showVaccination() {
    showNotification('Vaccination schedule would open here', 'info');
    speak('Opening vaccination schedule');
}

function showEducation() {
    showNotification('Education resources would open here', 'info');
    speak('Opening education resources');
}

function showMeals() {
    showNotification('Mid-day meals info would open here', 'info');
    speak('Opening mid-day meals information');
}

// Bill Payments
function selectBillType(billType) {
    showSecurityModal();
    speak(`Please verify your identity to proceed with ${billType} bill payment`);
}

function showSecurityModal() {
    document.getElementById('security-modal').style.display = 'flex';
}

function authenticateFingerprint() {
    // Simulate fingerprint authentication
    setTimeout(() => {
        document.getElementById('security-modal').style.display = 'none';
        showNotification('Authentication successful! Redirecting to payment...', 'success');
        speak('Authentication successful. Redirecting to payment gateway');
        
        // Simulate UPI app redirect
        setTimeout(() => {
            showNotification('Redirecting to UPI payment app...', 'info');
        }, 1000);
    }, 2000);
}

function showPinInput() {
    const pin = prompt('Enter your 4-digit PIN:');
    if (pin && pin.length === 4) {
        document.getElementById('security-modal').style.display = 'none';
        showNotification('Authentication successful! Redirecting to payment...', 'success');
        speak('Authentication successful. Redirecting to payment gateway');
    } else {
        showNotification('Invalid PIN. Please try again.', 'error');
    }
}

// Documents Management
function loadDocuments() {
    // Load from backend if logged in
    if (currentUser?.id) {
        listDocuments(currentUser.id).then(res => {
            if (res?.success) {
                documents = res.documents || [];
                saveLocalData();
            }
            renderDocuments();
        }).catch(() => renderDocuments());
    } else {
        if (documents.length === 0) {
            loadSampleDocuments();
        }
        renderDocuments();
    }
}

function filterDocuments(category) {
    document.querySelectorAll('.doc-category').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    speak(`Showing ${category} documents`);
}

function showAddDocument() {
    const modal = document.getElementById('add-doc-modal');
    if (!modal) {
        showNotification('Add document modal not found', 'error');
        return;
    }
    modal.classList.add('active');
    modal.style.display = 'flex';
    setupAddDocumentHandlers();
    speak('Opening add document form');
}

function viewDocument(docType) {
    showNotification(`Viewing ${docType} document`, 'info');
    speak(`Opening ${docType} document`);
}

function downloadDocument(docType) {
    showNotification(`Downloading ${docType} document`, 'success');
    speak(`Downloading ${docType} document`);
}

function viewDocumentById(docId) {
    const url = documentViewUrl(docId);
    window.open(url, '_blank');
}

function downloadDocumentById(docId) {
    const url = documentDownloadUrl(docId);
    const a = document.createElement('a');
    a.href = url;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    a.remove();
}

function deleteDocumentById(docId) {
    if (!confirm('Delete this document? This action cannot be undone.')) return;
    deleteDocumentApi(docId).then(res => {
        if (res?.success) {
            // Remove from local list and re-render
            documents = (documents || []).filter(d => d.id !== docId);
            saveLocalData();
            renderDocuments();
            showNotification('Document deleted', 'success');
        } else {
            showNotification('Failed to delete document', 'error');
        }
    });
}

// Add Document Modal Logic
let pendingSelectedFiles = [];

function setupAddDocumentHandlers() {
    const dropArea = document.getElementById('drop-area');
    const browseBtn = document.getElementById('browse-files');
    const fileInput = document.getElementById('file-input');
    const selectedContainer = document.getElementById('selected-files');

    if (!dropArea || !browseBtn || !fileInput || !selectedContainer) return;

    // Reset previous selection UI
    pendingSelectedFiles = [];
    selectedContainer.innerHTML = '';

    // Prevent defaults
    ['dragenter','dragover','dragleave','drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    ['dragenter','dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.add('highlight'));
    });

    ['dragleave','drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.remove('highlight'));
    });

    dropArea.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    });

    browseBtn.onclick = () => fileInput.click();
    fileInput.onchange = () => handleFiles(fileInput.files);
}

function handleFiles(fileList) {
    const selectedContainer = document.getElementById('selected-files');
    Array.from(fileList).forEach(file => {
        pendingSelectedFiles.push(file);
        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';
        item.style.padding = '6px 8px';
        item.style.borderBottom = '1px solid #eee';
        item.innerHTML = `<span>${file.name} (${Math.ceil(file.size/1024)} KB)</span>`;
        selectedContainer.appendChild(item);
    });
}

function closeAddDocument() {
    const modal = document.getElementById('add-doc-modal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

function confirmAddDocuments() {
    if (pendingSelectedFiles.length === 0) {
        showNotification('Please select at least one file', 'error');
        return;
    }
    // Upload to backend sequentially
    const files = [...pendingSelectedFiles];
    const uploads = files.map(f => uploadDocumentApi(currentUser?.id || '', f, guessDocTypeFromName(f.name)));
    Promise.all(uploads).then(results => {
        const okDocs = results.filter(r => r?.success).map(r => r.document);
        if (okDocs.length > 0) {
            documents = [...(documents || []), ...okDocs];
            saveLocalData();
            renderDocuments();
            showNotification('Documents uploaded successfully', 'success');
        } else {
            showNotification('Upload failed', 'error');
        }
    }).finally(() => {
        pendingSelectedFiles = [];
        closeAddDocument();
    });
}

function guessDocTypeFromName(name) {
    const lower = name.toLowerCase();
    if (lower.includes('aadhaar') || lower.includes('pan') || lower.includes('id')) return 'identity';
    if (lower.includes('certificate') || lower.endsWith('.pdf')) return 'certificates';
    if (lower.includes('invoice') || lower.includes('statement')) return 'financial';
    return 'other';
}

function renderDocuments() {
    const grid = document.querySelector('#documents-screen .documents-grid');
    if (!grid) return;
    grid.innerHTML = '';
    (documents || []).forEach(doc => {
        const card = document.createElement('div');
        card.className = 'document-card';
        card.innerHTML = `
            <div class="doc-icon">
                <i class="fas ${iconForDocType(doc.type)}"></i>
            </div>
            <div class="doc-info">
                <h4 title="${doc.original_name || doc.name}">${doc.name}</h4>
                <p>${labelForDocType(doc.type)}</p>
            </div>
            <div class="doc-actions">
                <button class="icon-btn" onclick="viewDocumentById(${doc.id})">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="icon-btn" onclick="downloadDocumentById(${doc.id})">
                    <i class="fas fa-download"></i>
                </button>
                <button class="icon-btn" onclick="deleteDocumentById(${doc.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function iconForDocType(type) {
    const map = { identity: 'fa-id-card', certificates: 'fa-file', financial: 'fa-receipt', other: 'fa-file' };
    return map[type] || map.other;
}

function labelForDocType(type) {
    const map = { identity: 'Identity', certificates: 'Certificates', financial: 'Financial', other: 'Other' };
    return map[type] || 'Document';
}

// Official Functions
function viewComplaints(category) {
    showNotification(`Viewing ${category} complaints`, 'info');
    speak(`Opening ${category} department complaints`);
}

// Data Management
function saveLocalData() {
    localStorage.setItem('complaints', JSON.stringify(complaints));
    localStorage.setItem('schemes', JSON.stringify(schemes));
    localStorage.setItem('documents', JSON.stringify(documents));
}

function loadLocalData() {
    const savedComplaints = localStorage.getItem('complaints');
    if (savedComplaints) {
        complaints = JSON.parse(savedComplaints);
    }
    
    const savedSchemes = localStorage.getItem('schemes');
    if (savedSchemes) {
        schemes = JSON.parse(savedSchemes);
    }
    
    const savedDocuments = localStorage.getItem('documents');
    if (savedDocuments) {
        documents = JSON.parse(savedDocuments);
    }
}

// Sample Data Loading
function loadSampleData() {
    loadSampleSchemes();
    loadSampleComplaints();
    loadSampleDocuments();
}

function loadSampleSchemes() {
    schemes = [
        {
            id: 1,
            title: "PM-KISAN Scheme",
            description: "Direct income support to farmers with landholding up to 2 hectares",
            type: "Central",
            category: "agriculture",
            eligibility: "Small and marginal farmers",
            amount: "₹6,000 per year"
        },
        {
            id: 2,
            title: "Ayushman Bharat",
            description: "Health insurance scheme providing coverage up to ₹5 lakh per family",
            type: "Central",
            category: "health",
            eligibility: "BPL families",
            amount: "₹5,00,000 coverage"
        },
        {
            id: 3,
            title: "Beti Bachao Beti Padhao",
            description: "Scheme to improve child sex ratio and promote education of girl child",
            type: "Central",
            category: "education",
            eligibility: "All girl children",
            amount: "Educational support"
        },
        {
            id: 4,
            title: "Mid Day Meal Scheme",
            description: "Free lunch to school children to improve enrollment and nutrition",
            type: "Central",
            category: "education",
            eligibility: "School children",
            amount: "Free meals"
        },
        {
            id: 5,
            title: "Old Age Pension",
            description: "Monthly pension for senior citizens below poverty line",
            type: "State",
            category: "social",
            eligibility: "Senior citizens (60+ years)",
            amount: "₹1,000 per month"
        }
    ];
    saveLocalData();
}

function loadSampleComplaints() {
    if (!currentUser) return;
    
    complaints = [
        {
            id: 1,
            userId: currentUser.id,
            sector: "education",
            subject: "Teacher Absence",
            description: "School teacher has been absent for 3 consecutive days",
            location: "Government Primary School, Village ABC",
            priority: "high",
            status: "pending",
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        }
    ];
    saveLocalData();
}

function loadSampleDocuments() {
    documents = [
        {
            id: 1,
            name: "Aadhaar Card",
            type: "identity",
            uploadDate: "2024-01-15"
        },
        {
            id: 2,
            name: "Ration Card",
            type: "identity",
            uploadDate: "2024-01-20"
        },
        {
            id: 3,
            name: "Income Certificate",
            type: "certificates",
            uploadDate: "2024-02-01"
        }
    ];
    saveLocalData();
}

// Utility Functions
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Add styles dynamically
    if (!document.getElementById('notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                padding: 15px 20px;
                border-radius: 10px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                z-index: 10000;
                animation: slideInRight 0.3s ease;
                max-width: 350px;
                border-left: 4px solid;
            }
            .notification.success { border-color: #4CAF50; }
            .notification.error { border-color: #f44336; }
            .notification.warning { border-color: #ff9800; }
            .notification.info { border-color: #2196F3; }
            .notification-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .notification.success i { color: #4CAF50; }
            .notification.error i { color: #f44336; }
            .notification.warning i { color: #ff9800; }
            .notification.info i { color: #2196F3; }
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }
    
    // Remove after 4 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
    
    // Add slide out animation
    const existingStyles = document.getElementById('notification-styles');
    if (!existingStyles.textContent.includes('slideOutRight')) {
        existingStyles.textContent += `
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
    }
}

function getNotificationIcon(type) {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    return icons[type] || icons.info;
}

// Event Listeners
document.addEventListener('click', function(e) {
    // Voice toggle
    if (e.target.id === 'voice-toggle' || e.target.id === 'voice-assistant-btn') {
        toggleVoiceAssistant();
    }
    
    // Close modals on outside click
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
        e.target.style.display = 'none';
    }
});

// Keyboard Navigation
document.addEventListener('keydown', function(e) {
    // Escape key closes modals
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
            modal.style.display = 'none';
        });
        closeVoiceModal();
    }
    
    // Voice activation with spacebar (when not typing)
    if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        if (recognition && isVoiceEnabled) {
            recognition.start();
        }
    }
});

// Responsive handling
window.addEventListener('resize', function() {
    // Handle responsive layouts if needed
    const isMobile = window.innerWidth < 768;
    document.body.classList.toggle('mobile', isMobile);
});

// Initialize mobile class
window.addEventListener('load', function() {
    const isMobile = window.innerWidth < 768;
    document.body.classList.toggle('mobile', isMobile);
});

// Service Worker for offline functionality (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        // Could register service worker here for offline functionality
        console.log('Service Worker support detected');
    });
}

// Web Speech API voices loading
if (synthesis) {
    synthesis.addEventListener('voiceschanged', function() {
        console.log('Voices loaded:', synthesis.getVoices().length);
    });
}

// Auto-save forms (prevent data loss)
document.addEventListener('input', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        const formData = new FormData();
        const form = e.target.closest('form') || e.target.closest('.auth-form') || e.target.closest('.form-container');
        if (form) {
            // Auto-save functionality could be implemented here
        }
    }
});

// Prevent form submission on Enter in certain contexts
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'submit') {
        const submitBtn = e.target.closest('form')?.querySelector('[type="submit"]') || 
                         e.target.closest('.auth-form')?.querySelector('.primary-btn') ||
                         e.target.closest('.form-container')?.querySelector('.primary-btn');
        if (submitBtn) {
            e.preventDefault();
            submitBtn.click();
        }
    }
});

console.log('Government Services App initialized successfully!');