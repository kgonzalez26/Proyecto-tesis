function redirigirSegunRoles(roles) {
    const listaRoles = (roles || []).map(r => r.toLowerCase());

    if (listaRoles.includes('cliente') && listaRoles.length === 1) {
        window.location.replace('pantallaClientes.html');
        return;
    }
    window.location.replace('pantallaPrincipal.html');
}

async function verificarSesionExistente() {
    try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (res.ok) {
            const { usuario } = await res.json();
            redirigirSegunRoles(usuario.roles);
        }
    } catch (error) {
    }
}
verificarSesionExistente();

document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const contrasena = document.getElementById('password').value;
    const errorMsg = document.getElementById('error-msg');

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, contrasena })
        });

        const data = await response.json();

        if (response.ok) {
            errorMsg.style.display = 'none';
            localStorage.setItem('usuarioLogueado', JSON.stringify(data.usuario));
            redirigirSegunRoles(data.usuario?.roles);
        } else {
            errorMsg.textContent = data.error;
            errorMsg.style.display = 'block';
        }
    } catch (error) {
        console.error('Error al conectar con el servidor:', error);
        errorMsg.textContent = 'Error de conexión con el servidor.';
        errorMsg.style.display = 'block';
    }
});

document.getElementById('showRegister').addEventListener('click', function () {
    const reg = document.getElementById('registerForm');
    reg.style.display = reg.style.display === 'none' ? 'block' : 'none';
    window.scrollTo(0, document.body.scrollHeight);
});

document.getElementById('registerForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const nombre = document.getElementById('nombre').value.trim();
    const email = document.getElementById('emailReg').value.trim();
    const pass1 = document.getElementById('passwordReg').value;
    const pass2 = document.getElementById('passwordReg2').value;
    const msg = document.getElementById('register-msg');

    if (pass1 !== pass2) {
        msg.style.display = 'block';
        msg.style.color = 'red';
        msg.textContent = 'Las contraseñas no coinciden.';
        return;
    }

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ nombre, email, contrasena: pass1 })
        });

        const data = await response.json();

        if (response.ok) {
            msg.style.display = 'block';
            msg.style.color = 'green';
            msg.textContent = 'Registro exitoso. Redirigiendo...';
            localStorage.setItem('usuarioLogueado', JSON.stringify(data.usuario));
            setTimeout(() => redirigirSegunRoles(data.usuario?.roles), 900);
        } else {
            msg.style.display = 'block';
            msg.style.color = 'red';
            msg.textContent = data.error || 'Error al registrar.';
        }
    } catch (err) {
        console.error('Error al registrar:', err);
        msg.style.display = 'block';
        msg.style.color = 'red';
        msg.textContent = 'Error de conexión con el servidor.';
    }
});
