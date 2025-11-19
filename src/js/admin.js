// Глобальные переменные
let database = {};
let currentUser = null;
let currentTable = 'расы';
let editingItem = null;

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    checkAdminAccess();
    initAdminPanel();
});

// Проверка доступа админа - ОБНОВЛЕННАЯ ФУНКЦИЯ
function checkAdminAccess() {
    const savedUser = localStorage.getItem('currentUser');
    currentUser = savedUser ? JSON.parse(savedUser) : null;
    
    console.log('Проверка доступа админа:', currentUser); // Для отладки
    
    // Проверяем, является ли пользователь админом (два способа)
    const isAdmin = currentUser && (
        currentUser.isAdmin === true || 
        currentUser.username === 'admin'
    );
    
    if (!isAdmin) {
        alert('Доступ запрещен. Только администратор может просматривать эту страницу.');
        window.location.href = '/';
        return;
    }
    
    console.log('Доступ разрешен для:', currentUser.username);
}

// Основная функция инициализации
async function initAdminPanel() {
    await loadDatabase();
    setupEventListeners();
    loadSessions();
    loadUsers();
    updateStats();
    loadTableData();
}

// Загрузка базы данных
async function loadDatabase() {
    try {
        const response = await fetch('src/data/DB.json');
        database = await response.json();
        console.log('База данных загружена:', database);
    } catch (error) {
        console.error('Ошибка загрузки базы данных:', error);
        showNotification('Не удалось загрузить базу данных', 'error');
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Табы
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchTab(e.target.dataset.tab);
        });
    });

    // Кнопка обновления сессий
    document.getElementById('refreshSessionsBtn').addEventListener('click', loadSessions);

    // Выбор таблицы БД
    document.getElementById('dbTableSelect').addEventListener('change', (e) => {
        currentTable = e.target.value;
        loadTableData();
    });

    // Кнопки управления БД
    document.getElementById('addItemBtn').addEventListener('click', showAddItemModal);
    document.getElementById('exportDbBtn').addEventListener('click', exportDatabase);
    document.getElementById('importDbBtn').addEventListener('click', showImportModal);

    // Кнопка очистки пользователей
    document.getElementById('clearUsersBtn').addEventListener('click', clearInactiveUsers);

    // Модальные окна
    setupModalEvents();
}

// Настройка событий модальных окон
function setupModalEvents() {
    // Закрытие модальных окон
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeAllModals();
            }
        });
    });

    // Форма элемента
    document.getElementById('itemForm').addEventListener('submit', saveItem);

    // Кнопки отмены
    document.getElementById('cancelItemBtn').addEventListener('click', closeAllModals);
    document.getElementById('cancelConfirmBtn').addEventListener('click', closeAllModals);
    document.getElementById('cancelImportBtn').addEventListener('click', closeAllModals);

    // Кнопки подтверждения
    document.getElementById('importDbConfirmBtn').addEventListener('click', importDatabase);
}

// Переключение табов
function switchTab(tabName) {
    // Деактивируем все табы
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });

    // Активируем выбранный таб
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-pane`).classList.add('active');
}

// Загрузка активных сессий
function loadSessions() {
    const sessionsList = document.getElementById('sessionsList');
    const sessions = JSON.parse(localStorage.getItem('activeSessions')) || [];
    
    if (sessions.length === 0) {
        sessionsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎮</div>
                <p>Нет активных игровых сессий</p>
            </div>
        `;
        return;
    }

    sessionsList.innerHTML = sessions.map(session => `
        <div class="session-card">
            <div class="session-header">
                <h3 class="session-title">${session.name || 'Без названия'}</h3>
                <span class="status status-active">Активна</span>
            </div>
            <div class="session-meta">
                <span class="session-info">Мастер: ${session.dm || 'Неизвестно'}</span>
                <span class="session-info">Игроков: ${session.players || 0}</span>
                <span class="session-info">Создана: ${new Date(session.createdAt).toLocaleString()}</span>
            </div>
            <div class="session-actions">
                <button class="btn btn-secondary" onclick="viewSession(${session.id})">Просмотр</button>
                <button class="btn btn-danger" onclick="endSession(${session.id})">Завершить</button>
            </div>
        </div>
    `).join('');

    updateStats();
}

// Загрузка пользователей
function loadUsers() {
    const usersList = document.getElementById('usersList');
    const users = JSON.parse(localStorage.getItem('users')) || [];
    
    if (users.length === 0) {
        usersList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">👤</div>
                <p>Нет зарегистрированных пользователей</p>
            </div>
        `;
        return;
    }

    usersList.innerHTML = users.map(user => `
        <div class="user-card">
            <div class="user-header">
                <h3 class="user-name">${user.username}</h3>
                <span class="status ${user.isActive ? 'status-active' : 'status-inactive'}">
                    ${user.isActive ? 'Активен' : 'Неактивен'}
                </span>
            </div>
            <div class="user-meta">
                <span class="user-info">ID: ${user.id}</span>
                <span class="user-info">Зарегистрирован: ${new Date(user.createdAt).toLocaleDateString()}</span>
                <span class="user-info">Email: ${user.email || 'Не указан'}</span>
            </div>
            <div class="user-actions">
                <button class="btn btn-secondary" onclick="editUser(${user.id})">Редактировать</button>
                <button class="btn btn-danger" onclick="deleteUser(${user.id})">Удалить</button>
            </div>
        </div>
    `).join('');

    updateStats();
}

// Загрузка данных таблицы
function loadTableData() {
    const tableBody = document.getElementById('dbTableBody');
    const tableData = database[currentTable] || [];
    
    if (tableData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-state">
                    Нет данных в таблице
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = tableData.map(item => `
        <tr>
            <td>${item.id}</td>
            <td>${item.название || item.name || 'Без названия'}</td>
            <td>${(item.описание || item.description || '').substring(0, 100)}...</td>
            <td class="actions-cell">
                <button class="btn btn-secondary" onclick="editItem(${item.id})">✏️</button>
                <button class="btn btn-danger" onclick="deleteItem(${item.id})">🗑️</button>
            </td>
        </tr>
    `).join('');
}

// Обновление статистики
function updateStats() {
    const sessions = JSON.parse(localStorage.getItem('activeSessions')) || [];
    const users = JSON.parse(localStorage.getItem('users')) || [];
    
    // Подсчет общего количества элементов в БД
    let totalItems = 0;
    Object.values(database).forEach(table => {
        if (Array.isArray(table)) {
            totalItems += table.length;
        }
    });

    document.getElementById('activeSessionsCount').textContent = sessions.length;
    document.getElementById('totalUsersCount').textContent = users.length;
    document.getElementById('totalItemsCount').textContent = totalItems;
}

// Показать модальное окно добавления элемента
function showAddItemModal() {
    editingItem = null;
    document.getElementById('itemModalTitle').textContent = 'Добавить элемент';
    document.getElementById('formFields').innerHTML = generateFormFields();
    document.getElementById('itemModal').classList.remove('hidden');
}

// Генерация полей формы
function generateFormFields() {
    const sampleItem = getSampleItem();
    let fields = '';

    Object.keys(sampleItem).forEach(key => {
        if (key === 'id') return; // Пропускаем ID
        
        const value = editingItem ? editingItem[key] : '';
        const fieldType = getFieldType(key, value);
        
        fields += `
            <div class="form-group">
                <label class="form-label">${getFieldLabel(key)}</label>
                ${generateFieldInput(key, value, fieldType)}
            </div>
        `;
    });

    return fields;
}

// Получить пример элемента для формы
function getSampleItem() {
    const samples = {
        'расы': { id: 0, название: '', описание: '', скорость: 30, размер: 'Средний' },
        'классы': { id: 0, название: '', описание: '', хиты_за_уровень: '1к8' },
        'заклинания': { id: 0, название: '', описание: '', уровень: 1, школа: 'Воплощение' },
        'монстры': { id: 0, название: '', описание: '', размер: 'Средний', тип: 'Гуманоид' },
        'предметы': { id: 0, название: '', описание: '', тип: 'Оружие', редкость: 'Обычный' }
    };
    
    return samples[currentTable] || { id: 0, название: '', описание: '' };
}

// Определить тип поля
function getFieldType(key, value) {
    if (key.includes('описание') || key.includes('description')) return 'textarea';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'checkbox';
    return 'text';
}

// Получить метку поля
function getFieldLabel(key) {
    const labels = {
        'название': 'Название',
        'описание': 'Описание',
        'скорость': 'Скорость',
        'размер': 'Размер',
        'хиты_за_уровень': 'Хиты за уровень',
        'уровень': 'Уровень',
        'школа': 'Школа магии',
        'тип': 'Тип',
        'редкость': 'Редкость'
    };
    return labels[key] || key;
}

// Генерация поля ввода
function generateFieldInput(key, value, type) {
    switch (type) {
        case 'textarea':
            return `<textarea class="form-textarea" name="${key}">${value}</textarea>`;
        case 'number':
            return `<input type="number" class="form-input" name="${key}" value="${value}">`;
        case 'checkbox':
            return `<input type="checkbox" class="form-input" name="${key}" ${value ? 'checked' : ''}>`;
        default:
            return `<input type="text" class="form-input" name="${key}" value="${value}">`;
    }
}

// Сохранение элемента
function saveItem(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const itemData = {};
    
    formData.forEach((value, key) => {
        // Преобразуем числовые значения
        if (!isNaN(value) && value !== '') {
            itemData[key] = Number(value);
        } else if (value === 'on') {
            itemData[key] = true;
        } else if (value === 'off') {
            itemData[key] = false;
        } else {
            itemData[key] = value;
        }
    });

    if (editingItem) {
        // Обновление существующего элемента
        updateItem(editingItem.id, itemData);
    } else {
        // Добавление нового элемента
        addItem(itemData);
    }
    
    closeAllModals();
}

// Добавление элемента
function addItem(itemData) {
    if (!database[currentTable]) {
        database[currentTable] = [];
    }
    
    itemData.id = Date.now(); // Генерируем уникальный ID
    database[currentTable].push(itemData);
    
    saveDatabase();
    loadTableData();
    updateStats();
    showNotification('Элемент успешно добавлен', 'success');
}

// Обновление элемента
function updateItem(itemId, itemData) {
    const itemIndex = database[currentTable].findIndex(item => item.id === itemId);
    if (itemIndex !== -1) {
        database[currentTable][itemIndex] = { ...database[currentTable][itemIndex], ...itemData };
        saveDatabase();
        loadTableData();
        showNotification('Элемент успешно обновлен', 'success');
    }
}

// Редактирование элемента
function editItem(itemId) {
    const item = database[currentTable].find(item => item.id === itemId);
    if (item) {
        editingItem = item;
        document.getElementById('itemModalTitle').textContent = 'Редактировать элемент';
        document.getElementById('formFields').innerHTML = generateFormFields();
        document.getElementById('itemModal').classList.remove('hidden');
    }
}

// Удаление элемента
function deleteItem(itemId) {
    showConfirmModal(
        'Вы уверены, что хотите удалить этот элемент?',
        () => {
            database[currentTable] = database[currentTable].filter(item => item.id !== itemId);
            saveDatabase();
            loadTableData();
            updateStats();
            showNotification('Элемент успешно удален', 'success');
        }
    );
}

// Сохранение базы данных
function saveDatabase() {
    // В реальном приложении здесь был бы запрос к серверу
    localStorage.setItem('adminDatabase', JSON.stringify(database));
    showNotification('База данных сохранена', 'success');
}

// Экспорт базы данных
function exportDatabase() {
    const dataStr = JSON.stringify(database, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = 'dnd_database_export.json';
    link.click();
    
    showNotification('База данных экспортирована', 'success');
}

// Показать модальное окно импорта
function showImportModal() {
    document.getElementById('importModal').classList.remove('hidden');
}

// Импорт базы данных
function importDatabase() {
    const fileInput = document.getElementById('dbFileInput');
    const file = fileInput.files[0];
    
    if (!file) {
        showNotification('Выберите файл для импорта', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            database = importedData;
            saveDatabase();
            loadTableData();
            updateStats();
            closeAllModals();
            showNotification('База данных успешно импортирована', 'success');
        } catch (error) {
            showNotification('Ошибка при импорте файла', 'error');
        }
    };
    reader.readAsText(file);
}

// Очистка неактивных пользователей
function clearInactiveUsers() {
    showConfirmModal(
        'Вы уверены, что хотите удалить всех неактивных пользователей?',
        () => {
            const users = JSON.parse(localStorage.getItem('users')) || [];
            const activeUsers = users.filter(user => user.isActive);
            localStorage.setItem('users', JSON.stringify(activeUsers));
            loadUsers();
            showNotification('Неактивные пользователи удалены', 'success');
        }
    );
}

// Показать модальное окно подтверждения
function showConfirmModal(message, confirmCallback) {
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmModal').classList.remove('hidden');
    
    document.getElementById('confirmBtn').onclick = () => {
        confirmCallback();
        closeAllModals();
    };
}

// Закрыть все модальные окна
function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.classList.add('hidden');
    });
    editingItem = null;
}

// Функции для сессий (заглушки)
function viewSession(sessionId) {
    showNotification(`Просмотр сессии #${sessionId}`, 'info');
}

function endSession(sessionId) {
    showConfirmModal(
        'Вы уверены, что хотите завершить эту сессию?',
        () => {
            const sessions = JSON.parse(localStorage.getItem('activeSessions')) || [];
            const updatedSessions = sessions.filter(session => session.id !== sessionId);
            localStorage.setItem('activeSessions', JSON.stringify(updatedSessions));
            loadSessions();
            showNotification('Сессия завершена', 'success');
        }
    );
}

// Функции для пользователей (заглушки)
function editUser(userId) {
    showNotification(`Редактирование пользователя #${userId}`, 'info');
}

function deleteUser(userId) {
    showConfirmModal(
        'Вы уверены, что хотите удалить этого пользователя?',
        () => {
            const users = JSON.parse(localStorage.getItem('users')) || [];
            const updatedUsers = users.filter(user => user.id !== userId);
            localStorage.setItem('users', JSON.stringify(updatedUsers));
            loadUsers();
            showNotification('Пользователь удален', 'success');
        }
    );
}

// Показать уведомление
function showNotification(message, type = 'info') {
    // Создаем временное уведомление
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4CAF50' : '#2196F3'};
        color: white;
        padding: 1rem 2rem;
        border-radius: 5px;
        z-index: 10000;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Добавляем тестовые данные при первом запуске
function initializeTestData() {
    if (!localStorage.getItem('activeSessions')) {
        const testSessions = [
            {
                id: 1,
                name: 'Поход в Подгорье',
                dm: 'Гэндальф',
                players: 4,
                createdAt: new Date().toISOString()
            },
            {
                id: 2,
                name: 'Осада Драконьей горы',
                dm: 'Эльминстер',
                players: 3,
                createdAt: new Date(Date.now() - 86400000).toISOString()
            }
        ];
        localStorage.setItem('activeSessions', JSON.stringify(testSessions));
    }
}

// Инициализируем тестовые данные при загрузке
initializeTestData();