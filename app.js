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
    
    // Crear el panel de configuración de campos si no existe
    if (!document.getElementById('client-config-panel')) {
        createClientConfigPanel();
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

async function login(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');
    const loadingOverlay = document.getElementById('loading-overlay');
    
    errorMessage.textContent = '';
    
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
        const data = await response.json();

        if (response.ok) {
            token = data.access_token;
            
            // Ocultar completamente el login con animación
            const loginForm = document.getElementById('login-form');
            loginForm.style.opacity = '0';
            loginForm.style.transform = 'scale(0.9)';
            loginForm.style.transition = 'all 0.3s ease-out';
            
            // Esperar un momento antes de ocultar completamente
            setTimeout(() => {
                loginForm.style.display = 'none';
                
                // Mostrar formulario de búsqueda con animación
                const searchForm = document.getElementById('search-form');
                searchForm.style.display = 'block';
                searchForm.style.opacity = '0';
                searchForm.style.transform = 'scale(0.9)';
                
                // Forzar un reflow para que la transición funcione
                void searchForm.offsetWidth;
                
                // Animar entrada del formulario de búsqueda
                searchForm.style.transition = 'all 0.3s ease-out';
                searchForm.style.opacity = '1';
                searchForm.style.transform = 'scale(1)';
            }, 300);
            
            // Verificar si el usuario es administrador
            const userResponse = await fetch(`${backendUrl}/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            
            if (userResponse.ok) {
                const userData = await userResponse.json();
                isAdmin = userData.role === "admin";
                
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
            }
            
            // Obtener información del usuario después del login exitoso
            await getUserInfo();
            
            // Si el usuario es administrador, preparar el menú de administración
            if (isAdmin) {
                updateAdminMenu();
            }
        } else {
            errorMessage.textContent = 'Error de autenticación: ' + data.detail;
        }
    } catch (error) {
        console.error('Error during login:', error);
        errorMessage.textContent = 'Error de conexión: ' + error.message;
    } finally {
        // Ocultar el overlay de carga, independientemente del resultado
        loadingOverlay.classList.remove('active');
        
        // Ajustar la posición del footer
        setTimeout(adjustFooterPosition, 300);
    }
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

async function logout() {
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
    
    // Si es admin, limpiar el selector de carpeta
    const adminFolderSelect = document.getElementById('admin-folder');
    if (adminFolderSelect) {
        adminFolderSelect.value = '';
    }
    
    // Limpiar resultados
    document.getElementById('results').innerHTML = '';
    
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
        
        // Ajustar footer
        setTimeout(adjustFooterPosition, 300);
    }, 300);
}

// Función para obtener información del usuario y configuración (versión mejorada)
// Función para obtener información del usuario y configuración (versión mejorada)
async function getUserInfo() {
    try {
        const response = await fetch(`${backendUrl}/client_config`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // Almacenar todas las configuraciones globalmente para usarlas en diferentes partes
            window.allClientConfigs = data.clientConfigs || [];
            
            // Para administradores, cargar todas las configuraciones de clientes
            const adminFolderSelector = document.getElementById('admin-folder-selector');
            
            if (isAdmin) {
                const adminFolderSelect = document.getElementById('admin-folder');
                
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
                
                // Mostrar selector de carpetas SOLO para administradores
                adminFolderSelector.style.display = 'block';
            } else {
                // Ocultar selector de carpetas para usuarios no administradores
                adminFolderSelector.style.display = 'none';
            }

            // Cargar la configuración del cliente para el usuario actual
            await loadClientConfig();
        }
    } catch (error) {
        console.error('Error al cargar configuraciones de clientes:', error);
    }
    // Ajustar la posición del footer
    setTimeout(adjustFooterPosition, 300);
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

// Modificar la función searchImages para mostrar error de forma más elegante
async function searchImages(event) {
    event.preventDefault();

    if (searchInProgress) {
        console.log('Búsqueda en progreso, por favor espere...');
        return;
    }

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

    if (isAdmin) {
        // Para administradores, verificar selección de carpeta
        if (!adminFolderSelect.value) {
            // Mostrar mensaje de error en el elemento error-message en lugar de un alert
            errorMessage.textContent = 'Debe seleccionar una carpeta como administrador';
            errorMessage.style.display = 'block';
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
    
    // Mostrar el indicador de carga
    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.classList.add('active');
    
    const sku = document.getElementById('sku').value;
    const startDate = document.getElementById('start-date').value.split('-').reverse().join('/');
    const endDate = document.getElementById('end-date').value.split('-').reverse().join('/');
    
    errorMessage.textContent = '';
    const results = document.getElementById('results');
    results.innerHTML = ''; // Clear previous results

    if ((startDate && !endDate) || (!startDate && endDate)) {
        errorMessage.textContent = 'Debe seleccionar ambas fechas si selecciona una de ellas.';
        searchInProgress = false;
        loadingOverlay.classList.remove('active');
        return;
    }

    try {
        let url = '';
        if (sku && startDate && endDate) {
            url = `${backendUrl}/search_by_sku_and_date/${sku}?start_date=${startDate}&end_date=${endDate}&folder=${folder}`;
        } else if (sku) {
            url = `${backendUrl}/search_by_sku/${sku}?folder=${folder}`;
        } else if (startDate && endDate) {
            url = `${backendUrl}/search_by_date?start_date=${startDate}&end_date=${endDate}&folder=${folder}`;
        } else {
            errorMessage.textContent = 'Debe ingresar un SKU o un rango de fechas.';
            searchInProgress = false;
            loadingOverlay.classList.remove('active');
            return;
        }

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        const data = await response.json();
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
                // Mostrar mensaje de error en la parte superior en vez de en los resultados
                errorMessage.textContent = 'No se encontraron resultados para el SKU: ${sku}';
                errorMessage.style.display = 'block';
                //results.innerHTML = ''; // Limpiar el área de resultados
            }
        
            document.getElementById('sku').value = '';
            document.getElementById('start-date').value = '';
            document.getElementById('end-date').value = '';
            validateDates();
        } else {
            errorMessage.textContent = 'Error al buscar resultados: ' + data.detail;
        }
    } catch (error) {
        console.error('Error during search:', error);
        errorMessage.textContent = 'Error de conexión: ' + error.message;
    } finally {
        searchInProgress = false;
        loadingOverlay.classList.remove('active');
        
        // Ajustar la posición del footer
        setTimeout(adjustFooterPosition, 300);
    }
}

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
                
                // Resto del código de renderización permanece igual
                default:
                    td.textContent = fieldValue !== undefined && fieldValue !== null ? fieldValue : 'N/A';
            }
            
            row.appendChild(td);
        });
        
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    tableContainer.appendChild(table);
    
    // Limpiar resultados anteriores y agregar la nueva tabla
    resultsDiv.innerHTML = '';
    resultsDiv.appendChild(tableContainer);
    
    // Ajustar la posición del footer después de renderizar la tabla
    setTimeout(adjustFooterPosition, 300);
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

// Función para mostrar la lista de usuarios con un solo botón Volver
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
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    users.forEach(user => {
        tableHtml += `
            <tr>
                <td>${user.username}</td>
                <td>${user.folder || 'Todas'}</td>
                <td>${user.expiration_date}</td>
                <td>${user.role}</td>
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


// Actualizar la función editUser para incluir selector de carpetas
async function editUser(username) {
    const user = currentUsers.find(u => u.username === username);
    if (!user) {
        showAlert('Usuario no encontrado', 'Error');
        return;
    }
    
    try {
        // Obtener la información completa del usuario
        const response = await fetch(`${backendUrl}/users/${username}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        
        if (!response.ok) {
            throw new Error('No se pudo obtener la información completa del usuario');
        }
        
        const userComplete = await response.json();
        
        const container = document.getElementById('user-form-container');
        container.style.display = 'block';
        
        // Ocultar listado si está visible
        document.getElementById('user-list-container').style.display = 'none';
        
        let folderFieldHtml = '';
        
        // Solo mostrar selección de carpeta para usuarios normales
        if (user.role === 'user') {
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
                    <input type="hidden" id="role-input" value="${user.role}">
                    
                    <div class="form-group">
                        <label for="username-input">Usuario:</label>
                        <input type="text" id="username-input" value="${username}" readonly>
                    </div>
                    <div class="form-group">
                        <label for="password-input">Contraseña:</label>
                        <div class="password-container">
                            <input type="password" id="password-input" value="">
                            <label class="checkbox-container">
                                <input type="checkbox" id="show-password" onchange="togglePasswordVisibility()">
                                <span>Mostrar contraseña</span>
                            </label>
                        </div>
                    </div>
                    
                    ${folderFieldHtml}
                    
                    <div class="form-group">
                        <label for="expiration-input">Fecha de Vigencia:</label>
                        <input type="date" id="expiration-input" value="${user.expiration_date}" required>
                    </div>
                    <div class="form-group">
                        <label>Rol:</label>
                        <input type="text" value="${user.role === 'admin' ? 'Administrador' : 'Usuario'}" readonly>
                    </div>
                    <div class="buttons-container">
                        <button type="submit" class="primary">Actualizar Usuario</button>
                        <button type="button" onclick="cancelUserForm()" class="logout">Cancelar</button>
                    </div>
                </form>
            </div>
        `;
        
        // Si es un usuario, cargar carpetas existentes
        if (user.role === 'user') {
            await loadExistingFolders();
            
            // Seleccionar la carpeta actual del usuario
            const folderSelect = document.getElementById('folder-select');
            if (user.folder) {
                // Intentar encontrar la carpeta en el selector
                let folderFound = false;
                for (let i = 0; i < folderSelect.options.length; i++) {
                    if (folderSelect.options[i].value === user.folder) {
                        folderSelect.selectedIndex = i;
                        folderFound = true;
                        break;
                    }
                }
                
                // Si no se encuentra la carpeta en el selector, suponer que es una carpeta personalizada
                if (!folderFound && user.folder !== '') {
                    const newFolderCheckbox = document.getElementById('new-folder-checkbox');
                    newFolderCheckbox.checked = true;
                    document.getElementById('folder-input').value = user.folder;
                    toggleNewFolderInput(); // Aplicar los cambios visuales
                }
            }
        }
    } catch (error) {
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
    
    // Generar formulario para editar campos
    let html = `
        <div class="table-container">
            <table class="user-list-table">
                <thead>
                    <tr>
                        <th>Campo JSON</th>
                        <th>Nombre a Mostrar</th>
                        <th>Orden</th>
                        <th>Tipo</th>
                        <th>Visible</th>
                        <th>Decimales</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="fields-tbody">
    `;
    
    columns.forEach((column, index) => {
        html += `
            <tr data-index="${index}">
                <td>
                    <input type="text" class="json-field" value="${column.jsonField || ''}" placeholder="nombre_campo">
                </td>
                <td>
                    <input type="text" class="display-name" value="${column.displayName || ''}" placeholder="Nombre Visible">
                </td>
                <td>
                    <input type="number" class="display-order" value="${column.displayOrder || index + 1}" min="1" step="1">
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
    
    // Ajustar la posición del footer
    setTimeout(adjustFooterPosition, 300);
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
function addNewField() {
    const tbody = document.getElementById('fields-tbody');
    const rowCount = tbody.children.length;
    
    const newRow = document.createElement('tr');
    newRow.dataset.index = rowCount;
    
    newRow.innerHTML = `
        <td>
            <input type="text" class="json-field" placeholder="nombre_campo">
        </td>
        <td>
            <input type="text" class="display-name" placeholder="Nombre Visible">
        </td>
        <td>
            <input type="number" class="display-order" value="${rowCount + 1}" min="1" step="1">
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
    
    // Ajustar la posición del footer
    setTimeout(adjustFooterPosition, 300);
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

// Función para guardar configuración de cliente (actualizada)
function saveClientConfig() {
    const clientId = document.getElementById('client-select').value;
    const config = window.allClientConfigs.find(c => c.clientId === clientId);
    
    if (!config) {
        showAlert('Cliente no encontrado', 'Error');
        return;
    }
    
    // Recopilar datos de los campos
    const rows = document.querySelectorAll('#fields-tbody tr');
    const columns = [];
    
    rows.forEach(row => {
        const jsonField = row.querySelector('.json-field').value.trim();
        const displayName = row.querySelector('.display-name').value.trim();
        const displayOrder = parseInt(row.querySelector('.display-order').value, 10);
        const type = row.querySelector('.field-type').value;
        const visible = row.querySelector('.visible-check').checked;
        const decimals = parseInt(row.querySelector('.decimals').value, 10);
        
        if (jsonField && displayName) {
            const column = {
                jsonField,
                displayName,
                displayOrder,
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

// Función para confirmar eliminación de carpeta
function confirmDeleteFolder(folderId) {
    showConfirm(`¿Está seguro de eliminar la carpeta "${folderId}"?`, 'Confirmar eliminación', function(confirmed) {
        if (confirmed) {
            deleteFolder(folderId);
        }
    });
}

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