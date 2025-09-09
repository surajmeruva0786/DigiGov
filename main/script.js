// Enhanced Government Services Application
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
let children = [];
let currentComplaintSector = null;
let favoriteSchemes = [];
let schemeFilters = { age: '', income: '', gender: '', category: 'all' };
let currentSchemeView = 'grid';

// Enhanced initialization
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupVoiceRecognition();
    loadSampleData();
    updateAllCounts();
    
    setTimeout(() => {
        document.getElementById('loading').style.display = 'none';
    }, 2000);
});

function initializeApp() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            if (currentUser.type === 'user') {
                showUserDashboard();
            } else if (currentUser.type === 'official') {
                showOfficialDashboard();
            }
        } catch (e) {
            localStorage.removeItem('currentUser');
        }
    }
    
    loadLocalData();
    setupEventListeners();
}

function setupEventListeners() {
    // Search input live filtering
    document.addEventListener('input', function(e) {
        if (e.target.id === 'scheme-search') {
            searchSchemes();
        } else if (e.target.id === 'doc-search') {
            searchDocuments();
        }
    });
}

// Enhanced Voice Recognition
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
    }
}

function toggleVoiceAssistant() {
    isVoiceEnabled = !isVoiceEnabled;
    const voiceBtn = document.getElementById('voice-toggle') || document.getElementById('voice-assistant-btn');
    
    if (isVoiceEnabled) {
        voiceBtn?.classList.add('active');
        showNotification('Voice assistant enabled', 'success');
        speak('Voice assistant is now enabled');
    } else {
        voiceBtn?.classList.remove('active');
        showNotification('Voice assistant disabled', 'info');
    }
    
    localStorage.setItem('voiceEnabled', isVoiceEnabled);
}

function speak(text) {
    if (!isVoiceEnabled || !synthesis) return;
    
    synthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.8;
    utterance.pitch = 1;
    utterance.volume = 0.8;
    synthesis.speak(utterance);
}

// Enhanced Navigation
function showScreen(screenId, addToHistory = true) {
    if (addToHistory && currentScreen && currentScreen !== screenId) {
        navigationHistory.push(currentScreen);
    }
    
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    document.getElementById(screenId).classList.add('active');
    currentScreen = screenId;
    
    // Screen-specific initialization
    if (screenId === 'schemes-screen') {
        loadSchemes();
        updateSchemeStats();
    } else if (screenId === 'complaints-screen') {
        updateComplaintStats();
    } else if (screenId === 'children-screen') {
        loadChildren();
    } else if (screenId === 'bills-screen') {
        updateBillSummary();
    } else if (screenId === 'documents-screen') {
        loadDocuments();
        updateDocumentStats();
    }
}

function goBack() {
    let targetScreen;
    
    if (navigationHistory.length > 0) {
        targetScreen = navigationHistory.pop();
    } else {
        targetScreen = currentUser?.type === 'user' ? 'user-dashboard' : 'home-screen';
    }
    
    showScreen(targetScreen, false);
}

// Authentication Functions
function showUserLogin() {
    showScreen('user-login');
}

function showOfficialLogin() {
    showScreen('official-login');
}

function switchTab(tab) {
    document.querySelectorAll('#user-login .tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('#user-login .auth-form').forEach(form => form.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(tab + '-form').classList.add('active');
}

async function userLogin() {
    const phone = document.getElementById('login-phone').value;
    const password = document.getElementById('login-password').value;
    
    if (!phone || !password) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    // Simulate login
    currentUser = {
        id: 1,
        type: 'user',
        name: 'John Doe',
        phone: phone,
        location: 'New Delhi'
    };
    
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    showNotification('Login successful!', 'success');
    showUserDashboard();
}

async function registerUser() {
    const name = document.getElementById('reg-name').value;
    const aadhaar = document.getElementById('aadhaar').value;
    const phone = document.getElementById('reg-phone').value;
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (!name || !aadhaar || !phone || !password) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showNotification('Passwords do not match', 'error');
        return;
    }
    
    if (!/^\\d{12}$/.test(aadhaar)) {
        showNotification('Please enter a valid 12-digit Aadhaar number', 'error');
        return;
    }
    
    currentUser = {
        id: Date.now(),
        type: 'user',
        name: name,
        phone: phone,
        aadhaar: aadhaar,
        location: 'India'
    };
    
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    showNotification('Registration successful!', 'success');
    showUserDashboard();
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentUser');
    showScreen('home-screen');
    showNotification('Logged out successfully', 'success');
}

// Dashboard Functions
function showUserDashboard() {
    showScreen('user-dashboard');
    updateUserDashboard();
}

function updateUserDashboard() {
    if (!currentUser) return;
    
    document.getElementById('user-name').textContent = currentUser.name || 'Welcome User';
    document.getElementById('user-location').textContent = currentUser.location || 'Location';
    
    updateAllCounts();
}

function updateAllCounts() {
    // Update complaint counts
    const pendingComplaints = complaints.filter(c => c.status === 'pending').length;
    const resolvedComplaints = complaints.filter(c => c.status === 'resolved').length;
    
    document.getElementById('pending-complaints').textContent = pendingComplaints;
    document.getElementById('resolved-complaints').textContent = resolvedComplaints;
    document.getElementById('favorite-schemes').textContent = favoriteSchemes.length;
    document.getElementById('stored-documents').textContent = documents.length;
}

// Enhanced Government Schemes Module
function showSchemes() {
    showScreen('schemes-screen');
}

function loadSchemes() {
    if (schemes.length === 0) {
        loadSampleSchemes();
    }
    renderSchemes();
    updateSchemeStats();
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
            amount: "₹6,000 per year",
            ageRange: "18+",
            incomeLevel: "bpl",
            gender: "all",
            deadline: "2024-12-31",
            popularity: 95,
            documents: ["Aadhaar", "Land Records"],
            benefits: ["Direct cash transfer", "Financial support", "Agricultural development"]
        },
        {
            id: 2,
            title: "Ayushman Bharat",
            description: "Health insurance scheme providing coverage up to ₹5 lakh per family",
            type: "Central",
            category: "health",
            eligibility: "BPL families",
            amount: "₹5,00,000 coverage",
            ageRange: "all",
            incomeLevel: "bpl",
            gender: "all",
            deadline: "2024-12-31",
            popularity: 92,
            documents: ["Aadhaar", "BPL Card"],
            benefits: ["Free healthcare", "Cashless treatment", "Secondary and tertiary care"]
        },
        {
            id: 3,
            title: "Beti Bachao Beti Padhao",
            description: "Scheme to improve child sex ratio and promote education of girl child",
            type: "Central",
            category: "women",
            eligibility: "All girl children",
            amount: "Educational support",
            ageRange: "0-18",
            incomeLevel: "all",
            gender: "female",
            deadline: "2024-12-31",
            popularity: 88,
            documents: ["Birth Certificate", "School Records"],
            benefits: ["Education support", "Gender equality", "Social awareness"]
        },
        {
            id: 4,
            title: "Pradhan Mantri Awas Yojana",
            description: "Housing for all by providing affordable housing to urban and rural poor",
            type: "Central",
            category: "housing",
            eligibility: "EWS/LIG/MIG families",
            amount: "₹2.67 lakh subsidy",
            ageRange: "18+",
            incomeLevel: "low",
            gender: "all",
            deadline: "2024-12-31",
            popularity: 85,
            documents: ["Income Certificate", "Aadhaar", "Property Papers"],
            benefits: ["Interest subsidy", "Affordable housing", "Urban development"]
        },
        {
            id: 5,
            title: "Old Age Pension",
            description: "Monthly pension for senior citizens below poverty line",
            type: "State",
            category: "elderly",
            eligibility: "Senior citizens (60+ years)",
            amount: "₹1,000 per month",
            ageRange: "60+",
            incomeLevel: "bpl",
            gender: "all",
            deadline: "2024-12-31",
            popularity: 90,
            documents: ["Aadhaar", "Age Proof", "Income Certificate"],
            benefits: ["Monthly pension", "Financial security", "Social welfare"]
        },
        {
            id: 6,
            title: "MGNREGA",
            description: "Employment guarantee scheme providing 100 days of wage employment",
            type: "Central",
            category: "employment",
            eligibility: "Rural households",
            amount: "₹220 per day",
            ageRange: "18+",
            incomeLevel: "bpl",
            gender: "all",
            deadline: "2024-12-31",
            popularity: 87,
            documents: ["Job Card", "Aadhaar"],
            benefits: ["Guaranteed employment", "Rural development", "Skill development"]
        },
        {
            id: 7,
            title: "Disability Pension",
            description: "Financial assistance for persons with disabilities",
            type: "State",
            category: "disability",
            eligibility: "Persons with 40% or more disability",
            amount: "₹1,500 per month",
            ageRange: "18+",
            incomeLevel: "all",
            gender: "all",
            deadline: "2024-12-31",
            popularity: 82,
            documents: ["Disability Certificate", "Aadhaar", "Medical Records"],
            benefits: ["Monthly allowance", "Healthcare support", "Social inclusion"]
        },
        {
            id: 8,
            title: "Sukanya Samriddhi Yojana",
            description: "Savings scheme for girl child education and marriage",
            type: "Central",
            category: "financial",
            eligibility: "Girl child up to 10 years",
            amount: "High interest rate savings",
            ageRange: "0-10",
            incomeLevel: "all",
            gender: "female",
            deadline: "2024-12-31",
            popularity: 89,
            documents: ["Birth Certificate", "Aadhaar"],
            benefits: ["Tax benefits", "High returns", "Future financial security"]
        }
    ];
    saveLocalData();
}

function renderSchemes() {
    const schemesList = document.getElementById('schemes-list');
    if (!schemesList) return;
    
    let filteredSchemes = filterSchemesByCategory();
    filteredSchemes = sortSchemes(filteredSchemes);
    
    schemesList.innerHTML = '';
    
    filteredSchemes.forEach(scheme => {
        const schemeCard = createSchemeCard(scheme);
        schemesList.appendChild(schemeCard);
    });
}

function createSchemeCard(scheme) {
    const card = document.createElement('div');
    card.className = `scheme-card ${currentSchemeView === 'list' ? 'list-view' : ''}`;
    
    const isFavorite = favoriteSchemes.includes(scheme.id);
    
    card.innerHTML = `
        <div class="scheme-header">
            <div class="scheme-badge ${scheme.type.toLowerCase()}">${scheme.type}</div>
            <button class="favorite-btn ${isFavorite ? 'active' : ''}" onclick="toggleFavorite(${scheme.id})">
                <i class="fas fa-heart"></i>
            </button>
        </div>
        <div class="scheme-content">
            <h3>${scheme.title}</h3>
            <p>${scheme.description}</p>
            <div class="scheme-details">
                <div class="detail-item">
                    <i class="fas fa-users"></i>
                    <span>${scheme.eligibility}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-rupee-sign"></i>
                    <span>${scheme.amount}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-calendar"></i>
                    <span>Deadline: ${new Date(scheme.deadline).toLocaleDateString()}</span>
                </div>
                <div class="detail-item popularity">
                    <i class="fas fa-star"></i>
                    <span>${scheme.popularity}% popularity</span>
                </div>
            </div>
            <div class="scheme-actions">
                <button class="btn-apply" onclick="applyForScheme(${scheme.id})">
                    <i class="fas fa-file-alt"></i> Apply Now
                </button>
                <button class="btn-details" onclick="viewSchemeDetails(${scheme.id})">
                    <i class="fas fa-info-circle"></i> View Details
                </button>
                <button class="btn-compare" onclick="addToComparison(${scheme.id})">
                    <i class="fas fa-balance-scale"></i> Compare
                </button>
            </div>
        </div>
    `;
    
    return card;
}

function filterSchemes(category) {
    schemeFilters.category = category;
    
    document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    renderSchemes();
    speak(`Showing ${category} schemes`);
}

function filterSchemesByCategory() {
    return schemes.filter(scheme => {
        if (schemeFilters.category !== 'all' && scheme.category !== schemeFilters.category) {
            return false;
        }
        if (schemeFilters.age && !checkAgeEligibility(scheme.ageRange, schemeFilters.age)) {
            return false;
        }
        if (schemeFilters.income && scheme.incomeLevel !== 'all' && scheme.incomeLevel !== schemeFilters.income) {
            return false;
        }
        if (schemeFilters.gender && scheme.gender !== 'all' && scheme.gender !== schemeFilters.gender) {
            return false;
        }
        return true;
    });
}

function checkAgeEligibility(schemeAge, userAge) {
    if (schemeAge === 'all') return true;
    
    const ageMap = {
        '0-5': [0, 5],
        '6-17': [6, 17],
        '18-35': [18, 35],
        '36-59': [36, 59],
        '60+': [60, 150]
    };
    
    const userAgeNum = parseInt(userAge.split('-')[0]);
    const [min, max] = ageMap[schemeAge] || [0, 150];
    
    return userAgeNum >= min && userAgeNum <= max;
}

function applyAdvancedFilters() {
    schemeFilters.age = document.getElementById('age-filter').value;
    schemeFilters.income = document.getElementById('income-filter').value;
    schemeFilters.gender = document.getElementById('gender-filter').value;
    
    renderSchemes();
    updateSchemeStats();
}

function sortSchemes(schemes) {
    const sortBy = document.getElementById('scheme-sort')?.value || 'relevance';
    
    return schemes.sort((a, b) => {
        switch (sortBy) {
            case 'amount-high':
                return parseFloat(b.amount.replace(/[^0-9]/g, '')) - parseFloat(a.amount.replace(/[^0-9]/g, ''));
            case 'amount-low':
                return parseFloat(a.amount.replace(/[^0-9]/g, '')) - parseFloat(b.amount.replace(/[^0-9]/g, ''));
            case 'popular':
                return b.popularity - a.popularity;
            case 'deadline':
                return new Date(a.deadline) - new Date(b.deadline);
            case 'recent':
                return b.id - a.id;
            default:
                return b.popularity - a.popularity;
        }
    });
}

function switchSchemeView(view) {
    currentSchemeView = view;
    
    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    const schemesList = document.getElementById('schemes-list');
    if (view === 'list') {
        schemesList.classList.add('list-view');
        schemesList.classList.remove('grid-view');
    } else {
        schemesList.classList.add('grid-view');
        schemesList.classList.remove('list-view');
    }
    
    renderSchemes();
}

function updateSchemeStats() {
    const filteredSchemes = filterSchemesByCategory();
    const eligibleSchemes = filteredSchemes.filter(scheme => isEligibleForScheme(scheme));
    
    document.getElementById('total-schemes').textContent = filteredSchemes.length;
    document.getElementById('eligible-schemes').textContent = eligibleSchemes.length;
    document.getElementById('applied-schemes').textContent = '0'; // Would come from backend
}

function isEligibleForScheme(scheme) {
    // Simple eligibility check - in real app would be more complex
    return true;
}

function toggleFavorite(schemeId) {
    const index = favoriteSchemes.indexOf(schemeId);
    if (index > -1) {
        favoriteSchemes.splice(index, 1);
        showNotification('Removed from favorites', 'info');
    } else {
        favoriteSchemes.push(schemeId);
        showNotification('Added to favorites', 'success');
    }
    
    saveLocalData();
    renderSchemes();
    updateAllCounts();
}

function showEligibilityChecker() {
    document.getElementById('eligibility-modal').style.display = 'flex';
}

function checkEligibility() {
    const age = document.getElementById('user-age').value;
    const income = document.getElementById('user-income').value;
    const category = document.getElementById('user-category').value;
    
    const eligibleSchemes = schemes.filter(scheme => {
        return checkAgeEligibility(scheme.ageRange, age + '-' + age) &&
               (scheme.incomeLevel === 'all' || scheme.incomeLevel === income);
    });
    
    const resultsDiv = document.getElementById('eligibility-results');
    const schemesList = document.getElementById('eligible-schemes-list');
    
    schemesList.innerHTML = '';
    eligibleSchemes.forEach(scheme => {
        const item = document.createElement('div');
        item.className = 'eligible-scheme-item';
        item.innerHTML = `
            <h5>${scheme.title}</h5>
            <p>${scheme.amount}</p>
        `;
        schemesList.appendChild(item);
    });
    
    resultsDiv.style.display = 'block';
    speak(`You are eligible for ${eligibleSchemes.length} schemes`);
}

function searchSchemes() {
    const searchTerm = document.getElementById('scheme-search').value.toLowerCase();
    
    if (!searchTerm) {
        renderSchemes();
        return;
    }
    
    const filteredSchemes = schemes.filter(scheme => 
        scheme.title.toLowerCase().includes(searchTerm) ||
        scheme.description.toLowerCase().includes(searchTerm) ||
        scheme.category.toLowerCase().includes(searchTerm)
    );
    
    renderFilteredSchemes(filteredSchemes);
}

function renderFilteredSchemes(filteredSchemes) {
    const schemesList = document.getElementById('schemes-list');
    if (!schemesList) return;
    
    schemesList.innerHTML = '';
    
    filteredSchemes.forEach(scheme => {
        const schemeCard = createSchemeCard(scheme);
        schemesList.appendChild(schemeCard);
    });
}

// Enhanced Complaints Module
function showComplaints() {
    showScreen('complaints-screen');
    updateComplaintStats();
}

function updateComplaintStats() {
    const pending = complaints.filter(c => c.status === 'pending').length;
    const resolved = complaints.filter(c => c.status === 'resolved').length;
    const urgent = complaints.filter(c => c.priority === 'urgent' || c.priority === 'emergency').length;
    
    document.getElementById('pending-count').textContent = pending;
    document.getElementById('resolved-count').textContent = resolved;
    document.getElementById('urgent-count').textContent = urgent;
}

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
    const type = document.getElementById('complaint-type').value;
    const anonymous = document.getElementById('anonymous-complaint').checked;
    
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
        type: type,
        anonymous: anonymous,
        status: 'pending',
        createdAt: new Date().toISOString(),
        attachments: []
    };
    
    complaints.push(complaint);
    saveLocalData();
    
    showNotification('Complaint submitted successfully', 'success');
    speak('Complaint submitted successfully');
    
    goBack();
    updateComplaintStats();
    updateAllCounts();
}

function showComplaintHistory() {
    // Implementation for complaint history view
    showNotification('Loading complaint history...', 'info');
}

function trackComplaint() {
    const complaintId = prompt('Enter complaint ID to track:');
    if (complaintId) {
        const complaint = complaints.find(c => c.id == complaintId);
        if (complaint) {
            showNotification(`Complaint Status: ${complaint.status}`, 'info');
            speak(`Your complaint is ${complaint.status}`);
        } else {
            showNotification('Complaint not found', 'error');
        }
    }
}

function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                document.getElementById('complaint-location').value = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
                showNotification('Location captured', 'success');
            },
            error => {
                showNotification('Could not get location', 'error');
            }
        );
    }
}

// Enhanced Children Module
function showChildren() {
    showScreen('children-screen');
    loadChildren();
}

function loadChildren() {
    if (children.length === 0) {
        children = [
            {
                id: 1,
                name: "Sample Child",
                age: 8,
                school: "Government Primary School",
                class: "3rd Grade",
                attendance: 85,
                vaccinations: ["BCG", "DPT", "Polio"],
                pendingVaccines: ["Hepatitis B"],
                homeworkTasks: 3,
                averageGrade: "B+",
                activities: []
            }
        ];
        saveLocalData();
    }
    renderChildren();
}

function renderChildren() {
    const childrenList = document.getElementById('children-list');
    if (!childrenList) return;
    
    // Clear existing children (except add button)
    const addButton = childrenList.querySelector('.add-child');
    childrenList.innerHTML = '';
    if (addButton) {
        childrenList.appendChild(addButton);
    }
    
    children.forEach(child => {
        const childCard = createChildCard(child);
        childrenList.insertBefore(childCard, addButton);
    });
}

function createChildCard(child) {
    const card = document.createElement('div');
    card.className = 'child-card';
    
    card.innerHTML = `
        <div class="child-info">
            <div class="child-avatar">
                <i class="fas fa-child"></i>
            </div>
            <div class="child-details">
                <h4>${child.name}</h4>
                <p>${child.school} - ${child.class}</p>
                <p>Attendance: ${child.attendance}%</p>
            </div>
        </div>
        <div class="child-actions">
            <button class="icon-btn" onclick="viewChild(${child.id})" title="View Details">
                <i class="fas fa-eye"></i>
            </button>
            <button class="icon-btn" onclick="editChild(${child.id})" title="Edit">
                <i class="fas fa-edit"></i>
            </button>
        </div>
    `;
    
    return card;
}

function showAddChild() {
    const name = prompt('Enter child\'s name:');
    if (!name) return;
    
    const age = prompt('Enter child\'s age:');
    if (!age) return;
    
    const school = prompt('Enter school name:');
    if (!school) return;
    
    const newChild = {
        id: Date.now(),
        name: name,
        age: parseInt(age),
        school: school,
        class: `${Math.ceil(age/2)}th Grade`,
        attendance: 85,
        vaccinations: [],
        pendingVaccines: [],
        homeworkTasks: 0,
        averageGrade: "B",
        activities: []
    };
    
    children.push(newChild);
    saveLocalData();
    renderChildren();
    
    showNotification('Child added successfully', 'success');
}

function showAttendance() {
    showNotification('Loading attendance calendar...', 'info');
    speak('Opening attendance tracker');
}

function showVaccination() {
    showNotification('Loading vaccination schedule...', 'info');
    speak('Opening vaccination schedule');
}

function showHomework() {
    showNotification('Loading homework tracker...', 'info');
    speak('Opening homework tracker');
}

function showTeacherChat() {
    showNotification('Opening teacher communication...', 'info');
    speak('Opening teacher chat');
}

function showPerformance() {
    showNotification('Loading performance analytics...', 'info');
    speak('Opening performance analytics');
}

// Enhanced Bill Payments Module
function showBillPayments() {
    showScreen('bills-screen');
    updateBillSummary();
}

function updateBillSummary() {
    // Sample bill data
    const bills = [
        { type: 'electricity', amount: 1250, status: 'due' },
        { type: 'water', amount: 450, status: 'due' },
        { type: 'gas', amount: 750, status: 'due' },
        { type: 'phone', amount: 899, status: 'due' }
    ];
    
    const thisMonth = bills.reduce((sum, bill) => sum + bill.amount, 0);
    const thisYear = thisMonth * 12; // Simplified calculation
    const overdue = bills.filter(b => b.status === 'overdue').reduce((sum, bill) => sum + bill.amount, 0);
    
    // Update summary display
    const summaryItems = document.querySelectorAll('.bill-summary .summary-item .amount');
    if (summaryItems.length >= 3) {
        summaryItems[0].textContent = `₹${thisMonth.toLocaleString()}`;
        summaryItems[1].textContent = `₹${thisYear.toLocaleString()}`;
        summaryItems[2].textContent = `₹${overdue.toLocaleString()}`;
    }
}

function selectBillType(billType) {
    showSecurityModal();
    speak(`Please verify your identity to proceed with ${billType} bill payment`);
}

function showSecurityModal() {
    document.getElementById('security-modal').style.display = 'flex';
}

function authenticateFingerprint() {
    setTimeout(() => {
        document.getElementById('security-modal').style.display = 'none';
        showNotification('Authentication successful! Redirecting to payment...', 'success');
        speak('Authentication successful. Redirecting to payment gateway');
        
        setTimeout(() => {
            showNotification('Redirecting to UPI payment app...', 'info');
        }, 1000);
    }, 2000);
}

function authenticateFaceID() {
    setTimeout(() => {
        document.getElementById('security-modal').style.display = 'none';
        showNotification('Face ID authentication successful!', 'success');
        speak('Face ID verified. Proceeding to payment');
    }, 1500);
}

function showPinInput() {
    const pin = prompt('Enter your 4-digit PIN:');
    if (pin && pin.length === 4) {
        document.getElementById('security-modal').style.display = 'none';
        showNotification('PIN authentication successful!', 'success');
        speak('PIN verified successfully');
    } else {
        showNotification('Invalid PIN. Please try again.', 'error');
    }
}

function showPasswordInput() {
    const password = prompt('Enter your password:');
    if (password && password.length >= 6) {
        document.getElementById('security-modal').style.display = 'none';
        showNotification('Password authentication successful!', 'success');
        speak('Password verified successfully');
    } else {
        showNotification('Invalid password. Please try again.', 'error');
    }
}

function scanQRCode() {
    showNotification('QR Code scanner opening...', 'info');
    speak('Opening QR code scanner for bill payment');
}

function selectPaymentMethod(method) {
    document.querySelectorAll('.payment-method').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    showNotification(`${method.toUpperCase()} selected as payment method`, 'success');
    speak(`${method} payment method selected`);
}

function setupAutoPay() {
    showNotification('Setting up auto-pay...', 'info');
    speak('Opening auto-pay setup');
}

function setupReminders() {
    showNotification('Setting up payment reminders...', 'info');
    speak('Configuring payment reminders');
}

// Enhanced Documents Module
function showDocuments() {
    showScreen('documents-screen');
    loadDocuments();
}

function loadDocuments() {
    if (documents.length === 0) {
        loadSampleDocuments();
    }
    renderDocuments();
    updateDocumentStats();
}

function loadSampleDocuments() {
    documents = [
        {
            id: 1,
            name: "Aadhaar Card",
            type: "identity",
            uploadDate: "2024-01-15",
            verified: true,
            expiry: "2030-12-31",
            size: "2.5 MB"
        },
        {
            id: 2,
            name: "PAN Card",
            type: "identity",
            uploadDate: "2024-01-20",
            verified: true,
            expiry: null,
            size: "1.8 MB"
        },
        {
            id: 3,
            name: "Income Certificate",
            type: "certificates",
            uploadDate: "2024-02-01",
            verified: false,
            expiry: "2024-12-31",
            size: "3.2 MB"
        }
    ];
    saveLocalData();
}

function renderDocuments() {
    const grid = document.getElementById('documents-grid');
    if (!grid) return;
    
    // Clear existing documents (keep sample card)
    const sampleCard = grid.querySelector('.sample');
    grid.innerHTML = '';
    if (sampleCard) {
        grid.appendChild(sampleCard);
    }
    
    documents.forEach(doc => {
        const card = createDocumentCard(doc);
        grid.appendChild(card);
    });
}

function createDocumentCard(doc) {
    const card = document.createElement('div');
    card.className = 'document-card';
    
    card.innerHTML = `
        <div class="doc-status ${doc.verified ? 'verified' : 'pending'}">
            <i class="fas ${doc.verified ? 'fa-check-circle' : 'fa-clock'}"></i>
        </div>
        <div class="doc-icon">
            <i class="fas ${getDocumentIcon(doc.type)}"></i>
        </div>
        <div class="doc-info">
            <h4>${doc.name}</h4>
            <p>${getDocumentTypeLabel(doc.type)}</p>
            <span class="expiry">${doc.expiry ? 'Expires: ' + new Date(doc.expiry).toLocaleDateString() : 'No expiry'}</span>
            <span class="size">Size: ${doc.size}</span>
        </div>
        <div class="doc-actions">
            <button class="icon-btn" onclick="viewDocument(${doc.id})" title="View">
                <i class="fas fa-eye"></i>
            </button>
            <button class="icon-btn" onclick="shareDocument(${doc.id})" title="Share">
                <i class="fas fa-share"></i>
            </button>
            <button class="icon-btn" onclick="downloadDocument(${doc.id})" title="Download">
                <i class="fas fa-download"></i>
            </button>
            <button class="icon-btn" onclick="editDocument(${doc.id})" title="Edit">
                <i class="fas fa-edit"></i>
            </button>
        </div>
    `;
    
    return card;
}

function getDocumentIcon(type) {
    const icons = {
        identity: 'fa-id-card',
        certificates: 'fa-certificate',
        financial: 'fa-receipt',
        medical: 'fa-heartbeat',
        property: 'fa-home',
        family: 'fa-users'
    };
    return icons[type] || 'fa-file';
}

function getDocumentTypeLabel(type) {
    const labels = {
        identity: 'Identity Document',
        certificates: 'Certificate',
        financial: 'Financial Document',
        medical: 'Medical Record',
        property: 'Property Document',
        family: 'Family Document'
    };
    return labels[type] || 'Document';
}

function updateDocumentStats() {
    const totalDocs = documents.length;
    const verifiedDocs = documents.filter(d => d.verified).length;
    const expiringDocs = documents.filter(d => {
        if (!d.expiry) return false;
        const expiryDate = new Date(d.expiry);
        const threeMonthsFromNow = new Date();
        threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
        return expiryDate <= threeMonthsFromNow;
    }).length;
    
    document.getElementById('total-docs').textContent = totalDocs;
    document.getElementById('verified-docs').textContent = verifiedDocs;
    document.getElementById('expiring-docs').textContent = expiringDocs;
}

function filterDocuments(category) {
    document.querySelectorAll('.doc-category').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    if (category === 'all') {
        renderDocuments();
    } else {
        const filteredDocs = documents.filter(doc => doc.type === category);
        renderFilteredDocuments(filteredDocs);
    }
    
    speak(`Showing ${category} documents`);
}

function renderFilteredDocuments(filteredDocs) {
    const grid = document.getElementById('documents-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    filteredDocs.forEach(doc => {
        const card = createDocumentCard(doc);
        grid.appendChild(card);
    });
}

function searchDocuments() {
    const searchTerm = document.getElementById('doc-search').value.toLowerCase();
    
    if (!searchTerm) {
        renderDocuments();
        return;
    }
    
    const filteredDocs = documents.filter(doc => 
        doc.name.toLowerCase().includes(searchTerm) ||
        doc.type.toLowerCase().includes(searchTerm)
    );
    
    renderFilteredDocuments(filteredDocs);
}

function scanDocument() {
    showNotification('Opening camera for document scan...', 'info');
    speak('Opening camera to scan document');
}

function showAddDocument() {
    document.getElementById('add-doc-modal').style.display = 'flex';
    setupFileUpload();
}

function setupFileUpload() {
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-files');
    
    if (!dropArea || !fileInput || !browseBtn) return;
    
    browseBtn.onclick = () => fileInput.click();
    
    fileInput.onchange = function() {
        handleFiles(this.files);
    };
    
    // Drag and drop functionality
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });
    
    dropArea.addEventListener('drop', handleDrop, false);
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight(e) {
    document.getElementById('drop-area').classList.add('highlight');
}

function unhighlight(e) {
    document.getElementById('drop-area').classList.remove('highlight');
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

function handleFiles(files) {
    const selectedFiles = document.getElementById('selected-files');
    selectedFiles.innerHTML = '';
    
    Array.from(files).forEach(file => {
        const fileItem = document.createElement('div');
        fileItem.style.padding = '8px';
        fileItem.style.borderBottom = '1px solid #eee';
        fileItem.innerHTML = `
            <span>${file.name}</span>
            <span style="float: right; color: #666;">${(file.size / 1024 / 1024).toFixed(2)} MB</span>
        `;
        selectedFiles.appendChild(fileItem);
    });
    
    showNotification(`${files.length} file(s) selected`, 'success');
}

function closeAddDocument() {
    document.getElementById('add-doc-modal').style.display = 'none';
}

function confirmAddDocuments() {
    const fileInput = document.getElementById('file-input');
    const files = fileInput.files;
    
    if (files.length === 0) {
        showNotification('Please select at least one file', 'error');
        return;
    }
    
    Array.from(files).forEach(file => {
        const newDoc = {
            id: Date.now() + Math.random(),
            name: file.name,
            type: guessDocumentType(file.name),
            uploadDate: new Date().toISOString().split('T')[0],
            verified: false,
            expiry: null,
            size: (file.size / 1024 / 1024).toFixed(2) + ' MB'
        };
        documents.push(newDoc);
    });
    
    saveLocalData();
    renderDocuments();
    updateDocumentStats();
    updateAllCounts();
    closeAddDocument();
    
    showNotification('Documents uploaded successfully', 'success');
    speak('Documents uploaded successfully');
}

function guessDocumentType(filename) {
    const name = filename.toLowerCase();
    if (name.includes('aadhaar') || name.includes('pan') || name.includes('passport')) {
        return 'identity';
    } else if (name.includes('certificate') || name.includes('degree')) {
        return 'certificates';
    } else if (name.includes('medical') || name.includes('health')) {
        return 'medical';
    } else if (name.includes('property') || name.includes('land')) {
        return 'property';
    } else if (name.includes('income') || name.includes('salary') || name.includes('bank')) {
        return 'financial';
    }
    return 'certificates';
}

function addTemplateDocument(type) {
    const templates = {
        pan: { name: "PAN Card", type: "identity" },
        passport: { name: "Passport", type: "identity" },
        license: { name: "Driving License", type: "identity" },
        insurance: { name: "Insurance Policy", type: "financial" }
    };
    
    const template = templates[type];
    if (template) {
        showNotification(`Opening ${template.name} upload...`, 'info');
        speak(`Select your ${template.name} to upload`);
    }
}

// Utility Functions
function saveLocalData() {
    localStorage.setItem('complaints', JSON.stringify(complaints));
    localStorage.setItem('schemes', JSON.stringify(schemes));
    localStorage.setItem('documents', JSON.stringify(documents));
    localStorage.setItem('children', JSON.stringify(children));
    localStorage.setItem('favoriteSchemes', JSON.stringify(favoriteSchemes));
}

function loadLocalData() {
    try {
        const savedComplaints = localStorage.getItem('complaints');
        if (savedComplaints) complaints = JSON.parse(savedComplaints);
        
        const savedSchemes = localStorage.getItem('schemes');
        if (savedSchemes) schemes = JSON.parse(savedSchemes);
        
        const savedDocuments = localStorage.getItem('documents');
        if (savedDocuments) documents = JSON.parse(savedDocuments);
        
        const savedChildren = localStorage.getItem('children');
        if (savedChildren) children = JSON.parse(savedChildren);
        
        const savedFavorites = localStorage.getItem('favoriteSchemes');
        if (savedFavorites) favoriteSchemes = JSON.parse(savedFavorites);
    } catch (e) {
        console.error('Error loading data:', e);
    }
}

function loadSampleData() {
    if (schemes.length === 0) loadSampleSchemes();
    if (documents.length === 0) loadSampleDocuments();
    if (children.length === 0) loadChildren();
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
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

// Add notification styles if not exists
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
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(styles);
}

// Event Listeners
document.addEventListener('click', function(e) {
    if (e.target.id === 'voice-toggle' || e.target.id === 'voice-assistant-btn') {
        toggleVoiceAssistant();
    }
    
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }
    
    if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        if (recognition && isVoiceEnabled) {
            recognition.start();
        }
    }
});

// Enhanced Official Dashboard Functions
let officialComplaints = [];
let schemeApplications = [];
let officialStats = {
    totalComplaints: 127,
    pendingComplaints: 23,
    resolvedComplaints: 104,
    schemeApplications: 89,
    pendingApplications: 15,
    approvedApplications: 74,
    citizensServed: 342,
    servedToday: 12,
    servedWeek: 78,
    efficiencyScore: 92,
    avgResolution: 2.3,
    targetMet: 95
};

function showOfficialDashboard() {
    showScreen('official-dashboard');
    updateOfficialDashboard();
    speak('Welcome to official dashboard');
}

function updateOfficialDashboard() {
    if (!currentUser || currentUser.type !== 'official') return;
    
    document.getElementById('official-name').textContent = currentUser.name || 'Official Name';
    document.getElementById('official-dept').textContent = currentUser.department || 'Department';
    document.getElementById('official-role').textContent = currentUser.role || 'Senior Officer';
    
    // Update performance metrics
    updatePerformanceMetrics();
    loadOfficialData();
}

function updatePerformanceMetrics() {
    document.getElementById('total-complaints').textContent = officialStats.totalComplaints;
    document.getElementById('pending-complaints').textContent = officialStats.pendingComplaints + ' Pending';
    document.getElementById('resolved-complaints').textContent = officialStats.resolvedComplaints + ' Resolved';
    document.getElementById('scheme-applications').textContent = officialStats.schemeApplications;
    document.getElementById('pending-applications').textContent = officialStats.pendingApplications + ' Pending';
    document.getElementById('approved-applications').textContent = officialStats.approvedApplications + ' Approved';
    document.getElementById('citizens-served').textContent = officialStats.citizensServed;
    document.getElementById('served-today').textContent = officialStats.servedToday + ' Today';
    document.getElementById('served-week').textContent = officialStats.servedWeek + ' This Week';
    document.getElementById('efficiency-score').textContent = officialStats.efficiencyScore + '%';
    document.getElementById('avg-resolution').textContent = officialStats.avgResolution + ' days avg';
    document.getElementById('target-met').textContent = officialStats.targetMet + '% target met';
}

function loadOfficialData() {
    if (officialComplaints.length === 0) {
        loadSampleOfficialComplaints();
    }
    if (schemeApplications.length === 0) {
        loadSampleSchemeApplications();
    }
}

function loadSampleOfficialComplaints() {
    officialComplaints = [
        {
            id: 'C12847',
            title: 'Teacher Absence Issue',
            description: 'School teacher has been absent for 3 consecutive days without notice',
            department: 'education',
            priority: 'urgent',
            status: 'pending',
            citizenName: 'Ram Kumar',
            location: 'Government Primary School, Village ABC',
            submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            assignedTo: null
        },
        {
            id: 'C12848',
            title: 'Hospital Medicine Shortage',
            description: 'Essential medicines not available at district hospital',
            department: 'health',
            priority: 'high',
            status: 'in-progress',
            citizenName: 'Sita Sharma',
            location: 'District Hospital',
            submittedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
            assignedTo: 'Dr. Patel'
        }
    ];
}

function loadSampleSchemeApplications() {
    schemeApplications = [
        {
            id: 'SA123',
            schemeName: 'PM-KISAN',
            applicantName: 'Sunita Devi',
            aadhaar: '****-****-9876',
            status: 'pending',
            submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            documents: {
                aadhaar: 'verified',
                landRecords: 'verified',
                bankDetails: 'pending'
            }
        },
        {
            id: 'SA124',
            schemeName: 'Ayushman Bharat',
            applicantName: 'Mohan Singh',
            aadhaar: '****-****-5432',
            status: 'under-verification',
            submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            documents: {
                aadhaar: 'verified',
                bplCard: 'pending',
                familyPhoto: 'verified'
            }
        }
    ];
}

// Complaint Management Functions
function showComplaintManagement() {
    showScreen('complaint-management');
    renderComplaintsList();
    speak('Opening complaint management system');
}

function renderComplaintsList() {
    const complaintsList = document.querySelector('.complaints-list');
    if (!complaintsList) return;
    
    complaintsList.innerHTML = '';
    
    officialComplaints.forEach(complaint => {
        const complaintItem = createComplaintItem(complaint);
        complaintsList.appendChild(complaintItem);
    });
}

function createComplaintItem(complaint) {
    const item = document.createElement('div');
    item.className = 'complaint-item';
    
    const priorityClass = complaint.priority === 'urgent' ? 'urgent' : 
                         complaint.priority === 'high' ? 'high' : 'medium';
    
    item.innerHTML = `
        <div class="complaint-checkbox">
            <input type="checkbox" id="complaint-${complaint.id}">
        </div>
        <div class="complaint-priority ${priorityClass}">
            <i class="fas fa-exclamation-triangle"></i>
        </div>
        <div class="complaint-details">
            <div class="complaint-header">
                <h4>#${complaint.id} - ${complaint.title}</h4>
                <span class="complaint-time">${getTimeAgo(complaint.submittedAt)}</span>
            </div>
            <p>${complaint.description}</p>
            <div class="complaint-meta">
                <span class="department">${complaint.department}</span>
                <span class="location">${complaint.location}</span>
                <span class="citizen">Reported by: ${complaint.citizenName}</span>
            </div>
        </div>
        <div class="complaint-status">
            <select onchange="updateComplaintStatus('${complaint.id}', this.value)">
                <option value="pending" ${complaint.status === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="in-progress" ${complaint.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                <option value="resolved" ${complaint.status === 'resolved' ? 'selected' : ''}>Resolved</option>
                <option value="closed" ${complaint.status === 'closed' ? 'selected' : ''}>Closed</option>
            </select>
        </div>
        <div class="complaint-actions">
            <button class="action-btn" onclick="viewComplaintDetails('${complaint.id}')" title="View Details">
                <i class="fas fa-eye"></i>
            </button>
            <button class="action-btn" onclick="assignComplaint('${complaint.id}')" title="Assign">
                <i class="fas fa-user-plus"></i>
            </button>
            <button class="action-btn" onclick="addComplaintNote('${complaint.id}')" title="Add Note">
                <i class="fas fa-sticky-note"></i>
            </button>
            <button class="action-btn" onclick="escalateComplaint('${complaint.id}')" title="Escalate">
                <i class="fas fa-arrow-up"></i>
            </button>
        </div>
    `;
    
    return item;
}

function getTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return `${diffMins} minutes ago`;
    } else if (diffHours < 24) {
        return `${diffHours} hours ago`;
    } else {
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} days ago`;
    }
}

function updateComplaintStatus(complaintId, newStatus) {
    const complaint = officialComplaints.find(c => c.id === complaintId);
    if (complaint) {
        complaint.status = newStatus;
        showNotification(`Complaint ${complaintId} status updated to ${newStatus}`, 'success');
        speak(`Complaint status updated to ${newStatus}`);
        updatePerformanceMetrics();
    }
}

function viewComplaintDetails(complaintId) {
    const complaint = officialComplaints.find(c => c.id === complaintId);
    if (complaint) {
        showNotification(`Viewing details for complaint ${complaintId}`, 'info');
        speak(`Opening complaint details for ${complaintId}`);
    }
}

function assignComplaint(complaintId) {
    const assignee = prompt('Assign complaint to:');
    if (assignee) {
        const complaint = officialComplaints.find(c => c.id === complaintId);
        if (complaint) {
            complaint.assignedTo = assignee;
            showNotification(`Complaint ${complaintId} assigned to ${assignee}`, 'success');
            speak(`Complaint assigned to ${assignee}`);
        }
    }
}

function addComplaintNote(complaintId) {
    const note = prompt('Add note to complaint:');
    if (note) {
        showNotification('Note added to complaint', 'success');
        speak('Note added successfully');
    }
}

function escalateComplaint(complaintId) {
    const complaint = officialComplaints.find(c => c.id === complaintId);
    if (complaint) {
        complaint.priority = 'urgent';
        showNotification(`Complaint ${complaintId} escalated`, 'warning');
        speak('Complaint has been escalated');
        renderComplaintsList();
    }
}

function applyComplaintFilters() {
    const statusFilter = document.getElementById('status-filter').value;
    const priorityFilter = document.getElementById('priority-filter').value;
    const deptFilter = document.getElementById('dept-filter').value;
    const dateFilter = document.getElementById('date-filter').value;
    
    let filteredComplaints = officialComplaints;
    
    if (statusFilter) {
        filteredComplaints = filteredComplaints.filter(c => c.status === statusFilter);
    }
    if (priorityFilter) {
        filteredComplaints = filteredComplaints.filter(c => c.priority === priorityFilter);
    }
    if (deptFilter) {
        filteredComplaints = filteredComplaints.filter(c => c.department === deptFilter);
    }
    
    renderFilteredComplaints(filteredComplaints);
    speak(`Applied filters, showing ${filteredComplaints.length} complaints`);
}

function renderFilteredComplaints(filteredComplaints) {
    const complaintsList = document.querySelector('.complaints-list');
    if (!complaintsList) return;
    
    complaintsList.innerHTML = '';
    
    filteredComplaints.forEach(complaint => {
        const complaintItem = createComplaintItem(complaint);
        complaintsList.appendChild(complaintItem);
    });
}

function bulkAssign() {
    const checkedComplaints = document.querySelectorAll('.complaint-checkbox input:checked');
    if (checkedComplaints.length === 0) {
        showNotification('Please select complaints to assign', 'warning');
        return;
    }
    
    const assignee = prompt('Assign selected complaints to:');
    if (assignee) {
        showNotification(`${checkedComplaints.length} complaints assigned to ${assignee}`, 'success');
        speak(`Bulk assigned ${checkedComplaints.length} complaints`);
    }
}

function bulkStatusUpdate() {
    const checkedComplaints = document.querySelectorAll('.complaint-checkbox input:checked');
    if (checkedComplaints.length === 0) {
        showNotification('Please select complaints to update', 'warning');
        return;
    }
    
    const newStatus = prompt('Enter new status (pending/in-progress/resolved/closed):');
    if (newStatus) {
        showNotification(`${checkedComplaints.length} complaints status updated`, 'success');
        speak(`Bulk status update completed`);
    }
}

function exportComplaints() {
    showNotification('Exporting complaints data...', 'info');
    speak('Generating complaints export file');
    
    setTimeout(() => {
        showNotification('Complaints exported successfully', 'success');
    }, 2000);
}

// Scheme Applications Management
function showSchemeApplications() {
    showScreen('scheme-applications');
    renderApplicationsList();
    speak('Opening scheme applications management');
}

function renderApplicationsList() {
    const applicationsList = document.querySelector('.applications-list');
    if (!applicationsList) return;
    
    applicationsList.innerHTML = '';
    
    schemeApplications.forEach(application => {
        const applicationItem = createApplicationItem(application);
        applicationsList.appendChild(applicationItem);
    });
}

function createApplicationItem(application) {
    const item = document.createElement('div');
    item.className = 'application-item';
    
    const documentsHtml = Object.entries(application.documents).map(([doc, status]) => {
        const statusIcon = status === 'verified' ? '✓' : status === 'pending' ? '⏳' : '❌';
        const statusClass = status === 'verified' ? 'verified' : 'pending';
        return `<span class="doc-status ${statusClass}">${doc} ${statusIcon}</span>`;
    }).join('');
    
    item.innerHTML = `
        <div class="application-info">
            <div class="applicant-details">
                <h4>${application.schemeName} Application</h4>
                <p><strong>Applicant:</strong> ${application.applicantName}</p>
                <p><strong>Aadhaar:</strong> ${application.aadhaar}</p>
                <p><strong>Applied:</strong> ${getTimeAgo(application.submittedAt)}</p>
            </div>
            <div class="application-documents">
                ${documentsHtml}
            </div>
        </div>
        <div class="application-actions">
            <button class="approve-btn" onclick="approveApplication('${application.id}')">
                <i class="fas fa-check"></i> Approve
            </button>
            <button class="reject-btn" onclick="rejectApplication('${application.id}')">
                <i class="fas fa-times"></i> Reject
            </button>
            <button class="review-btn" onclick="reviewApplication('${application.id}')">
                <i class="fas fa-eye"></i> Review
            </button>
        </div>
    `;
    
    return item;
}

function approveApplication(applicationId) {
    const application = schemeApplications.find(a => a.id === applicationId);
    if (application) {
        application.status = 'approved';
        showNotification(`Application ${applicationId} approved`, 'success');
        speak(`Application for ${application.applicantName} approved`);
        updatePerformanceMetrics();
    }
}

function rejectApplication(applicationId) {
    const reason = prompt('Reason for rejection:');
    if (reason) {
        const application = schemeApplications.find(a => a.id === applicationId);
        if (application) {
            application.status = 'rejected';
            application.rejectionReason = reason;
            showNotification(`Application ${applicationId} rejected`, 'warning');
            speak('Application rejected with reason provided');
        }
    }
}

function reviewApplication(applicationId) {
    const application = schemeApplications.find(a => a.id === applicationId);
    if (application) {
        showNotification(`Reviewing application for ${application.applicantName}`, 'info');
        speak(`Opening application review for ${application.applicantName}`);
    }
}

// Reports and Analytics
function showReports() {
    showScreen('reports-analytics');
    speak('Opening reports and analytics dashboard');
}

function generateReport(reportType) {
    showNotification(`Generating ${reportType} report...`, 'info');
    speak(`Generating ${reportType.replace('-', ' ')} report`);
    
    setTimeout(() => {
        showNotification('Report generated successfully', 'success');
        speak('Report is ready for download');
    }, 3000);
}

function generateCustomReport() {
    showNotification('Opening custom report builder...', 'info');
    speak('Opening custom report configuration');
}

// Document Verification
function showDocumentVerification() {
    showScreen('document-verification');
    speak('Opening document verification queue');
}

function verifyDocument(docId, action) {
    if (action === 'approved') {
        showNotification(`Document ${docId} verified successfully`, 'success');
        speak('Document verified and approved');
    } else if (action === 'rejected') {
        const reason = prompt('Reason for rejection:');
        if (reason) {
            showNotification(`Document ${docId} rejected`, 'warning');
            speak('Document rejected with reason');
        }
    }
}

function flagForReview(docId) {
    showNotification(`Document ${docId} flagged for senior review`, 'warning');
    speak('Document flagged for additional review');
}

function batchVerification() {
    showNotification('Starting batch verification process...', 'info');
    speak('Initiating batch document verification');
}

// Citizen Management
function showCitizenRequests() {
    showScreen('citizen-management');
    speak('Opening citizen management dashboard');
}

function searchCitizens() {
    const searchTerm = document.getElementById('citizen-search').value;
    if (searchTerm) {
        showNotification(`Searching for citizens: ${searchTerm}`, 'info');
        speak(`Searching for citizen ${searchTerm}`);
    }
}

function viewCitizenProfile(citizenId) {
    showNotification(`Viewing profile for citizen ${citizenId}`, 'info');
    speak('Opening citizen profile');
}

function contactCitizen(citizenId) {
    showNotification(`Initiating contact with citizen ${citizenId}`, 'info');
    speak('Connecting with citizen');
}

function assistCitizen(citizenId) {
    showNotification(`Starting assistance for citizen ${citizenId}`, 'info');
    speak('Starting citizen assistance session');
}

// Department Operations
function viewDeptComplaints(department) {
    showComplaintManagement();
    
    // Filter by department
    document.getElementById('dept-filter').value = department;
    applyComplaintFilters();
    
    speak(`Viewing ${department} department complaints`);
}

function quickAssign(department, event) {
    event.stopPropagation();
    const assignee = prompt(`Assign ${department} complaints to:`);
    if (assignee) {
        showNotification(`${department} complaints assigned to ${assignee}`, 'success');
        speak(`Assigned ${department} complaints to ${assignee}`);
    }
}

function bulkAction(department, event) {
    event.stopPropagation();
    showNotification(`Opening bulk actions for ${department} complaints`, 'info');
    speak(`Opening bulk operations for ${department}`);
}

function filterComplaintCategories() {
    const filter = document.getElementById('complaint-filter').value;
    showNotification(`Filtering complaints by ${filter}`, 'info');
    speak(`Applying ${filter} filter to complaints`);
}

function showComplaintAnalytics() {
    showNotification('Loading complaint analytics dashboard...', 'info');
    speak('Opening complaint analytics and insights');
}

// Notifications and Messages
function showNotifications() {
    showNotification('You have 5 new notifications', 'info');
    speak('You have 5 new notifications');
}

function showMessages() {
    showNotification('You have 3 unread messages', 'info');
    speak('You have 3 unread messages');
}

function showAnnouncements() {
    showNotification('Opening announcement system...', 'info');
    speak('Opening public announcement system');
}

function showAllActivities() {
    showNotification('Loading all recent activities...', 'info');
    speak('Loading complete activity history');
}

// Enhanced Official Authentication
async function officialLogin() {
    const empId = document.getElementById('emp-id').value;
    const password = document.getElementById('official-password').value;
    
    if (!empId || !password) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    // Simulate official login
    currentUser = {
        id: empId,
        type: 'official',
        name: 'Government Official',
        empId: empId,
        department: 'Administration',
        role: 'Senior Officer'
    };
    
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    showNotification('Official login successful!', 'success');
    showOfficialDashboard();
}

async function officialRegister() {
    const empId = document.getElementById('new-emp-id').value;
    const name = document.getElementById('official-name').value;
    const department = document.getElementById('department').value;
    const category = document.getElementById('official-category').value;
    const password = document.getElementById('new-official-password').value;
    
    if (!empId || !name || !department || !category || !password) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    currentUser = {
        id: empId,
        type: 'official',
        name: name,
        empId: empId,
        department: department,
        category: category,
        role: category === '1' ? 'Complaint Handler' : 'Verification Officer'
    };
    
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    showNotification('Official registration successful!', 'success');
    showOfficialDashboard();
}

console.log('Enhanced Government Services App with Official Dashboard initialized successfully!');