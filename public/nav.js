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

    // Organized navigation items by category
    const navCategories = [
        {
            label: 'Home',
            items: [
                { text: 'Home', href: 'index.html' }
            ]
        },
        {
            label: 'Wellness',
            items: [
                { text: 'Mood Tracker', href: 'index.html#mood' },
                { text: 'Habits', href: 'habits.html' },
                { text: 'Journal', href: 'journal.html' },
                { text: 'Wellness Tools', href: 'wellness-tools.html' }
            ]
        },
        {
            label: 'Support',
            items: [
                { text: 'Resources', href: currentPath.includes('index.html') ? '#resources' : 'index.html#resources' }
            ]
        },
        {
            label: 'Activities',
            items: [
                { text: 'Games', href: 'games.html' }
            ]
        },
        {
            label: 'Account',
            items: [
                { text: 'Dashboard', href: '/dashboard' }
            ]
        }
    ];

    // Add admin item if applicable
    if (window.userDataManager?.isAdmin(user)) {
        navCategories[4].items.push({ text: 'Manage Content', href: 'admin.html' });
    }

    // Add logout
    navCategories[4].items.push({ text: 'Logout', href: '#', id: 'logoutLink', onclick: 'logout()' });

    renderCategorizedNav(nav, navCategories);

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

    // Organized navigation items by category (logged out)
    const navCategories = [
        {
            label: 'Home',
            items: [
                { text: 'Home', href: 'index.html' }
            ]
        },
        {
            label: 'Wellness',
            items: [
                { text: 'Mood Tracker', href: 'index.html#mood', requiresAuth: true },
                { text: 'Habits', href: 'habits.html', requiresAuth: true },
                { text: 'Journal', href: 'journal.html', requiresAuth: true },
                { text: 'Wellness Tools', href: 'wellness-tools.html', requiresAuth: true }
            ]
        },
        {
            label: 'Support',
            items: [
                { text: 'Resources', href: currentPath.includes('index.html') ? '#resources' : 'index.html#resources', requiresAuth: true }
            ]
        },
        {
            label: 'Activities',
            items: [
                { text: 'Games', href: 'games.html', requiresAuth: true }
            ]
        }
    ];

    // Add Login and Sign Up as flat links for logged-out users (except on login/signup pages)
    if (!currentPath.includes('login.html') && !currentPath.includes('signup.html')) {
        navCategories.push({
            label: 'Login',
            items: [{ text: 'Login', href: 'login.html' }],
            isFlat: true
        });
        navCategories.push({
            label: 'Sign Up',
            items: [{ text: 'Sign Up', href: 'signup.html' }],
            isFlat: true
        });
    }

    renderCategorizedNav(nav, navCategories);

    // Add click handlers for protected links
    addProtectedLinkHandlers();
}

function renderNav(nav, navItems) {
    nav.innerHTML = navItems.map(item => {
        const dataAttrs = [];
        if (item.id) dataAttrs.push(`id="${item.id}"`);
        if (item.requiresAuth) dataAttrs.push(`data-requires-auth="true"`);

        const attrs = dataAttrs.length > 0 ? ' ' + dataAttrs.join(' ') : '';

        if (item.onclick) {
            return `<li><a href="${item.href}"${attrs}>${item.text}</a></li>`;
        }
        return `<li><a href="${item.href}"${attrs}>${item.text}</a></li>`;
    }).join('');
}

function renderCategorizedNav(nav, navCategories) {
    nav.innerHTML = navCategories.map(category => {
        const items = category.items.map(item => {
            const dataAttrs = [];
            if (item.id) dataAttrs.push(`id="${item.id}"`);
            if (item.requiresAuth) dataAttrs.push(`data-requires-auth="true"`);

            const attrs = dataAttrs.length > 0 ? ' ' + dataAttrs.join(' ') : '';

            return `<a href="${item.href}"${attrs}>${item.text}</a>`;
        }).join('');

        // If category is flat (Login/Sign Up), render as direct link
        if (category.isFlat) {
            return `<li>${items}</li>`;
        }

        // If category only has one item and it's Home, render without dropdown
        if (category.label === 'Home') {
            return `<li>${items}</li>`;
        }

        return `
            <li class="nav-category">
                <span class="nav-category-label">${category.label} ▼</span>
                <div class="nav-dropdown">
                    ${items}
                </div>
            </li>
        `;
    }).join('');

    // Add mobile menu toggle functionality
    setupMobileMenuToggle();
}

function setupMobileMenuToggle() {
    // Only for mobile devices
    if (window.innerWidth <= 768) {
        const navCategories = document.querySelectorAll('.nav-category');

        navCategories.forEach(category => {
            const label = category.querySelector('.nav-category-label');

            label.addEventListener('click', (e) => {
                e.stopPropagation();
                // Toggle active class
                category.classList.toggle('active');

                // Close other open categories
                navCategories.forEach(other => {
                    if (other !== category) {
                        other.classList.remove('active');
                    }
                });
            });
        });

        // Close menus when clicking outside
        document.addEventListener('click', () => {
            navCategories.forEach(category => {
                category.classList.remove('active');
            });
        });
    }
}

// Add click handlers for protected links (mood tracker, resources, etc.)
function addProtectedLinkHandlers() {
    const protectedLinks = document.querySelectorAll('nav a[data-requires-auth="true"]');
    
    protectedLinks.forEach(link => {
        link.addEventListener('click', async (e) => {
            // Check if user is authenticated
            const user = await window.userDataManager?.getCurrentUser();
            
            if (!user) {
                e.preventDefault();
                // Store the intended destination (preserve hash if present)
                let href = link.getAttribute('href');
                
                // If it's a hash link and we're on index.html, preserve the full path
                if (href.startsWith('#') && window.location.pathname.includes('index.html')) {
                    href = window.location.pathname + href;
                } else if (href.startsWith('#')) {
                    // If it's just a hash and we're not on index, go to index with hash
                    href = 'index.html' + href;
                }
                
                // Redirect to login with return URL
                window.location.href = `/login.html?redirect=${encodeURIComponent(href)}`;
            }
            // If user is authenticated, allow normal navigation
        });
    });
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
