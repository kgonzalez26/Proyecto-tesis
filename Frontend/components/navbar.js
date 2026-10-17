const ICONS = {
    car: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 1 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>`,
    ship: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/><path d="M19 10 12 7 5 10"/><path d="M12 7V3"/><path d="m10 5 2-2 2 2"/></svg>`,
    'file-text': `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>`,
    calculator: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></svg>`,
    'bar-chart': `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></svg>`,
    settings: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,
    'chevron-down': `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`,
    'log-out': `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>`
};

const NAV_ITEMS = [
    { href: 'pantallaClientes.html', icon: 'car', label: 'Mis Vehículos', rolesRequeridos: ['Cliente'] },
    { href: 'pantallaPrincipal.html', icon: 'car', label: 'Vehículos', rolesRequeridos: ['Administrador', 'Tramitador'] },
    { href: 'tracking.html', icon: 'ship', label: 'Logística', rolesRequeridos: ['Administrador', 'Tramitador', 'Mecánico'] },
    { href: 'cotizaciones.html', icon: 'file-text', label: 'Cotizaciones', rolesRequeridos: ['Administrador', 'Finanzas'] },
    { href: 'calculadoraCostos.html', icon: 'calculator', label: 'Calculadora', rolesRequeridos: ['Administrador', 'Finanzas', 'Cliente'] },
    { href: 'reportes.html', icon: 'bar-chart', label: 'Reportes', rolesRequeridos: ['Administrador'] },
    { href: 'usuarios.html', icon: 'settings', label: 'Administración', rolesRequeridos: ['Administrador'] }
];

async function inicializarNavbar() {
    const placeholder = document.getElementById('navbar-placeholder');
    if (!placeholder) return;

    let usuario;
    try {
        const respuesta = await fetch('/api/auth/me', { credentials: 'include' });
        if (!respuesta.ok) throw new Error('Sesión no válida');
        ({ usuario } = await respuesta.json());
    } catch (error) {
        window.location.replace('login.html');
        return;
    }

    window.usuarioActual = usuario;

    const paginaActual = window.location.pathname.split('/').pop();
    const roles = usuario.roles || [];
    const esSoloCliente = roles.length > 0 && roles.every(r => r === 'Cliente');
    const hrefMarca = esSoloCliente ? 'pantallaClientes.html' : 'pantallaPrincipal.html';

    const linksHtml = NAV_ITEMS
        .filter(item => !item.rolesRequeridos || item.rolesRequeridos.some(r => roles.includes(r)))
        .map(item => `
            <a href="${item.href}" class="nav-item ${item.href === paginaActual ? 'active' : ''}">
                ${ICONS[item.icon] || ''}<span>${item.label}</span>
            </a>
        `).join('');

    const inicial = (usuario.nombre || '?').charAt(0).toUpperCase();

    placeholder.innerHTML = `
        <nav class="navbar">
            <a href="${hrefMarca}" class="navbar-brand">
                ${ICONS['car']} Importadora Los Gemelos
            </a>
            <div class="nav-links">${linksHtml}</div>
            <div class="user-menu-container">
                <button class="user-profile-btn" id="userMenuBtn">
                    <div class="user-avatar">${inicial}</div>
                    <span>${usuario.nombre}</span>
                    ${ICONS['chevron-down']}
                </button>
                <div class="dropdown-menu" id="userDropdown">
                    <div class="dropdown-header">
                        <strong>${usuario.nombre}</strong>
                        <p>${usuario.email}</p>
                    </div>
                    <a href="#" class="dropdown-item" id="logoutBtn">
                        ${ICONS['log-out']} Cerrar Sesión
                    </a>
                </div>
            </div>
        </nav>
    `;

    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdown = document.getElementById('userDropdown');
    userMenuBtn.addEventListener('click', () => userDropdown.classList.toggle('show'));
    window.addEventListener('click', (e) => {
        if (!userMenuBtn.contains(e.target) && !userDropdown.contains(e.target)) {
            userDropdown.classList.remove('show');
        }
    });

    document.getElementById('logoutBtn').addEventListener('click', async (e) => {
        e.preventDefault();
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        window.location.replace('login.html');
    });
}

document.addEventListener('DOMContentLoaded', inicializarNavbar);
