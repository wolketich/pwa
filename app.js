let parsedData = null;
let isDarkMode = false;
let swRegistration = null;
let deferredPrompt = null;

// DOM elements
const dragDropArea = document.getElementById('dragDropArea');
const fileInput = document.getElementById('fileInput');
const loading = document.getElementById('loading');
const uploadSection = document.getElementById('uploadSection');
const resultsSection = document.getElementById('resultsSection');
const chooseFileBtn = document.getElementById('chooseFileBtn');
const loadSampleBtn = document.getElementById('loadSampleBtn');
const exportBtn = document.getElementById('exportBtn');
const rawJsonBtn = document.getElementById('rawJsonBtn');
const searchBox = document.getElementById('searchBox');
const darkModeToggle = document.getElementById('darkModeToggle');
const expandAllBtn = document.getElementById('expandAllBtn');
const collapseAllBtn = document.getElementById('collapseAllBtn');
const copyAllBtn = document.getElementById('copyAllBtn');
const copyChildBtn = document.getElementById('copyChildBtn');
const copyContactsBtn = document.getElementById('copyContactsBtn');
const copyHealthBtn = document.getElementById('copyHealthBtn');

// Event listeners
chooseFileBtn.addEventListener('click', () => {
    fileInput.click();
});

loadSampleBtn.addEventListener('click', loadSampleData);
exportBtn.addEventListener('click', exportJSON);
rawJsonBtn.addEventListener('click', toggleRawData);
darkModeToggle.addEventListener('click', toggleDarkMode);
expandAllBtn.addEventListener('click', expandAllCards);
collapseAllBtn.addEventListener('click', collapseAllCards);
copyAllBtn.addEventListener('click', () => copyBatchData('all'));
copyChildBtn.addEventListener('click', () => copyBatchData('child'));
copyContactsBtn.addEventListener('click', () => copyBatchData('contacts'));
copyHealthBtn.addEventListener('click', () => copyBatchData('health'));

// Search functionality
searchBox.addEventListener('input', (e) => {
    filterFields(e.target.value);
});

// Drag and drop functionality
dragDropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dragDropArea.classList.add('drag-over');
});

dragDropArea.addEventListener('dragleave', () => {
    dragDropArea.classList.remove('drag-over');
});

dragDropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dragDropArea.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

dragDropArea.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

// PWA Installation and Service Worker
function initializePWA() {
    // Register service worker
    if ('serviceWorker' in navigator) {
        // Always register from the pwa directory
        const swPath = './sw.js';
        const scope = './';
            
        navigator.serviceWorker.register(swPath, { scope })
            .then((registration) => {
                console.log('Service Worker registered successfully:', registration);
                console.log('Registration scope:', registration.scope);
                console.log('Service Worker script URL:', registration.scriptURL);
                swRegistration = registration;
                
                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            showUpdateNotification();
                        }
                    });
                });
            })
            .catch((error) => {
                console.error('Service Worker registration failed:', error);
            });
    }

    // Handle beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
        console.log('Install prompt triggered');
        e.preventDefault();
        deferredPrompt = e;
        showInstallPrompt();
    });

    // Handle app installed event
    window.addEventListener('appinstalled', (evt) => {
        console.log('App was installed');
        hideInstallPrompt();
        showSuccess('App installed successfully! 🎉');
    });

    // Handle URL parameters for shortcuts
    handleURLParameters();
}

function showInstallPrompt() {
    const installBanner = document.createElement('div');
    installBanner.id = 'installBanner';
    installBanner.innerHTML = `
        <div class="install-banner">
            <div class="install-content">
                <span class="install-icon">📱</span>
                <div class="install-text">
                    <h3>Install Famly Parser</h3>
                    <p>Get quick access and work offline</p>
                </div>
            </div>
            <div class="install-actions">
                <button class="install-btn" id="installBtn">Install</button>
                <button class="dismiss-btn" id="dismissBtn">Not now</button>
            </div>
        </div>
    `;
    
    // Add styles
    const installStyles = document.createElement('style');
    installStyles.textContent = `
        .install-banner {
            position: fixed;
            bottom: 20px;
            left: 20px;
            right: 20px;
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            color: white;
            padding: 20px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            z-index: 10000;
            display: flex;
            justify-content: space-between;
            align-items: center;
            animation: slideUp 0.3s ease;
        }
        
        .install-content {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .install-icon {
            font-size: 2rem;
        }
        
        .install-text h3 {
            margin: 0 0 5px 0;
            font-size: 1.1rem;
        }
        
        .install-text p {
            margin: 0;
            opacity: 0.9;
            font-size: 0.9rem;
        }
        
        .install-actions {
            display: flex;
            gap: 10px;
        }
        
        .install-btn, .dismiss-btn {
            padding: 8px 16px;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .install-btn {
            background: white;
            color: #4f46e5;
        }
        
        .install-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 5px 15px rgba(255,255,255,0.3);
        }
        
        .dismiss-btn {
            background: rgba(255,255,255,0.2);
            color: white;
        }
        
        .dismiss-btn:hover {
            background: rgba(255,255,255,0.3);
        }
        
        @keyframes slideUp {
            from {
                transform: translateY(100%);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
        
        @media (max-width: 768px) {
            .install-banner {
                flex-direction: column;
                gap: 15px;
                text-align: center;
            }
        }
    `;
    document.head.appendChild(installStyles);
    
    document.body.appendChild(installBanner);
    
    // Add event listeners
    document.getElementById('installBtn').addEventListener('click', installApp);
    document.getElementById('dismissBtn').addEventListener('click', hideInstallPrompt);
}

function hideInstallPrompt() {
    const banner = document.getElementById('installBanner');
    if (banner) {
        banner.remove();
    }
}

function installApp() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
            } else {
                console.log('User dismissed the install prompt');
            }
            deferredPrompt = null;
        });
    }
    hideInstallPrompt();
}

function showUpdateNotification() {
    const updateBanner = document.createElement('div');
    updateBanner.id = 'updateBanner';
    updateBanner.innerHTML = `
        <div class="update-banner">
            <div class="update-content">
                <span class="update-icon">🔄</span>
                <div class="update-text">
                    <h3>Update Available</h3>
                    <p>New version of Famly Parser is ready</p>
                </div>
            </div>
            <div class="update-actions">
                <button class="update-btn" id="updateBtn">Update</button>
                <button class="dismiss-btn" id="dismissUpdateBtn">Later</button>
            </div>
        </div>
    `;
    
    // Add styles
    const updateStyles = document.createElement('style');
    updateStyles.textContent = `
        .update-banner {
            position: fixed;
            top: 20px;
            left: 20px;
            right: 20px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 20px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            z-index: 10000;
            display: flex;
            justify-content: space-between;
            align-items: center;
            animation: slideDown 0.3s ease;
        }
        
        .update-content {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .update-icon {
            font-size: 2rem;
        }
        
        .update-text h3 {
            margin: 0 0 5px 0;
            font-size: 1.1rem;
        }
        
        .update-text p {
            margin: 0;
            opacity: 0.9;
            font-size: 0.9rem;
        }
        
        .update-actions {
            display: flex;
            gap: 10px;
        }
        
        .update-btn, .dismiss-btn {
            padding: 8px 16px;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .update-btn {
            background: white;
            color: #10b981;
        }
        
        .update-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 5px 15px rgba(255,255,255,0.3);
        }
        
        .dismiss-btn {
            background: rgba(255,255,255,0.2);
            color: white;
        }
        
        .dismiss-btn:hover {
            background: rgba(255,255,255,0.3);
        }
        
        @keyframes slideDown {
            from {
                transform: translateY(-100%);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
        
        @media (max-width: 768px) {
            .update-banner {
                flex-direction: column;
                gap: 15px;
                text-align: center;
            }
        }
    `;
    document.head.appendChild(updateStyles);
    
    document.body.appendChild(updateBanner);
    
    // Add event listeners
    document.getElementById('updateBtn').addEventListener('click', updateApp);
    document.getElementById('dismissUpdateBtn').addEventListener('click', hideUpdateNotification);
}

function hideUpdateNotification() {
    const banner = document.getElementById('updateBanner');
    if (banner) {
        banner.remove();
    }
}

function updateApp() {
    if (swRegistration && swRegistration.waiting) {
        swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
    }
    hideUpdateNotification();
}

function handleURLParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    
    if (action === 'sample') {
        // Auto-load sample data
        setTimeout(() => {
            loadSampleData();
        }, 1000);
    } else if (action === 'export' && parsedData) {
        // Auto-export data
        setTimeout(() => {
            exportJSON();
        }, 1000);
    }
}

async function handleFile(file) {
    if (!file.name.toLowerCase().endsWith('.eml')) {
        showError('Please select a valid EML file.');
        return;
    }

    showLoading(true);
    
    try {
        const content = await readFileAsText(file);
        const parser = new EMLParser();
        parsedData = await parser.parseEMLToJSON(content);
        
        showResults(parsedData);
        showSuccess('EML file parsed successfully!');
    } catch (error) {
        console.error('Parsing error:', error);
        showError(`Failed to parse EML file: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

function showLoading(show) {
    loading.style.display = show ? 'flex' : 'none';
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    resultsSection.insertBefore(successDiv, resultsSection.firstChild);
    
    setTimeout(() => {
        successDiv.remove();
    }, 5000);
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    resultsSection.insertBefore(errorDiv, resultsSection.firstChild);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

function showResults(data) {
    uploadSection.style.display = 'none';
    resultsSection.style.display = 'block';
    
    const content = document.getElementById('resultsContent');
    content.innerHTML = generateResultsHTML(data);
    
    // Add event listeners to collapsible cards
    setupCollapsibleCards();
    
    // Add copy button functionality
    setupCopyButtons();
}

function generateResultsHTML(data) {
    return `
        <div class="data-grid">
            ${generateChildCard(data.child)}
            ${generateParentsCard(data.parents)}
            ${generateGuardianCard(data.guardian)}
            ${generateEmergencyContactCard(data.emergency_contact)}
            ${generateDoctorCard(data.doctor)}
            ${generateImmunisationsCard(data.immunisations)}
            ${generateSpecialNeedsCard(data.special_needs)}
            ${generateGeneralInfoCard(data)}
        </div>
    `;
}

function generateChildCard(child) {
    if (!child) return '';
    
    return `
        <div class="data-card" data-section="child">
            <div class="card-header">
                <div class="card-title">
                    <span class="card-icon">👶</span>
                    Child Information
                </div>
                <span class="collapse-icon">▼</span>
            </div>
            <div class="card-content">
                ${generateField('Name', child.name)}
                ${generateField('Gender', child.gender)}
                ${generateField('Date of Birth', child.dob)}
                ${generateField('Address', child.address)}
                ${generateField('First Language', child.first_language)}
            </div>
        </div>
    `;
}

function generateParentsCard(parents) {
    if (!parents || parents.length === 0) return '';
    
    let html = `
        <div class="data-card" data-section="parents">
            <div class="card-header">
                <div class="card-title">
                    <span class="card-icon">👨‍👩‍👧‍👦</span>
                    Parents Information
                </div>
                <span class="collapse-icon">▼</span>
            </div>
            <div class="card-content">
    `;
    
    parents.forEach((parent, index) => {
        html += `
            <div class="array-item">
                <h4>Parent ${index + 1}</h4>
                ${generateField('Name', parent.name)}
                ${generateField('Mobile', parent.mobile)}
                ${generateField('Landline', parent.landline)}
                ${generateField('Email', parent.email)}
                ${generateField('Address', parent.address)}
                ${generateField('Same as Above', parent.address_same_as_above)}
            </div>
        `;
    });
    
    html += `
            </div>
        </div>
    `;
    
    return html;
}

function generateGuardianCard(guardian) {
    if (!guardian || !guardian.provided || guardian.provided !== 'Yes') return '';
    
    return `
        <div class="data-card" data-section="guardian">
            <div class="card-header">
                <div class="card-title">
                    <span class="card-icon">👤</span>
                    Guardian Information
                </div>
                <span class="collapse-icon">▼</span>
            </div>
            <div class="card-content">
                ${generateField('Email', guardian.email)}
                ${generateField('Mobile', guardian.mobile)}
                ${generateField('Address', guardian.address)}
                ${generateField('Note', guardian.note)}
            </div>
        </div>
    `;
}

function generateEmergencyContactCard(emergency) {
    if (!emergency) return '';
    
    return `
        <div class="data-card" data-section="emergency">
            <div class="card-header">
                <div class="card-title">
                    <span class="card-icon">🚨</span>
                    Emergency Contact
                </div>
                <span class="collapse-icon">▼</span>
            </div>
            <div class="card-content">
                ${generateField('Name', emergency.name)}
                ${generateField('Mobile', emergency.mobile)}
                ${generateField('Landline', emergency.landline)}
                ${generateField('Email', emergency.email)}
                ${generateField('Address', emergency.address)}
            </div>
        </div>
    `;
}

function generateDoctorCard(doctor) {
    if (!doctor) return '';
    
    return `
        <div class="data-card" data-section="doctor">
            <div class="card-header">
                <div class="card-title">
                    <span class="card-icon">🏥</span>
                    Doctor Information
                </div>
                <span class="collapse-icon">▼</span>
            </div>
            <div class="card-content">
                ${generateField('Name', doctor.name)}
                ${generateField('Landline', doctor.landline)}
                ${generateField('Mobile', doctor.mobile)}
                ${generateField('Email', doctor.email)}
                ${generateField('Address', doctor.address)}
            </div>
        </div>
    `;
}

function generateImmunisationsCard(immunisations) {
    if (!immunisations || immunisations.length === 0) return '';
    
    let html = `
        <div class="data-card" data-section="immunisations">
            <div class="card-header">
                <div class="card-title">
                    <span class="card-icon">💉</span>
                    Immunisations
                </div>
                <span class="collapse-icon">▼</span>
            </div>
            <div class="card-content">
    `;
    
    immunisations.forEach((immunisation, index) => {
        html += `
            <div class="array-item">
                ${generateField('Vaccine', immunisation.label)}
                ${generateField('Received', immunisation.received)}
                ${generateField('Date', immunisation.date)}
            </div>
        `;
    });
    
    html += `
            </div>
        </div>
    `;
    
    return html;
}

function generateSpecialNeedsCard(specialNeeds) {
    if (!specialNeeds || specialNeeds.length === 0) return '';
    
    let html = `
        <div class="data-card" data-section="special-needs">
            <div class="card-header">
                <div class="card-title">
                    <span class="card-icon">♿</span>
                    Special Needs
                </div>
                <span class="collapse-icon">▼</span>
            </div>
            <div class="card-content">
    `;
    
    specialNeeds.forEach((need, index) => {
        html += `
            <div class="array-item">
                ${generateField('Type', need.type)}
                ${generateField('Provided', need.provided)}
                ${generateField('Details', need.details)}
            </div>
        `;
    });
    
    html += `
            </div>
        </div>
    `;
    
    return html;
}

function generateGeneralInfoCard(data) {
    return `
        <div class="data-card" data-section="general">
            <div class="card-header">
                <div class="card-title">
                    <span class="card-icon">📋</span>
                    General Information
                </div>
                <span class="collapse-icon">▼</span>
            </div>
            <div class="card-content">
                ${generateField('Creche Name', data.creche_name)}
                ${generateField('Start Date', data.start_date)}
                ${generateField('Placement Type', data.placement_type)}
                ${generateField('Term Hours', data.term_hours)}
                ${generateField('Holiday Hours', data.holiday_hours)}
                ${generateField('Notes', data.notes)}
            </div>
        </div>
    `;
}

function generateField(label, value) {
    const displayValue = value || '';
    const isEmpty = !displayValue || displayValue.trim() === '';
    const fieldId = `field-${label.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return `
        <div class="field-group" data-field="${label.toLowerCase().replace(/\s+/g, '-')}">
            <div class="field-header">
                <div class="field-label">${label}</div>
                <button class="copy-btn" data-field-id="${fieldId}" data-value="${displayValue.replace(/"/g, '&quot;')}">
                    📋 Copy
                </button>
            </div>
            <div class="field-value ${isEmpty ? 'empty' : ''}" id="${fieldId}">
                ${isEmpty ? '(Not provided)' : displayValue}
            </div>
        </div>
    `;
}

function setupCollapsibleCards() {
    const cardHeaders = document.querySelectorAll('.card-header');
    
    cardHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const card = header.closest('.data-card');
            card.classList.toggle('collapsed');
        });
    });
}

function setupCopyButtons() {
    const copyButtons = document.querySelectorAll('.copy-btn');
    
    copyButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const value = button.dataset.value;
            copyToClipboard(value, button);
        });
    });
}

function copyToClipboard(text, button) {
    navigator.clipboard.writeText(text).then(() => {
        // Visual feedback
        const originalText = button.textContent;
        button.textContent = '✅ Copied!';
        button.classList.add('copied');
        
        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('copied');
        }, 2000);
        
        // Show success notification
        showCopySuccess();
    }).catch(err => {
        console.error('Failed to copy: ', err);
        showError('Failed to copy to clipboard');
    });
}

function showCopySuccess() {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-weight: 600;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = '✅ Copied to clipboard!';
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 2000);
}

function filterFields(searchTerm) {
    const fieldGroups = document.querySelectorAll('.field-group');
    const cards = document.querySelectorAll('.data-card');
    
    if (!searchTerm.trim()) {
        // Show all fields and cards
        fieldGroups.forEach(field => field.style.display = 'block');
        cards.forEach(card => card.style.display = 'block');
        return;
    }
    
    const searchLower = searchTerm.toLowerCase();
    let hasVisibleFields = false;
    
    cards.forEach(card => {
        const cardFields = card.querySelectorAll('.field-group');
        let cardHasVisibleFields = false;
        
        cardFields.forEach(field => {
            const label = field.querySelector('.field-label').textContent.toLowerCase();
            const value = field.querySelector('.field-value').textContent.toLowerCase();
            
            if (label.includes(searchLower) || value.includes(searchLower)) {
                field.style.display = 'block';
                cardHasVisibleFields = true;
                hasVisibleFields = true;
            } else {
                field.style.display = 'none';
            }
        });
        
        card.style.display = cardHasVisibleFields ? 'block' : 'none';
    });
    
    // Expand cards that have matching fields
    if (hasVisibleFields) {
        cards.forEach(card => {
            const hasVisibleFields = card.querySelector('.field-group[style="display: block"]');
            if (hasVisibleFields) {
                card.classList.remove('collapsed');
            }
        });
    }
}

function expandAllCards() {
    const cards = document.querySelectorAll('.data-card');
    cards.forEach(card => card.classList.remove('collapsed'));
}

function collapseAllCards() {
    const cards = document.querySelectorAll('.data-card');
    cards.forEach(card => card.classList.add('collapsed'));
}

function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode', isDarkMode);
    darkModeToggle.textContent = isDarkMode ? '☀️' : '🌙';
}

function copyBatchData(type) {
    if (!parsedData) return;
    
    let dataToCopy = '';
    
    switch (type) {
        case 'all':
            dataToCopy = JSON.stringify(parsedData, null, 2);
            break;
        case 'child':
            dataToCopy = JSON.stringify(parsedData.child, null, 2);
            break;
        case 'contacts':
            const contacts = {
                parents: parsedData.parents,
                guardian: parsedData.guardian,
                emergency_contact: parsedData.emergency_contact
            };
            dataToCopy = JSON.stringify(contacts, null, 2);
            break;
        case 'health':
            const health = {
                doctor: parsedData.doctor,
                immunisations: parsedData.immunisations,
                special_needs: parsedData.special_needs
            };
            dataToCopy = JSON.stringify(health, null, 2);
            break;
    }
    
    navigator.clipboard.writeText(dataToCopy).then(() => {
        showCopySuccess();
    }).catch(err => {
        console.error('Failed to copy batch data: ', err);
        showError('Failed to copy to clipboard');
    });
}

function exportJSON() {
    if (!parsedData) return;
    
    const dataStr = JSON.stringify(parsedData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'famly-parsed-data.json';
    link.click();
    
    URL.revokeObjectURL(url);
}

function toggleRawData() {
    const rawData = document.getElementById('rawData');
    const isVisible = rawData.style.display === 'block';
    
    if (isVisible) {
        rawData.style.display = 'none';
        rawJsonBtn.textContent = '📄 Raw JSON';
    } else {
        rawData.style.display = 'block';
        rawJsonBtn.textContent = '📄 Hide JSON';
        
        if (!rawData.textContent) {
            rawData.textContent = JSON.stringify(parsedData, null, 2);
        }
    }
}

function loadSampleData() {
    const sampleHTML = `
        <table id="emailFieldsTable">
            <tr><td class="questionColumn">Child's Name (as it appears on birth certificate)</td><td class="valueColumn">Aoibhín Stafford</td></tr>
            <tr><td class="questionColumn">Date of Birth</td><td class="valueColumn">01/01/2020</td></tr>
            <tr><td class="questionColumn">Sex: Male/Female</td><td class="valueColumn">Female</td></tr>
            <tr><td class="questionColumn">Address</td><td class="valueColumn">123 Main Street, Dublin</td></tr>
            <tr><td class="questionColumn">Parent 1 - Name</td><td class="valueColumn">Siobhán O'Connor</td></tr>
            <tr><td class="questionColumn">Parent 1 Email</td><td class="valueColumn">siobhan@email.com</td></tr>
            <tr><td class="questionColumn">Parent 1 Address - Same as above?</td><td class="valueColumn">Yes</td></tr>
            <tr><td class="questionColumn">Parent 2 - Name</td><td class="valueColumn">Seán Murphy</td></tr>
            <tr><td class="questionColumn">Parent 2 Email</td><td class="valueColumn">sean@email.com</td></tr>
            <tr><td class="questionColumn">Address - Same as above?</td><td class="valueColumn">Yes</td></tr>
            <tr><td class="questionColumn">Emergency Contact Name</td><td class="valueColumn">Máire Walsh</td></tr>
            <tr><td class="questionColumn">Email</td><td class="valueColumn">maire@email.com</td></tr>
            <tr><td class="questionColumn">Emergency Contact Address - Same as above?</td><td class="valueColumn">Yes</td></tr>
        </table>
    `;
    
    showLoading(true);
    
    setTimeout(() => {
        try {
            const parser = new EMLParser();
            const rawData = parser.parseHTMLToRaw(sampleHTML);
            parsedData = parser.normalizeFields(rawData.raw, rawData.flat);
            
            showResults(parsedData);
            showSuccess('Sample data loaded successfully!');
        } catch (error) {
            console.error('Sample parsing error:', error);
            showError(`Failed to parse sample data: ${error.message}`);
        } finally {
            showLoading(false);
        }
    }, 1000);
}

// Initialize PWA when page loads
document.addEventListener('DOMContentLoaded', () => {
    initializePWA();
    collapseAllCards();
});

// Add CSS animation for slide-in notification
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .dark-mode {
        background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
    }
    
    .dark-mode .container {
        background: #1f2937;
        color: #f9fafb;
    }
    
    .dark-mode .data-card {
        background: #374151;
        border-color: #4b5563;
    }
    
    .dark-mode .card-header {
        background: linear-gradient(135deg, #4b5563 0%, #374151 100%);
        border-color: #4b5563;
    }
    
    .dark-mode .field-group {
        background: #4b5563;
        border-color: #6b7280;
    }
    
    .dark-mode .field-value {
        background: #374151;
        border-color: #6b7280;
        color: #f9fafb;
    }
    
    .dark-mode .field-label {
        color: #d1d5db;
    }
`;
document.head.appendChild(style); 
