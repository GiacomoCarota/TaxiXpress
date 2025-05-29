// manage-users.js - Versione funzionale
let users = [];
let filteredUsers = [];
let currentPage = 1;
const usersPerPage = 10;
let editingUserId = null;
let userToDelete = null;

// Inizializzazione
function init() {
    setupEventListeners();
    loadUsers();
}

function setupEventListeners() {
    // Search and filters
    document.getElementById('searchInput').addEventListener('input', () => {
        filterUsers();
    });

    document.getElementById('roleFilter').addEventListener('change', () => {
        filterUsers();
    });

    document.getElementById('statusFilter').addEventListener('change', () => {
        filterUsers();
    });


    document.getElementById('cancelBtn').addEventListener('click', () => {
        hideModal();
    });

    // Form submission
    document.getElementById('userForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveUser();
    });

    // Select all checkbox
    document.getElementById('selectAll').addEventListener('change', (e) => {
        toggleSelectAll(e.target.checked);
    });

    // Confirmation modal
    document.getElementById('confirmYes').addEventListener('click', () => {
        confirmDelete();
    });

    document.getElementById('confirmNo').addEventListener('click', () => {
        hideConfirmModal();
    });

    // Pagination mobile
    document.getElementById('prevPageMobile').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderUsers();
        }
    });

    document.getElementById('nextPageMobile').addEventListener('click', () => {
        const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderUsers();
        }
    });
}

async function loadUsers() {
    try {
        const response = await fetch('/api/users');
        if (response.ok) {
            users = await response.json();
            console.log('Users loaded:', users);
            filteredUsers = [...users];
            renderUsers();
        } else {
            showError('Errore nel caricamento degli utenti');
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function generateMockUsers() {
    const roles = ['user', 'driver', 'admin'];
    const statuses = ['active', 'suspended', 'banned'];
    const mockUsers = [];

    for (let i = 1; i <= 25; i++) {
        mockUsers.push({
            id: i,
            firstName: `Nome${i}`,
            lastName: `Cognome${i}`,
            email: `utente${i}@email.com`,
            phone: `+39 ${String(Math.floor(Math.random() * 900000000) + 100000000)}`,
            role: roles[Math.floor(Math.random() * roles.length)],
            status: statuses[Math.floor(Math.random() * statuses.length)],
            registrationDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
            lastLogin: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
        });
    }

    return mockUsers;
}

function filterUsers() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const roleFilter = document.getElementById('roleFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;

    filteredUsers = users.filter(user => {
        const matchesSearch = !searchTerm || 
            user.firstName.toLowerCase().includes(searchTerm) ||
            user.lastName.toLowerCase().includes(searchTerm) ||
            user.email.toLowerCase().includes(searchTerm) ||
            user.phone.includes(searchTerm);

        const matchesRole = !roleFilter || user.role === roleFilter;
        const matchesStatus = !statusFilter || user.status === statusFilter;

        return matchesSearch && matchesRole && matchesStatus;
    });

    currentPage = 1;
    renderUsers();
}

function renderUsers() {
    const tbody = document.getElementById('usersTableBody');
    const start = (currentPage - 1) * usersPerPage;
    const end = start + usersPerPage;
    const usersToShow = filteredUsers.slice(start, end);

    tbody.innerHTML = usersToShow.map(user => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">
                <input type="checkbox" class="user-checkbox rounded" data-user-id="${user.id}">
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10">
                        <div class="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                        <span class="text-sm font-medium text-green-800">
                                ${user.firstname.charAt(0)}${user.lastname.charAt(0)}
                            </span>
                        </div>
                    </div>
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">
                            ${user.firstname} ${user.lastname}
                        </div>
                        <div class="text-sm text-gray-500">${user.email}</div>
                        <div class="text-sm text-gray-500">${user.phone}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeClass(user.role)}">
                    ${translateRole(user.role)}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(user.status)}">
                    status
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${formatDate(user.registrationdate)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${formatDate(user.lastlogin)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button class="text-green-600 hover:text-green-900 mr-3" onclick="editUser(${user.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="text-red-600 hover:text-red-900" onclick="deleteUser(${user.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');

    updatePagination();
}

function updatePagination() {
    const totalUsers = filteredUsers.length;
    const totalPages = Math.ceil(totalUsers / usersPerPage);
    const start = (currentPage - 1) * usersPerPage + 1;
    const end = Math.min(currentPage * usersPerPage, totalUsers);

    // Update pagination info
    document.getElementById('paginationInfo').innerHTML = `
        Visualizzando <span class="font-medium">${start}</span> - 
        <span class="font-medium">${end}</span> di 
        <span class="font-medium">${totalUsers}</span> risultati
    `;

    // Generate pagination buttons
    const paginationNav = document.getElementById('paginationNav');
    let paginationHTML = '';

    // Previous button
    paginationHTML += `
        <button ${currentPage === 1 ? 'disabled' : ''} 
                onclick="goToPage(${currentPage - 1})" 
                class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}">
            <i class="fas fa-chevron-left"></i>
        </button>
    `;

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            paginationHTML += `
                <button onclick="goToPage(${i})" 
                        class="relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            i === currentPage 
                                ? 'bg-green-50 border-green-500 text-green-600' 
                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }">
                    ${i}
                </button>
            `;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            paginationHTML += `
                <span class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                    ...
                </span>
            `;
        }
    }

    // Next button
    paginationHTML += `
        <button ${currentPage === totalPages ? 'disabled' : ''} 
                onclick="goToPage(${currentPage + 1})" 
                class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;

    paginationNav.innerHTML = paginationHTML;
}

function goToPage(page) {
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        renderUsers();
    }
}

function showAddUserModal() {
    editingUserId = null;
    document.getElementById('modalTitle').textContent = 'Aggiungi Nuovo Utente';
    document.getElementById('userForm').reset();
    document.getElementById('userModal').classList.remove('hidden');
}

function editUser(userId) {
    const user = users.find(u => u.id === userId);
    if (user) {
        editingUserId = userId;
        // document.getElementById('modalTitle').innerText = 'Modifica Utente';
        document.getElementById('userId').value = user.idu;
        document.getElementById('firstName').value = user.firstname;
        document.getElementById('lastName').value = user.lastname;
        document.getElementById('email').value = user.email;
        document.getElementById('phone').value = user.phone;
        document.getElementById('role').value = user.role;
        // document.getElementById('status').value = user.status;
        document.getElementById('userModal').classList.remove('hidden');
    }
}

async function saveUser() {
    const formData = new FormData(document.getElementById('userForm'));
    const userData = Object.fromEntries(formData.entries());

    try {
        let response;
        if (editingUserId) {
            response = await fetch(`/api/users/${editingUserId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
        } else {
            response = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
        }

        if (response.ok) {
            hideModal();
            loadUsers();
            showSuccess(editingUserId ? 'Utente aggiornato con successo' : 'Utente creato con successo');
        } else {
            const errorData = await response.json();
            showError(errorData.error || 'Errore nel salvataggio dell\'utente');
        }
    } catch (error) {
        console.error('Error saving user:', error);
        // Mock success for development
        hideModal();
        mockSaveUser(userData);
        showSuccess(editingUserId ? 'Utente aggiornato con successo' : 'Utente creato con successo');
    }
}

function mockSaveUser(userData) {
    if (editingUserId) {
        const index = users.findIndex(u => u.id === editingUserId);
        if (index !== -1) {
            users[index] = { ...users[index], ...userData };
        }
    } else {
        const newUser = {
            id: Math.max(...users.map(u => u.id)) + 1,
            ...userData,
            registrationDate: new Date(),
            lastLogin: new Date()
        };
        users.push(newUser);
    }
    filterUsers();
}

function deleteUser(userId) {
    userToDelete = userId;
    document.getElementById('confirmModal').classList.remove('hidden');
}

async function confirmDelete() {
    try {
        const response = await fetch(`/api/users/${userToDelete}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            hideConfirmModal();
            loadUsers();
            showSuccess('Utente eliminato con successo');
        } else {
            const errorData = await response.json();
            showError(errorData.error || 'Errore nell\'eliminazione dell\'utente');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        // Mock delete for development
        users = users.filter(u => u.id !== userToDelete);
        hideConfirmModal();
        filterUsers();
        showSuccess('Utente eliminato con successo');
    }
}

function hideModal() {
    document.getElementById('userModal').classList.add('hidden');
}

function hideConfirmModal() {
    document.getElementById('confirmModal').classList.add('hidden');
}

function toggleSelectAll(checked) {
    const checkboxes = document.querySelectorAll('.user-checkbox');
    checkboxes.forEach(cb => cb.checked = checked);
}

function getRoleBadgeClass(role) {
    switch (role) {
        case 'admin': return 'bg-purple-100 text-purple-800';
        case 'driver': return 'bg-blue-100 text-blue-800';
        case 'user': return 'bg-green-100 text-green-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

function getStatusBadgeClass(status) {
    switch (status) {
        case 'active': return 'bg-green-100 text-green-800';
        case 'suspended': return 'bg-yellow-100 text-yellow-800';
        case 'banned': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

function translateRole(role) {
    switch (role) {
        case 'admin': return 'Admin';
        case 'driver': return 'Autista';
        case 'user': return 'Utente';
        default: return role;
    }
}

function translateStatus(status) {
    switch (status) {
        case 'active': return 'Attivo';
        case 'suspended': return 'Sospeso';
        case 'banned': return 'Bannato';
        default: return status;
    }
}

function formatDate(date) {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('it-IT', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showSuccess(message) {
    // Simple alert for now - can be replaced with a better notification system
    alert(message);
}

function showError(message) {
    // Simple alert for now - can be replaced with a better notification system
    alert('Errore: ' + message);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    init();
});