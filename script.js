document.addEventListener('DOMContentLoaded', () => {
    // --------------------------------------------------------------------------
    // 1. CONFIGURACIÓN SUPABASE
    // --------------------------------------------------------------------------
    const SUPABASE_URL = 'https://ljpbmrhkndwgsqdhmpks.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqcGJtcmhrbmR3Z3NxZGhtcGtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMTk2MTIsImV4cCI6MjA4MDc5NTYxMn0.LWsHW_EHdOgbkI8gkqNdu0cCYRQO25b22bxOpigqT4A';
    
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --------------------------------------------------------------------------
    // 2. REFERENCIAS DOM (ELEMENTOS)
    // --------------------------------------------------------------------------
    const loginView = document.getElementById('login-view');
    const registerView = document.getElementById('register-view');
    const appView = document.getElementById('app-view');
    const menuSection = document.getElementById('menu-section');
    const addDebtSection = document.getElementById('add-debt-section');
    const viewDebtsSection = document.getElementById('view-debts-section');
    
    // Formularios y Botones Generales
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const appHeaderTitle = document.getElementById('app-header-title');
    const logoutButton = document.getElementById('logout-button');
    const welcomeUserSpan = document.getElementById('welcome-user');
    const formDeuda = document.getElementById('form-deuda');
    const goToRegisterLink = document.getElementById('go-to-register-link');
    const goToLoginLink = document.getElementById('go-to-login-link');
    const goToAddBtn = document.getElementById('go-to-add-btn');
    const goToViewBtn = document.getElementById('go-to-view-btn');
    const backButtons = document.querySelectorAll('.back-button');
    
    // Modales
    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-form');
    const paymentModal = document.getElementById('payment-modal');
    
    // Elementos de pago y fotos
    const paymentButtonsContainer = document.getElementById('payment-buttons');
    const uploadSection = document.getElementById('upload-section');
    const comprobanteInput = document.getElementById('comprobante-input');
    const confirmUploadBtn = document.getElementById('confirm-upload-btn');
    const cancelButtons = document.querySelectorAll('.cancel-btn');
    
    // Elementos para la vista previa
    const previewContainer = document.getElementById('preview-container');
    const imgPreview = document.getElementById('img-preview');
    
    let currentDebtIdToPay = null;
    let checkInterval = null;

    // --------------------------------------------------------------------------
    // 2.1 VALIDACIÓN DE INPUTS (ESTILO NATIVO/CAPTURA)
    // --------------------------------------------------------------------------
    const nombreDeudaInput = document.getElementById('nombre-deuda');

    if (nombreDeudaInput) {
        let errorTimeout;

        nombreDeudaInput.addEventListener('input', function(e) {
            // Verifica si hay números
            if (/\d/.test(this.value)) {
                
                // 1. Eliminar el número inmediatamente
                this.value = this.value.replace(/\d/g, '');

                // 2. Definir el mensaje de la burbuja nativa
                this.setCustomValidity("No se puede escribir números en la descripción");
                
                // 3. Disparar la burbuja (Se verá igual a tu captura)
                this.reportValidity();

                // 4. Limpiar el error interno después de 2 segundos
                // Esto es necesario para que el navegador no crea que el campo sigue inválido
                // y te deje enviar el formulario después.
                if (errorTimeout) clearTimeout(errorTimeout);
                errorTimeout = setTimeout(() => {
                    this.setCustomValidity("");
                }, 2000);

            } else {
                // Si el usuario borra o escribe letras, limpiamos cualquier error pendiente
                this.setCustomValidity("");
            }
        });
    }

    // --------------------------------------------------------------------------
    // 3. FUNCIONES HELPER
    // --------------------------------------------------------------------------
    const getLocalISOString = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getMonthName = (dateString) => {
        if (!dateString) return 'Sin fecha';
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day); 
        return date.toLocaleString('es-ES', { month: 'long' });
    };

    const cleanDebtName = (name) => name ? name.trim() : 'Sin descripción';

    const formatPaymentDate = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' });
    };

    const addMonthsToDate = (dateString, monthsToAdd) => {
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        date.setMonth(date.getMonth() + monthsToAdd);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const calculateMonthlyInstallment = (monto, tasaAnual, meses) => {
        const saldo = parseFloat(monto);
        const n = parseInt(meses);
        if (n <= 1) return saldo;
        const i = (parseFloat(tasaAnual || 0) / 100) / 12;
        return i > 0 ? saldo * ((i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1)) : saldo / n;
    };

    // --------------------------------------------------------------------------
    // 4. MANEJO DE VISTAS
    // --------------------------------------------------------------------------
    const showView = (viewToShow) => {
        [loginView, registerView, appView].forEach(v => v.classList.add('hidden'));
        if (viewToShow && viewToShow.classList) viewToShow.classList.remove('hidden');
        else loginView.classList.remove('hidden'); 
    };

    const showSection = (sectionToShow, title) => {
        [menuSection, addDebtSection, viewDebtsSection].forEach(s => s.classList.add('hidden'));
        sectionToShow.classList.remove('hidden');
        appHeaderTitle.textContent = title;
    };

    goToRegisterLink.addEventListener('click', (e) => { e.preventDefault(); showView(registerView); });
    goToLoginLink.addEventListener('click', (e) => { e.preventDefault(); showView(loginView); });
    goToAddBtn.addEventListener('click', () => showSection(addDebtSection, "Agregar Deuda"));
    goToViewBtn.addEventListener('click', () => { renderAllDebts(); showSection(viewDebtsSection, "Deudas y Pagos"); });
    backButtons.forEach(btn => btn.addEventListener('click', () => showSection(menuSection, "Panel Principal")));
    
    cancelButtons.forEach(btn => btn.addEventListener('click', () => {
        const modal = btn.closest('.modal-overlay'); 
        if (modal) {
            modal.classList.add('hidden');
            if (modal.id === 'payment-modal') {
                currentDebtIdToPay = null;
                if(window.resetPaymentModalUI) window.resetPaymentModalUI();
            }
        }
    }));

    // --------------------------------------------------------------------------
    // 5. AUTH
    // --------------------------------------------------------------------------
    const checkSessionOnLoad = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            startSession(session.user);
        } else {
            showView(loginView);
        }
    };

    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
            startSession(session.user);
        } else if (event === 'SIGNED_OUT') {
            showView(loginView);
            if (checkInterval) clearInterval(checkInterval);
        }
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const btn = loginForm.querySelector('button');
        const originalText = btn.textContent;
        btn.textContent = "Verificando..."; btn.disabled = true;

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        btn.textContent = originalText; btn.disabled = false;
        if (error) alert('Error: ' + error.message);
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('register-username').value.trim();
        const password = document.getElementById('register-password').value;
        if (password.length < 6) { alert('Contraseña muy corta.'); return; }
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) alert('Error: ' + error.message);
        else { alert('Cuenta creada. Inicia sesión.'); registerForm.reset(); showView(loginView); }
    });

    logoutButton.addEventListener('click', async () => {
        await supabase.auth.signOut();
    });

    const startSession = async (user) => {
        welcomeUserSpan.textContent = `Hola, ${user.email}`;
        showView(appView);
        showSection(menuSection, "Panel Principal");

        if (Notification.permission !== "granted" && Notification.permission !== "denied") {
            await Notification.requestPermission();
        }

        checkDebtsDueToday(user.id);
        if (checkInterval) clearInterval(checkInterval);
        checkInterval = setInterval(() => {
            console.log("Revisión automática de deudas en segundo plano...");
            checkDebtsDueToday(user.id);
        }, 3600000); 
    };

    // --------------------------------------------------------------------------
    // 6. NOTIFICACIONES Y RENDERIZADO
    // --------------------------------------------------------------------------
    const checkDebtsDueToday = async (userId) => {
        const hoyString = getLocalISOString();
        const { data: deudasHoy } = await supabase
            .from('debts').select('*').eq('user_id', userId).lte('fecha', hoyString).eq('pagado', false);

        if (deudasHoy && deudasHoy.length > 0) {
            deudasHoy.forEach(deuda => {
                const esHoy = deuda.fecha === hoyString; 
                const tituloNotif = esHoy ? "¡VENCE HOY!" : "¡DEUDA VENCIDA!";
                const notifKey = `notified_${deuda.id}_${hoyString}`;
                if (localStorage.getItem(notifKey)) return; 

                if (Notification.permission === "granted") {
                    const notif = new Notification(tituloNotif, {
                        body: `${deuda.nombre}\nMonto: S/ ${parseFloat(deuda.monto).toFixed(2)}`,
                        icon: "https://cdn-icons-png.flaticon.com/512/1011/1011322.png", 
                        requireInteraction: true 
                    });
                    localStorage.setItem(notifKey, 'true'); 
                    notif.onclick = function() { window.focus(); notif.close(); }; 
                }
            });
        }
    };

// --- NUEVAS VARIABLES GLOBALES ---
    let currentFilterMode = 'pendientes'; // opciones: 'pendientes', 'pagadas', 'proximas'

    // --- LÓGICA DEL MENÚ DESPLEGABLE ---
    const viewSelectorBtn = document.getElementById('view-selector-btn');
    const viewDropdown = document.getElementById('view-dropdown');
    const currentViewTitle = document.getElementById('current-view-title');
    const arrowIcon = document.querySelector('.arrow-icon');

    if (viewSelectorBtn) {
        viewSelectorBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Evitar que se cierre inmediatamente
            viewDropdown.classList.toggle('hidden-menu');
            arrowIcon.classList.toggle('rotate');
        });
    }

    // Cerrar menú si se hace click fuera
    document.addEventListener('click', (e) => {
        if (viewDropdown && !viewSelectorBtn.contains(e.target)) {
            viewDropdown.classList.add('hidden-menu');
            arrowIcon.classList.remove('rotate');
        }
    });

    // Función global para cambiar filtro desde el HTML
    window.changeViewFilter = (mode) => {
        currentFilterMode = mode;
        
        // Actualizar título
        if (mode === 'pendientes') currentViewTitle.textContent = "Deudas Pendientes";
        else if (mode === 'pagadas') currentViewTitle.textContent = "Historial de Pagos";
        else if (mode === 'proximas') currentViewTitle.textContent = "Deudas Próximas (> 2 meses)";
        
        // Cerrar menú
        viewDropdown.classList.add('hidden-menu');
        arrowIcon.classList.remove('rotate');
        
        // Renderizar
        renderAllDebts();
    };

    // --- FUNCIÓN RENDERIZADO ACTUALIZADA ---
    // --------------------------------------------------------------------------
// 6.1 RENDERIZADO UNIFICADO (MODIFICADO PARA INCLUIR SEMÁFORO EN DEUDAS PRÓXIMAS)
// --------------------------------------------------------------------------
const renderAllDebts = async () => {
    const mainContainer = document.getElementById('lista-deudas-main');
    if (!mainContainer) return;

    mainContainer.innerHTML = '<div style="padding:20px; text-align:center;">Cargando datos...</div>';

    const { data: deudas, error } = await supabase
        .from('debts')
        .select('*')
        .order('fecha', { ascending: true });

    if (error) { 
        mainContainer.innerHTML = '<p style="color:red; text-align:center;">Error de conexión</p>'; 
        return; 
    }

    const hoy = new Date();
    const hoyString = getLocalISOString();
    
    // Calcular Fin de Mes Actual
    const finDeMesActual = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    finDeMesActual.setHours(23, 59, 59, 999);
    
    // Calcular Fin de Semana (Próximo Domingo)
    const finDeSemana = new Date(hoy);
    const diaSemana = hoy.getDay(); // 0 es Domingo
    const diasParaDomingo = diaSemana === 0 ? 0 : 7 - diaSemana;
    finDeSemana.setDate(hoy.getDate() + diasParaDomingo);
    finDeSemana.setHours(23, 59, 59, 999);

    // --- FILTRADO DE DATOS ---
    let filteredDebts = [];

    if (currentFilterMode === 'pendientes') {
        filteredDebts = deudas.filter(d => {
            if (d.pagado) return false;
            const [anio, mes, dia] = d.fecha.split('-').map(Number);
            const fechaDeuda = new Date(anio, mes - 1, dia);
            return fechaDeuda <= finDeMesActual; 
        });

    } else if (currentFilterMode === 'pagadas') {
        filteredDebts = deudas.filter(d => d.pagado);
        filteredDebts.sort((a, b) => new Date(b.fecha_pago_real || b.created_at) - new Date(a.fecha_pago_real || a.created_at));
    
    } else if (currentFilterMode === 'proximas') {
        filteredDebts = deudas.filter(d => {
            if (d.pagado || d.numero_meses < 2) return false;
            
            // Filtro para incluir cuotas desde la 2ª
            const match = d.nombre.match(/\(Cuota (\d+)\/\d+\)/);
            if (match && match[1]) {
                const cuotaActual = parseInt(match[1]);
                return cuotaActual >= 2;
            }
            return false;
        });
    }

    mainContainer.innerHTML = '';

    if (filteredDebts.length === 0) {
        mainContainer.innerHTML = '<p style="text-align:center; color:#666; margin-top:20px;">No hay registros para esta sección.</p>';
        return;
    }

    // CASO 1: Lista Simple (Pagadas)
    if (currentFilterMode === 'pagadas') {
        filteredDebts.forEach(deuda => {
            const el = document.createElement('div');
            el.className = 'deuda pagado';
            const metodoTexto = deuda.metodo_pago ? ` con ${deuda.metodo_pago}` : '';
            const fechaPagoMostrar = deuda.fecha_pago_real ? deuda.fecha_pago_real : deuda.created_at;
            
            const linkComprobante = deuda.comprobante_url 
                ? `<br><a href="${deuda.comprobante_url}" target="_blank" style="color: #3498db; text-decoration: underline; font-size: 0.9em;">Ver Comprobante</a>` 
                : '';
            
            el.innerHTML = `
                <div class="deuda-info">
                    <strong>${cleanDebtName(deuda.nombre)}</strong><br>
                    S/ ${deuda.monto} - Pagado${metodoTexto} el ${formatPaymentDate(fechaPagoMostrar)}
                    ${linkComprobante}
                </div>`;
            mainContainer.appendChild(el);
        });
        return;
    }

    // CASO 2: Lista Agrupada (Pendientes y Próximas)
    const groupedDebts = filteredDebts.reduce((acc, deuda) => {
        const key = `${getMonthName(deuda.fecha)} ${deuda.fecha.split('-')[0]}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(deuda);
        return acc;
    }, {});

    for (const key in groupedDebts) {
        const groupHtml = document.createElement('div');
        groupHtml.className = 'mes-agrupador';
        groupHtml.innerHTML = `<h3 class="titulo-mes">${key.toUpperCase()}</h3>`;
        const list = document.createElement('div');
        list.className = 'lista-deudas-mensual';

        groupedDebts[key].forEach(deuda => {
            const [anio, mes, dia] = deuda.fecha.split('-').map(Number);
            const fechaDeuda = new Date(anio, mes - 1, dia);

            let statusClass = ''; 
            let statusLabel = '';
            
            // Lógica de Semáforo (Aplicada a ambas vistas agrupadas)
            // Incluye vencidas, hoy y esta semana.
            if (deuda.fecha === hoyString) {
                statusClass = 'alerta-hoy'; 
                statusLabel = '<span class="texto-amarillo">(VENCE HOY)</span>';
            } else if (deuda.fecha < hoyString) {
                statusClass = 'vencida';
                statusLabel = '<span class="texto-rojo">(DEUDA VENCIDA)</span>';
            } else if (fechaDeuda <= finDeSemana) {
                statusClass = 'alerta-semana'; 
                statusLabel = '<span class="texto-amarillo">(ESTA SEMANA)</span>';
            }

            const el = document.createElement('div');
            el.className = `deuda ${statusClass}`;
            
            // Info extra para "Deudas Próximas"
            const infoExtra = currentFilterMode === 'proximas' 
                ? `<br><small style="color:#aaa">Plan de ${deuda.numero_meses} cuotas (a partir de la 2ª)</small>` 
                : '';

            el.innerHTML = `
                <div class="deuda-info">
                    <strong>${cleanDebtName(deuda.nombre)} ${statusLabel}</strong><br>
                    <span>S/ ${parseFloat(deuda.monto).toFixed(2)} | Vence: ${deuda.fecha}</span>
                    ${infoExtra}
                </div>
                <div class="deuda-actions" style="display: flex; gap: 5px;">
                    <button class="action-btn edit" onclick="openVisualModal(${deuda.id})">Visualizar</button>
                    <button class="action-btn pay" onclick="openPaymentModal(${deuda.id})">Pagar</button>
                </div>`;
            list.appendChild(el);
        });
        groupHtml.appendChild(list);
        mainContainer.appendChild(groupHtml);
    }
};

    // --------------------------------------------------------------------------
    // 7. LÓGICA DE PAGOS (SUBIDA DE FOTOS CON VALIDACIÓN OCR)
    // --------------------------------------------------------------------------
    
    window.resetPaymentModalUI = () => {
        if(paymentButtonsContainer) paymentButtonsContainer.classList.remove('hidden');
        if(uploadSection) uploadSection.classList.add('hidden');
        if(comprobanteInput) comprobanteInput.value = ''; 
        if(previewContainer) previewContainer.classList.add('hidden');
        if(imgPreview) imgPreview.src = '';
    };

    window.openPaymentModal = (id) => {
        currentDebtIdToPay = id;
        window.resetPaymentModalUI();
        paymentModal.classList.remove('hidden');
    };

    window.processPayment = async (metodo) => {
        if (!currentDebtIdToPay) return;
        if (metodo === 'Efectivo') {
            paymentButtonsContainer.classList.add('hidden');
            uploadSection.classList.remove('hidden');
            return;
        }
        if (!confirm(`¿Confirmar pago con ${metodo}?`)) return;
        executePayment(metodo, null);
    };

    // Listener para previsualización (Vista previa de imagen)
    if(comprobanteInput) {
        comprobanteInput.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
                if (!validTypes.includes(file.type)) {
                    alert('❌ Formato no válido. Por favor sube una imagen (JPG o PNG).');
                    this.value = ''; 
                    previewContainer.classList.add('hidden');
                    return;
                }
                const maxSize = 5 * 1024 * 1024; // 5MB
                if (file.size > maxSize) {
                    alert('⚠️ La imagen es demasiado pesada (Máx 5MB).');
                    this.value = '';
                    previewContainer.classList.add('hidden');
                    return;
                }
                const reader = new FileReader();
                reader.onload = function(e) {
                    if(imgPreview) imgPreview.src = e.target.result;
                    if(previewContainer) previewContainer.classList.remove('hidden');
                }
                reader.readAsDataURL(file);
            }
        });
    }

    // --- LISTENER PRINCIPAL: VALIDACIÓN INTELIGENTE Y SUBIDA ---
    if(confirmUploadBtn) {
        confirmUploadBtn.addEventListener('click', async () => {
            const file = comprobanteInput.files[0];
            
            // 1. Verificación básica de existencia
            if (!file) {
                alert("⚠️ Por favor selecciona una imagen del comprobante.");
                return;
            }

            // Guardamos el texto original del botón para restaurarlo después
            const originalText = "Confirmar y Guardar";
            confirmUploadBtn.textContent = "Analizando comprobante...";
            confirmUploadBtn.disabled = true;

            try {
                // -----------------------------------------------------------------
                // A. PASO DE VALIDACIÓN INTELIGENTE (OCR)
                // -----------------------------------------------------------------
                // Palabras clave que esperamos en un recibo real
                const palabrasClave = [
                    'total', 'importe', 'monto', 's/', 'soles', 'fecha', 'hora', 
                    'destino', 'yape', 'plin', 'transferencia', 'pago', 'exitoso', 
                    'constancia', 'banco', 'operación', 'bcp', 'bbva', 'interbank', 'scotiabank',
                    'recibo', 'ticket', 'confirmación'
                ];
                
                // Ejecutamos Tesseract para leer la imagen (español)
                const { data: { text } } = await Tesseract.recognize(file, 'spa');
                const textoEncontrado = text.toLowerCase();
                
                // Verificamos si al menos UNA palabra clave existe
                const esComprobanteValido = palabrasClave.some(palabra => textoEncontrado.includes(palabra));

                if (!esComprobanteValido) {
                    alert("¡La imagen no parece ser un comprobante válido!.\n\ \nPor favor sube una foto clara del comprobante.");
                    confirmUploadBtn.textContent = originalText;
                    confirmUploadBtn.disabled = false;
                    return; 
                }

                // -----------------------------------------------------------------
                // B. PASO DE SUBIDA (SI PASÓ LA VALIDACIÓN)
                // -----------------------------------------------------------------
                confirmUploadBtn.textContent = "Subiendo archivo...";

                const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
                const fileName = `${Date.now()}_${currentDebtIdToPay}_${cleanFileName}`;
                
                const { data: storageData, error: storageError } = await supabase
                    .storage
                    .from('comprobantes')
                    .upload(fileName, file, { cacheControl: '3600', upsert: false });

                if (storageError) throw storageError;

                const { data: { publicUrl } } = supabase
                    .storage
                    .from('comprobantes')
                    .getPublicUrl(fileName);

                // C. REGISTRAR PAGO
                await executePayment('Efectivo', publicUrl);

            } catch (error) {
                console.error(error);
                alert('❌ Ocurrió un error inesperado: ' + error.message);
                confirmUploadBtn.textContent = originalText;
                confirmUploadBtn.disabled = false;
            }
        });
    }

    // Función que realmente guarda en la base de datos
    const executePayment = async (metodo, comprobanteUrl = null) => {
        const updateData = { 
            pagado: true, 
            fecha_pago_real: new Date(), 
            metodo_pago: metodo,
            comprobante_url: comprobanteUrl 
        };

        const { error } = await supabase
            .from('debts')
            .update(updateData)
            .eq('id', currentDebtIdToPay);

        if (error) {
            console.error(error);
            alert('Error al procesar pago: ' + error.message);
            if(confirmUploadBtn) {
                confirmUploadBtn.textContent = "Confirmar y Guardar";
                confirmUploadBtn.disabled = false;
            }
        } else {
            paymentModal.classList.add('hidden');
            currentDebtIdToPay = null;
            renderAllDebts();
            if(confirmUploadBtn) {
                confirmUploadBtn.textContent = "Confirmar y Guardar";
                confirmUploadBtn.disabled = false;
            }
            alert("✅ Pago validado y registrado correctamente.");
        }
    };

    // --------------------------------------------------------------------------
    // 8. CREAR Y EDITAR
    // --------------------------------------------------------------------------
    formDeuda.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { alert('Inicia sesión primero.'); return; }

        const nombre = document.getElementById('nombre-deuda').value.trim();
        const monto = parseFloat(document.getElementById('monto-deuda').value);
        const fecha = document.getElementById('fecha-pago').value;
        const meses = parseInt(document.getElementById('numero-meses').value || 1);
        const tasa = parseFloat(document.getElementById('tasa-interes').value || 0);

        const btn = formDeuda.querySelector('button');
        btn.disabled = true; btn.textContent = "Procesando...";

        const deudas = [];
        if (meses <= 1) {
            deudas.push({ user_id: user.id, email_usuario: user.email, nombre, monto, fecha, tasa_interes: tasa, numero_meses: 1 });
        } else {
            const cuota = calculateMonthlyInstallment(monto, tasa, meses);
            for (let i = 0; i < meses; i++) {
                deudas.push({
                    user_id: user.id,
                    email_usuario: user.email, 
                    nombre: `${nombre} (Cuota ${i+1}/${meses})`,
                    monto: cuota.toFixed(2),
                    fecha: addMonthsToDate(fecha, i),
                    tasa_interes: tasa,
                    numero_meses: meses
                });
            }
        }

        const { error } = await supabase.from('debts').insert(deudas);
        btn.disabled = false; btn.textContent = "Guardar Deuda";

        if (error) alert('Error: ' + error.message);
        else {
            alert("Deuda guardada correctamente.");
            formDeuda.reset();
            renderAllDebts();
            showSection(menuSection, "Panel Principal");
        }
    });

    window.openVisualModal = async (id) => {
        const { data } = await supabase.from('debts').select('*').eq('id', id).single();
        if (data) {
            const modalTitle = editModal.querySelector('h2');
            if(modalTitle) modalTitle.textContent = "Detalles de la Deuda";
            document.getElementById('edit-debt-index').value = id;
            document.getElementById('edit-nombre-deuda').value = cleanDebtName(data.nombre);
            document.getElementById('edit-monto-deuda').value = data.monto;
            document.getElementById('edit-fecha-pago').value = data.fecha;
            document.getElementById('edit-tasa-interes').value = data.tasa_interes || '';
            document.getElementById('edit-numero-meses').value = data.numero_meses || '';
            const inputs = editModal.querySelectorAll('input');
            inputs.forEach(input => input.setAttribute('readonly', true));
            const saveBtn = editModal.querySelector('button[type="submit"]');
            if(saveBtn) saveBtn.style.display = 'none';
            editModal.classList.remove('hidden');
        }
    };

    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        editModal.classList.add('hidden');
    });

    checkSessionOnLoad();
});