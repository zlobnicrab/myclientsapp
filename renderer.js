// ===== State =====
let currentPage = 'clients-list';
let currentClientId = null;
let clients = [];
let hasUnsavedChanges = false;
let editingAdminBlock = false;
let editingRequestBlock = false;
let editingSessionId = null;
let newSessionMode = false;

// ===== DOM Elements =====
const pages = {
    clientsList: document.getElementById('page-clients-list'),
    newClient: document.getElementById('page-new-client'),
    client: document.getElementById('page-client')
};

const elements = {
    // Search
    searchInput: document.getElementById('search-input'),
    searchClear: document.getElementById('search-clear'),
    
    // Clients list
    clientsTableBody: document.getElementById('clients-table-body'),
    emptyState: document.getElementById('empty-state'),
    dbPath: document.getElementById('db-path'),
    btnAddClient: document.getElementById('btn-add-client'),
    
    // New client
    btnBackFromNew: document.getElementById('btn-back-from-new'),
    btnCancelNew: document.getElementById('btn-cancel-new'),
    newClientForm: document.getElementById('new-client-form'),
    
    // Client page
    btnBackFromClient: document.getElementById('btn-back-from-client'),
    clientName: document.getElementById('client-name'),
    statusDropdown: document.getElementById('status-dropdown'),
    statusBtn: document.getElementById('status-btn'),
    statusText: document.getElementById('status-text'),
    statusMenu: document.getElementById('status-menu'),
    
    // Admin block
    adminView: document.getElementById('admin-view'),
    adminEdit: document.getElementById('admin-edit'),
    btnEditAdmin: document.getElementById('btn-edit-admin'),
    btnSaveAdmin: document.getElementById('btn-save-admin'),
    
    // Request block
    requestView: document.getElementById('request-view'),
    requestEdit: document.getElementById('request-edit'),
    btnEditRequest: document.getElementById('btn-edit-request'),
    btnSaveRequest: document.getElementById('btn-save-request'),
    
    // Sessions
    btnAddSession: document.getElementById('btn-add-session'),
    sessionsContainer: document.getElementById('sessions-container'),
    
    // Modals
    modalConfirm: document.getElementById('modal-confirm'),
    modalText: document.getElementById('modal-text'),
    modalCancel: document.getElementById('modal-cancel'),
    modalConfirmBtn: document.getElementById('modal-confirm-btn'),
    
    modalSave: document.getElementById('modal-save'),
    modalSaveText: document.getElementById('modal-save-text'),
    modalDontSave: document.getElementById('modal-dont-save'),
    modalSaveCancel: document.getElementById('modal-save-cancel'),
    modalSaveBtn: document.getElementById('modal-save-btn')
};

// ===== Initialization =====
async function init() {
    await loadClients();
    await loadDbPath();
    setupEventListeners();
    renderClientsTable();
}

async function loadClients() {
    clients = await window.api.getClients();
}

async function loadDbPath() {
    const path = await window.api.getDbPath();
    elements.dbPath.textContent = `Данные: ${path}`;
}

// ===== Event Listeners =====
function setupEventListeners() {
    // Search
    elements.searchInput.addEventListener('input', handleSearch);
    elements.searchClear.addEventListener('click', clearSearch);
    
    // Navigation
    elements.btnAddClient.addEventListener('click', () => navigateTo('new-client'));
    elements.btnBackFromNew.addEventListener('click', () => handleBackFromNew());
    elements.btnCancelNew.addEventListener('click', () => handleBackFromNew());
    elements.btnBackFromClient.addEventListener('click', () => handleBackFromClient());
    
    // New client form
    elements.newClientForm.addEventListener('submit', handleNewClientSubmit);
    elements.newClientForm.addEventListener('input', () => { hasUnsavedChanges = true; });
    
    // Status dropdown
    elements.statusBtn.addEventListener('click', toggleStatusDropdown);
    document.querySelectorAll('.status-option').forEach(option => {
        option.addEventListener('click', handleStatusChange);
    });
    
    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
        if (!elements.statusDropdown.contains(e.target)) {
            elements.statusDropdown.classList.remove('open');
        }
    });
    
    // Admin block
    elements.btnEditAdmin.addEventListener('click', () => toggleAdminEdit(true));
    elements.btnSaveAdmin.addEventListener('click', saveAdminChanges);
    
    // Request block
    elements.btnEditRequest.addEventListener('click', () => toggleRequestEdit(true));
    elements.btnSaveRequest.addEventListener('click', saveRequestChanges);
    
    // Sessions
    elements.btnAddSession.addEventListener('click', addNewSession);
    
    // Modal confirm
    elements.modalCancel.addEventListener('click', closeConfirmModal);
    elements.modalConfirmBtn.addEventListener('click', confirmModalAction);
    document.querySelector('#modal-confirm .modal-overlay').addEventListener('click', closeConfirmModal);
    
    // Modal save
    elements.modalDontSave.addEventListener('click', handleDontSave);
    elements.modalSaveCancel.addEventListener('click', closeSaveModal);
    elements.modalSaveBtn.addEventListener('click', handleSaveAndNavigate);
    document.querySelector('#modal-save .modal-overlay').addEventListener('click', closeSaveModal);
}

// ===== Navigation =====
function navigateTo(page, clientId = null) {
    currentPage = page;
    
    Object.values(pages).forEach(p => p.classList.remove('active'));
    
    switch (page) {
        case 'clients-list':
            pages.clientsList.classList.add('active');
            loadClients().then(renderClientsTable);
            break;
        case 'new-client':
            pages.newClient.classList.add('active');
            resetNewClientForm();
            break;
        case 'client':
            currentClientId = clientId;
            pages.client.classList.add('active');
            loadClientPage(clientId);
            break;
    }
}

// ===== Search =====
function handleSearch() {
    const query = elements.searchInput.value.toLowerCase().trim();
    
    if (query) {
        elements.searchClear.classList.remove('hidden');
    } else {
        elements.searchClear.classList.add('hidden');
    }
    
    renderClientsTable(query);
}

function clearSearch() {
    elements.searchInput.value = '';
    elements.searchClear.classList.add('hidden');
    renderClientsTable();
}

// ===== Clients Table =====
function renderClientsTable(searchQuery = '') {
    let filteredClients = clients;
    
    if (searchQuery) {
        filteredClients = clients.filter(client => {
            const searchString = `
                ${client.lastName} ${client.firstName} ${client.middleName}
                ${client.phone} ${client.telegram} ${client.email}
            `.toLowerCase();
            return searchString.includes(searchQuery);
        });
    }
    
    // Sort by creation date (newest first)
    filteredClients.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    if (filteredClients.length === 0) {
        elements.clientsTableBody.innerHTML = '';
        elements.emptyState.classList.remove('hidden');
        return;
    }
    
    elements.emptyState.classList.add('hidden');
    
    elements.clientsTableBody.innerHTML = filteredClients.map(client => `
        <tr data-id="${client.id}">
            <td>${client.lastName} ${client.firstName} ${client.middleName || ''}</td>
            <td>${client.phone || ''}</td>
            <td class="status-${client.status}">${getStatusText(client.status)}</td>
            <td>${getTherapyText(client.therapy)}</td>
            <td>${formatDate(client.createdAt)}</td>
            <td>
                <button class="btn-delete" data-id="${client.id}" aria-label="Удалить клиента">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                    </svg>
                </button>
            </td>
        </tr>
    `).join('');
    
    // Add event listeners to rows
    elements.clientsTableBody.querySelectorAll('tr').forEach(row => {
        row.addEventListener('click', (e) => {
            if (!e.target.closest('.btn-delete')) {
                navigateTo('client', row.dataset.id);
            }
        });
    });
    
    // Add event listeners to delete buttons
    elements.clientsTableBody.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            showDeleteConfirm(btn.dataset.id);
        });
    });
}

// ===== New Client =====
function resetNewClientForm() {
    elements.newClientForm.reset();
    hasUnsavedChanges = false;
}

async function handleNewClientSubmit(e) {
    e.preventDefault();
    
    const clientData = {
        lastName: document.getElementById('new-lastName').value,
        firstName: document.getElementById('new-firstName').value,
        middleName: document.getElementById('new-middleName').value,
        phone: document.getElementById('new-phone').value,
        telegram: document.getElementById('new-telegram').value,
        email: document.getElementById('new-email').value,
        age: document.getElementById('new-age').value,
        price: document.getElementById('new-price').value,
        therapy: document.getElementById('new-therapy').value,
        request: document.getElementById('new-request').value,
        experience: document.getElementById('new-experience').value,
        comment: document.getElementById('new-comment').value
    };
    
    await window.api.addClient(clientData);
    hasUnsavedChanges = false;
    navigateTo('clients-list');
}

function handleBackFromNew() {
    if (hasUnsavedChanges) {
        showSaveModal(() => {
            elements.newClientForm.dispatchEvent(new Event('submit'));
        }, () => {
            hasUnsavedChanges = false;
            navigateTo('clients-list');
        });
    } else {
        navigateTo('clients-list');
    }
}

// ===== Client Page =====
async function loadClientPage(clientId) {
    const client = await window.api.getClient(clientId);
    if (!client) {
        navigateTo('clients-list');
        return;
    }
    
    // Reset edit modes
    editingAdminBlock = false;
    editingRequestBlock = false;
    editingSessionId = null;
    newSessionMode = false;
    hasUnsavedChanges = false;
    
    // Set client name
    elements.clientName.textContent = `${client.lastName} ${client.firstName} ${client.middleName || ''}`;
    
    // Set status
    updateStatusUI(client.status);
    
    // Render admin view
    renderAdminView(client);
    toggleAdminEdit(false);
    
    // Render request view
    renderRequestView(client);
    toggleRequestEdit(false);
    
    // Render sessions
    renderSessions(client.sessions || []);
}

function renderAdminView(client) {
    document.getElementById('view-lastName').textContent = client.lastName || '-';
    document.getElementById('view-firstName').textContent = client.firstName || '-';
    document.getElementById('view-middleName').textContent = client.middleName || '-';
    document.getElementById('view-phone').textContent = client.phone || '-';
    document.getElementById('view-telegram').textContent = client.telegram || '-';
    document.getElementById('view-email').textContent = client.email || '-';
    document.getElementById('view-age').textContent = client.age || '-';
    document.getElementById('view-price').textContent = client.price || '-';
    document.getElementById('view-therapy').textContent = getTherapyText(client.therapy);
    
    // Fill edit fields
    document.getElementById('edit-lastName').value = client.lastName || '';
    document.getElementById('edit-firstName').value = client.firstName || '';
    document.getElementById('edit-middleName').value = client.middleName || '';
    document.getElementById('edit-phone').value = client.phone || '';
    document.getElementById('edit-telegram').value = client.telegram || '';
    document.getElementById('edit-email').value = client.email || '';
    document.getElementById('edit-age').value = client.age || '';
    document.getElementById('edit-price').value = client.price || '';
    document.getElementById('edit-therapy').value = client.therapy || 'personal';
}

function renderRequestView(client) {
    document.getElementById('view-request').textContent = client.request || '-';
    document.getElementById('view-experience').textContent = client.experience || '-';
    document.getElementById('view-comment').textContent = client.comment || '-';
    
    // Fill edit fields
    document.getElementById('edit-request').value = client.request || '';
    document.getElementById('edit-experience').value = client.experience || '';
    document.getElementById('edit-comment').value = client.comment || '';
}

function toggleAdminEdit(edit) {
    editingAdminBlock = edit;
    if (edit) {
        elements.adminView.classList.add('hidden');
        elements.adminEdit.classList.remove('hidden');
        elements.btnEditAdmin.classList.add('hidden');
    } else {
        elements.adminView.classList.remove('hidden');
        elements.adminEdit.classList.add('hidden');
        elements.btnEditAdmin.classList.remove('hidden');
    }
}

function toggleRequestEdit(edit) {
    editingRequestBlock = edit;
    if (edit) {
        elements.requestView.classList.add('hidden');
        elements.requestEdit.classList.remove('hidden');
        elements.btnEditRequest.classList.add('hidden');
    } else {
        elements.requestView.classList.remove('hidden');
        elements.requestEdit.classList.add('hidden');
        elements.btnEditRequest.classList.remove('hidden');
    }
}

async function saveAdminChanges() {
    const updates = {
        lastName: document.getElementById('edit-lastName').value,
        firstName: document.getElementById('edit-firstName').value,
        middleName: document.getElementById('edit-middleName').value,
        phone: document.getElementById('edit-phone').value,
        telegram: document.getElementById('edit-telegram').value,
        email: document.getElementById('edit-email').value,
        age: document.getElementById('edit-age').value,
        price: document.getElementById('edit-price').value,
        therapy: document.getElementById('edit-therapy').value
    };
    
    const client = await window.api.updateClient(currentClientId, updates);
    if (client) {
        renderAdminView(client);
        elements.clientName.textContent = `${client.lastName} ${client.firstName} ${client.middleName || ''}`;
        toggleAdminEdit(false);
    }
}

async function saveRequestChanges() {
    const updates = {
        request: document.getElementById('edit-request').value,
        experience: document.getElementById('edit-experience').value,
        comment: document.getElementById('edit-comment').value
    };
    
    const client = await window.api.updateClient(currentClientId, updates);
    if (client) {
        renderRequestView(client);
        toggleRequestEdit(false);
    }
}

// ===== Status =====
function toggleStatusDropdown() {
    elements.statusDropdown.classList.toggle('open');
}

async function handleStatusChange(e) {
    const status = e.target.dataset.status;
    await window.api.updateClient(currentClientId, { status });
    updateStatusUI(status);
    elements.statusDropdown.classList.remove('open');
}

function updateStatusUI(status) {
    elements.statusText.textContent = getStatusText(status);
    elements.statusBtn.className = `status-btn status-${status}`;
}

// ===== Sessions =====
function renderSessions(sessions) {
    if (!sessions || sessions.length === 0) {
        elements.sessionsContainer.innerHTML = '';
        return;
    }
    
    // Sort by date (newest first)
    const sortedSessions = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    elements.sessionsContainer.innerHTML = sortedSessions.map(session => `
        <div class="session-card" data-id="${session.id}">
            <div class="session-header">
                <span class="session-date">${formatDate(session.date)}</span>
                <button class="btn-icon btn-edit-session" data-id="${session.id}" aria-label="Редактировать сессию">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path>
                        <path d="m15 5 4 4"></path>
                    </svg>
                </button>
            </div>
            <div class="session-content">
                <p class="session-notes">${session.notes || ''}</p>
            </div>
        </div>
    `).join('');
    
    // Add event listeners to edit buttons
    elements.sessionsContainer.querySelectorAll('.btn-edit-session').forEach(btn => {
        btn.addEventListener('click', () => editSession(btn.dataset.id));
    });
}

async function addNewSession() {
    newSessionMode = true;
    
    const today = new Date().toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    
    const newSessionHtml = `
        <div class="session-card session-new" data-id="new">
            <div class="session-header">
                <span class="session-date">${today}</span>
            </div>
            <div class="session-form">
                <textarea class="form-textarea" id="new-session-notes" placeholder="Комментарии к сессии"></textarea>
                <button class="btn btn-primary" id="btn-save-new-session">Сохранить</button>
            </div>
        </div>
    `;
    
    elements.sessionsContainer.insertAdjacentHTML('afterbegin', newSessionHtml);
    
    document.getElementById('btn-save-new-session').addEventListener('click', saveNewSession);
    document.getElementById('new-session-notes').focus();
}

async function saveNewSession() {
    const notes = document.getElementById('new-session-notes').value;
    
    const session = await window.api.addSession(currentClientId, { notes });
    if (session) {
        newSessionMode = false;
        const client = await window.api.getClient(currentClientId);
        renderSessions(client.sessions || []);
    }
}

async function editSession(sessionId) {
    editingSessionId = sessionId;
    
    const sessionCard = elements.sessionsContainer.querySelector(`[data-id="${sessionId}"]`);
    const notesEl = sessionCard.querySelector('.session-notes');
    const currentNotes = notesEl.textContent;
    
    const contentEl = sessionCard.querySelector('.session-content');
    contentEl.innerHTML = `
        <div class="session-form">
            <textarea class="form-textarea" id="edit-session-notes">${currentNotes}</textarea>
            <button class="btn btn-primary" id="btn-save-edit-session">Сохранить</button>
        </div>
    `;
    
    sessionCard.querySelector('.btn-edit-session').classList.add('hidden');
    
    document.getElementById('btn-save-edit-session').addEventListener('click', () => saveEditedSession(sessionId));
    document.getElementById('edit-session-notes').focus();
}

async function saveEditedSession(sessionId) {
    const notes = document.getElementById('edit-session-notes').value;
    
    await window.api.updateSession(currentClientId, sessionId, { notes });
    editingSessionId = null;
    
    const client = await window.api.getClient(currentClientId);
    renderSessions(client.sessions || []);
}

// ===== Back from Client =====
function handleBackFromClient() {
    if (editingAdminBlock || editingRequestBlock || newSessionMode || editingSessionId) {
        showSaveModal(async () => {
            if (editingAdminBlock) await saveAdminChanges();
            if (editingRequestBlock) await saveRequestChanges();
            if (newSessionMode) await saveNewSession();
            if (editingSessionId) await saveEditedSession(editingSessionId);
            navigateTo('clients-list');
        }, () => {
            navigateTo('clients-list');
        });
    } else {
        navigateTo('clients-list');
    }
}

// ===== Delete Client =====
let deleteClientId = null;

function showDeleteConfirm(clientId) {
    deleteClientId = clientId;
    elements.modalText.textContent = 'Вы уверены, что хотите удалить клиента?';
    elements.modalConfirm.classList.remove('hidden');
}

function closeConfirmModal() {
    elements.modalConfirm.classList.add('hidden');
    deleteClientId = null;
}

async function confirmModalAction() {
    if (deleteClientId) {
        await window.api.deleteClient(deleteClientId);
        await loadClients();
        renderClientsTable();
    }
    closeConfirmModal();
}

// ===== Save Modal =====
let saveCallback = null;
let dontSaveCallback = null;

function showSaveModal(onSave, onDontSave) {
    saveCallback = onSave;
    dontSaveCallback = onDontSave;
    elements.modalSave.classList.remove('hidden');
}

function closeSaveModal() {
    elements.modalSave.classList.add('hidden');
    saveCallback = null;
    dontSaveCallback = null;
}

function handleDontSave() {
    if (dontSaveCallback) dontSaveCallback();
    closeSaveModal();
}

function handleSaveAndNavigate() {
    if (saveCallback) saveCallback();
    closeSaveModal();
}

// ===== Helpers =====
function getStatusText(status) {
    const statusMap = {
        active: 'Активен',
        pause: 'Пауза',
        archive: 'Архив'
    };
    return statusMap[status] || 'Активен';
}

function getTherapyText(therapy) {
    const therapyMap = {
        personal: 'Личная',
        group: 'Группа',
        supervision: 'Супервизия'
    };
    return therapyMap[therapy] || 'Личная';
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// ===== Start App =====
init();