// Данные приложения
const appData = {
    currentUser: JSON.parse(localStorage.getItem('currentUser')) || null,
    users: JSON.parse(localStorage.getItem('users')) || []
};

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    initApp();
    initSlider();
    initAuthModal();
    initUserMenu();
    initProtectedLinks();
    updateUserInterface();
});

// Основная инициализация
function initApp() {
    console.log('Dungeon Master\'s Hub initialized');
}

// Слайдер
function initSlider() {
    const slides = document.querySelectorAll('.slider__content');
    const prevBtn = document.getElementById('sliderPrev');
    const nextBtn = document.getElementById('sliderNext');
    let currentSlide = 0;

    function updateSlides() {
        slides.forEach((slide, index) => {
            slide.classList.remove('active', 'prev', 'next');
            
            if (index === currentSlide) {
                slide.classList.add('active');
            } else if (index === (currentSlide - 1 + slides.length) % slides.length) {
                slide.classList.add('prev');
            } else if (index === (currentSlide + 1) % slides.length) {
                slide.classList.add('next');
            }
        });
    }

    function nextSlide() {
        currentSlide = (currentSlide + 1) % slides.length;
        updateSlides();
    }

    function prevSlide() {
        currentSlide = (currentSlide - 1 + slides.length) % slides.length;
        updateSlides();
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', prevSlide);
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', nextSlide);
    }

    // Автопереключение слайдов
    setInterval(nextSlide, 5000);
    updateSlides();
}

// Модальное окно авторизации
function initAuthModal() {
    const userIcon = document.getElementById('userIcon');
    const authModal = document.getElementById('authModal');
    const closeModal = document.getElementById('closeModal');
    const authForm = document.getElementById('authForm');
    const authSwitch = document.getElementById('authSwitch');

    // Открытие модального окна
    if (userIcon) {
        userIcon.addEventListener('click', function(e) {
            e.stopPropagation();
            if (appData.currentUser) {
                toggleUserMenu();
            } else {
                showModal();
            }
        });
    }

    // Закрытие модального окна
    if (closeModal) {
        closeModal.addEventListener('click', hideModal);
    }

    // Переключение режима авторизации/регистрации
    if (authSwitch) {
        authSwitch.addEventListener('click', toggleAuthMode);
    }

    // Обработка формы
    if (authForm) {
        authForm.addEventListener('submit', handleAuthSubmit);
    }

    // Закрытие по клику на оверлей
    if (authModal) {
        authModal.addEventListener('click', function(e) {
            if (e.target === authModal) {
                hideModal();
            }
        });
    }
}

// Меню пользователя
function initUserMenu() {
    const logoutBtn = document.getElementById('logoutBtn');
    const userMenu = document.getElementById('userMenu');

    // Выход из аккаунта
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logoutUser);
    }

    // Закрытие меню при клике вне его
    document.addEventListener('click', function(e) {
        if (userMenu && userMenu.classList.contains('active') && 
            !e.target.closest('.user-menu') && 
            !e.target.closest('.user-icon')) {
            hideUserMenu();
        }
    });
}

// Защищенные ссылки
function initProtectedLinks() {
    const protectedLinks = document.querySelectorAll('.protected-link');
    
    protectedLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            if (!appData.currentUser) {
                e.preventDefault();
                showNotification('Для доступа к этой странице необходимо авторизоваться');
                showModal();
            } else {
                // Здесь будет переход на защищенные страницы
                const page = this.getAttribute('data-page');
                handleProtectedPageNavigation(page, e);
            }
        });
    });
}

// Обработка перехода на защищенные страницы
function handleProtectedPageNavigation(page, e) {
    e.preventDefault();
    
    switch(page) {
        case 'create-character':
            showNotification('Переход к созданию персонажа');
            // window.location.href = '/create-character.html';
            break;
        case 'play':
            showNotification('Переход к игре');
            window.location.href = '/handbook.html';
            break;
        case 'create-campaign':
            showNotification('Переход к созданию кампании');
            // window.location.href = '/create-campaign.html';
            break;
        default:
            showNotification('Страница в разработке');
    }
}

// Функции модального окна
function showModal() {
    const modal = document.getElementById('authModal');
    modal.classList.add('active');
}

function hideModal() {
    const modal = document.getElementById('authModal');
    modal.classList.remove('active');
    
    // Очистка формы
    const form = document.getElementById('authForm');
    if (form) {
        form.reset();
    }
}

function toggleAuthMode() {
    const modalTitle = document.getElementById('modalTitle');
    const submitBtn = document.getElementById('submitBtn');
    const authSwitchText = document.getElementById('authSwitchText');
    const authSwitch = document.getElementById('authSwitch');

    if (modalTitle.textContent === 'Вход') {
        modalTitle.textContent = 'Регистрация';
        submitBtn.textContent = 'Зарегистрироваться';
        authSwitchText.textContent = 'Уже есть аккаунт? ';
        authSwitch.textContent = 'Войти';
    } else {
        modalTitle.textContent = 'Вход';
        submitBtn.textContent = 'Войти';
        authSwitchText.textContent = 'Нет аккаунта? ';
        authSwitch.textContent = 'Зарегистрироваться';
    }
}

// Функции меню пользователя
function toggleUserMenu() {
    const userMenu = document.getElementById('userMenu');
    if (userMenu) {
        userMenu.classList.toggle('active');
    }
}

function hideUserMenu() {
    const userMenu = document.getElementById('userMenu');
    if (userMenu) {
        userMenu.classList.remove('active');
    }
}

// Обработка формы авторизации
function handleAuthSubmit(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const isLoginMode = document.getElementById('modalTitle').textContent === 'Вход';

    let result;
    if (isLoginMode) {
        result = loginUser(username, password);
    } else {
        result = registerUser(username, password);
    }

    if (result.success) {
        showNotification(result.message);
        hideModal();
        updateUserInterface();
        updateProtectedLinks();
    } else {
        showNotification(result.message);
    }
}

// Функции работы с пользователями
function registerUser(username, password) {
    const userExists = appData.users.find(user => user.username === username);
    if (userExists) {
        return { success: false, message: 'Пользователь с таким именем уже существует' };
    }

    const newUser = {
        id: Date.now(),
        username,
        password,
        isActive: true,
        createdAt: new Date().toISOString(),
        // Добавляем флаг админа для пользователя 'admin'
        isAdmin: username === 'admin'
    };

    appData.users.push(newUser);
    localStorage.setItem('users', JSON.stringify(appData.users));
    
    // Автоматический вход после регистрации
    const loginResult = loginUser(username, password);
    return loginResult;
}
function loginUser(username, password) {
    const user = appData.users.find(user => 
        user.username === username && user.password === password
    );

    if (user) {
        appData.currentUser = {
            id: user.id,
            name: user.username,
            email: user.email,
            isAdmin: user.isAdmin || false  // Добавляем флаг админа
        };
        localStorage.setItem('currentUser', JSON.stringify(appData.currentUser));
        return { success: true, message: 'Вход выполнен успешно!' };
    }

    return { success: false, message: 'Неверное имя пользователя или пароль' };
}

function logoutUser() {
    appData.currentUser = null;
    localStorage.removeItem('currentUser');
    updateUserInterface();
    updateProtectedLinks();
    hideUserMenu();
    showNotification('Вы вышли из системы');
}

// Обновление интерфейса
function updateUserInterface() {
    const userName = document.getElementById('userName');
    const userIcon = document.getElementById('userIcon');
    const userMenuName = document.getElementById('userMenuName');
    const userMenuEmail = document.getElementById('userMenuEmail');

    if (userName && userIcon) {
        if (appData.currentUser) {
            userName.textContent = appData.currentUser.name;
            userIcon.title = 'Меню пользователя';
            
            if (userMenuName) userMenuName.textContent = appData.currentUser.name;
            if (userMenuEmail) userMenuEmail.textContent = appData.currentUser.email;

            // Добавляем ссылку на админ-панель для админа
            addAdminLink();
        } else {
            userName.textContent = '';
            userIcon.title = 'Войти';
            
            if (userMenuName) userMenuName.textContent = '';
            if (userMenuEmail) userMenuEmail.textContent = '';

            // Удаляем ссылку на админ-панель при выходе
            removeAdminLink();
        }
    }
}

// Функция добавления ссылки на админ-панель
function addAdminLink() {
    const userMenu = document.getElementById('userMenu');
    if (userMenu && appData.currentUser && appData.currentUser.isAdmin) {
        // Удаляем существующую ссылку, если есть
        removeAdminLink();
        
        const adminLink = document.createElement('a');
        adminLink.href = '/admin.html';
        adminLink.className = 'user-menu__item admin-link';
        adminLink.innerHTML = 'Админ-панель';
        
        // Вставляем перед кнопкой выхода
        const logoutBtn = userMenu.querySelector('#logoutBtn');
        if (logoutBtn) {
            userMenu.insertBefore(adminLink, logoutBtn);
        } else {
            userMenu.appendChild(adminLink);
        }
    }
}

// Функция удаления ссылки на админ-панель
function removeAdminLink() {
    const adminLink = document.querySelector('.admin-link');
    if (adminLink) {
        adminLink.remove();
    }
}


// Обновление состояния защищенных ссылок
function updateProtectedLinks() {
    const protectedLinks = document.querySelectorAll('.protected-link');
    
    protectedLinks.forEach(link => {
        if (!appData.currentUser) {
            link.classList.add('disabled');
        } else {
            link.classList.remove('disabled');
        }
    });
}

// Уведомления
function showNotification(message) {
    const notification = document.getElementById('notification');
    if (notification) {
        notification.textContent = message;
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
}