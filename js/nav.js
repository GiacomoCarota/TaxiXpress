// Gestire la visualizzazione dell'header basata sull'autenticazione
function updateHeaderForAuth() {
    const authData = checkUserAuthenticationNav();
    const authButtons = document.querySelector('.hidden.md\\:flex.items-center.space-x-4');
    const nav = document.querySelector('nav.hidden.md\\:flex');

    if (authData && authButtons) {
        // Utente loggato - sostituire i pulsanti con il profilo
        authButtons.innerHTML = `
            <div class="relative">
                <button onclick="toggleProfileDropdown()" class="flex items-center space-x-2 text-green-800 hover:text-green-700 transition duration-300">
                    <i class="fas fa-user-circle text-xl"></i>
                    <span>${authData.user.nome || authData.user.full_name || 'Profilo'}</span>
                    <i class="fas fa-chevron-down text-sm"></i>
                </button>
                
                <!-- Dropdown Menu -->
                <div id="profile-dropdown" class="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 hidden">
                    <div class="py-2">
                        <div class="px-4 py-2 border-b border-gray-100">
                            <div class="font-medium text-gray-800">${authData.user.nome || authData.user.full_name}</div>
                            <div class="text-sm text-gray-500">${authData.user.email}</div>
                            <div class="text-xs text-blue-600 font-medium mt-1">
                                ${authData.user.tipo === 'driver' ? 'Driver' : 'Cliente'}
                            </div>
                        </div>
                        <a href="#" onclick="viewProfile()" class="block px-4 py-2 text-gray-700 hover:bg-gray-100 transition duration-200">
                            <i class="fas fa-user mr-2"></i>Il mio profilo
                        </a>
                        ${authData.user.tipo === 'driver' ? 
                            `<a href="#" onclick="viewDriverDashboard()" class="block px-4 py-2 text-gray-700 hover:bg-gray-100 transition duration-200">
                                <i class="fas fa-tachometer-alt mr-2"></i>Dashboard Driver
                            </a>` : 
                            `<a href="#" onclick="viewBookingHistory()" class="block px-4 py-2 text-gray-700 hover:bg-gray-100 transition duration-200">
                                <i class="fas fa-history mr-2"></i>Le mie prenotazioni
                            </a>`
                        }
                        <a href="#" onclick="viewSettings()" class="block px-4 py-2 text-gray-700 hover:bg-gray-100 transition duration-200">
                            <i class="fas fa-cog mr-2"></i>Impostazioni
                        </a>
                        <div class="border-t border-gray-100 mt-2">
                            <button onclick="logout()" class="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 transition duration-200">
                                <i class="fas fa-sign-out-alt mr-2"></i>Esci
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Aggiornare anche la navigazione principale se necessario
        updateMainNavigation(authData.user.tipo);
    } else if (authButtons) {
        // Utente non loggato - mostrare pulsanti login/register
        authButtons.innerHTML = `
            <a href="/html/login.html" class="text-green-800 hover:text-green-700 transition duration-300">Login</a>
            <a href="/html/register.html" class="bg-green-800 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition duration-300">Register</a>
        `;
        
        // Reset della navigazione per utenti non loggati
        updateMainNavigation(null);
    }
}

// Aggiornare la navigazione principale basata sul tipo di utente
function updateMainNavigation(userType) {
    const mainNav = document.querySelector('nav.hidden.md\\:flex');
    if (!mainNav) return;
    
    // Pagina corrente per mantenere il link attivo
    const currentPage = window.location.pathname.split('/').pop();
    
    let navLinks = '';
    
    if (userType === 'driver') {
        // Navigazione per driver
        navLinks = `
            <a href="/html/home.html" class="${currentPage === 'home.html' ? 'text-green-800 font-medium' : 'text-gray-600 hover:text-green-600 transition duration-300'}">Home</a>
            <a href="/html/myrequest.html" class="${currentPage === 'myrequest.html' ? 'text-green-800 font-medium' : 'text-gray-600 hover:text-green-600 transition duration-300'}">Dashboard Driver</a>
            <a href="/html/contact.html" class="${currentPage === 'contact.html' ? 'text-green-800 font-medium' : 'text-gray-600 hover:text-green-600 transition duration-300'}">Contact</a>
        `;
    } else if (userType === 'cliente') {
        // Navigazione per clienti
        navLinks = `
            <a href="/html/home.html" class="${currentPage === 'home.html' ? 'text-green-800 font-medium' : 'text-gray-600 hover:text-green-600 transition duration-300'}">Home</a>
            <a href="/html/book.html" class="${currentPage === 'book.html' ? 'text-green-800 font-medium' : 'text-gray-600 hover:text-green-600 transition duration-300'}">Book Ride</a>
            <a href="/html/mybookings.html" class="${currentPage === 'mybookings.html' ? 'text-green-800 font-medium' : 'text-gray-600 hover:text-green-600 transition duration-300'}">My Bookings</a>
            <a href="/html/pricing.html" class="${currentPage === 'pricing.html' ? 'text-green-800 font-medium' : 'text-gray-600 hover:text-green-600 transition duration-300'}">Pricing</a>
            <a href="/html/contact.html" class="${currentPage === 'contact.html' ? 'text-green-800 font-medium' : 'text-gray-600 hover:text-green-600 transition duration-300'}">Contact</a>
        `;
    }else if (userType === 'admin') {
        // Navigazione per admin
        navLinks = `
            <a href="/html/home.html" class="${currentPage === 'home.html' ? 'text-green-800 font-medium' : 'text-gray-600 hover:text-green-600 transition duration-300'}">Home</a>
            <a href="/html/manage-promo.html" class="${currentPage === 'manage-promo.html' ? 'text-green-800 font-medium' : 'text-gray-600 hover:text-green-600 transition duration-300'}">Manage Promos</a>
            <a href="/html/manage-users.html" class="${currentPage === 'manage-users.html' ? 'text-green-800 font-medium' : 'text-gray-600 hover:text-green-600 transition duration-300'}">Manage Users</a>
            <a href="/html/contact.html" class="${currentPage === 'contact.html' ? 'text-green-800 font-medium' : 'text-gray-600 hover:text-green-600 transition duration-300'}">Contact</a>
        `;
    } else {
        // Navigazione per utenti non loggati
        navLinks = `
            <a href="/html/home.html" class="${currentPage === 'home.html' ? 'text-green-800 font-medium' : 'text-gray-600 hover:text-green-600 transition duration-300'}">Home</a>
            <a href="/html/pricing.html" class="${currentPage === 'pricing.html' ? 'text-green-800 font-medium' : 'text-gray-600 hover:text-green-600 transition duration-300'}">Pricing</a>
            <a href="/html/contact.html" class="${currentPage === 'contact.html' ? 'text-green-800 font-medium' : 'text-gray-600 hover:text-green-600 transition duration-300'}">Contact</a>
        `;
    }
    
    mainNav.innerHTML = navLinks;
}

// Toggle dropdown del profilo
function toggleProfileDropdown() {
    const dropdown = document.getElementById('profile-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
    }
}

// Chiudere dropdown cliccando fuori
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('profile-dropdown');
    const profileButton = event.target.closest('button');
    
    if (dropdown && !dropdown.contains(event.target) && (!profileButton || !profileButton.onclick)) {
        dropdown.classList.add('hidden');
    }
});

// Funzioni placeholder per le azioni del profilo
function viewProfile() {
    toggleProfileDropdown();
    alert('Funzione profilo in sviluppo');
    // window.location.href = '/html/profile.html';
}

function viewBookingHistory() {
    toggleProfileDropdown();
    window.location.href = "/html/mybookings.html";
}

function viewDriverDashboard() {
    toggleProfileDropdown();
    window.location.href = "/html/myrequest.html";
}

function viewSettings() {
    toggleProfileDropdown();
    alert('Impostazioni in sviluppo');
    // window.location.href = '/html/settings.html';
}

// Aggiornare la funzione di logout per aggiornare l'header
function logout() {
    if (confirm('Sei sicuro di voler uscire?')) {
        localStorage.removeItem('user');
        localStorage.removeItem('redirectAfterLogin');
        
        // Rimuovere info utente dalla pagina di booking
        const userInfo = document.getElementById('user-info-booking');
        if (userInfo) {
            userInfo.remove();
        }
        
        // Aggiornare header
        updateHeaderForAuth();
        
        // Mostrare messaggio
        alert('Logout effettuato con successo');
        
        // Opzionale: reindirizzare alla home
        window.location.href = '/html/home.html';
    }
}

// Verificare se l'utente è autenticato (versione migliorata)
function checkUserAuthenticationNav() {
    try {
        const user = localStorage.getItem('user');
        
        if (!user) {
            return null;
        }
        
        // Parsare dati utente
        const userData = JSON.parse(user);
        
        // Verificare che i dati siano validi
        if (!userData.user || !userData.user.email) {
            localStorage.removeItem('user');
            return null;
        }
        
        return {
            user: userData.user
        };
        
    } catch (error) {
        console.error('Errore controllo autenticazione:', error);
        localStorage.removeItem('user');
        return null;
    }
}

// Funzione per verificare l'accesso basato sul tipo di utente
function checkUserAccess(requiredType) {
    const authData = checkUserAuthenticationNav();
    
    if (!authData) {
        alert('Devi effettuare il login per accedere a questa pagina.');
        window.location.href = '/html/login.html';
        return false;
    }
    
    if (requiredType && authData.user.tipo !== requiredType) {
        alert(`Accesso negato. Questa pagina è riservata agli utenti di tipo: ${requiredType}`);
        window.location.href = '/html/home.html';
        return false;
    }
    
    return true;
}

// Funzione per proteggere le pagine driver
function protectDriverPage() {
    return checkUserAccess('driver');
}

// Funzione per proteggere le pagine customer
function protectCustomerPage() {
    return checkUserAccess('cliente');
}

// Aggiornare l'inizializzazione per includere l'aggiornamento dell'header
document.addEventListener('DOMContentLoaded', function() {
    // Aggiornare header basato sull'autenticazione
    updateHeaderForAuth();
    
    // Verificare se siamo in una pagina protetta
    const currentPage = window.location.pathname.split('/').pop();
    
    if (currentPage === 'driver-dashboard.html') {
        protectDriverPage();
    } else if (currentPage === 'mybookings.html' || currentPage === 'book.html') {
        protectCustomerPage();
    }
    
    // Aggiornare il saluto utente se presente
    const authData = checkUserAuthenticationNav();
    if (authData) {
        const userGreeting = document.getElementById('userGreeting');
        if (userGreeting) {
            const greeting = authData.user.tipo === 'driver' ? 'Driver' : 'Ciao';
            userGreeting.textContent = `${greeting}, ${authData.user.nome || authData.user.full_name}`;
        }
    }
});

// Esporre funzioni globalmente
window.toggleProfileDropdown = toggleProfileDropdown;
window.viewProfile = viewProfile;
window.viewBookingHistory = viewBookingHistory;
window.viewDriverDashboard = viewDriverDashboard;
window.viewSettings = viewSettings;
window.updateHeaderForAuth = updateHeaderForAuth;
window.logout = logout;
window.checkUserAccess = checkUserAccess;
window.protectDriverPage = protectDriverPage;
window.protectCustomerPage = protectCustomerPage;