// Variabili globali
let currentPage = 1;
let itemsPerPage = 10;
let totalItems = 0;
let promotions = [];
let filteredPromotions = [];
let editingPromoId = null;

// DOM Elements
const promosTableBody = document.getElementById('promosTableBody');
const searchInput = document.getElementById('searchInput');
const typeFilter = document.getElementById('typeFilter');
const statusFilter = document.getElementById('statusFilter');
const addPromoBtn = document.getElementById('addPromoBtn');
const promoModal = document.getElementById('promoModal');
const closeModal = document.getElementById('closeModal');
const cancelBtn = document.getElementById('cancelBtn');
const promoForm = document.getElementById('promoForm');
const confirmModal = document.getElementById('confirmModal');
const confirmYes = document.getElementById('confirmYes');
const confirmNo = document.getElementById('confirmNo');
let promoToDelete = null;

// Inizializzazione
document.addEventListener('DOMContentLoaded', function() {
    loadPromotions();
    setupEventListeners();
    updateStats();
});

// Event Listeners
function setupEventListeners() {
    // Search and filters
    searchInput.addEventListener('input', debounce(applyFilters, 300));
    typeFilter.addEventListener('change', applyFilters);
    statusFilter.addEventListener('change', applyFilters);
    
    // Modal controls
    addPromoBtn.addEventListener('click', openNewPromoModal);
    closeModal.addEventListener('click', closePromoModal);
    cancelBtn.addEventListener('click', closePromoModal);
    
    // Form submission
    promoForm.addEventListener('submit', handleFormSubmit);
    
    // Confirmation modal
    confirmYes.addEventListener('click', confirmDelete);
    confirmNo.addEventListener('click', closeConfirmModal);
    
    // Select all checkbox
    document.getElementById('selectAll').addEventListener('change', toggleSelectAll);
    
    // Click outside modal to close
    promoModal.addEventListener('click', function(e) {
        if (e.target === promoModal) {
            closePromoModal();
        }
    });
    
    confirmModal.addEventListener('click', function(e) {
        if (e.target === confirmModal) {
            closeConfirmModal();
        }
    });
}

// API Functions
async function loadPromotions() {
    try {
        showLoading(true);
        const response = await fetch('/api/promotions');
        if (!response.ok) throw new Error('Errore nel caricamento delle promozioni');
        
        promotions = await response.json();
        filteredPromotions = [...promotions];
        renderPromotions();
        updateStats();
    } catch (error) {
        console.error('Errore:', error);
        showNotification('Errore nel caricamento delle promozioni', 'error');
    } finally {
        showLoading(false);
    }
}

async function savePromotion(formData) {
    try {
        const url = editingPromoId ? `/api/promotions/${editingPromoId}` : '/api/promotions';
        const method = editingPromoId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Errore nel salvataggio');
        }
        
        return await response.json();
    } catch (error) {
        throw error;
    }
}

async function deletePromotion(promoId) {
    try {
        const response = await fetch(`/api/promotions/${promoId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Errore nell\'eliminazione della promozione');
        
        return true;
    } catch (error) {
        throw error;
    }
}

async function togglePromoStatus(promoId, isActive) {
    try {
        const response = await fetch(`/api/promotions/${promoId}/toggle`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ isActive })
        });
        
        if (!response.ok) throw new Error('Errore nel cambio stato');
        
        return await response.json();
    } catch (error) {
        throw error;
    }
}

// Rendering Functions
function renderPromotions() {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedPromotions = filteredPromotions.slice(startIndex, endIndex);
    
    if (paginatedPromotions.length === 0) {
        promosTableBody.innerHTML = `
            <tr>
                <td colspan="9" class="px-6 py-4 text-center text-gray-500">
                    <i class="fas fa-inbox text-4xl mb-2 text-gray-400"></i>
                    <p>Nessuna promozione trovata</p>
                </td>
            </tr>
        `;
        updatePagination();
        return;
    }
    
    promosTableBody.innerHTML = paginatedPromotions.map(promo => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">
                <input type="checkbox" class="promo-checkbox rounded" data-id="${promo.id}">
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10">
                        <div class="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                            <i class="fas fa-tag text-green-600"></i>
                        </div>
                    </div>
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">${promo.name}</div>
                        <div class="text-sm text-gray-500">${promo.description || 'Nessuna descrizione'}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="font-mono text-sm bg-gray-100 px-2 py-1 rounded">${promo.code}</span>
                <button onclick="copyToClipboard('${promo.code}')" class="ml-2 text-gray-400 hover:text-gray-600">
                    <i class="fas fa-copy"></i>
                </button>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                tipo
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${formatPromoValue(promo)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <div class="flex flex-col">
                    <span>${promo.usedCount || 0} / ${promo.maxUses || '∞'}</span>
                    <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div class="bg-green-600 h-2 rounded-full" style="width: ${getUsagePercentage(promo)}%"></div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <div class="flex flex-col">
                    <span class="text-xs text-gray-500">Dal: ${formatDate(promo.startDate)}</span>
                    <span class="text-xs text-gray-500">Al: ${formatDate(promo.endDate)}</span>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                ${getStatusBadge(promo)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex space-x-2">
                    <button onclick="editPromotion(${promo.id})" 
                            class="text-indigo-600 hover:text-indigo-900" title="Modifica">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="togglePromo(${promo.id}, ${!promo.isActive})" 
                            class="text-${promo.isActive ? 'yellow' : 'green'}-600 hover:text-${promo.isActive ? 'yellow' : 'green'}-900" 
                            title="${promo.isActive ? 'Disattiva' : 'Attiva'}">
                        <i class="fas fa-${promo.isActive ? 'pause' : 'play'}"></i>
                    </button>
                    <button onclick="duplicatePromotion(${promo.id})" 
                            class="text-blue-600 hover:text-blue-900" title="Duplica">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button onclick="deletePromo(${promo.id})" 
                            class="text-red-600 hover:text-red-900" title="Elimina">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    updatePagination();
}

// Helper Functions
function getTypebadge(type) {
    const badges = {
        percentage: '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Percentuale</span>',
        fixed: '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">Importo Fisso</span>',
        free_ride: '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">Corsa Gratuita</span>'
    };
    return badges[type] || '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">Sconosciuto</span>';
}

function getStatusBadge(promo) {
    const now = new Date();
    const startDate = new Date(promo.startDate);
    const endDate = new Date(promo.endDate);
    
    if (!promo.isActive) {
        return '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">Inattiva</span>';
    } else if (now < startDate) {
        return '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Programmata</span>';
    } else if (now > endDate) {
        return '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Scaduta</span>';
    } else {
        return '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Attiva</span>';
    }
}

function formatPromoValue(promo) {
    switch (promo.type) {
        case 'percentage':
            return `${promo.value}%`;
        case 'fixed':
            return `€${promo.value}`;
        case 'free_ride':
            return 'Gratuita';
        default:
            return promo.value;
    }
}

function getUsagePercentage(promo) {
    if (!promo.maxUses) return 0;
    return Math.min(((promo.usedCount || 0) / promo.maxUses) * 100, 100);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Modal Functions
function openNewPromoModal() {
    editingPromoId = null;
    document.getElementById('modalTitle').textContent = 'Nuova Promozione';
    promoForm.reset();
    
    // Set default dates
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    document.getElementById('startDate').value = formatDateTimeLocal(tomorrow);
    document.getElementById('endDate').value = formatDateTimeLocal(nextWeek);
    
    promoModal.classList.remove('hidden');
}

function editPromotion(promoId) {
    const promo = promotions.find(p => p.id === promoId);
    if (!promo) return;
    
    editingPromoId = promoId;
    document.getElementById('modalTitle').textContent = 'Modifica Promozione';
    
    // Populate form
    document.getElementById('promoId').value = promo.id;
    // document.getElementById('name').value = promo.name;
    document.getElementById('description').value = promo.description || '';
    // document.getElementById('code').value = promo.code;
    // document.getElementById('type').value = promo.type;
    document.getElementById('value').value = promo.value;
    document.getElementById('startDate').value = formatDateTimeLocal(new Date(promo.startdate));
    document.getElementById('endDate').value = formatDateTimeLocal(new Date(promo.enddate));
    document.getElementById('maxUses').value = promo.maxUses || '';
    document.getElementById('maxUsesPerUser').value = promo.maxUsesPerUser || '';
    document.getElementById('minOrderAmount').value = promo.minOrderAmount || '';
    document.getElementById('isActive').checked = promo.isActive;
    
    promoModal.classList.remove('hidden');
}

function closePromoModal() {
    promoModal.classList.add('hidden');
    editingPromoId = null;
    promoForm.reset();
}

function duplicatePromotion(promoId) {
    const promo = promotions.find(p => p.id === promoId);
    if (!promo) return;
    
    editingPromoId = null;
    document.getElementById('modalTitle').textContent = 'Duplica Promozione';
    
    // Populate form with promo data but generate new code
    document.getElementById('name').value = `${promo.name} (Copia)`;
    document.getElementById('description').value = promo.description || '';
    document.getElementById('code').value = generatePromoCode();
    document.getElementById('type').value = promo.type;
    document.getElementById('value').value = promo.value;
    
    // Set new dates
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    document.getElementById('startDate').value = formatDateTimeLocal(tomorrow);
    document.getElementById('endDate').value = formatDateTimeLocal(nextWeek);
    document.getElementById('maxUses').value = promo.maxUses || '';
    document.getElementById('maxUsesPerUser').value = promo.maxUsesPerUser || '';
    document.getElementById('minOrderAmount').value = promo.minOrderAmount || '';
    document.getElementById('isActive').checked = false; // Start as inactive
    
    promoModal.classList.remove('hidden');
}

// Form Handling
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(promoForm);
    const promoData = {
        name: formData.get('name'),
        description: formData.get('description'),
        code: generatePromoCode(),
        type: formData.get('type'),
        value: parseFloat(formData.get('value')),
        startDate: formData.get('startDate'),
        endDate: formData.get('endDate'),
        maxUses: formData.get('maxUses') ? parseInt(formData.get('maxUses')) : null,
        maxUsesPerUser: formData.get('maxUsesPerUser') ? parseInt(formData.get('maxUsesPerUser')) : null,
        minOrderAmount: formData.get('minOrderAmount') ? parseFloat(formData.get('minOrderAmount')) : null,
        isActive: formData.get('isActive') === 'on'
    };
    
    try {
        await savePromotion(promoData);
        showNotification(editingPromoId ? 'Promozione aggiornata con successo' : 'Promozione creata con successo', 'success');
        closePromoModal();
        loadPromotions();
    } catch (error) {
        console.error('Errore:', error);
        showNotification(error.message, 'error');
    }
}

// Delete Functions
function deletePromo(promoId) {
    promoToDelete = promoId;
    const promo = promotions.find(p => p.id === promoId);
    document.getElementById('confirmMessage').textContent = 
        `Sei sicuro di voler eliminare la promozione "${promo?.name}"? Questa azione non può essere annullata.`;
    confirmModal.classList.remove('hidden');
}

async function confirmDelete() {
    if (!promoToDelete) return;
    
    try {
        await deletePromotion(promoToDelete);
        showNotification('Promozione eliminata con successo', 'success');
        loadPromotions();
    } catch (error) {
        console.error('Errore:', error);
        showNotification('Errore nell\'eliminazione della promozione', 'error');
    }
    
    closeConfirmModal();
}

function closeConfirmModal() {
    confirmModal.classList.add('hidden');
    promoToDelete = null;
}

// Toggle Functions
async function togglePromo(promoId, newStatus) {
    try {
        await togglePromoStatus(promoId, newStatus);
        showNotification(`Promozione ${newStatus ? 'attivata' : 'disattivata'} con successo`, 'success');
        loadPromotions();
    } catch (error) {
        console.error('Errore:', error);
        showNotification('Errore nel cambio stato della promozione', 'error');
    }
}

// Filter Functions
function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    const typeValue = typeFilter.value;
    const statusValue = statusFilter.value;
    
    filteredPromotions = promotions.filter(promo => {
        const matchesSearch = !searchTerm || 
            promo.name.toLowerCase().includes(searchTerm) || 
            promo.code.toLowerCase().includes(searchTerm) ||
            (promo.description && promo.description.toLowerCase().includes(searchTerm));
        
        const matchesType = !typeValue || promo.type === typeValue;
        
        const matchesStatus = !statusValue || getPromoStatus(promo) === statusValue;
        
        return matchesSearch && matchesType && matchesStatus;
    });
    
    currentPage = 1;
    renderPromotions();
}

function getPromoStatus(promo) {
    const now = new Date();
    const startDate = new Date(promo.startDate);
    const endDate = new Date(promo.endDate);
    
    if (!promo.isActive) return 'inactive';
    if (now > endDate) return 'expired';
    return 'active';
}

// Pagination Functions
function updatePagination() {
    totalItems = filteredPromotions.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    // Update pagination info
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);
    
    document.getElementById('paginationInfo').innerHTML = 
        `Visualizzando <span class="font-medium">${startItem}</span> - <span class="font-medium">${endItem}</span> di <span class="font-medium">${totalItems}</span> risultati`;
    
    // Generate pagination buttons
    generatePaginationButtons(totalPages);
}

function generatePaginationButtons(totalPages) {
    const paginationNav = document.getElementById('paginationNav');
    if (!paginationNav) return;
    
    let buttons = '';
    
    // Previous button
    buttons += `
        <button onclick="changePage(${currentPage - 1})" 
                ${currentPage === 1 ? 'disabled' : ''} 
                class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${currentPage === 1 ? 'cursor-not-allowed opacity-50' : ''}">
            <i class="fas fa-chevron-left"></i>
        </button>
    `;
    
    // Page buttons
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            buttons += `
                <button onclick="changePage(${i})" 
                        class="relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            i === currentPage 
                                ? 'z-10 bg-green-50 border-green-500 text-green-600' 
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }">
                    ${i}
                </button>
            `;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            buttons += `
                <span class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                    ...
                </span>
            `;
        }
    }
    
    // Next button
    buttons += `
        <button onclick="changePage(${currentPage + 1})" 
                ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''} 
                class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${currentPage === totalPages || totalPages === 0 ? 'cursor-not-allowed opacity-50' : ''}">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    paginationNav.innerHTML = buttons;
}

function changePage(newPage) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (newPage < 1 || newPage > totalPages) return;
    
    currentPage = newPage;
    renderPromotions();
}

// Stats Functions
async function updateStats() {
    try {
        const response = await fetch('/api/promotions/stats');
        const stats = await response.json();
        
        document.getElementById('activePromosCount').textContent = stats.activeCount || 0;
        document.getElementById('usedCodesCount').textContent = stats.totalUsed || 0;
        document.getElementById('totalSavings').textContent = `€${stats.totalSavings || 0}`;
        document.getElementById('expiringCount').textContent = stats.expiringCount || 0;
    } catch (error) {
        console.error('Errore nel caricamento delle statistiche:', error);
    }
}

// Utility Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function formatDateTimeLocal(date) {
    const d = new Date(date);
    return d.getFullYear() + '-' + 
           String(d.getMonth() + 1).padStart(2, '0') + '-' + 
           String(d.getDate()).padStart(2, '0') + 'T' + 
           String(d.getHours()).padStart(2, '0') + ':' + 
           String(d.getMinutes()).padStart(2, '0');
}

function generatePromoCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Codice copiato negli appunti', 'success');
    }).catch(() => {
        showNotification('Errore nella copia del codice', 'error');
    });
}

function toggleSelectAll() {
    const selectAll = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('.promo-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
    });
}

function showLoading(show) {
    // Implementa il loading spinner se necessario
    if (show) {
        promosTableBody.innerHTML = `
            <tr>
                <td colspan="9" class="px-6 py-4 text-center">
                    <i class="fas fa-spinner fa-spin text-2xl text-gray-400"></i>
                    <p class="mt-2 text-gray-500">Caricamento...</p>
                </td>
            </tr>
        `;
    }
}

function showNotification(message, type = 'info') {
    // Crea e mostra una notifica toast
    const notification = document.createElement('div');
    notification.className = `
        fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg text-white transform transition-all duration-300 translate-x-full
        ${type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'}
    `;
    
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-triangle' : 'info'} mr-2"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Anima l'entrata
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // Rimuovi automaticamente dopo 5 secondi
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 5000);
}