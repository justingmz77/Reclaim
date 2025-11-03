// Shared navigation script to update navbar based on login status
// This should be included in all HTML pages

document.addEventListener('DOMContentLoaded', async () => {
    updateNavigation();
});

async function updateNavigation() {
    const nav = document.querySelector('nav ul');
    if (!nav) return;

    const currentPath = window.location.pathname;
    
    // Handle login/signup pages with simple nav
    if (currentPath.includes('login.html')) {
        showAuthNav(nav, 'login');
        return;
    }
    if (currentPath.includes('signup.html')) {
        showAuthNav(nav, 'signup');
        return;
    }

    try {
        const response = await fetch('/api/user');
        
        if (response.ok) {
            const user = await response.json();
            // User is logged in - show dashboard and logout
            showLoggedInNav(nav, user);
        } else {
            // User is not logged in - show login and signup
            showLoggedOutNav(nav);
        }
    } catch (error) {
        // Network error or server not running - show login and signup
        showLoggedOutNav(nav);
    }
}

function showAuthNav(nav, page) {
    const navItems = [
        { text: 'Home', href: 'index.html' }
    ];
    
    if (page === 'login') {
        navItems.push({ text: 'Sign Up', href: 'signup.html' });
    } else {
        navItems.push({ text: 'Login', href: 'login.html' });
    }
    
    renderNav(nav, navItems);
}

function showLoggedInNav(nav, user) {
    // Get current page path
    const currentPath = window.location.pathname;
    
    // Base navigation items (common to all pages)
    let navItems = [
        { text: 'Home', href: 'index.html' },
        { text: 'Mood Tracker', href: 'index.html#mood' },
        { text: 'Habits', href: 'habits.html' }
    ];

    // Add Journal if it exists
    if (currentPath.includes('habits.html') || currentPath.includes('index.html')) {
        navItems.push({ text: 'Journal', href: 'journal.html' });
    }

    // Add Resources link for index page
    if (currentPath.includes('index.html')) {
        navItems.push({ text: 'Resources', href: '#resources' });
    } else {
        navItems.push({ text: 'Resources', href: 'index.html#resources' });
    }

    // Add Dashboard and Logout for logged-in users
    navItems.push(
        { text: 'Dashboard', href: 'dashboard.html' }
    );

    // Admin-only: Manage Content
    if (window.userDataManager?.isAdmin(user)) {
        navItems.push({ text: 'Manage Content', href: 'admin.html' });
    }

    navItems.push(
        { text: 'Logout', href: '#', id: 'logoutLink', onclick: 'logout()' }
    );

    renderNav(nav, navItems);

    // Add logout handler
    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', async (e) => {
            e.preventDefault();
            await logout();
        });
    }
}

function showLoggedOutNav(nav) {
    const currentPath = window.location.pathname;
    
    let navItems = [
        { text: 'Home', href: 'index.html' },
        { text: 'Mood Tracker', href: 'index.html#mood' },
        { text: 'Habits', href: 'habits.html' }
    ];

    // Add Journal if it exists
    if (currentPath.includes('habits.html') || currentPath.includes('index.html')) {
        navItems.push({ text: 'Journal', href: 'journal.html' });
    }

    // Add Resources
    if (currentPath.includes('index.html')) {
        navItems.push({ text: 'Resources', href: '#resources' });
    } else {
        navItems.push({ text: 'Resources', href: 'index.html#resources' });
    }

    // Add Login and Sign Up for logged-out users (except on login/signup pages)
    if (!currentPath.includes('login.html') && !currentPath.includes('signup.html')) {
        navItems.push(
            { text: 'Login', href: 'login.html' },
            { text: 'Sign Up', href: 'signup.html' }
        );
    }

    renderNav(nav, navItems);
}

function renderNav(nav, navItems) {
    nav.innerHTML = navItems.map(item => {
        if (item.onclick) {
            return `<li><a href="${item.href}" ${item.id ? `id="${item.id}"` : ''}>${item.text}</a></li>`;
        }
        return `<li><a href="${item.href}">${item.text}</a></li>`;
    }).join('');
}

async function logout() {
    try {
        // Clear all user data before logging out
        if (window.userDataManager) {
            window.userDataManager.clearAllReclaimData();
        }
        
        const response = await fetch('/api/logout', {
            method: 'POST'
        });
        
        if (response.ok) {
            window.location.href = '/login.html';
        } else {
            // Still redirect and clear data even if logout fails
            window.location.href = '/login.html';
        }
    } catch (error) {
        console.error('Logout error:', error);
        // Clear data and redirect even if logout fails
        if (window.userDataManager) {
            window.userDataManager.clearAllReclaimData();
        }
        window.location.href = '/login.html';
    }
}