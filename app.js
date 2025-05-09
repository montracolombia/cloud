// Configuración global
const backendUrl = 'https://fastapi-backend-201226788937.us-central1.run.app';
//const backendUrl= 'http://127.0.0.1:8000'
let token = '';
let searchInProgress = false; // Prevent simultaneous searches
let isAdmin = false; // Variable global para controlar si el usuario es administrador
let currentUsers = []; // Variable para almacenar los usuarios actuales

// Variables globales para controlar la configuración del cliente
let clientConfig = null;
let defaultConfig = {
    columns: [
        {"jsonField": "code", "displayName": "Code", "displayOrder": 1, "visible": true, "type": "text"},
        {"jsonField": "length", "displayName": "Largo (cm)", "displayOrder": 2, "visible": true, "type": "number"},
        {"jsonField": "width", "displayName": "Ancho (cm)", "displayOrder": 3, "visible": true, "type": "number"},
        {"jsonField": "heigth", "displayName": "Alto (cm)", "displayOrder": 4, "visible": true, "type": "number"},
        {"jsonField": "weigth", "displayName": "Peso (Kg)", "displayOrder": 5, "visible": true, "type": "number"},
        {"jsonField": "measure_date", "displayName": "Fecha", "displayOrder": 6, "visible": true, "type": "datetime"},
        {"jsonField": "machine_pid", "displayName": "Equipo", "displayOrder": 7, "visible": true, "type": "text"},
        {"jsonField": "image_url", "displayName": "Imagen", "displayOrder": 8, "visible": true, "type": "image"}
    ]
};


// Agregar una nueva variable global para almacenar las máquinas
let availableMachines = []; // Lista de máquinas disponibles para el cliente actual

// Función para asegurar que el footer siempre esté visible apropiadamente
function adjustFooterPosition() {
    const container = document.querySelector('.container');
    const footer = document.querySelector('.footer');
    
    if (!container || !footer) return;
    
    // Obtener el último elemento visible antes del footer
    const visibleElements = Array.from(container.children).filter(el => {
        return el !== footer && 
            el.style.display !== 'none' && 
            getComputedStyle(el).display !== 'none';
    });
    
    if (visibleElements.length > 0) {
        const lastElement = visibleElements[visibleElements.length - 1];
        const lastElementBottom = lastElement.offsetTop + lastElement.offsetHeight;
        
        // Si la altura de la ventana es mayor que la posición del último elemento más un margen,
        // ajustar el margen superior del footer
        const windowHeight = window.innerHeight;
        const minMargin = 30; // Margen mínimo
        
        if (windowHeight > lastElementBottom + footer.offsetHeight + minMargin) {
            // Calcular cuánto espacio tenemos disponible
            const availableSpace = windowHeight - lastElementBottom - footer.offsetHeight;
            
            // Limitar el margen a un valor razonable (entre minMargin y 100px)
            const newMargin = Math.min(Math.max(minMargin, availableSpace / 2), 100);
            
            // Usar transición suave para el margen
            footer.style.transition = 'margin-top 0.2s ease-in-out';
            footer.style.marginTop = `${newMargin}px`;
        } else {
            // Usar el margen predeterminado con transición
            footer.style.transition = 'margin-top 0.2s ease-in-out';
            footer.style.marginTop = `${minMargin}px`;
        }
    }
}

// Al cargar la página, configurar los elementos del DOM
document.addEventListener('DOMContentLoaded', function() {
    // Configuración inicial
    const adminButton = document.getElementById('admin-button');
    if (adminButton) {
        adminButton.style.display = 'none'; // Inicialmente oculto hasta verificar si es admin
    }
    
    // Mostrar el botón de configuración de campos para administradores
    const configFieldsButton = document.getElementById('config-fields-button');
    if (configFieldsButton) {
        configFieldsButton.style.display = 'none'; // Inicialmente oculto
    }
    
    // Ocultar el panel de configuración de campos
    const configPanel = document.getElementById('client-config-panel');
    if (configPanel) {
        configPanel.style.display = 'none';
    }

    // Mostrar pero deshabilitar el selector de máquinas inicialmente
    const machineSelector = document.getElementById('machine-selector');
    const machineSelect = document.getElementById('machine');
    if (machineSelector && machineSelect) {
        machineSelector.style.display = 'block';
        machineSelect.disabled = true;
    }
    
    // Crear el panel de configuración de campos si no existe
    if (!document.getElementById('client-config-panel')) {
        createClientConfigPanel();
    }
    
    // Configurar funcionalidad de mostrar/ocultar contraseña
    const passwordInput = document.getElementById('password');
    const togglePasswordBtn = document.getElementById('toggle-password');

    if (passwordInput && togglePasswordBtn) {
        // Añadir event listener al botón de toggle
        togglePasswordBtn.addEventListener('click', function() {
            const openEyeIcon = this.querySelector('.eye-open');
            const closedEyeIcon = this.querySelector('.eye-closed');
            
            if (passwordInput.type === 'password') {
                // Cambiar a texto visible - mostrar el ojo abierto
                passwordInput.type = 'text';
                openEyeIcon.style.display = 'block';
                closedEyeIcon.style.display = 'none';
            } else {
                // Cambiar a texto oculto - mostrar el ojo tachado
                passwordInput.type = 'password';
                openEyeIcon.style.display = 'none';
                closedEyeIcon.style.display = 'block';
            }
        });
        
        // Evitar que el botón de toggle envíe el formulario
        togglePasswordBtn.addEventListener('click', function(e) {
            e.preventDefault();
        });
    }
    
    // Ajustar la posición del footer inicialmente
    adjustFooterPosition();
    
    // También ajustar cuando cambia el tamaño de la ventana
    window.addEventListener('resize', adjustFooterPosition);
});

// Función para crear el panel de configuración si no existe en el HTML
function createClientConfigPanel() {
    const configPanelHtml = `
        <div class="card" id="client-config-panel" style="display: none;">
            <h3>Configuración de Campos por Cliente</h3>
            <p>Configure qué campos mostrar y cómo mostrarlos para cada cliente</p>
            
            <div class="form-group">
                <label for="client-select">Seleccione Cliente:</label>
                <select id="client-select" onchange="loadClientFieldsConfig()"></select>
                <div style="margin-top: 15px; margin-bottom: 20px;">
                    <button type="button" onclick="showNewClientConfigForm()">Nuevo Cliente</button>
                </div>
            </div>
            
            <div id="client-fields-container" style="margin-top: 20px;"></div>
            
            <div class="buttons-container" style="margin-top: 20px; display: flex; justify-content: space-between;">
                <div>
                    <button type="button" onclick="addNewField()">Agregar Campo</button>
                    <button type="button" onclick="saveClientConfig()" class="primary">Guardar Configuración</button>
                </div>
                <div>
                    <button type="button" onclick="hideClientConfigPanel()" style="background-color: #2c3e50;">Volver a Búsqueda</button>
                </div>
            </div>
        </div>
    `;
    
    const container = document.querySelector('.container');
    container.insertAdjacentHTML('beforeend', configPanelHtml);
    
    // Mover el footer después del panel de configuración para que quede abajo
    const footer = document.querySelector('.footer');
    if (footer) {
        container.appendChild(footer);
    }
}

// Modificación para login: asegurar que las etiquetas se aplican correctamente
async function login(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');
    const loadingOverlay = document.getElementById('loading-overlay');
    
    // Resetear mensaje de error
    errorMessage.textContent = '';
    errorMessage.style.display = 'none';
    
    // Mostrar el overlay de carga
    loadingOverlay.classList.add('active');

    try {
        const response = await fetch(`${backendUrl}/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                'username': username,
                'password': password,
            }),
        });
        
        if (!response.ok) {
            const data = await response.json();
            loadingOverlay.classList.remove('active');
            showErrorMessage('Error de autenticación: ' + data.detail);
            return;
        }
        
        const data = await response.json();
        token = data.access_token;
        
        // Verificar si el usuario es administrador
        const userResponse = await fetch(`${backendUrl}/me`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        
        if (!userResponse.ok) {
            loadingOverlay.classList.remove('active');
            showErrorMessage('Error al obtener información del usuario');
            return;
        }
        
        const userData = await userResponse.json();
        isAdmin = userData.role === "admin";
        
        // Ocultar el formulario de login primero (sin transición)
        const loginForm = document.getElementById('login-form');
        loginForm.style.display = 'none';
        
        // Preparar el formulario de búsqueda, pero mantenerlo oculto
        const searchForm = document.getElementById('search-form');
        searchForm.style.display = 'none';
        
        // Actualizar la interfaz según el tipo de usuario
        const manageFoldersBtn = document.getElementById('manage-folders-btn');
        if (manageFoldersBtn) {
            manageFoldersBtn.style.display = isAdmin ? 'inline-block' : 'none';
        }
        
        // Mostrar botón de administración solo para administradores
        const adminButton = document.getElementById('admin-button');
        if (adminButton) {
            adminButton.style.display = isAdmin ? 'inline-block' : 'none';
        }
        
        // Mostrar botón de configuración de campos solo para administradores
        const configFieldsButton = document.getElementById('config-fields-button');
        if (configFieldsButton) {
            configFieldsButton.style.display = isAdmin ? 'inline-block' : 'none';
        }
        
        // CRÍTICO: Obtener información del usuario y configuraciones
        // Esto debe completarse ANTES de mostrar la interfaz
        console.log("Obteniendo información del usuario y configuraciones...");
        await getUserInfo();
        
        // Registrar estado de las etiquetas para depuración
        console.log("Estado después de getUserInfo:");
        logDOMElements();
        
        // Si el usuario es administrador, preparar el menú de administración
        if (isAdmin) {
            updateAdminMenu();
        }
        
        // Ahora que todo está cargado y configurado correctamente, mostrar la interfaz
        // Primero configurar los estilos iniciales para la animación
        searchForm.style.opacity = '0';
        searchForm.style.transform = 'scale(0.9)';
        searchForm.style.display = 'block';
        
        // Forzar un reflow para que la transición funcione
        void searchForm.offsetWidth;
        
        // Ahora que la interfaz está preparada, ocultar el overlay de carga
        loadingOverlay.classList.remove('active');
        
        // Y luego animar la aparición del formulario
        searchForm.style.transition = 'all 0.3s ease-out';
        searchForm.style.opacity = '1';
        searchForm.style.transform = 'scale(1)';
        
        // Verificar nuevamente que las etiquetas se hayan aplicado correctamente
        setTimeout(() => {
            console.log("Estado final de las etiquetas:");
            logDOMElements();
        }, 500);
        
    } catch (error) {
        console.error('Error durante el inicio de sesión:', error);
        loadingOverlay.classList.remove('active');
        showErrorMessage('Error de conexión: ' + error.message);
    }
    
    // Ajustar la posición del footer (se ejecuta siempre, en éxito o error)
    setTimeout(adjustFooterPosition, 300);
}

// Mejora del overlay de carga para mostrar mensajes y asegurar visibilidad
function showLoadingOverlay(message = '') {
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.querySelector('.loading-text');
    
    // Si existe un elemento para el texto, actualizarlo
    if (loadingText) {
        loadingText.textContent = message;
    } else {
        // Si no existe, crear uno y añadirlo
        const textElem = document.createElement('div');
        textElem.className = 'loading-text';
        textElem.textContent = message;
        const spinner = loadingOverlay.querySelector('.loading-spinner');
        if (spinner) {
            spinner.appendChild(textElem);
        } else {
            loadingOverlay.appendChild(textElem);
        }
    }
    
    // Asegurarse de que sea visible y se muestre por encima de todo
    loadingOverlay.style.zIndex = '9999';
    loadingOverlay.classList.add('active');
}  

// Función para ocultar el overlay de carga
function hideLoadingOverlay() {
    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.classList.remove('active');
}

// Función para mostrar un modal de alerta personalizado (reemplaza alert)
function showAlert(message, title = 'Información', callback = null) {
    const modal = document.getElementById('custom-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const confirmBtn = document.getElementById('modal-confirm-btn');
    const cancelBtn = document.getElementById('modal-cancel-btn');
    
    // Configurar el modal
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    confirmBtn.textContent = 'Aceptar';
    cancelBtn.style.display = 'none'; // Ocultar botón de cancelar en alertas
    
    // Mostrar el modal
    modal.style.display = 'block';
    
    // Manejar clic en Aceptar
    confirmBtn.onclick = function() {
        modal.style.display = 'none';
        if (callback && typeof callback === 'function') {
            callback(true);
        }
    };
    
    // Cerrar modal al hacer clic fuera del contenido
    modal.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
            if (callback && typeof callback === 'function') {
                callback(false);
            }
        }
    };
}

// Función para mostrar un modal de confirmación personalizado (reemplaza confirm)
function showConfirm(message, title = 'Confirmación', callback) {
    const modal = document.getElementById('custom-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const confirmBtn = document.getElementById('modal-confirm-btn');
    const cancelBtn = document.getElementById('modal-cancel-btn');
    
    // Configurar el modal
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    confirmBtn.textContent = 'Aceptar';
    cancelBtn.style.display = 'inline-block'; // Mostrar botón de cancelar
    cancelBtn.textContent = 'Cancelar';
    
    // Mostrar el modal
    modal.style.display = 'block';
    
    // Manejar clic en Aceptar
    confirmBtn.onclick = function() {
        modal.style.display = 'none';
        if (callback && typeof callback === 'function') {
            callback(true);
        }
    };
    
    // Manejar clic en Cancelar
    cancelBtn.onclick = function() {
        modal.style.display = 'none';
        if (callback && typeof callback === 'function') {
            callback(false);
        }
    };
    
    // Cerrar modal al hacer clic fuera del contenido
    modal.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
            if (callback && typeof callback === 'function') {
                callback(false);
            }
        }
    };
}

// Función modificada para logout con reinicio completo de selectores
function logout() {
    // Limpiar mensajes de error
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = '';
    errorMessage.style.display = 'none';  // Ocultar completamente
    
    // Ocultar formulario de búsqueda con animación
    const searchForm = document.getElementById('search-form');
    searchForm.style.opacity = '0';
    searchForm.style.transform = 'scale(0.9)';
    
    // Limpiar campos de búsqueda
    document.getElementById('sku').value = '';
    document.getElementById('start-date').value = '';
    document.getElementById('end-date').value = '';
    
    // Reiniciar el selector de máquina
    const machineSelect = document.getElementById('machine');
    if (machineSelect) {
        machineSelect.innerHTML = '<option value="">Todas las máquinas</option>';
        machineSelect.value = '';
        machineSelect.disabled = true;
    }
    
    // Si es admin, limpiar el selector de carpeta
    const adminFolderSelect = document.getElementById('admin-folder');
    if (adminFolderSelect) {
        adminFolderSelect.value = '';
    }
    
    // Limpiar resultados
    document.getElementById('results').innerHTML = '';
    
    // Resetear la lista de máquinas disponibles
    availableMachines = [];
    
    // Esperar animación
    setTimeout(() => {
        // Reiniciar estado
        token = '';
        isAdmin = false;
        
        // Limpiar campos de login
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        
        // Ocultar formulario de búsqueda
        searchForm.style.display = 'none';
        
        // Mostrar login con animación
        const loginForm = document.getElementById('login-form');
        loginForm.style.display = 'block';
        loginForm.style.opacity = '0';
        loginForm.style.transform = 'scale(0.9)';
        
        // Forzar reflow
        void loginForm.offsetWidth;
        
        // Animar entrada
        loginForm.style.opacity = '1';
        loginForm.style.transform = 'scale(1)';
        
        // Ocultar paneles de administración
        const adminPanel = document.getElementById('admin-panel');
        const configPanel = document.getElementById('client-config-panel');
        
        if (adminPanel) adminPanel.style.display = 'none';
        if (configPanel) configPanel.style.display = 'none';
        
        // Asegurarse de que el mensaje de error esté configurado correctamente para el siguiente inicio de sesión
        errorMessage.style.display = 'none'; // Inicialmente oculto
        errorMessage.textContent = ''; // Sin texto
        
        // Asegurar que cualquier otro estado también se reinicie
        clientConfig = null;
        
        // Ajustar footer
        setTimeout(adjustFooterPosition, 300);
    }, 300);
}

// Función mejorada para mostrar mensajes de error
function showErrorMessage(message) {
    const errorMessage = document.getElementById('error-message');
    
    // Limpiar cualquier contenido o estilo previo
    errorMessage.textContent = '';
    
    // Establecer el nuevo mensaje
    errorMessage.textContent = message;
    
    // Asegurarse de que sea visible
    errorMessage.style.display = 'block';
    
    // Aplicar estilos adicionales para destacar
    errorMessage.style.padding = '10px';
    errorMessage.style.marginBottom = '15px';
    errorMessage.style.borderRadius = '8px';
    errorMessage.style.backgroundColor = 'rgba(255, 0, 0, 0.05)';
    errorMessage.style.border = '1px solid rgba(255, 0, 0, 0.2)';
    errorMessage.style.borderLeft = '4px solid #ff0000';
    errorMessage.style.color = '#ff0000';
    
    // Scroll al mensaje para asegurarse de que sea visible
    errorMessage.scrollIntoView({behavior: 'smooth', block: 'start'});
    
    // Opcionalmente, programar el mensaje para desaparecer después de un tiempo
    setTimeout(() => {
        // Reducir la opacidad gradualmente
        errorMessage.style.transition = 'opacity 1s';
        errorMessage.style.opacity = '0.7';
    }, 5000); // 5 segundos antes de comenzar a desvanecer
}

// 1. Modificar getUserInfo para garantizar que se carguen las configuraciones de cliente
async function getUserInfo() {
    try {
        // Mostrar overlay de carga con mensaje contextual
        showLoadingOverlay('');
        
        // Reiniciar el selector de máquina al principio
        const machineSelect = document.getElementById('machine');
        if (machineSelect) {
            machineSelect.innerHTML = '<option value="">Todas las máquinas</option>';
            machineSelect.value = '';
            machineSelect.disabled = true;
        }
        
        // Reiniciar la lista de máquinas disponibles
        availableMachines = [];
        
        // Primero obtenemos información del usuario actual
        const userResponse = await fetch(`${backendUrl}/me`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        
        if (userResponse.ok) {
            const userData = await userResponse.json();
            console.log("Información del usuario:", userData);
            
            // Determinar si es administrador
            isAdmin = userData.role === "admin";
            
            // Actualizar mensaje de carga
            showLoadingOverlay('');
            
            try {
                // Obtener configuraciones de clientes
                const response = await fetch(`${backendUrl}/client_config`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });
                
                if (response.ok) {
                    const data = await response.json();
                    
                    // Almacenar todas las configuraciones globalmente para usarlas en diferentes partes
                    if (data.clientConfigs) {
                        // Si recibimos un array de configuraciones (para admin)
                        window.allClientConfigs = data.clientConfigs || [];
                        console.log("Configuraciones de cliente cargadas:", window.allClientConfigs);
                    } else if (data.clientConfig) {
                        // Si recibimos una sola configuración (para usuarios)
                        window.allClientConfigs = [data.clientConfig];
                        console.log("Configuración de cliente cargada:", data.clientConfig);
                    } else {
                        // Si no recibimos datos válidos, usar las configuraciones hardcodeadas
                        window.allClientConfigs = getHardcodedConfigs();
                        console.log("Usando configuraciones hardcodeadas por respaldo");
                    }
                } else {
                    // Si hay un error en la respuesta, usar configuraciones hardcodeadas
                    window.allClientConfigs = getHardcodedConfigs();
                    console.log("Error en la respuesta, usando configuraciones hardcodeadas");
                }
            } catch (error) {
                // En caso de error de conexión, usar configuraciones hardcodeadas
                console.error("Error al obtener configuraciones:", error);
                window.allClientConfigs = getHardcodedConfigs();
                console.log("Usando configuraciones hardcodeadas debido a error");
            }
            
            // Actualizar el selector de carpetas según el tipo de usuario
            const adminFolderSelector = document.getElementById('admin-folder-selector');
            const adminFolderSelect = document.getElementById('admin-folder');
            
            if (isAdmin) {
                // Para administradores, mostrar todas las carpetas
                // Limpiar opciones existentes
                adminFolderSelect.innerHTML = '<option value="">Seleccione una carpeta</option>';
                
                // Filtrar solo configuraciones de clientes reales (no default)
                const clientConfigs = window.allClientConfigs.filter(config => 
                    config.clientId && 
                    config.clientId !== 'default' && 
                    config.clientId !== 'admin'
                );

                // Agregar cada cliente/carpeta como una opción
                clientConfigs.forEach(config => {
                    const option = document.createElement('option');
                    option.value = config.clientId;
                    option.textContent = config.displayName || config.clientId;
                    adminFolderSelect.appendChild(option);
                });
                
                // Mostrar selector de carpetas SOLO para administradores
                adminFolderSelector.style.display = 'block';
                
                // Añadir evento al selector de carpetas
                adminFolderSelect.onchange = adminFolderChanged;
                adminFolderSelect.disabled = false;
                adminFolderSelect.value = ''; // Reiniciar selección
                
                // Para administradores, establecer etiquetas predeterminadas
                applySearchLabels(null);
            } else {
                // Para usuarios normales, verificar si tienen carpeta asignada
                if (userData.folder) {
                    // Buscar configuración específica para su carpeta
                    const userConfig = window.allClientConfigs.find(
                        config => config.clientId && config.clientId.toLowerCase() === userData.folder.toLowerCase()
                    );
                    
                    console.log("Carpeta del usuario:", userData.folder);
                    console.log("Configuración encontrada para el usuario:", userConfig);
                    
                    // CAMBIO CRÍTICO: Verificar si encontramos configuración válida
                    if (userConfig) {
                        console.log("Aplicando etiquetas personalizadas de la configuración:", userConfig.clientId);
                        applySearchLabels(userConfig);
                    } else {
                        // Si no encontramos configuración para este usuario, buscar en las hardcodeadas
                        const hardcodedConfigs = getHardcodedConfigs();
                        const hardcodedConfig = hardcodedConfigs.find(
                            config => config.clientId && config.clientId.toLowerCase() === userData.folder.toLowerCase()
                        );
                        
                        if (hardcodedConfig) {
                            console.log("Usando configuración hardcodeada para:", userData.folder);
                            applySearchLabels(hardcodedConfig);
                        } else {
                            console.log("No se encontró configuración para la carpeta. Usando etiquetas específicas para:", userData.folder);
                            applyCustomLabelsForFolder(userData.folder);
                        }
                    }
                    
                    // Actualizar mensaje de carga
                    showLoadingOverlay('');
                    
                    // Tienen carpeta asignada, obtener máquinas para esta carpeta
                    await loadMachinesForFolder(userData.folder);
                    
                    // Ocultar selector de carpetas para usuarios normales
                    adminFolderSelector.style.display = 'none';
                } else {
                    // En el caso extraño que un usuario no tenga carpeta asignada
                    adminFolderSelector.style.display = 'none';
                    availableMachines = [];
                    updateMachineSelector();
                    
                    // Aplicar etiquetas predeterminadas
                    applySearchLabels(null);
                }
            }

            // Cargar la configuración del cliente para el usuario actual
            await loadClientConfig();
        }
    } catch (error) {
        console.error('Error al cargar información de usuario o configuraciones:', error);
        showErrorMessage('Error al cargar la configuración: ' + error.message);
    } finally {
        // No ocultamos el overlay aquí, lo dejamos para la función de login
        // que decidirá cuándo mostrar la interfaz completamente
    }
}

// 2. Función para obtener las configuraciones hardcodeadas (como respaldo)
function getHardcodedConfigs() {
    return [
        {
            "clientId": "default",
            "displayName": "Configuración Predeterminada",
            "tableConfig": {
                "columns": [
                    {"jsonField": "code", "displayName": "SKU", "displayOrder": 1, "visible": true, "type": "text"},
                    {"jsonField": "machine_pid", "displayName": "Equipo", "displayOrder": 2, "visible": true, "type": "text"},
                    {"jsonField": "length", "displayName": "Largo (cm)", "displayOrder": 3, "visible": true, "type": "number", "decimals": 2},
                    {"jsonField": "width", "displayName": "Ancho (cm)", "displayOrder": 4, "visible": true, "type": "number", "decimals": 2},
                    {"jsonField": "heigth", "displayName": "Alto (cm)", "displayOrder": 5, "visible": true, "type": "number", "decimals": 2},
                    {"jsonField": "weigth", "displayName": "Peso (Kg)", "displayOrder": 6, "visible": true, "type": "number", "decimals": 3},
                    {"jsonField": "measure_date", "displayName": "Fecha", "displayOrder": 7, "visible": true, "type": "datetime"},
                    {"jsonField": "image_url", "displayName": "Imagen", "displayOrder": 8, "visible": true, "type": "image"}
                ]
            },
            "searchLabels": {
                "codeLabel": "Buscar por Código",
                "machineLabel": "Filtrar por Máquina",
                "folderLabel": "Seleccionar Carpeta"
            }
        },
        {
            "clientId": "Deprisa",
            "displayName": "Deprisa",
            "tableConfig": {
                "columns": [
                    {"jsonField": "code", "displayName": "Código", "displayOrder": 1, "visible": true, "type": "text"},
                    {"jsonField": "machine_pid", "displayName": "Equipo", "displayOrder": 2, "visible": true, "type": "text"},
                    {"jsonField": "length", "displayName": "Largo (cm)", "displayOrder": 3, "visible": true, "type": "number", "decimals": 2},
                    {"jsonField": "width", "displayName": "Ancho (cm)", "displayOrder": 4, "visible": true, "type": "number", "decimals": 2},
                    {"jsonField": "heigth", "displayName": "Alto (cm)", "displayOrder": 5, "visible": true, "type": "number", "decimals": 2},
                    {"jsonField": "weigth", "displayName": "Peso (Kg)", "displayOrder": 6, "visible": true, "type": "number", "decimals": 3},
                    {"jsonField": "measure_date", "displayName": "Fecha", "displayOrder": 7, "visible": true, "type": "datetime"},
                    {"jsonField": "image_url", "displayName": "Imagen", "displayOrder": 8, "visible": true, "type": "image"}
                ]
            },
            "searchLabels": {
                "codeLabel": "Buscar por code",
                "machineLabel": "Máquina",
                "folderLabel": "Seleccionar Cliente"
            }
        },
        {
            "clientId": "TCC",
            "displayName": "TCC",
            "tableConfig": {
                "columns": [
                    {"jsonField": "sku", "displayName": "SKU", "displayOrder": 1, "visible": true, "type": "text"},
                    {"jsonField": "largo", "displayName": "Largo (cm)", "displayOrder": 2, "visible": true, "type": "number", "decimals": 2},
                    {"jsonField": "ancho", "displayName": "Ancho (cm)", "displayOrder": 3, "visible": true, "type": "number", "decimals": 2},
                    {"jsonField": "alto", "displayName": "Alto (cm)", "displayOrder": 4, "visible": true, "type": "number", "decimals": 2},
                    {"jsonField": "peso", "displayName": "Peso (Kg)", "displayOrder": 5, "visible": true, "type": "number", "decimals": 3},
                    {"jsonField": "fecha", "displayName": "Date", "displayOrder": 6, "visible": true, "type": "datetime"},
                    {"jsonField": "nombre_maquina", "displayName": "Sede", "displayOrder": 7, "visible": true, "type": "text"},
                    {"jsonField": "Nombre_imagen", "displayName": "Imagen", "displayOrder": 8, "visible": true, "type": "image"}
                ]
            },
            "searchLabels": {
                "codeLabel": "Buscar SKU",
                "machineLabel": "Filtrar Sede",
                "folderLabel": "Cliente"
            }
        }
    ];
}

// 3. Función para aplicar etiquetas personalizadas según la carpeta
function applyCustomLabelsForFolder(folderName) {
    if (!folderName) return;
    
    // Convertir a minúsculas para comparación insensible a mayúsculas/minúsculas
    const folder = folderName.toLowerCase();
    
    let codeLabel, machineLabel, folderLabel;
    
    // Configuraciones específicas por carpeta
    switch (folder) {
        case 'deprisa':
            codeLabel = "Buscar por code";
            machineLabel = "Máquina";
            folderLabel = "Seleccionar Cliente";
            break;
        case 'tcc':
            codeLabel = "Buscar SKU";
            machineLabel = "Filtrar Sede";
            folderLabel = "Cliente";
            break;
        default:
            // Valores predeterminados para cualquier otra carpeta
            codeLabel = "Buscar por Código";
            machineLabel = "Filtrar por Máquina";
            folderLabel = "Seleccionar Cliente";
    }
    
    // Actualizar las etiquetas en la interfaz
    updateLabelsInDOM(codeLabel, machineLabel, folderLabel);
    
    console.log(`Etiquetas personalizadas aplicadas para carpeta ${folderName}:`, {
        codeLabel, machineLabel, folderLabel
    });
}


// Asegurar que las etiquetas se actualicen al cambiar la carpeta seleccionada (admin)
function adminFolderChanged() {
    const adminFolderSelect = document.getElementById('admin-folder');
    if (adminFolderSelect) {
        const selectedFolder = adminFolderSelect.value;
        
        // Deshabilitar temporalmente el selector de máquinas mientras se cargan
        const machineSelect = document.getElementById('machine');
        if (machineSelect) {
            machineSelect.disabled = true;
            machineSelect.innerHTML = '<option value="">Cargando máquinas...</option>';
        }
        
        // Cargar las máquinas disponibles para esta carpeta
        loadMachinesForFolder(selectedFolder);
        
        // Actualizar las etiquetas según la carpeta seleccionada
        if (selectedFolder) {
            const selectedConfig = window.allClientConfigs.find(
                config => config.clientId === selectedFolder
            );
            applySearchLabels(selectedConfig);
        } else {
            // Si no hay carpeta seleccionada, usar etiquetas predeterminadas
            applySearchLabels(null);
        }
    }
}

// Función modificada para mejorar la actualización y reinicio del selector de máquinas
function updateMachineSelector() {
    const machineSelector = document.getElementById('machine-selector');
    if (!machineSelector) {
        console.error("No se encontró el elemento 'machine-selector'");
        return;
    }
    
    // Siempre mostrar el selector, pero habilitarlo/deshabilitarlo según corresponda
    machineSelector.style.display = 'block';
    
    // Limpiar selector existente
    const machineSelect = document.getElementById('machine');
    if (machineSelect) {
        // Cuando se actualiza el selector, siempre empezar con una lista limpia
        machineSelect.innerHTML = '<option value="">Todas las máquinas</option>';
        
        // Si hay máquinas disponibles, agregar cada máquina como una opción y habilitar el selector
        if (availableMachines && availableMachines.length > 0) {
            availableMachines.forEach(machine => {
                const option = document.createElement('option');
                option.value = machine;
                option.textContent = machine;
                machineSelect.appendChild(option);
            });
            
            // Siempre iniciar con la opción "Todas las máquinas" seleccionada
            machineSelect.value = "";
            
            // Habilitar el selector
            machineSelect.disabled = false;
        } else {
            // Si no hay máquinas, deshabilitar el selector pero mantenerlo visible
            machineSelect.disabled = true;
            
            // Si no hay máquinas disponibles, indicarlo
            if (machineSelect.options.length <= 1) {
                const noMachinesOption = document.createElement('option');
                noMachinesOption.value = "";
                noMachinesOption.textContent = "No hay máquinas disponibles";
                machineSelect.innerHTML = ''; // Limpiar el "Todas las máquinas"
                machineSelect.appendChild(noMachinesOption);
            }
        }
    }
    
    console.log("Selector de máquinas actualizado. Máquinas disponibles:", availableMachines);
}

// Modificar la función loadMachinesForFolder para mejorar la carga de máquinas
async function loadMachinesForFolder(folderId) {
    if (!folderId) {
        availableMachines = [];
        updateMachineSelector();
        return;
    }
    
    try {
        console.log(`Cargando máquinas para la carpeta: ${folderId}`);
        
        // Deshabilitar temporalmente el selector de máquinas mientras se cargan
        const machineSelect = document.getElementById('machine');
        if (machineSelect) {
            machineSelect.disabled = true;
            machineSelect.innerHTML = '<option value="">Cargando máquinas...</option>';
        }
        
        const response = await fetch(`${backendUrl}/machines?folder=${folderId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log(`Máquinas cargadas para ${folderId}:`, data.machines);
            
            // Actualizar la variable global de máquinas disponibles
            availableMachines = data.machines || [];
            
            // Actualizar selector de máquinas
            updateMachineSelector();
        } else {
            console.error('Error al cargar máquinas:', await response.text());
            availableMachines = [];
            updateMachineSelector();
        }
    } catch (error) {
        console.error('Error al cargar máquinas para la carpeta:', error);
        availableMachines = [];
        updateMachineSelector();
    }
}


// Función asincrónica para recargar la lista de carpetas del selector
async function reloadFolderSelector() {
    try {
        const response = await fetch(`${backendUrl}/client_config`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // Actualizar la lista global
            window.allClientConfigs = data.clientConfigs || [];
            
            // Actualizar el selector de carpetas para administradores
            if (isAdmin) {
                const adminFolderSelect = document.getElementById('admin-folder');
                if (adminFolderSelect) {
                    // Guardar la selección actual
                    const currentSelection = adminFolderSelect.value;
                    
                    // Limpiar opciones existentes
                    adminFolderSelect.innerHTML = '<option value="">Seleccione una carpeta</option>';
                    
                    // Filtrar solo configuraciones de clientes reales (no default)
                    const clientConfigs = data.clientConfigs.filter(config => 
                        config.clientId && 
                        config.clientId !== 'default' && 
                        config.clientId !== 'admin'
                    );
                    
                    // Agregar cada cliente/carpeta como una opción
                    clientConfigs.forEach(config => {
                        const option = document.createElement('option');
                        option.value = config.clientId;
                        option.textContent = config.displayName || config.clientId;
                        adminFolderSelect.appendChild(option);
                    });
                    
                    // Restaurar la selección si todavía existe
                    if (currentSelection && clientConfigs.some(c => c.clientId === currentSelection)) {
                        adminFolderSelect.value = currentSelection;
                    }
                }
            }
            
            console.log("✅ Selector de carpetas actualizado correctamente");
            return true;
        }
    } catch (error) {
        console.error('Error al recargar el selector de carpetas:', error);
    }
    return false;
}


async function loadClientConfig() {
    try {
        const response = await fetch(`${backendUrl}/client_config`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        
        if (response.ok) {
            const data = await response.json();

            if (data.clientConfig) {
                // Para usuarios normales, se devuelve una sola configuración
                clientConfig = data.clientConfig.tableConfig;
            } else if (data.clientConfigs && data.clientConfigs.length > 0) {
                // Para administradores, se devuelven todas las configuraciones
                window.allClientConfigs = data.clientConfigs;
                
                // Obtener la carpeta del usuario actual
                const userResponse = await fetch(`${backendUrl}/me`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });
                const userData = await userResponse.json();
                
                // Buscar configuración para la carpeta del usuario
                const userFolderConfig = data.clientConfigs.find(config => 
                    config.clientId.toLowerCase() === userData.folder.toLowerCase()
                );
                
                // Usar la configuración de la carpeta del usuario o la configuración predeterminada
                clientConfig = userFolderConfig ? 
                    userFolderConfig.tableConfig : 
                    (data.clientConfigs.find(c => c.clientId === 'default')?.tableConfig || 
                     data.clientConfigs[0].tableConfig);
            }
        } else {
            console.error('Error al cargar la configuración del cliente');
            clientConfig = { columns: [...defaultConfig.columns] };
        }
    } catch (error) {
        console.error('Error al cargar la configuración del cliente:', error);
        clientConfig = { columns: [...defaultConfig.columns] };
    }
}

// También modificamos la función de búsqueda para usar el overlay mejorado
async function searchImages(event) {
    event.preventDefault();

    if (searchInProgress) {
        console.log('Búsqueda en progreso, por favor espere...');
        return;
    }

    // Mostrar overlay de carga con mensaje contextual
    showLoadingOverlay('');
    
    try {
        // Obtener información del usuario actual
        const userResponse = await fetch(`${backendUrl}/me`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        const userData = await userResponse.json();

        // Determinar la carpeta a usar
        let folder = '';
        const adminFolderSelector = document.getElementById('admin-folder-selector');
        const adminFolderSelect = document.getElementById('admin-folder');
        const errorMessage = document.getElementById('error-message');

        // Resetear mensaje de error
        errorMessage.textContent = '';
        errorMessage.style.display = 'none';

        if (isAdmin) {
            // Para administradores, verificar selección de carpeta
            if (!adminFolderSelect.value) {
                // Ocultar overlay de carga
                hideLoadingOverlay();
                // Mostrar mensaje de error usando la función mejorada
                showErrorMessage('Debe seleccionar una carpeta como administrador');
                return;
            }
            folder = adminFolderSelect.value;
            adminFolderSelector.style.display = 'block';
        } else {
            // Para usuarios normales, usar su carpeta asignada
            folder = userData.folder || '';
            
            // Ocultar y limpiar el selector de carpetas
            adminFolderSelector.style.display = 'none';
            adminFolderSelect.innerHTML = '<option value="">Seleccione una carpeta</option>';
        }

        searchInProgress = true;
        
        const sku = document.getElementById('sku').value;
        const startDate = document.getElementById('start-date').value.split('-').reverse().join('/');
        const endDate = document.getElementById('end-date').value.split('-').reverse().join('/');
        
        // Obtener la máquina seleccionada (si existe)
        const machineSelect = document.getElementById('machine');
        const machine = machineSelect ? machineSelect.value : '';
        
        const results = document.getElementById('results');
        results.innerHTML = ''; // Clear previous results

        if ((startDate && !endDate) || (!startDate && endDate)) {
            hideLoadingOverlay();
            showErrorMessage('Debe seleccionar ambas fechas si selecciona una de ellas.');
            searchInProgress = false;
            return;
        }

        // Actualizar mensaje de carga para la búsqueda
        showLoadingOverlay('');

        let url = '';
        // Determinar qué endpoint usar según los parámetros especificados
        if (sku && startDate && endDate && machine) {
            // Búsqueda por SKU, fecha y máquina
            url = `${backendUrl}/search_by_machine_date_and_sku/${sku}?start_date=${startDate}&end_date=${endDate}&machine=${machine}&folder=${folder}`;
        } else if (sku && machine) {
            // Búsqueda por SKU y máquina
            url = `${backendUrl}/search_by_sku_and_machine/${sku}?machine=${machine}&folder=${folder}`;
        } else if (startDate && endDate && machine) {
            // Búsqueda por fecha y máquina
            url = `${backendUrl}/search_by_machine_and_date?start_date=${startDate}&end_date=${endDate}&machine=${machine}&folder=${folder}`;
        } else if (sku && startDate && endDate) {
            // Búsqueda por SKU y fecha (en todas las máquinas)
            url = `${backendUrl}/search_by_sku_and_date/${sku}?start_date=${startDate}&end_date=${endDate}&folder=${folder}`;
            // Agregar máquina como parámetro si se especificó
            if (machine) {
                url += `&machine=${machine}`;
            }
        } else if (sku) {
            // Búsqueda solo por SKU (en todas las máquinas)
            url = `${backendUrl}/search_by_sku/${sku}?folder=${folder}`;
            // Agregar máquina como parámetro si se especificó
            if (machine) {
                url += `&machine=${machine}`;
            }
        } else if (startDate && endDate) {
            // Búsqueda solo por fecha (en todas las máquinas)
            url = `${backendUrl}/search_by_date?start_date=${startDate}&end_date=${endDate}&folder=${folder}`;
            // Agregar máquina como parámetro si se especificó
            if (machine) {
                url += `&machine=${machine}`;
            }
        } else {
            hideLoadingOverlay();
            showErrorMessage('Debe ingresar un SKU o un rango de fechas.');
            searchInProgress = false;
            return;
        }

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        const data = await response.json();
        
        // Actualizar mensaje de carga para el procesamiento final
        showLoadingOverlay('');
        
        if (response.ok) {
            if (data.results && data.results.length > 0) {
                // Si es admin y ha seleccionado una carpeta específica
                if (isAdmin && folder) {
                    const folderConfig = window.allClientConfigs.find(
                        config => config.clientId.toLowerCase() === folder.toLowerCase()
                    );
                    
                    if (folderConfig) {
                        clientConfig = folderConfig.tableConfig;
                        console.log('Configuración para carpeta admin:', clientConfig);
                    }
                }
                
                renderDynamicTable(data.results);
            } else {
                // Mostrar mensaje de error mejorado
                hideLoadingOverlay();
                showErrorMessage('No se encontraron resultados para la búsqueda realizada');
            }
        
            document.getElementById('sku').value = '';
            document.getElementById('start-date').value = '';
            document.getElementById('end-date').value = '';
            // No limpiar el selector de máquina para permitir búsquedas consecutivas en la misma máquina
            validateDates();
        } else {
            hideLoadingOverlay();
            showErrorMessage('Error al buscar resultados: ' + data.detail);
        }
    } catch (error) {
        console.error('Error during search:', error);
        hideLoadingOverlay();
        showErrorMessage('Error de conexión: ' + error.message);
    } finally {
        searchInProgress = false;
        hideLoadingOverlay();
        
        // Ajustar la posición del footer
        setTimeout(adjustFooterPosition, 300);
    }
}

// Modificación de la función renderDynamicTable para garantizar que el botón de exportación sea visible
function renderDynamicTable(results) {
    const resultsDiv = document.getElementById('results');
    
    if (!results || results.length === 0) {
        resultsDiv.innerHTML = '<div class="empty-results"><p>No se encontraron resultados.</p></div>';
        setTimeout(adjustFooterPosition, 300);
        return;
    }
    
    // Usar la configuración del cliente o la predeterminada
    const config = clientConfig || { columns: [...defaultConfig.columns] };
    
    // Ordenar las columnas según displayOrder
    const sortedColumns = [...config.columns]
        .filter(col => col.visible)
        .sort((a, b) => a.displayOrder - b.displayOrder);
    
    // Limpiar resultados anteriores
    resultsDiv.innerHTML = '';
    
    // Añadir botón de exportación antes de la tabla - MODIFICADO: ahora se añade primero
    const exportButtonContainer = document.createElement('div');
    exportButtonContainer.className = 'export-button-container';
    exportButtonContainer.style.marginBottom = '15px';
    exportButtonContainer.style.display = 'flex'; // Asegurar que es visible
    exportButtonContainer.style.justifyContent = 'flex-start'; // Alineación
    
    const exportButton = document.createElement('button');
    exportButton.textContent = 'Exportar a Excel';
    exportButton.className = 'export-button';
    exportButton.style.backgroundColor = '#28a745'; // Verde para diferenciar
    exportButton.style.color = 'white'; // Asegurar texto visible
    exportButton.style.padding = '10px 15px'; // Padding adecuado
    exportButton.style.borderRadius = '8px'; // Bordes redondeados
    exportButton.style.border = 'none'; // Sin borde
    exportButton.style.cursor = 'pointer'; // Cursor tipo puntero
    exportButton.style.fontWeight = 'bold'; // Texto en negrita
    exportButton.onclick = () => exportToExcel(results, sortedColumns);
    
    exportButtonContainer.appendChild(exportButton);
    resultsDiv.appendChild(exportButtonContainer);
    
    // Crear el contenedor de la tabla
    const tableContainer = document.createElement('div');
    tableContainer.className = 'table-container';
    
    // Crear la tabla
    const table = document.createElement('table');
    
    // Crear el encabezado
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // Agregar las columnas del encabezado
    sortedColumns.forEach(column => {
        const th = document.createElement('th');
        th.textContent = column.displayName;
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Crear el cuerpo de la tabla
    const tbody = document.createElement('tbody');
    
    // Agregar filas de datos
    results.forEach(item => {
        console.log('Item completo:', item);
        
        const row = document.createElement('tr');
        
        // Agregar celdas según la configuración
        sortedColumns.forEach(column => {
            const td = document.createElement('td');
            const fieldName = column.jsonField;
            const fieldValue = item[fieldName];
            
            // Renderizar según el tipo de dato
            switch(column.type) {
                case 'image':
                    // Estrategias para encontrar la imagen
                    let imageUrl = null;
                    
                    // 1. Usar directamente image_url si está presente
                    if (item['image_url']) {
                        imageUrl = item['image_url'];
                        console.log('Imagen encontrada por image_url:', imageUrl);
                    }
                    
                    // Crear elemento de imagen
                    if (imageUrl) {
                        const img = document.createElement('img');
                        img.src = imageUrl;
                        img.alt = "Imagen";
                        img.dataset.fullpath = imageUrl;
                        img.onclick = () => downloadImage(imageUrl);
                        
                        // Estilos para hacer la imagen más pequeña y manejable
                        img.style.maxWidth = '100px';
                        img.style.maxHeight = '100px';
                        img.style.objectFit = 'contain';
                        img.style.cursor = 'pointer';
                        
                        td.appendChild(img);
                    } else {
                        td.textContent = 'No disponible';
                        console.log('No se encontró imagen para el item:', item);
                    }
                    break;
                
                case 'number':
                    if (fieldValue !== undefined && fieldValue !== null) {
                        // Formatear número con decimales según configuración
                        const decimals = column.decimals || 2;
                        td.textContent = typeof fieldValue === 'number' ? 
                            fieldValue.toFixed(decimals) : 
                            fieldValue;
                    } else {
                        td.textContent = 'N/A';
                    }
                    break;
                
                case 'datetime':
                    if (fieldValue) {
                        // Intentar formatear la fecha de manera legible
                        try {
                            let date;
                            if (typeof fieldValue === 'string') {
                                // Intentar varios formatos de fecha
                                try {
                                    date = new Date(fieldValue);
                                } catch (e) {
                                    // Si falla, mantener el valor original
                                    date = null;
                                }
                            }
                            
                            if (date && !isNaN(date.getTime())) {
                                // Formato: DD/MM/YYYY HH:MM:SS
                                td.textContent = date.toLocaleString('es-ES');
                            } else {
                                td.textContent = fieldValue;
                            }
                        } catch (e) {
                            // Si hay error al formatear, mostrar el valor original
                            td.textContent = fieldValue;
                        }
                    } else {
                        td.textContent = 'N/A';
                    }
                    break;
                
                default:
                    td.textContent = fieldValue !== undefined && fieldValue !== null ? fieldValue : 'N/A';
            }
            
            row.appendChild(td);
        });
        
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    tableContainer.appendChild(table);
    
    // Añadir la tabla después del botón de exportación
    resultsDiv.appendChild(tableContainer);
    
    // Ajustar la posición del footer después de renderizar la tabla
    setTimeout(adjustFooterPosition, 300);
    
    // Imprimir en consola para depuración
    console.log('Tabla y botón de exportación renderizados. Resultados:', results.length);
}

// Función corregida para exportar datos a Excel con hipervínculos correctamente alineados y tipos de datos preservados
function exportToExcel(results, columns) {
    // Función para cargar dinámicamente XLSX-JS-Style
    loadScript('https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js', function() {
        // Verificar que la librería se haya cargado correctamente
        if (!window.XLSX) {
            showAlert('Error: No se pudo cargar la biblioteca XLSX-JS-Style', 'Error');
            return;
        }
        
        try {
            // Crear un nuevo libro de trabajo
            const wb = XLSX.utils.book_new();
            
            // Crear la hoja "Sheet1" como una hoja vacía
            const ws = XLSX.utils.aoa_to_sheet([]);
            
            // Obtener la fecha y hora actual
            const now = new Date();
            
            // Formato de fecha
            const formattedDate = formatDateForMeasurementsReport(now);
            
            // Título del reporte y datos como en la imagen
            XLSX.utils.sheet_add_aoa(ws, [
                ['MEASUREMENTS REPORT'],  // Fila 1: Título como en la imagen
                [],                       // Fila 2: Vacía
                ['GENERATION DATE'],      // Fila 3: Subtítulo "GENERATION DATE"
                [],                       // Fila 4: Vacía
                [formattedDate],          // Fila 5: Fecha con formato
                ['TOTAL DATA'],           // Fila 6: Subtítulo "TOTAL DATA"
                [results.length],         // Fila 7: Número total de resultados
                [],                       // Fila 8: Vacía
                ['MEASURES'],             // Fila 9: Subtítulo "MEASURES"
                []                        // Fila 10: Vacía (antes de la tabla)
            ], { origin: 'A1' });
            
            // Crear el encabezado de la tabla
            const headerRow = columns.map(col => col.displayName);
            
            // Identificar qué columna es la de imágenes
            let imageColumnIndex = -1;
            columns.forEach((col, index) => {
                if (col.type === 'image') {
                    imageColumnIndex = index;
                }
            });
            
            // Añadir el encabezado a la fila 11
            XLSX.utils.sheet_add_aoa(ws, [headerRow], { origin: 'A11' });
            
            // Procesar y añadir las filas de datos preservando los tipos
            results.forEach((item, rowIndex) => {
                // Para agregar los valores correctamente con su tipo, crearemos un objeto de celdas directamente
                const rowCells = {};
                
                columns.forEach((col, colIndex) => {
                    const fieldName = col.jsonField;
                    const fieldValue = item[fieldName];
                    const cellRef = XLSX.utils.encode_cell({
                        r: 12 + rowIndex - 1, // -1 porque las filas son 0-indexed internamente
                        c: colIndex           // columnas también son 0-indexed
                    });
                    
                    // Manejar cada tipo de manera diferente
                    if (col.type === 'image') {
                        // Para imágenes, crear un hipervínculo
                        if (item['image_url']) {
                            rowCells[cellRef] = {
                                v: 'Ver foto',   // valor visible
                                l: {             // hipervínculo
                                    Target: item['image_url'],
                                    Tooltip: "Abrir imagen"
                                },
                                s: {             // estilo
                                    font: {
                                        color: { rgb: "0000FF" },
                                        underline: true
                                    }
                                }
                            };
                        } else {
                            rowCells[cellRef] = { v: 'No disponible' };
                        }
                    } else if (col.type === 'number') {
                        // Para números, mantener el tipo numérico
                        if (fieldValue !== undefined && fieldValue !== null) {
                            const numValue = typeof fieldValue === 'number' ? 
                                fieldValue : parseFloat(fieldValue);
                            
                            if (!isNaN(numValue)) {
                                // Establecer el tipo como número y aplicar formato numérico
                                const decimals = col.decimals || 2;
                                rowCells[cellRef] = { 
                                    v: numValue,    // valor numérico
                                    t: 'n',         // tipo numérico
                                    z: `0.${'0'.repeat(decimals)}`  // formato numérico con decimales específicos
                                };
                            } else {
                                rowCells[cellRef] = { v: 'N/A' };
                            }
                        } else {
                            rowCells[cellRef] = { v: 'N/A' };
                        }
                    } else if (col.type === 'datetime') {
                        // Para fechas, mantener el formato original como texto
                        if (fieldValue) {
                            try {
                                const date = new Date(fieldValue);
                                if (!isNaN(date.getTime())) {
                                    // Formato: DD/MM/YYYY HH:MM:SS como texto
                                    rowCells[cellRef] = { 
                                        v: date.toLocaleString('es-ES'),
                                        t: 's'  // tipo string
                                    };
                                } else {
                                    rowCells[cellRef] = { v: fieldValue };
                                }
                            } catch (e) {
                                rowCells[cellRef] = { v: fieldValue };
                            }
                        } else {
                            rowCells[cellRef] = { v: 'N/A' };
                        }
                    } else {
                        // Para otros tipos (texto, boolean), usar el valor como está
                        rowCells[cellRef] = { 
                            v: fieldValue !== undefined && fieldValue !== null ? fieldValue : 'N/A',
                            t: 's'  // tipo string
                        };
                    }
                });
                
                // Añadir las celdas a la hoja
                Object.keys(rowCells).forEach(ref => {
                    ws[ref] = rowCells[ref];
                });
            });
            
            // Asegurarse de que el rango de la hoja sea correcto
            if (results.length > 0) {
                const lastRowRef = 12 + results.length - 1;
                const lastColRef = XLSX.utils.encode_col(columns.length - 1);
                ws['!ref'] = `A1:${lastColRef}${lastRowRef}`;
            }
            
            // Añadir la hoja al libro
            XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
            
            // Generar el nombre del archivo
            const filenameParts = formattedForFilename(now);
            const filename = `CUBISCAN-${filenameParts}.xlsx`;
            
            // Guardar el archivo
            XLSX.writeFile(wb, filename);
            
            console.log("Excel exportado exitosamente con hipervínculos y tipos de datos preservados");
            
        } catch (error) {
            console.error('Error al exportar a Excel:', error);
            showAlert('Error al exportar a Excel: ' + error.message, 'Error');
        }
    });
}

// Función para cargar scripts dinámicamente
function loadScript(url, callback) {
    console.log("Cargando script:", url);
    const script = document.createElement('script');
    script.src = url;
    script.onload = function() {
        console.log("Script cargado con éxito:", url);
        callback();
    };
    script.onerror = function() {
        console.error("Error al cargar el script:", url);
        showAlert(`No se pudo cargar la biblioteca necesaria desde ${url}. Intente de nuevo o contacte al soporte técnico.`, 'Error');
    };
    document.head.appendChild(script);
}

// Función específica para formatear la fecha como aparece en la imagen del reporte
// Formato deseado: YYYY-MM-DD HH:MM:SS am/pm
function formatDateForMeasurementsReport(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    let hours = date.getHours();
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // La hora '0' debe ser '12'
    
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} ${ampm}`;
}

// Formatear la fecha para el nombre del archivo (yyyy-mm-dd hh_nn_ss am/pm)
function formattedForFilename(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    let hours = date.getHours();
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // La hora '0' debe ser '12'
    
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}_${minutes}_${seconds} ${ampm}`;
}

// Función específica para formatear la fecha como aparece en la imagen del reporte
// Formato deseado: YYYY-MM-DD HH:MM:SS am/pm
function formatDateForMeasurementsReport(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    let hours = date.getHours();
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // La hora '0' debe ser '12'
    
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} ${ampm}`;
}

// Formatear la fecha para el nombre del archivo (yyyy-mm-dd hh_nn_ss am/pm)
function formattedForFilename(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    let hours = date.getHours();
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // La hora '0' debe ser '12'
    
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}_${minutes}_${seconds} ${ampm}`;
}
// Función para cargar scripts dinámicamente
function loadScript(url, callback) {
    const script = document.createElement('script');
    script.src = url;
    script.onload = callback;
    document.head.appendChild(script);
}

// Función para descargar imágenes (actualizada)
async function downloadImage(imageUrl) {
    try {
        // Extraer solo el nombre de la imagen de la URL completa
        const imagePath = extractImagePathFromUrl(imageUrl);
        console.log('Intentando descargar imagen con ruta:', imagePath);
        
        const response = await fetch(`${backendUrl}/download/${encodeURIComponent(imagePath)}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error del servidor:', errorData);
            showAlert('Error al generar el link de descarga: ' + errorData.detail, 'Error');
            return;
        }
        
        const data = await response.json();
        window.open(data.download_url, '_blank'); // Abrir la URL firmada en una nueva pestaña
    } catch (error) {
        console.error('Error de conexión:', error);
        showAlert('Error de conexión: ' + error.message, 'Error');
    }
}

// Función auxiliar para extraer la ruta de la imagen de una URL firmada
function extractImagePathFromUrl(url) {
    // Verificar si la URL es una URL firmada de Google Cloud Storage
    if (url.includes('storage.googleapis.com')) {
        // Extraer la ruta después del nombre del bucket
        const bucketName = 'cloudmontra'; // Tu nombre de bucket
        const regex = new RegExp(`${bucketName}/([^?]+)`);
        const match = url.match(regex);
        
        if (match && match[1]) {
            return decodeURIComponent(match[1]);
        }
    }
    
    // Si no es una URL de GCS o no se pudo extraer la ruta, devolver la URL tal cual
    return url;
}

// Funciones para validación de formularios
function validateDates() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    
    if (startDate || endDate) {
        startDateInput.required = true;
        endDateInput.required = true;
    } else {
        startDateInput.required = false;
        endDateInput.required = false;
    }
}

// Función para mostrar panel de administración (actualizada)
function showAdminPanel() {
    if (!isAdmin) {
        showAlert('Solo los administradores pueden acceder al panel de administración', 'Acceso denegado');
        return;
    }
    
    document.getElementById('search-form').style.display = 'none';
    document.getElementById('results').style.display = 'none';
    
    // Actualizar el HTML del panel de administración
    const adminPanel = document.getElementById('admin-panel');
    adminPanel.innerHTML = `
        <h3>Gestión de Usuarios</h3>
        <p>Administre los usuarios del sistema y sus permisos</p>
        
        <div class="buttons-container">
            <button type="button" id="list-users-btn" onclick="listUsers()">Listar Usuarios</button>
            <button type="button" id="add-user-btn" onclick="showAddUserForm()">Agregar Usuario</button>
        </div>
        
        <div id="user-list-container" class="mt-20"></div>
        
        <div id="user-form-container" class="mt-20" style="display: none;">
            <!-- El formulario se cargará dinámicamente -->
        </div>
    `;
    
    adminPanel.style.display = 'block';
    
    // Ocultar panel de configuración de campos si está visible
    const configPanel = document.getElementById('client-config-panel');
    if (configPanel) {
        configPanel.style.display = 'none';
    }
    
    // Cargar la lista de usuarios automáticamente
    listUsers();
    
    // Ajustar la posición del footer
    setTimeout(adjustFooterPosition, 300);
}



// Función modificada para ocultar el panel de administración
function hideAdminPanel() {
    document.getElementById('admin-panel').style.display = 'none';
    document.getElementById('search-form').style.display = 'block';
    document.getElementById('results').style.display = 'block';
    
    // Asegurarse de que el panel de configuración de campos esté oculto
    const configPanel = document.getElementById('client-config-panel');
    if (configPanel) {
        configPanel.style.display = 'none';
    }
    
    // Ajustar la posición del footer
    setTimeout(adjustFooterPosition, 300);
}

function updateAdminMenu() {
    // No es necesario agregar el botón de configuración de campos aquí
    // ya que está en el menú principal junto al botón de administración
}

// Funciones para la gestión de usuarios
async function listUsers() {
    if (!isAdmin) {
        alert('Solo los administradores pueden ver la lista de usuarios');
        return;
    }
    
    try {
        const response = await fetch(`${backendUrl}/users`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        const data = await response.json();
        
        if (response.ok) {
            currentUsers = data.users;
            displayUserList(data.users);
        } else {
            alert('Error al obtener la lista de usuarios: ' + data.detail);
        }
    } catch (error) {
        console.error('Error de conexión:', error);
        alert('Error de conexión: ' + error.message);
    }
    
    // Ajustar la posición del footer después de cargar la lista
    setTimeout(adjustFooterPosition, 300);
}

// Función modificada para mostrar el estado del usuario según su fecha de vigencia
function displayUserList(users) {
    const container = document.getElementById('user-list-container');
    
    // Ocultar formulario si está visible
    document.getElementById('user-form-container').style.display = 'none';
    
    let tableHtml = `
        <div class="table-container">
            <table class="user-list-table">
                <thead>
                    <tr>
                        <th>Usuario</th>
                        <th>Carpeta</th>
                        <th>Vigencia</th>
                        <th>Rol</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    const today = new Date();
    
    users.forEach(user => {
        // Determinar el estado del usuario basado en la fecha de vigencia
        const expirationDate = new Date(user.expiration_date);
        
        let status = '';
        let statusClass = '';
        
        if (expirationDate < today) {
            status = 'Vencido';
            statusClass = 'status-expired';
        } else {
            // Calcular días restantes
            const diffTime = expirationDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays <= 30) {
                status = 'Por vencer';
                statusClass = 'status-warning';
            } else {
                status = 'Activo';
                statusClass = 'status-active';
            }
        }
        
        tableHtml += `
            <tr>
                <td>${user.username}</td>
                <td>${user.folder || 'Todas'}</td>
                <td>${user.expiration_date}</td>
                <td>${user.role}</td>
                <td class="${statusClass}">${status}</td>
                <td>
                    <button class="action-btn" onclick="editUser('${user.username}')">Editar</button>
                    <button class="action-btn delete" onclick="confirmDeleteUser('${user.username}')">Eliminar</button>
                </td>
            </tr>
        `;
    });
    
    tableHtml += `
                </tbody>
            </table>
        </div>
        <div class="buttons-container" style="margin-top: 20px; display: flex; justify-content: flex-end;">
            <button type="button" onclick="hideAdminPanel()" style="background-color: #2c3e50;">Volver a Búsqueda</button>
        </div>
        
        <style>
            .status-active {
                color: #28a745;
                font-weight: bold;
            }
            
            .status-warning {
                color: #ffc107;
                font-weight: bold;
            }
            
            .status-expired {
                color: #dc3545;
                font-weight: bold;
            }
            
            /* Hacer que la tabla tenga encabezado fijo */
            .table-container {
                max-height: 500px;
                overflow-y: auto;
                margin-bottom: 20px;
                border: 1px solid #ddd;
                border-radius: 8px;
            }
            
            .user-list-table {
                width: 100%;
                border-collapse: separate;
                border-spacing: 0;
            }
            
            .user-list-table thead {
                position: sticky;
                top: 0;
                z-index: 10;
                background-color: #f2f2f2;
                border-bottom: 2px solid #ddd;
            }
            
            .user-list-table th {
                padding: 12px 15px;
                text-align: left;
                font-weight: 600;
                color: #333333;
            }
            
            .user-list-table td {
                padding: 10px 15px;
                text-align: left;
                border-bottom: 1px solid #ddd;
                background-color: #ffffff;
            }
        </style>
    `;
    
    container.innerHTML = tableHtml;
    container.style.display = 'block';
    
    // Ajustar la posición del footer
    setTimeout(adjustFooterPosition, 300);
}


// Modificación para mostrar selector de carpetas existentes al crear usuarios
function showAddUserForm() {
    const container = document.getElementById('user-form-container');
    container.style.display = 'block';
    
    // Ocultar listado si está visible
    document.getElementById('user-list-container').style.display = 'none';
    
    // Nuevo HTML que primero pregunta por el rol
    container.innerHTML = `
        <div class="user-form">
            <h4 class="form-title">Seleccionar Rol del Usuario</h4>
            <div class="form-group">
                <label for="role-selection">Seleccione el Rol:</label>
                <select id="role-selection" onchange="handleRoleSelection()">
                    <option value="">-- Seleccione un Rol --</option>
                    <option value="admin">Administrador</option>
                    <option value="user">Usuario</option>
                </select>
            </div>
        </div>
    `;
    
    // Ajustar la posición del footer
    setTimeout(adjustFooterPosition, 300);
}

function handleRoleSelection() {
    const roleSelect = document.getElementById('role-selection');
    const selectedRole = roleSelect.value;
    
    if (selectedRole) {
        // Recrear el formulario basado en el rol seleccionado
        const container = document.getElementById('user-form-container');
        
        let additionalFields = '';
        if (selectedRole === 'admin') {
            // Para admin, solo mostrar un aviso sobre carpetas
            additionalFields = `
                <div class="form-group">
                    <p class="hint">Los administradores tendrán acceso a todas las carpetas</p>
                </div>
            `;
        } else {
            // Para usuarios normales, requerir selección/creación de carpeta
            additionalFields = `
                <div class="form-group">
                    <label for="folder-select">Carpeta:</label>
                    <div class="folder-selection-wrapper">
                        <select id="folder-select" onchange="handleFolderSelection()">
                            <option value="">-- Seleccione una carpeta existente --</option>
                        </select>
                        <div style="margin-top: 10px;">
                            <label class="checkbox-container">
                                <input type="checkbox" id="new-folder-checkbox" onchange="toggleNewFolderInput()">
                                <span>Crear nueva carpeta</span>
                            </label>
                        </div>
                        <div id="new-folder-container" style="display: none; margin-top: 10px;">
                            <input type="text" id="folder-input" placeholder="Nombre de la nueva carpeta">
                            <small class="password-hint">La carpeta debe ser única</small>
                        </div>
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = `
            <div class="user-form">
                <h4 class="form-title">Agregar Nuevo Usuario: ${selectedRole === 'admin' ? 'Administrador' : 'Usuario'}</h4>
                <form id="user-form" onsubmit="saveUser(event)">
                    <input type="hidden" id="form-mode" value="create">
                    <input type="hidden" id="selected-role" value="${selectedRole}">
                    
                    <div class="form-group">
                        <label for="username-input">Usuario:</label>
                        <input type="text" id="username-input" required>
                    </div>
                    <div class="form-group">
                        <label for="password-input">Contraseña:</label>
                        <div class="password-container">
                            <input type="password" id="password-input" required>
                            <label class="checkbox-container">
                                <input type="checkbox" id="show-password" onchange="togglePasswordVisibility()">
                                <span>Mostrar contraseña</span>
                            </label>
                        </div>
                    </div>
                    ${additionalFields}
                    <div class="form-group">
                        <label for="expiration-input">Fecha de Vigencia:</label>
                        <input type="date" id="expiration-input" required>
                    </div>
                    <div class="buttons-container">
                        <button type="submit" class="primary">Crear Usuario</button>
                        <button type="button" onclick="cancelUserForm()" class="logout">Cancelar</button>
                    </div>
                </form>
            </div>
        `;
        
        // Si es admin, no cargar carpetas
        if (selectedRole === 'user') {
            loadExistingFolders();
        }
        
        // Ajustar la posición del footer
        setTimeout(adjustFooterPosition, 300);
    }
}

// Función para cargar las carpetas existentes en el selector
async function loadExistingFolders() {
    try {
        // Primero intentamos cargar las carpetas desde las configuraciones de cliente
        const response = await fetch(`${backendUrl}/client_config`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        
        if (response.ok) {
            const data = await response.json();
            const folderSelect = document.getElementById('folder-select');
            
            if (data.clientConfigs && data.clientConfigs.length > 0) {
                // Filtrar configuraciones que tienen clientId y no son default o admin
                const folderConfigs = data.clientConfigs.filter(config => 
                    config.clientId && 
                    config.clientId !== 'default' && 
                    config.clientId !== 'admin'
                );
                
                // Agregar cada carpeta como opción
                folderConfigs.forEach(config => {
                    const option = document.createElement('option');
                    option.value = config.clientId;
                    option.textContent = config.displayName || config.clientId;
                    folderSelect.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Error al cargar carpetas existentes:', error);
        // No mostrar error al usuario, simplemente dejar el selector vacío
    }
}

// Función para alternar entre carpeta existente y nueva carpeta
function toggleNewFolderInput() {
    const newFolderCheckbox = document.getElementById('new-folder-checkbox');
    const folderSelect = document.getElementById('folder-select');
    const newFolderContainer = document.getElementById('new-folder-container');
    
    if (newFolderCheckbox.checked) {
        folderSelect.disabled = true;
        folderSelect.value = '';
        newFolderContainer.style.display = 'block';
    } else {
        folderSelect.disabled = false;
        newFolderContainer.style.display = 'none';
    }
}

// Función para manejar la selección de carpeta
function handleFolderSelection() {
    const folderSelect = document.getElementById('folder-select');
    const newFolderCheckbox = document.getElementById('new-folder-checkbox');
    
    if (folderSelect.value) {
        newFolderCheckbox.checked = false;
        document.getElementById('new-folder-container').style.display = 'none';
    }
}


// Función modificada para obtener y mostrar la contraseña al editar un usuario
async function editUser(username) {
    try {
        // Mostrar el overlay de carga
        showLoadingOverlay("");
        
        // Obtener la información completa del usuario
        const response = await fetch(`${backendUrl}/users/${username}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        
        if (!response.ok) {
            hideLoadingOverlay();
            throw new Error('No se pudo obtener la información completa del usuario');
        }
        
        const userComplete = await response.json();
        hideLoadingOverlay();
        
        const container = document.getElementById('user-form-container');
        container.style.display = 'block';
        
        // Ocultar listado si está visible
        document.getElementById('user-list-container').style.display = 'none';
        
        let folderFieldHtml = '';
        
        // Solo mostrar selección de carpeta para usuarios normales
        if (userComplete.role === 'user') {
            folderFieldHtml = `
                <div class="form-group">
                    <label for="folder-select">Carpeta:</label>
                    <div class="folder-selection-wrapper">
                        <select id="folder-select" onchange="handleFolderSelection()">
                            <option value="">-- Seleccione una carpeta existente --</option>
                        </select>
                        <div style="margin-top: 10px;">
                            <label class="checkbox-container">
                                <input type="checkbox" id="new-folder-checkbox" onchange="toggleNewFolderInput()">
                                <span>Crear nueva carpeta</span>
                            </label>
                        </div>
                        <div id="new-folder-container" style="display: none; margin-top: 10px;">
                            <input type="text" id="folder-input" placeholder="Nombre de la nueva carpeta">
                            <small class="password-hint">La carpeta debe ser única</small>
                        </div>
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = `
            <div class="user-form">
                <h4 class="form-title">Editar Usuario: ${username}</h4>
                <form id="user-form" onsubmit="saveUser(event)">
                    <input type="hidden" id="form-mode" value="update">
                    <input type="hidden" id="original-username" value="${username}">
                    <input type="hidden" id="role-input" value="${userComplete.role}">
                    
                    <div class="form-group">
                        <label for="username-input">Usuario:</label>
                        <input type="text" id="username-input" value="${username}" readonly>
                    </div>
                    <div class="form-group">
                        <label for="password-input">Contraseña:</label>
                        <div class="password-container">
                            <input type="password" id="password-input" value="${userComplete.password || ''}">
                            <label class="checkbox-container">
                                <input type="checkbox" id="show-password" onchange="togglePasswordVisibility()">
                                <span>Mostrar contraseña</span>
                            </label>
                        </div>
                    </div>
                    
                    ${folderFieldHtml}
                    
                    <div class="form-group">
                        <label for="expiration-input">Fecha de Vigencia:</label>
                        <input type="date" id="expiration-input" value="${userComplete.expiration_date}" required>
                    </div>
                    <div class="form-group">
                        <label>Rol:</label>
                        <input type="text" value="${userComplete.role === 'admin' ? 'Administrador' : 'Usuario'}" readonly>
                    </div>
                    <div class="buttons-container">
                        <button type="submit" class="primary">Actualizar Usuario</button>
                        <button type="button" onclick="cancelUserForm()" class="logout">Cancelar</button>
                    </div>
                </form>
            </div>
        `;
        
        // Si es un usuario, cargar carpetas existentes
        if (userComplete.role === 'user') {
            await loadExistingFolders();
            
            // Seleccionar la carpeta actual del usuario
            const folderSelect = document.getElementById('folder-select');
            if (userComplete.folder) {
                // Intentar encontrar la carpeta en el selector
                let folderFound = false;
                for (let i = 0; i < folderSelect.options.length; i++) {
                    if (folderSelect.options[i].value === userComplete.folder) {
                        folderSelect.selectedIndex = i;
                        folderFound = true;
                        break;
                    }
                }
                
                // Si no se encuentra la carpeta en el selector, suponer que es una carpeta personalizada
                if (!folderFound && userComplete.folder !== '') {
                    const newFolderCheckbox = document.getElementById('new-folder-checkbox');
                    newFolderCheckbox.checked = true;
                    document.getElementById('folder-input').value = userComplete.folder;
                    toggleNewFolderInput(); // Aplicar los cambios visuales
                }
            }
        }
    } catch (error) {
        hideLoadingOverlay();
        console.error('Error al obtener la información del usuario:', error);
        showAlert('Error: ' + error.message, 'Error');
    }
    
    // Ajustar la posición del footer
    setTimeout(adjustFooterPosition, 300);
}

function togglePasswordVisibility() {
    const passwordInput = document.getElementById('password-input');
    const showPasswordCheckbox = document.getElementById('show-password');
    
    if (passwordInput && showPasswordCheckbox) {
        passwordInput.type = showPasswordCheckbox.checked ? 'text' : 'password';
    }
}

// Función para guardar usuario con actualización de selector de carpetas
async function saveUser(event) {
    event.preventDefault();
    
    const mode = document.getElementById('form-mode').value;
    const username = document.getElementById('username-input').value;
    const passwordInput = document.getElementById('password-input').value;
    const expirationDate = document.getElementById('expiration-input').value;
    
    // Para nuevos usuarios, obtener el rol de un campo oculto
    const role = mode === 'create' 
        ? document.getElementById('selected-role').value 
        : document.getElementById('role-input').value;
    
    // Determinar carpeta basado en el rol
    let folder = '';
    let isNewFolder = false; // Flag para indicar si es una carpeta nueva
    
    if (role === 'admin') {
        // Los administradores quedan con carpeta vacía para acceso total
        folder = '';
    } else {
        // Para usuarios, carpeta es obligatoria
        // Verificar si existe el checkbox de nueva carpeta
        const newFolderCheckbox = document.getElementById('new-folder-checkbox');
        
        if (newFolderCheckbox && newFolderCheckbox.checked) {
            // Si está marcado, usar el input de nueva carpeta
            const folderInput = document.getElementById('folder-input');
            if (folderInput) {
                folder = folderInput.value.trim();
                isNewFolder = true;
            }
            
            // Validar que la carpeta nueva no esté vacía
            if (!folder) {
                showAlert('Debe ingresar un nombre para la nueva carpeta', 'Error');
                return;
            }
            
            // Validar que la carpeta nueva sea válida (solo alfanuméricos, guiones y guiones bajos)
            const folderPattern = /^[a-zA-Z0-9_-]+$/;
            if (!folderPattern.test(folder)) {
                showAlert('El nombre de carpeta solo puede contener letras, números, guiones y guiones bajos', 'Error');
                return;
            }
            
            // Verificar si la carpeta ya existe
            try {
                const configResponse = await fetch(`${backendUrl}/client_config`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                const configData = await configResponse.json();
                
                // Verificar si ya existe una configuración con esta carpeta
                const folderExists = configData.clientConfigs.some(
                    config => config.clientId.toLowerCase() === folder.toLowerCase()
                );
                
                if (folderExists) {
                    showAlert('La carpeta ya existe. Elija otro nombre.', 'Error');
                    return;
                }
            } catch (error) {
                console.error('Error al verificar la carpeta:', error);
                showAlert('Error al verificar la carpeta', 'Error');
                return;
            }
        } else {
            // Usar carpeta existente del selector
            const folderSelect = document.getElementById('folder-select');
            if (folderSelect) {
                folder = folderSelect.value;
            }
            
            // Validar que se seleccione una carpeta
            if (!folder) {
                showAlert('Debe seleccionar o crear una carpeta para el usuario', 'Error');
                return;
            }
        }
    }
    
    try {
        let url;
        let method;
        let body = {};
        
        if (mode === 'create') {
            url = `${backendUrl}/users`;
            method = 'POST';
            body = {
                username,
                password: passwordInput,
                folder,
                expiration_date: expirationDate,
                role
            };
        } else { // update
            const originalUsername = document.getElementById('original-username').value;
            url = `${backendUrl}/users/${originalUsername}`;
            method = 'PUT';
            body = {
                password: passwordInput,
                folder,
                expiration_date: expirationDate,
                role
            };
        }
        
        // Mostrar overlay de carga
        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.classList.add('active');
        
        // Si estamos creando un usuario con una carpeta nueva, crear la carpeta primero
        let newFolderCreated = false;
        if (mode === 'create' && folder && isNewFolder) {
            try {
                // Crear la estructura de carpetas
                const createFolderResponse = await fetch(`${backendUrl}/folders/${folder}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!createFolderResponse.ok) {
                    const errorData = await createFolderResponse.json();
                    loadingOverlay.classList.remove('active');
                    showAlert(`Error al crear la carpeta: ${errorData.detail}`, 'Error');
                    return;
                }
                
                // Crear nueva configuración de cliente
                const newConfig = {
                    clientId: folder,
                    displayName: folder,
                    tableConfig: {
                        columns: [
                            {"jsonField": "code", "displayName": "Código", "displayOrder": 1, "visible": true, "type": "text"},
                            {"jsonField": "length", "displayName": "Largo (cm)", "displayOrder": 2, "visible": true, "type": "number", "decimals": 2},
                            {"jsonField": "width", "displayName": "Ancho (cm)", "displayOrder": 3, "visible": true, "type": "number", "decimals": 2},
                            {"jsonField": "heigth", "displayName": "Alto (cm)", "displayOrder": 4, "visible": true, "type": "number", "decimals": 2},
                            {"jsonField": "weigth", "displayName": "Peso (Kg)", "displayOrder": 5, "visible": true, "type": "number", "decimals": 3},
                            {"jsonField": "measure_date", "displayName": "Fecha", "displayOrder": 6, "visible": true, "type": "datetime"},
                            {"jsonField": "machine_pid", "displayName": "Equipo", "displayOrder": 7, "visible": true, "type": "text"},
                            {"jsonField": "image_url", "displayName": "Imagen", "displayOrder": 8, "visible": true, "type": "image"}
                        ]
                    }
                };
                
                const configResponse = await fetch(`${backendUrl}/client_config`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        clientId: folder,
                        config: newConfig
                    })
                });
                
                if (!configResponse.ok) {
                    const errorData = await configResponse.json();
                    loadingOverlay.classList.remove('active');
                    showAlert(`Error al crear la configuración: ${errorData.detail}`, 'Error');
                    return;
                }
                
                newFolderCreated = true;
                
                // Actualizar la lista global de configuraciones de clientes
                if (window.allClientConfigs) {
                    window.allClientConfigs.push(newConfig);
                }
            } catch (error) {
                console.error('Error al crear carpeta:', error);
                loadingOverlay.classList.remove('active');
                showAlert('Error al crear carpeta: ' + error.message, 'Error');
                return;
            }
        }
        
        // Ahora crear/actualizar el usuario
        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        
        loadingOverlay.classList.remove('active');
        
        const data = await response.json();
        
        if (response.ok) {
            // Si hemos creado una carpeta nueva, actualizamos el selector en la página de búsqueda
            if (newFolderCreated) {
                // Actualizar el selector de carpetas de administración
                const adminFolderSelect = document.getElementById('admin-folder');
                if (adminFolderSelect) {
                    const option = document.createElement('option');
                    option.value = folder;
                    option.textContent = folder;
                    adminFolderSelect.appendChild(option);
                }
            }
            
            showAlert(mode === 'create' ? 'Usuario creado exitosamente' : 'Usuario actualizado exitosamente', 'Operación exitosa', function() {
                // Actualizar la lista de usuarios después de cerrar la alerta
                listUsers();
            });
        } else {
            showAlert(`Error: ${data.detail}`, 'Error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error de conexión: ' + error.message, 'Error');
        
        // Ocultar overlay de carga en caso de error
        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.classList.remove('active');
    }
}

// Función para confirmar eliminación de usuario
function confirmDeleteUser(username) {
    showConfirm(`¿Está seguro de eliminar al usuario "${username}"?`, 'Confirmar eliminación', function(confirmed) {
        if (confirmed) {
            deleteUser(username);
        }
    });
}


// Función para eliminar usuario (actualizada)
async function deleteUser(username) {
    try {
        const response = await fetch(`${backendUrl}/users/${username}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert('Usuario eliminado exitosamente', 'Operación exitosa', function() {
                // Actualizar la lista de usuarios después de cerrar la alerta
                listUsers();
            });
        } else {
            showAlert(`Error: ${data.detail}`, 'Error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error de conexión: ' + error.message, 'Error');
    }
}

function cancelUserForm() {
    document.getElementById('user-form-container').style.display = 'none';
    // Volver a mostrar la lista
    listUsers();
    
    // Ajustar la posición del footer
    setTimeout(adjustFooterPosition, 300);
}


// Función para mostrar panel de configuración de campos (actualizada)
function showClientConfigPanel() {
    if (!isAdmin) {
        showAlert('Solo los administradores pueden configurar los campos.', 'Acceso denegado');
        return;
    }
    
    // Ocultar otros paneles
    document.getElementById('search-form').style.display = 'none';
    document.getElementById('results').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'none';
    
    // Ocultar contenedores de usuario si están visibles
    const userListContainer = document.getElementById('user-list-container');
    if (userListContainer) {
        userListContainer.style.display = 'none';
    }
    
    const userFormContainer = document.getElementById('user-form-container');
    if (userFormContainer) {
        userFormContainer.style.display = 'none';
    }
    
    // Mostrar el panel de configuración de clientes
    const configPanel = document.getElementById('client-config-panel');
    if (!configPanel) {
        // Si no existe, crearlo
        createClientConfigPanel();
    } else {
        configPanel.style.display = 'block';
        
        // Asegurar que el footer esté posicionado correctamente
        const footer = document.querySelector('.footer');
        const container = document.querySelector('.container');
        if (footer && container) {
            container.appendChild(footer);
        }
    }
    
    // Cargar la lista de clientes
    loadClientsList();
    
    // Ajustar la posición del footer
    setTimeout(adjustFooterPosition, 300);
}
function hideClientConfigPanel() {
    const configPanel = document.getElementById('client-config-panel');
    if (configPanel) {
        configPanel.style.display = 'none';
    }
    
    // Mostrar el formulario de búsqueda y resultados en lugar del panel de administración
    document.getElementById('search-form').style.display = 'block';
    document.getElementById('results').style.display = 'block';
    
    // Ocultar el panel de administración si estaba visible
    const adminPanel = document.getElementById('admin-panel');
    if (adminPanel) {
        adminPanel.style.display = 'none';
    }
    
    // Asegurarse de que el footer esté en su lugar correcto
    const footer = document.querySelector('.footer');
    const container = document.querySelector('.container');
    if (footer && container) {
        container.appendChild(footer);
    }
    
    // Ajustar la posición del footer
    setTimeout(adjustFooterPosition, 300);
}

function loadClientsList() {
    const clientSelect = document.getElementById('client-select');
    clientSelect.innerHTML = '';

    // Cargar configuraciones desde el servidor
    fetch(`${backendUrl}/client_config`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    })
    .then(response => response.json())
    .then(data => {
        // Almacenar todas las configuraciones globalmente
        window.allClientConfigs = data.clientConfigs || [];

        if (window.allClientConfigs.length > 0) {
            // Ordenar configuraciones por ID para consistencia
            window.allClientConfigs.sort((a, b) => a.clientId.localeCompare(b.clientId));

            // Llenar el selector de clientes
            window.allClientConfigs.forEach(config => {
                const option = document.createElement('option');
                option.value = config.clientId;
                option.textContent = config.displayName || config.clientId;
                clientSelect.appendChild(option);
            });

            // Cargar la configuración del primer cliente por defecto
            if (clientSelect.options.length > 0) {
                clientSelect.selectedIndex = 0;
                loadClientFieldsConfig();
            }
        } else {
            // Si no hay configuraciones, mostrar opción para crear
            const option = document.createElement('option');
            option.value = 'default';
            option.textContent = 'Configuración Predeterminada';
            clientSelect.appendChild(option);
            
            showNewClientConfigForm();
        }
    })
    .catch(error => {
        console.error('Error al cargar configuraciones:', error);
        showAlert('No se pudieron cargar las configuraciones de clientes', 'Error');
    });
}

// Función para cargar la configuración de campos con opción de arrastrar y soltar (con colores originales)
function loadClientFieldsConfig() {
    const clientId = document.getElementById('client-select').value;
    const container = document.getElementById('client-fields-container');
    
    // Buscar la configuración del cliente seleccionado
    const config = window.allClientConfigs.find(c => c.clientId === clientId);
    
    if (!config || !config.tableConfig || !config.tableConfig.columns) {
        showAlert('No hay configuración para este cliente', 'Advertencia');
        container.innerHTML = '<p>No hay configuración para este cliente. Cree una nueva configuración.</p>';
        setTimeout(adjustFooterPosition, 300);
        return;
    }
    
    // Ordenar columnas por displayOrder
    const columns = [...config.tableConfig.columns].sort((a, b) => a.displayOrder - b.displayOrder);
    
    // Verificar si existe la configuración de textos de búsqueda
    if (!config.searchLabels) {
        config.searchLabels = {
            codeLabel: "Buscar por Código",
            machineLabel: "Filtrar por Máquina",
            folderLabel: "Seleccionar Cliente"
        };
    }
    
    // Generar formulario para editar campos
    let html = `
        <div class="search-labels-config">
            <h4>Etiquetas de Búsqueda</h4>
            <p>Personaliza los textos que aparecerán en la interfaz de búsqueda</p>
            
            <div class="form-group">
                <label for="code-search-label">Etiqueta para búsqueda por código:</label>
                <input type="text" id="code-search-label" value="${config.searchLabels.codeLabel || 'Buscar por Código'}" 
                    placeholder="Ej: Buscar por SKU, Buscar por Referencia, etc.">
            </div>
            
            <div class="form-group">
                <label for="machine-search-label">Etiqueta para filtro de máquina:</label>
                <input type="text" id="machine-search-label" value="${config.searchLabels.machineLabel || 'Filtrar por Máquina'}" 
                    placeholder="Ej: Filtrar por Equipo, Seleccionar Estación, etc.">
            </div>
        </div>
        
        <h4>Configuración de Columnas</h4>
        <p>Arrastra las filas para cambiar el orden de las columnas</p>
        
        <div class="table-wrapper">
            <table class="user-list-table sortable-table">
                <thead>
                    <tr>
                        <th>Campo JSON</th>
                        <th>Nombre a Mostrar</th>
                        <th>Tipo</th>
                        <th>Visible</th>
                        <th>Decimales</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="fields-tbody" class="sortable">
    `;
    
    columns.forEach((column, index) => {
        html += `
            <tr data-index="${index}" class="field-row" draggable="true">
                <td>
                    <input type="text" class="json-field" value="${column.jsonField || ''}" placeholder="nombre_campo">
                </td>
                <td>
                    <input type="text" class="display-name" value="${column.displayName || ''}" placeholder="Nombre Visible">
                </td>
                <td>
                    <select class="field-type">
                        <option value="text" ${column.type === 'text' ? 'selected' : ''}>Texto</option>
                        <option value="number" ${column.type === 'number' ? 'selected' : ''}>Número</option>
                        <option value="datetime" ${column.type === 'datetime' ? 'selected' : ''}>Fecha/Hora</option>
                        <option value="boolean" ${column.type === 'boolean' ? 'selected' : ''}>Booleano</option>
                        <option value="image" ${column.type === 'image' ? 'selected' : ''}>Imagen</option>
                    </select>
                </td>
                <td>
                    <input type="checkbox" class="visible-check" ${column.visible ? 'checked' : ''}>
                </td>
                <td>
                    <input type="number" class="decimals" value="${column.decimals || 2}" min="0" max="10" step="1" 
                        ${column.type === 'number' ? '' : 'disabled'}>
                </td>
                <td>
                    <button type="button" class="action-btn delete" onclick="removeField(this)">Eliminar</button>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
        
        <style>
            .table-wrapper {
                max-height: 500px;
                overflow-y: auto;
                margin-bottom: 20px;
                border: 1px solid #ddd;
                border-radius: 8px;
            }
            
            .sortable-table {
                width: 100%;
                border-collapse: separate;
                border-spacing: 0;
            }
            
            .sortable-table thead {
                position: sticky;
                top: 0;
                z-index: 10;
                background-color: #f2f2f2;  /* Restaurar color original más oscuro */
            }
            
            .sortable-table th {
                padding: 12px 15px;
                text-align: center;
                font-weight: 600;
                border-bottom: 2px solid #ddd;
                color: #333333;  /* Color de texto oscuro para mejor contraste */
            }
            
            .sortable-table td {
                padding: 12px 15px;
                border-bottom: 1px solid #eee;
                background-color: #ffffff;  /* Fondo blanco para las celdas */
            }
            
            .sortable-table .field-row {
                cursor: move;
                transition: background-color 0.2s;
            }
            
            .sortable-table .field-row:hover {
                background-color: #f5f5f5;
            }
            
            .sortable-table .field-row.dragging {
                opacity: 0.5;
                background-color: #e0e0e0;
            }
            
            .drag-indicator {
                margin-right: 10px;
                color: #888;
                cursor: move;
            }
            
            .search-labels-config {
                background-color: #f8f8f8;
                padding: 15px;
                margin-bottom: 20px;
                border-radius: 8px;
                border: 1px solid #ddd;
            }
            
            /* Mejorar la apariencia de los inputs y botones dentro de la tabla */
            .sortable-table input[type="text"],
            .sortable-table input[type="number"],
            .sortable-table select {
                width: 100%;
                padding: 8px 10px;
                border: 1px solid #ddd;
                border-radius: 4px;
            }
            
            .sortable-table .action-btn {
                padding: 6px 12px;
                border-radius: 4px;
                font-size: 0.9rem;
            }
        </style>
    `;
    
    container.innerHTML = html;
    
    // Añadir event listeners para los selectores de tipo (activar/desactivar decimales)
    document.querySelectorAll('.field-type').forEach(select => {
        select.addEventListener('change', function() {
            const row = this.closest('tr');
            const decimalsInput = row.querySelector('.decimals');
            decimalsInput.disabled = this.value !== 'number';
        });
    });
    
    // Implementar funcionalidad de arrastrar y soltar
    setupDragAndDrop();
    
    // Ajustar la posición del footer
    setTimeout(adjustFooterPosition, 300);
}


// Función para configurar el arrastrar y soltar para todas las filas
function setupDragAndDrop() {
    const tbody = document.getElementById('fields-tbody');
    if (!tbody) return;
    
    // Agregar eventos a cada fila
    const rows = tbody.querySelectorAll('.field-row');
    rows.forEach(row => {
        setupRowDragEvents(row);
    });
}



function showNewClientConfigForm() {
    const container = document.getElementById('client-fields-container');
    
    // Generar formulario para nueva configuración
    let html = `
        <div class="user-form">
            <h4 class="form-title">Nueva Configuración de Cliente</h4>
            <div class="form-group">
                <label for="new-client-id">ID del Cliente (nombre de carpeta):</label>
                <input type="text" id="new-client-id" required placeholder="ID único del cliente">
            </div>
            <div class="form-group">
                <label for="new-client-name">Nombre para mostrar:</label>
                <input type="text" id="new-client-name" required placeholder="Nombre visible del cliente">
            </div>
            <div class="form-group">
                <button type="button" onclick="createNewClientConfig()">Crear Configuración</button>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Ajustar la posición del footer
    setTimeout(adjustFooterPosition, 300);
}

// Función para crear nueva configuración de cliente (actualizada)
function createNewClientConfig() {
    const clientId = document.getElementById('new-client-id').value.trim();
    const displayName = document.getElementById('new-client-name').value.trim();
    
    if (!clientId || !displayName) {
        showAlert('Debe ingresar el ID y nombre del cliente', 'Datos incompletos');
        return;
    }
    
    // Verificar si ya existe un cliente con ese ID
    if (window.allClientConfigs && window.allClientConfigs.some(c => c.clientId === clientId)) {
        showAlert('Ya existe un cliente con ese ID. Por favor, use otro.', 'ID duplicado');
        return;
    }
    
    // Crear nueva configuración con campos predeterminados
    const newConfig = {
        clientId: clientId,
        displayName: displayName,
        tableConfig: {
            columns: [
                {"jsonField": "code", "displayName": "Código", "displayOrder": 1, "visible": true, "type": "text"},
                {"jsonField": "length", "displayName": "Largo (cm)", "displayOrder": 2, "visible": true, "type": "number", "decimals": 2},
                {"jsonField": "width", "displayName": "Ancho (cm)", "displayOrder": 3, "visible": true, "type": "number", "decimals": 2},
                {"jsonField": "heigth", "displayName": "Alto (cm)", "displayOrder": 4, "visible": true, "type": "number", "decimals": 2},
                {"jsonField": "weigth", "displayName": "Peso (Kg)", "displayOrder": 5, "visible": true, "type": "number", "decimals": 3},
                {"jsonField": "measure_date", "displayName": "Fecha", "displayOrder": 6, "visible": true, "type": "datetime"},
                {"jsonField": "machine_pid", "displayName": "Equipo", "displayOrder": 7, "visible": true, "type": "text"},
                {"jsonField": "image_url", "displayName": "Imagen", "displayOrder": 8, "visible": true, "type": "image"}
            ]
        }
    };
    
    // Agregar a la lista global
    if (!window.allClientConfigs) {
        window.allClientConfigs = [];
    }
    window.allClientConfigs.push(newConfig);
    
    // Actualizar el dropdown de clientes
    const clientSelect = document.getElementById('client-select');
    const option = document.createElement('option');
    option.value = clientId;
    option.textContent = displayName;
    clientSelect.appendChild(option);
    clientSelect.value = clientId;
    
    // Cargar la configuración para editar
    loadClientFieldsConfig();
    
    // Mostrar mensaje de éxito
    showAlert('Configuración de cliente creada exitosamente', 'Operación exitosa');
    
    // Ajustar la posición del footer
    setTimeout(adjustFooterPosition, 300);
}

// Función modificada para añadir un nuevo campo sin columna de posición y con desplazamiento
function addNewField() {
    const tbody = document.getElementById('fields-tbody');
    const rowCount = tbody.children.length;
    
    const newRow = document.createElement('tr');
    newRow.dataset.index = rowCount;
    newRow.className = 'field-row';
    newRow.setAttribute('draggable', 'true');
    
    newRow.innerHTML = `
        <td>
            <input type="text" class="json-field" placeholder="nombre_campo">
        </td>
        <td>
            <input type="text" class="display-name" placeholder="Nombre Visible">
        </td>
        <td>
            <select class="field-type">
                <option value="text">Texto</option>
                <option value="number">Número</option>
                <option value="datetime">Fecha/Hora</option>
                <option value="boolean">Booleano</option>
                <option value="image">Imagen</option>
            </select>
        </td>
        <td>
            <input type="checkbox" class="visible-check" checked>
        </td>
        <td>
            <input type="number" class="decimals" value="2" min="0" max="10" step="1" disabled>
        </td>
        <td>
            <button type="button" class="action-btn delete" onclick="removeField(this)">Eliminar</button>
        </td>
    `;
    
    tbody.appendChild(newRow);
    
    // Añadir event listener para tipo de campo
    const typeSelect = newRow.querySelector('.field-type');
    typeSelect.addEventListener('change', function() {
        const decimalsInput = newRow.querySelector('.decimals');
        decimalsInput.disabled = this.value !== 'number';
    });
    
    // Añadir eventos de arrastrar para la nueva fila
    setupRowDragEvents(newRow);
    
    // Desplazarse hacia el nuevo campo de manera que sea completamente visible
    // Usar el contenedor padre para el scrolling
    const tableWrapper = document.querySelector('.table-wrapper');
    if (tableWrapper) {
        tableWrapper.scrollTop = tableWrapper.scrollHeight;
    }
    
    // Dar foco al primer campo para facilitar la edición
    setTimeout(() => {
        const firstInput = newRow.querySelector('.json-field');
        if (firstInput) firstInput.focus();
    }, 300);
    
    // Ajustar la posición del footer
    setTimeout(adjustFooterPosition, 500);
}

// Función auxiliar para configurar eventos de arrastre para una sola fila
function setupRowDragEvents(row) {
    const tbody = document.getElementById('fields-tbody');
    
    // Evento cuando se empieza a arrastrar
    row.addEventListener('dragstart', function(e) {
        this.classList.add('dragging');
        
        // Necesario para Firefox
        e.dataTransfer.setData('text/plain', '');
        
        // Permitir soltar en otros elementos
        e.dataTransfer.effectAllowed = 'move';
    });
    
    // Evento cuando se termina de arrastrar
    row.addEventListener('dragend', function() {
        this.classList.remove('dragging');
        
        // Actualizar visualización de todas las filas
        updateRowIndices();
    });
    
    // Evento cuando se arrastra sobre una fila
    row.addEventListener('dragover', function(e) {
        e.preventDefault();
        const draggedItem = document.querySelector('.dragging');
        if (draggedItem && draggedItem !== this) {
            e.dataTransfer.dropEffect = 'move';
        }
    });
    
    // Evento cuando se entra a una fila
    row.addEventListener('dragenter', function(e) {
        e.preventDefault();
        const draggedItem = document.querySelector('.dragging');
        if (draggedItem && draggedItem !== this) {
            this.classList.add('drag-over');
        }
    });
    
    // Evento cuando se sale de una fila
    row.addEventListener('dragleave', function() {
        this.classList.remove('drag-over');
    });
    
    // Evento cuando se suelta sobre una fila
    row.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('drag-over');
        
        const draggedItem = document.querySelector('.dragging');
        if (draggedItem && draggedItem !== this) {
            // Determinar la posición para insertar
            const rect = this.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            
            if (e.clientY < midpoint) {
                // Insertar antes de esta fila
                tbody.insertBefore(draggedItem, this);
            } else {
                // Insertar después de esta fila
                if (this.nextSibling) {
                    tbody.insertBefore(draggedItem, this.nextSibling);
                } else {
                    tbody.appendChild(draggedItem);
                }
            }
            
            // Actualizar índices
            updateRowIndices();
        }
    });
}

// Función para actualizar los índices de las filas
function updateRowIndices() {
    const tbody = document.getElementById('fields-tbody');
    const allRows = tbody.querySelectorAll('.field-row');
    allRows.forEach((row, index) => {
        // Actualizar el atributo data-index para mantener coherencia
        row.setAttribute('data-index', index);
    });
}

// Función para eliminar campo (actualizada)
function removeField(button) {
    showConfirm('¿Está seguro de eliminar este campo?', 'Confirmar eliminación', function(confirmed) {
        if (confirmed) {
            const row = button.closest('tr');
            row.parentNode.removeChild(row);
            
            // Ajustar la posición del footer
            setTimeout(adjustFooterPosition, 300);
        }
    });
}

// Función para guardar la configuración con el nuevo orden de campos
function saveClientConfig() {
    const clientId = document.getElementById('client-select').value;
    const config = window.allClientConfigs.find(c => c.clientId === clientId);
    
    if (!config) {
        showAlert('Cliente no encontrado', 'Error');
        return;
    }
    
    // Recopilar datos de etiquetas de búsqueda personalizadas
    const codeSearchLabel = document.getElementById('code-search-label').value.trim();
    const machineSearchLabel = document.getElementById('machine-search-label').value.trim();
    
    // Actualizar o crear objeto searchLabels
    if (!config.searchLabels) {
        config.searchLabels = {};
    }
    
    config.searchLabels.codeLabel = codeSearchLabel || "Buscar por Código";
    config.searchLabels.machineLabel = machineSearchLabel || "Filtrar por Máquina";
    config.searchLabels.folderLabel = "Seleccionar Cliente"; // Valor fijo como solicitado
    
    // Recopilar datos de los campos
    const rows = document.querySelectorAll('#fields-tbody tr');
    const columns = [];
    
    rows.forEach((row, index) => {
        const jsonField = row.querySelector('.json-field').value.trim();
        const displayName = row.querySelector('.display-name').value.trim();
        const type = row.querySelector('.field-type').value;
        const visible = row.querySelector('.visible-check').checked;
        const decimals = parseInt(row.querySelector('.decimals').value, 10);
        
        if (jsonField && displayName) {
            const column = {
                jsonField,
                displayName,
                displayOrder: index + 1, // El orden ahora se basa en la posición actual en la tabla
                visible,
                type
            };
            
            if (type === 'number') {
                column.decimals = decimals;
            }
            
            columns.push(column);
        }
    });
    
    // Validar que haya al menos un campo
    if (columns.length === 0) {
        showAlert('Debe configurar al menos un campo', 'Datos incompletos');
        return;
    }
    
    // Actualizar la configuración
    config.tableConfig.columns = columns;
    
    // Guardar en el servidor
    fetch(`${backendUrl}/client_config`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            clientId: config.clientId,
            config: config
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al guardar la configuración');
        }
        return response.json();
    })
    .then(data => {
        showAlert('Configuración guardada exitosamente', 'Operación exitosa');
        
        // Actualizar la configuración local
        const index = window.allClientConfigs.findIndex(c => c.clientId === clientId);
        if (index !== -1) {
            window.allClientConfigs[index] = config;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('Error al guardar la configuración: ' + error.message, 'Error');
    });
}


// Función modificada para aplicar etiquetas personalizadas en la interfaz de búsqueda
function updateSearchLabels() {
    try {
        // Solo actualizar si hay un usuario logueado
        if (!token) return;
        
        // Obtener la configuración actual
        let currentConfig = null;
        
        // Para administradores, usar la carpeta seleccionada
        if (isAdmin) {
            const adminFolderSelect = document.getElementById('admin-folder');
            if (adminFolderSelect && adminFolderSelect.value) {
                const selectedFolder = adminFolderSelect.value;
                currentConfig = window.allClientConfigs.find(
                    config => config.clientId.toLowerCase() === selectedFolder.toLowerCase()
                );
            }
        }
        // Para usuarios normales, usar su carpeta asignada
        else {
            fetch(`${backendUrl}/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            })
            .then(response => response.json())
            .then(userData => {
                if (userData.folder) {
                    currentConfig = window.allClientConfigs.find(
                        config => config.clientId.toLowerCase() === userData.folder.toLowerCase()
                    );
                    applySearchLabels(currentConfig);
                }
            });
            return; // Retornar aquí porque el resto se maneja en la promesa
        }
        
        applySearchLabels(currentConfig);
    } catch (error) {
        console.error('Error al actualizar etiquetas de búsqueda:', error);
    }
}

// 4. Función mejorada para aplicar etiquetas personalizadas en la interfaz
function applySearchLabels(config) {
    // Valores predeterminados
    let codeLabel = "Buscar por SKU";
    let machineLabel = "Filtrar por Máquina";
    let folderLabel = "Seleccionar Cliente";
    
    // Si hay configuración y tiene etiquetas personalizadas, usarlas
    if (config && config.searchLabels) {
        console.log("Aplicando etiquetas personalizadas de la configuración:", config.clientId);
        
        // Usar las etiquetas del cliente si existen, de lo contrario mantener predeterminadas
        codeLabel = config.searchLabels.codeLabel || codeLabel;
        machineLabel = config.searchLabels.machineLabel || machineLabel;
        folderLabel = config.searchLabels.folderLabel || folderLabel;
        
        console.log("Etiquetas a aplicar:", { codeLabel, machineLabel, folderLabel });
    } else {
        console.log("Aplicando etiquetas predeterminadas");
    }
    
    // Actualizar las etiquetas en la interfaz
    updateLabelsInDOM(codeLabel, machineLabel, folderLabel);
}

// Función auxiliar para depurar y encontrar el problema
function logDOMElements() {
    console.log("Etiquetas en el DOM:");
    console.log("Etiqueta SKU:", document.querySelector('label[for="sku"]')?.textContent);
    console.log("Etiqueta máquina:", document.querySelector('label[for="machine"]')?.textContent);
    console.log("Etiqueta carpeta:", document.querySelector('label[for="admin-folder"]')?.textContent);
}

// 5. Función auxiliar para actualizar etiquetas en el DOM
function updateLabelsInDOM(codeLabel, machineLabel, folderLabel) {
    const codeLabelElement = document.querySelector('label[for="sku"]');
    const machineLabelElement = document.querySelector('label[for="machine"]');
    const folderLabelElement = document.querySelector('label[for="admin-folder"]');
    
    if (codeLabelElement) {
        codeLabelElement.textContent = codeLabel + ":";
        console.log("Etiqueta de código actualizada a:", codeLabelElement.textContent);
    } else {
        console.warn("No se encontró etiqueta para código");
    }
    
    if (machineLabelElement) {
        machineLabelElement.textContent = machineLabel + ":";
        console.log("Etiqueta de máquina actualizada a:", machineLabelElement.textContent);
    } else {
        console.warn("No se encontró etiqueta para máquina");
    }
    
    if (folderLabelElement) {
        folderLabelElement.textContent = folderLabel + ":";
        console.log("Etiqueta de carpeta actualizada a:", folderLabelElement.textContent);
    } else {
        console.warn("No se encontró etiqueta para carpeta");
    }
}


function showFolderManagementPanel() {
    console.log('Función showFolderManagementPanel ejecutándose');
    
    if (!isAdmin) {
        showAlert('Solo los administradores pueden administrar carpetas', 'Acceso denegado');
        return;
    }
    
    // Ocultar paneles por ID directamente
    const searchForm = document.getElementById('search-form');
    const results = document.getElementById('results');
    const adminPanel = document.getElementById('admin-panel');
    
    if (searchForm) searchForm.style.display = 'none';
    if (results) results.style.display = 'none';
    if (adminPanel) adminPanel.style.display = 'none';
    
    // Verificar si existe el panel de administración de carpetas
    let folderPanel = document.getElementById('folder-management-panel');
    
    // Si no existe, crear uno nuevo
    if (!folderPanel) {
        folderPanel = document.createElement('div');
        folderPanel.id = 'folder-management-panel';
        folderPanel.className = 'card admin-panel';
        
        // Añadir el panel al contenedor principal
        const container = document.querySelector('.container');
        
        // Insertar antes del footer para mantener el orden correcto
        const footer = document.querySelector('.footer');
        if (container && footer) {
            container.insertBefore(folderPanel, footer);
        } else if (container) {
            container.appendChild(folderPanel);
        } else {
            // Si no hay contenedor, añadir al body como último recurso
            document.body.appendChild(folderPanel);
        }
    }
    
    // Mostrar el panel y llenarlo con el contenido
    folderPanel.style.display = 'block';
    folderPanel.innerHTML = `
        <h3>Administración de Carpetas</h3>
        <p>Desde aquí puede gestionar las carpetas del sistema</p>
        
        <div id="folders-list-container" class="mt-20">
            <!-- Aquí irá la lista de carpetas -->
            <div class="table-container">
                <table class="user-list-table">
                    <thead>
                        <tr>
                            <th>Nombre de Carpeta</th>
                            <th>Nombre para Mostrar</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="folders-tbody">
                        <!-- Se llenará dinámicamente -->
                    </tbody>
                </table>
            </div>
        </div>
        
        <div class="buttons-container" style="margin-top: 20px;">
            <button type="button" onclick="createNewFolder()">Crear Nueva Carpeta</button>
            <button type="button" onclick="returnToSearch()" class="logout">Volver a Búsqueda</button>
        </div>
    `;
    
    // Cargar las carpetas existentes
    loadFolders();
    
    // Ajustar la posición del footer
    setTimeout(adjustFooterPosition, 300);
}

// Función para crear una nueva carpeta
function createNewFolder() {
    // Ocultar la lista de carpetas y mostrar el formulario
    const foldersContainer = document.getElementById('folders-list-container');
    foldersContainer.innerHTML = `
        <div class="user-form">
            <h4 class="form-title">Crear Nueva Carpeta</h4>
            <form id="folder-form" onsubmit="saveFolder(event)">
                <div class="form-group">
                    <label for="folder-id">ID de Carpeta:</label>
                    <input type="text" id="folder-id" required placeholder="ID único para la carpeta">
                    <small class="password-hint">Solo letras, números, guiones y guiones bajos</small>
                </div>
                <div class="buttons-container">
                    <button type="submit" class="primary">Guardar Carpeta</button>
                    <button type="button" onclick="cancelFolderForm()" class="logout">Cancelar</button>
                </div>
            </form>
        </div>
    `;
    
    // Ocultar el botón principal de crear carpeta mientras se muestra el formulario
    const createButtons = document.querySelectorAll('button[onclick="createNewFolder()"]');
    createButtons.forEach(btn => {
        btn.style.display = 'none';
    });
}

// Función para guardar una nueva carpeta
async function saveFolder(event) {
    event.preventDefault();
    
    const folderId = document.getElementById('folder-id').value.trim();
    
    // Validar que el ID de carpeta solo contenga caracteres permitidos
    const folderPattern = /^[a-zA-Z0-9_-]+$/;
    if (!folderPattern.test(folderId)) {
        showAlert('El ID de carpeta solo puede contener letras, números, guiones y guiones bajos', 'Error');
        return;
    }
    
    try {
        // Mostrar overlay de carga
        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.classList.add('active');
        
        // Verificar primero si ya existe una configuración con este ID
        const configResponse = await fetch(`${backendUrl}/client_config`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const configData = await configResponse.json();
        
        // Verificar si ya existe una configuración con esta carpeta
        const folderExists = configData.clientConfigs.some(
            config => config.clientId.toLowerCase() === folderId.toLowerCase()
        );
        
        if (folderExists) {
            loadingOverlay.classList.remove('active');
            showAlert('Ya existe una carpeta con ese ID. Elija otro.', 'Error');
            return;
        }
        
        // Crear nueva configuración de cliente/carpeta con el mismo ID como nombre
        const newConfig = {
            clientId: folderId,
            displayName: folderId, // Usar el mismo ID como nombre para mostrar
            tableConfig: {
                columns: [
                    {"jsonField": "code", "displayName": "Código", "displayOrder": 1, "visible": true, "type": "text"},
                    {"jsonField": "length", "displayName": "Largo (cm)", "displayOrder": 2, "visible": true, "type": "number", "decimals": 2},
                    {"jsonField": "width", "displayName": "Ancho (cm)", "displayOrder": 3, "visible": true, "type": "number", "decimals": 2},
                    {"jsonField": "heigth", "displayName": "Alto (cm)", "displayOrder": 4, "visible": true, "type": "number", "decimals": 2},
                    {"jsonField": "weigth", "displayName": "Peso (Kg)", "displayOrder": 5, "visible": true, "type": "number", "decimals": 3},
                    {"jsonField": "measure_date", "displayName": "Fecha", "displayOrder": 6, "visible": true, "type": "datetime"},
                    {"jsonField": "machine_pid", "displayName": "Equipo", "displayOrder": 7, "visible": true, "type": "text"},
                    {"jsonField": "image_url", "displayName": "Imagen", "displayOrder": 8, "visible": true, "type": "image"}
                ]
            }
        };
        
        // Primero crear la estructura de carpetas en el servidor
        const createFolderResponse = await fetch(`${backendUrl}/folders/${folderId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!createFolderResponse.ok) {
            loadingOverlay.classList.remove('active');
            const errorData = await createFolderResponse.json();
            showAlert(`Error al crear estructura de carpetas: ${errorData.detail}`, 'Error');
            return;
        }

        // Guardar en el servidor la configuración
        const saveResponse = await fetch(`${backendUrl}/client_config`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                clientId: folderId,
                config: newConfig
            })
        });
        
        loadingOverlay.classList.remove('active');
        
        if (saveResponse.ok) {
            // Actualizar la lista global de configuraciones de clientes
            if (window.allClientConfigs) {
                window.allClientConfigs.push(newConfig);
            }
            
            // Actualizar también el selector de carpetas de administración
            const adminFolderSelect = document.getElementById('admin-folder');
            if (adminFolderSelect) {
                const option = document.createElement('option');
                option.value = folderId;
                option.textContent = folderId;
                adminFolderSelect.appendChild(option);
            }
            
            showAlert('Carpeta creada exitosamente', 'Operación exitosa', function() {
                loadFolders(); // Recargar la lista de carpetas
            });
        } else {
            const errorData = await saveResponse.json();
            showAlert(`Error al crear la carpeta: ${errorData.detail}`, 'Error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error de conexión: ' + error.message, 'Error');
        
        // Ocultar overlay de carga en caso de error
        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.classList.remove('active');
    }
}

// Función para cancelar la creación de carpeta
function cancelFolderForm() {
    // Asegurarse de volver a mostrar TODOS los botones de crear carpeta
    const createButtons = document.querySelectorAll('button[onclick="createNewFolder()"]');
    createButtons.forEach(btn => {
        btn.style.display = 'inline-block';
    });
    
    // Volver a cargar la lista de carpetas
    loadFolders();
}

// Función para cargar la lista de carpetas
async function loadFolders() {
    try {
        const response = await fetch(`${backendUrl}/client_config`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // Mostrar la lista de carpetas
            const foldersContainer = document.getElementById('folders-list-container');
            const foldersTable = `
                <div class="table-container">
                    <table class="user-list-table">
                        <thead>
                            <tr>
                                <th>Nombre de Carpeta</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="folders-tbody">
                            ${renderFolderRows(data.clientConfigs)}
                        </tbody>
                    </table>
                </div>
            `;
            
            foldersContainer.innerHTML = foldersTable;
            
            // Mostrar el botón de crear carpeta si está oculto
            const createButton = document.getElementById('create-folder-btn');
            if (createButton) {
                createButton.style.display = 'inline-block';
            }
        } else {
            showAlert('Error al cargar la lista de carpetas', 'Error');
        }
    } catch (error) {
        console.error('Error al cargar carpetas:', error);
        showAlert('Error de conexión: ' + error.message, 'Error');
    }
}

// Función para renderizar las filas de la tabla de carpetas
function renderFolderRows(configs) {
    // Filtrar solo configuraciones que no sean default o admin
    const folderConfigs = configs.filter(config => 
        config.clientId && 
        config.clientId !== 'default' && 
        config.clientId !== 'admin'
    );
    
    if (folderConfigs.length === 0) {
        return `<tr><td colspan="2" style="text-align: center;">No hay carpetas configuradas</td></tr>`;
    }
    
    return folderConfigs.map(config => `
        <tr>
            <td>${config.clientId}</td>
            <td>
                <button class="action-btn delete" onclick="confirmDeleteFolder('${config.clientId}')">Eliminar</button>
            </td>
        </tr>
    `).join('');
}

// No se implementará la función de editar carpetas
// Esta función se ha eliminado conforme a los requisitos

// Función modificada para confirmar eliminación de carpeta con contraseña
function confirmDeleteFolder(folderId) {
    // Crear un modal personalizado para solicitar la contraseña
    const passwordModal = document.createElement('div');
    passwordModal.className = 'custom-modal';
    passwordModal.id = 'password-modal';
    passwordModal.style.display = 'block';
    
    passwordModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h4>Confirmar eliminación</h4>
            </div>
            <div class="modal-body">
                <p>Para eliminar la carpeta <strong>${folderId}</strong>, ingrese la contraseña de autorización:</p>
                <div class="form-group" style="margin-top: 15px;">
                    <div class="password-input-container">
                        <input type="password" id="delete-password" class="form-control" placeholder="">
                        <button type="button" id="toggle-delete-password" class="password-toggle-btn" aria-label="Mostrar contraseña">
                            <svg xmlns="http://www.w3.org/2000/svg" class="eye-icon eye-open" viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display: none;">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            <svg xmlns="http://www.w3.org/2000/svg" class="eye-icon eye-closed" viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                                <line x1="2" y1="2" x2="22" y2="22"></line>
                            </svg>
                        </button>
                    </div>
                    <div id="password-error" style="color: #ff0000; display: none; margin-top: 5px; font-size: 0.9rem;">
                        Contraseña incorrecta
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" id="confirm-delete-btn" class="primary">Eliminar</button>
                <button type="button" id="cancel-delete-btn" class="logout">Cancelar</button>
            </div>
        </div>
    `;
    
    // Añadir el modal al DOM
    document.body.appendChild(passwordModal);
    
    // Configurar el evento para mostrar/ocultar contraseña
    const togglePasswordBtn = document.getElementById('toggle-delete-password');
    const passwordInput = document.getElementById('delete-password');
    
    togglePasswordBtn.addEventListener('click', function() {
        const openEyeIcon = this.querySelector('.eye-open');
        const closedEyeIcon = this.querySelector('.eye-closed');
        
        if (passwordInput.type === 'password') {
            // Cambiar a texto visible - mostrar el ojo abierto
            passwordInput.type = 'text';
            openEyeIcon.style.display = 'block';
            closedEyeIcon.style.display = 'none';
        } else {
            // Cambiar a texto oculto - mostrar el ojo tachado
            passwordInput.type = 'password';
            openEyeIcon.style.display = 'none';
            closedEyeIcon.style.display = 'block';
        }
    });
    
    // Permitir usar la tecla Enter para confirmar
    passwordInput.addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            document.getElementById('confirm-delete-btn').click();
        }
    });
    
    // Configurar los botones
    document.getElementById('confirm-delete-btn').onclick = function() {
        const password = passwordInput.value;
        const passwordError = document.getElementById('password-error');
        
        // Verificar la contraseña (8749A10)
        if (password === '8749A10') {
            // Contraseña correcta, cerrar modal y eliminar carpeta
            document.body.removeChild(passwordModal);
            deleteFolder(folderId);
        } else {
            // Contraseña incorrecta, mostrar error
            passwordError.style.display = 'block';
            passwordInput.value = '';
            
            // Efecto de agitación para el input
            passwordInput.classList.add('shake-animation');
            setTimeout(() => {
                passwordInput.classList.remove('shake-animation');
            }, 500);
        }
    };
    
    document.getElementById('cancel-delete-btn').onclick = function() {
        document.body.removeChild(passwordModal);
    };
    
    // También cerrar al hacer clic fuera del modal
    passwordModal.onclick = function(event) {
        if (event.target === passwordModal) {
            document.body.removeChild(passwordModal);
        }
    };
    
    // Enfocar el campo de contraseña automáticamente
    setTimeout(() => {
        passwordInput.focus();
    }, 100);
}

// Agregar estilos CSS para la animación de agitación
const styleElement = document.createElement('style');
styleElement.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
    
    .shake-animation {
        animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
    }
`;
document.head.appendChild(styleElement);
// Función para eliminar una carpeta
async function deleteFolder(folderId) {
    try {
        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.classList.add('active');
        
        // Primero eliminar la configuración del cliente
        const configResponse = await fetch(`${backendUrl}/client_config/${folderId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!configResponse.ok) {
            loadingOverlay.classList.remove('active');
            const errorData = await configResponse.json();
            showAlert(`Error al eliminar la configuración: ${errorData.detail}`, 'Error');
            return;
        }
        
        // Luego eliminar la estructura de carpetas
        const folderResponse = await fetch(`${backendUrl}/folders/${folderId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        loadingOverlay.classList.remove('active');
        
        if (folderResponse.ok) {
            showAlert('Carpeta eliminada exitosamente', 'Operación exitosa', function() {
                loadFolders(); // Recargar la lista de carpetas
            });
        } else {
            // Si la configuración se eliminó pero la carpeta no, aún consideramos exitosa la operación
            // pero informamos al usuario
            const errorData = await folderResponse.json();
            console.error('Error al eliminar la estructura de carpetas:', errorData);
            showAlert('La configuración fue eliminada, pero puede haber habido un problema al eliminar los archivos físicos de la carpeta.', 'Advertencia', function() {
                loadFolders(); // Recargar la lista de carpetas
            });
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error de conexión: ' + error.message, 'Error');
        
        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.classList.remove('active');
    }
}

// Función mejorada para volver a la pantalla de búsqueda
function returnToSearch() {
    // Ocultar panel de gestión de carpetas
    const folderPanel = document.getElementById('folder-management-panel');
    if (folderPanel) {
        folderPanel.style.display = 'none';
    }
    
    // Mostrar formulario de búsqueda y resultados
    const searchForm = document.getElementById('search-form');
    const results = document.getElementById('results');
    
    if (searchForm) searchForm.style.display = 'block';
    if (results) results.style.display = 'block';
    
    // Ajustar la posición del footer
    setTimeout(adjustFooterPosition, 300);
}
