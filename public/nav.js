// Shared navigation script to update navbar based on login status
// Include on all HTML pages

document.addEventListener('DOMContentLoaded', async () => {
    updateNavigation();
    initHamburgerMenu();
});

async function updateNavigation() {
    const nav = document.querySelector('nav ul');
    if (!nav) return;

    const currentPath = window.location.pathname;

    // Simple nav for login/signup pages
    if (currentPath.includes('login.html')) return renderAuthNav(nav, 'login');
    if (currentPath.includes('signup.html')) return renderAuthNav(nav, 'signup');

    try {
        const response = await fetch('/api/user');
        if (response.ok) {
            const user = await response.json();
            renderLoggedInNav(nav, user);
        } else {
            renderLoggedOutNav(nav);
        }
    } catch {
        renderLoggedOutNav(nav);
    }
}

function renderAuthNav(nav, page) {
    const navItems = [{ text: 'Home', href: 'index.html' }];
    navItems.push(page === 'login'
        ? { text: 'Sign Up', href: 'signup.html' }
        : { text: 'Login', href: 'login.html' }
    );
    renderNav(nav, navItems);
}

function renderLoggedInNav(nav, user) {
    const currentPath = window.location.pathname;

    const navCategories = [
        { label: 'Home', items: [{ text: 'Home', href: 'index.html' }] },
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
        { label: 'Activities', items: [{ text: 'Games', href: 'games.html' }] },
        {
            label: 'Account',
            items: [
                { text: 'Dashboard', href: '/dashboard' },
                ...(window.userDataManager?.isAdmin(user) ? [{ text: 'Manage Content', href: 'admin.html' }] : []),
                { text: 'Logout', href: '#', id: 'logoutLink' }
            ]
        }
    ];

    renderCategorizedNav(nav, navCategories);

    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', async (e) => {
            e.preventDefault();
            await logout();
        });
    }
}

function renderLoggedOutNav(nav) {
    const currentPath = window.location.pathname;

    const navCategories = [
        { label: 'Home', items: [{ text: 'Home', href: 'index.html' }] },
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
        { label: 'Activities', items: [{ text: 'Games', href: 'games.html', requiresAuth: true }] },
        // Always show login/signup for logged-out users
        { label: 'Login', items: [{ text: 'Login', href: 'login.html' }] },
        { label: 'Sign Up', items: [{ text: 'Sign Up', href: 'signup.html' }] }
    ];

    renderCategorizedNav(nav, navCategories);
    addProtectedLinkHandlers();
}

function renderNav(nav, navItems) {
    nav.innerHTML = navItems.map(item => {
        const attrs = [
            item.id ? `id="${item.id}"` : '',
            item.requiresAuth ? `data-requires-auth="true"` : ''
        ].filter(Boolean).join(' ');

        return `<li><a href="${item.href}" ${attrs}>${item.text}</a></li>`;
    }).join('');
}

function renderCategorizedNav(nav, navCategories) {
    nav.innerHTML = navCategories.map(category => {
        const itemsHTML = category.items.map(item => {
            const attrs = [
                item.id ? `id="${item.id}"` : '',
                item.requiresAuth ? `data-requires-auth="true"` : ''
            ].filter(Boolean).join(' ');

            return `<a href="${item.href}" ${attrs}>${item.text}</a>`;
        }).join('');

        // Render Home and single-item categories as simple list items
        if (category.label === 'Home' || category.items.length === 1) return `<li>${itemsHTML}</li>`;

        return `
            <li class="nav-category">
                <span class="nav-category-label">${category.label} ▼</span>
                <div class="nav-dropdown">${itemsHTML}</div>
            </li>
        `;
    }).join('');

    setupMobileMenuToggle();
}

// Hamburger menu initialization
function initHamburgerMenu() {
    const hamburgerBtn = document.querySelector('.hamburger-btn');
    const navList = document.querySelector('.nav-links');
    if (!hamburgerBtn || !navList) return;

    hamburgerBtn.addEventListener('click', e => {
        e.stopPropagation();
        navList.classList.toggle('mobile-menu-open');
    });

    document.addEventListener('click', e => {
        if (window.innerWidth <= 785 && !hamburgerBtn.contains(e.target) && !navList.contains(e.target)) {
            navList.classList.remove('mobile-menu-open');
        }
    });
}

function setupMobileMenuToggle() {
    if (window.innerWidth > 785) return;

    const navCategories = document.querySelectorAll('.nav-category');
    navCategories.forEach(category => {
        const label = category.querySelector('.nav-category-label');
        label.addEventListener('click', e => {
            e.stopPropagation();
            category.classList.toggle('active');
            navCategories.forEach(other => { if (other !== category) other.classList.remove('active'); });
        });
    });

    document.addEventListener('click', () => navCategories.forEach(category => category.classList.remove('active')));
}

// Handle protected links
function addProtectedLinkHandlers() {
    const protectedLinks = document.querySelectorAll('nav a[data-requires-auth="true"]');

    protectedLinks.forEach(link => {
        link.addEventListener('click', async e => {
            const user = await window.userDataManager?.getCurrentUser();
            if (!user) {
                e.preventDefault();
                let href = link.getAttribute('href');
                if (href.startsWith('#') && window.location.pathname.includes('index.html')) {
                    href = window.location.pathname + href;
                } else if (href.startsWith('#')) {
                    href = 'index.html' + href;
                }
                window.location.href = `/login.html?redirect=${encodeURIComponent(href)}`;
            }
        });
    });
}

async function logout() {
    try {
        window.userDataManager?.clearAllReclaimData();
        await fetch('/api/logout', { method: 'POST' });
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        window.location.href = '/login.html';
    }
}
