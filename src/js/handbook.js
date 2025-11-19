// Глобальные переменные
let database = {};
let currentData = [];
let searchTimeout = null;

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    initHandbook();
});

// Основная функция инициализации
async function initHandbook() {
    await loadDatabase();
    setupEventListeners();
    showCategory('all');
}

// Загрузка базы данных
async function loadDatabase() {
    try {
        const response = await fetch('src/data/DB.json');
        database = await response.json();
        console.log('База данных загружена:', database);
    } catch (error) {
        console.error('Ошибка загрузки базы данных:', error);
        showError('Не удалось загрузить справочник');
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Поиск
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', handleSearch);

    // Фильтры
    const categoryFilter = document.getElementById('categoryFilter');
    const sortFilter = document.getElementById('sortFilter');
    
    categoryFilter.addEventListener('change', handleCategoryChange);
    sortFilter.addEventListener('change', handleSortChange);

    // Модальное окно
    const modalOverlay = document.getElementById('detailModal');
    modalOverlay.addEventListener('click', function(e) {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });

    // Закрытие модального окна по ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
}

// Обработка поиска
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    // Очищаем предыдущий таймаут
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    // Устанавливаем новый таймаут (3 секунды)
    searchTimeout = setTimeout(() => {
        performSearch(searchTerm);
    }, 300);
}

// Выполнение поиска
function performSearch(searchTerm) {
    const category = document.getElementById('categoryFilter').value;
    let results = [];
    
    if (searchTerm === '') {
        showCategory(category);
        return;
    }
    
    if (category === 'all') {
        // Ищем во всех категориях
        Object.keys(database).forEach(cat => {
            if (Array.isArray(database[cat]) && isValidCategory(cat)) {
                const categoryResults = database[cat].filter(item => 
                    item && matchesSearch(item, searchTerm)
                );
                results = results.concat(categoryResults.map(item => ({
                    ...item,
                    category: cat
                })));
            }
        });
    } else {
        // Ищем в конкретной категории
        if (database[category] && Array.isArray(database[category])) {
            results = database[category].filter(item => 
                item && matchesSearch(item, searchTerm)
            ).map(item => ({
                ...item,
                category: category
            }));
        }
    }
    
    displayResults(results, `Результаты поиска: "${searchTerm}"`);
}

// Проверка валидности категории
function isValidCategory(category) {
    const validCategories = ['расы', 'классы', 'заклинания', 'монстры', 'предметы', 'черты_рас', 'умения_классов', 'способности_монстров'];
    return validCategories.includes(category);
}

// Проверка совпадения при поиске
function matchesSearch(item, searchTerm) {
    if (!item || !item.название) return false;
    
    const searchFields = ['название', 'описание', 'тип', 'школа', 'размер'];
    
    return searchFields.some(field => {
        if (item[field] && typeof item[field] === 'string') {
            return item[field].toLowerCase().includes(searchTerm);
        }
        return false;
    });
}

// Обработка изменения категории
function handleCategoryChange(e) {
    showCategory(e.target.value);
}

// Обработка изменения сортировки
function handleSortChange() {
    const category = document.getElementById('categoryFilter').value;
    showCategory(category);
}

// Показать категорию
function showCategory(category) {
    let data = [];
    
    if (category === 'all') {
        // Собираем данные из всех категорий
        Object.keys(database).forEach(cat => {
            if (Array.isArray(database[cat]) && isValidCategory(cat) && database[cat].length > 0) {
                const categoryData = database[cat]
                    .filter(item => item && item.название) // Фильтруем только элементы с названием
                    .map(item => ({
                        ...item,
                        category: cat
                    }));
                data = data.concat(categoryData);
            }
        });
    } else {
        if (database[category] && Array.isArray(database[category])) {
            data = database[category]
                .filter(item => item && item.название) // Фильтруем только элементы с названием
                .map(item => ({
                    ...item,
                    category: category
                }));
        }
    }
    
    currentData = sortData(data);
    displayResults(currentData, getCategoryTitle(category));
}

// Сортировка данных
function sortData(data) {
    const sortType = document.getElementById('sortFilter').value;
    
    return data.sort((a, b) => {
        // Защита от undefined
        const aName = a.название || '';
        const bName = b.название || '';
        const aLevel = a.уровень || 0;
        const bLevel = b.уровень || 0;
        const aRarity = a.редкость || '';
        const bRarity = b.редкость || '';
        const aCr = a.рейтинг_сложности || 0;
        const bCr = b.рейтинг_сложности || 0;
        
        switch (sortType) {
            case 'name_asc':
                return aName.localeCompare(bName);
            case 'name_desc':
                return bName.localeCompare(aName);
            case 'level_asc':
                return aLevel - bLevel;
            case 'level_desc':
                return bLevel - aLevel;
            case 'rarity_asc':
                return getRarityValue(aRarity) - getRarityValue(bRarity);
            case 'cr_asc':
                return aCr - bCr;
            case 'cr_desc':
                return bCr - aCr;
            default:
                return 0;
        }
    });
}

// Получить числовое значение редкости
function getRarityValue(rarity) {
    const rarityMap = {
        'Обычный': 1,
        'Необычный': 2,
        'Редкий': 3,
        'Очень редкий': 4,
        'Легендарный': 5
    };
    return rarityMap[rarity] || 0;
}

// Получить заголовок категории
function getCategoryTitle(category) {
    const titles = {
        'all': 'Весь справочник',
        'расы': 'Расы',
        'классы': 'Классы',
        'заклинания': 'Заклинания',
        'монстры': 'Монстры',
        'предметы': 'Предметы',
        'черты_рас': 'Черты рас',
        'умения_классов': 'Умения классов',
        'способности_монстров': 'Способности монстров'
    };
    return titles[category] || category;
}

// Отображение результатов
function displayResults(data, title) {
    const grid = document.getElementById('contentGrid');
    const loadingMessage = document.getElementById('loadingMessage');
    const emptyMessage = document.getElementById('emptyMessage');
    
    // Показываем сообщение о загрузке
    loadingMessage.classList.remove('hidden');
    emptyMessage.classList.add('hidden');
    grid.innerHTML = '';
    
    // Имитируем загрузку для лучшего UX
    setTimeout(() => {
        loadingMessage.classList.add('hidden');
        
        if (data.length === 0) {
            emptyMessage.classList.remove('hidden');
            return;
        }
        
        grid.innerHTML = data.map(item => createCard(item)).join('');
        
        // Добавляем обработчики клика на карточки
        grid.querySelectorAll('.entity-card').forEach((card, index) => {
            card.addEventListener('click', () => showDetailModal(data[index]));
        });
    }, 500);
}

// Создание карточки
function createCard(item) {
    if (!item || !item.название) return '';
    
    const meta = getCardMeta(item);
    
    return `
        <div class="entity-card" data-id="${item.id}" data-category="${item.category}">
            <div class="entity-card__image" >
                ${item.фото ? `<img src="${item.фото}" alt="${item.название}" class="entity-card__image">` : ''}
            </div>
            <div class="entity-card__content">
                <h3 class="entity-card__title">${item.название}</h3>
                ${meta ? `<div class="entity-card__meta ${meta.class || ''}">${meta.text}</div>` : ''}
            </div>
        </div>
    `;
}

// Получить мета-информацию для карточки
function getCardMeta(item) {
    if (!item) return null;
    
    switch (item.category) {
        case 'заклинания':
            return {
                text: `Уровень ${item.уровень || 'N/A'} • ${item.школа || 'N/A'}`,
                class: 'level'
            };
        case 'монстры':
            return {
                text: `Сложность ${item.рейтинг_сложности || 'N/A'} • ${item.размер || 'N/A'} ${item.тип || 'N/A'}`,
                class: 'cr'
            };
        case 'предметы':
            return {
                text: `${item.тип || 'N/A'} • ${item.редкость || 'N/A'}`,
                class: `rarity ${getRarityClass(item.редкость)}`
            };
        case 'классы':
            return {
                text: `Хиты: ${item.хиты_за_уровень || 'N/A'}`
            };
        case 'расы':
            return {
                text: `${item.размер || 'N/A'} • Скорость ${item.скорость || 'N/A'} фт.`
            };
        case 'черты_рас':
            return {
                text: `Тип: ${item.тип || 'N/A'}`
            };
        case 'умения_классов':
            return {
                text: `Уровень: ${item.уровень || 'N/A'}`
            };
        case 'способности_монстров':
            return {
                text: `Тип: ${item.тип || 'N/A'}`
            };
        default:
            return null;
    }
}

// Получить класс редкости
function getRarityClass(rarity) {
    const classMap = {
        'Обычный': 'common',
        'Необычный': 'uncommon',
        'Редкий': 'rare',
        'Очень редкий': 'epic',
        'Легендарный': 'epic'
    };
    return classMap[rarity] || 'common';
}

// Показать модальное окно с детальной информацией
function showDetailModal(item) {
    if (!item) return;
    
    const modalContent = document.getElementById('modalContent');
    modalContent.innerHTML = createModalContent(item);
    
    const modal = document.getElementById('detailModal');
    modal.classList.remove('hidden');
    
    // Добавляем обработчик закрытия
    const closeBtn = modalContent.querySelector('.modal-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
}

// Создание контента модального окна
function createModalContent(item) {
    if (!item) return '<div class="modal-body"><p>Ошибка: данные не найдены</p></div>';
    
    let content = `
        <button class="modal-close">&times;</button>
        <div class="modal-header">
            <h2 class="modal-title">${item.название || 'Без названия'}</h2>
            ${item.фото ? `<img src="${item.фото}" alt="${item.название || ''}" class="modal-image">` : ''}
        </div>
        <div class="modal-body">
    `;
    
    // Добавляем специфичный контент в зависимости от категории
    switch (item.category) {
        case 'расы':
            content += createRaceModalContent(item);
            break;
        case 'классы':
            content += createClassModalContent(item);
            break;
        case 'заклинания':
            content += createSpellModalContent(item);
            break;
        case 'монстры':
            content += createMonsterModalContent(item);
            break;
        case 'предметы':
            content += createItemModalContent(item);
            break;
        case 'черты_рас':
            content += createTraitModalContent(item);
            break;
        case 'умения_классов':
            content += createFeatureModalContent(item);
            break;
        case 'способности_монстров':
            content += createAbilityModalContent(item);
            break;
        default:
            content += createGenericModalContent(item);
    }
    
    content += '</div>';
    return content;
}

// Контент модального окна для рас
function createRaceModalContent(race) {
    return `
        <div class="modal-section">
            <p class="modal-section__content">${race.описание || 'Описание отсутствует'}</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-item__label">Скорость</div>
                <div class="stat-item__value">${race.скорость || 'N/A'} фт.</div>
            </div>
            <div class="stat-item">
                <div class="stat-item__label">Размер</div>
                <div class="stat-item__value">${race.размер || 'N/A'}</div>
            </div>
        </div>
        
        ${createAbilityBonusStats(race)}
        
        ${createRaceTraits(race.id)}
    `;
}

// Создание бонусов характеристик для рас
function createAbilityBonusStats(race) {
    const abilities = ['силы', 'ловкости', 'телосложения', 'интеллекта', 'мудрости', 'харизмы'];
    const bonusStats = abilities.map(ability => {
        const bonus = race[`бонус_${ability}`];
        if (bonus !== undefined && bonus !== 0) {
            return `
                <div class="stat-item">
                    <div class="stat-item__label">${ability.charAt(0).toUpperCase() + ability.slice(1)}</div>
                    <div class="stat-item__value">${bonus > 0 ? '+' : ''}${bonus}</div>
                </div>
            `;
        }
        return '';
    }).join('');
    
    if (!bonusStats) return '';
    
    return `
        <div class="modal-section">
            <h3 class="modal-section__title">Бонусы характеристик</h3>
            <div class="stats-grid">
                ${bonusStats}
            </div>
        </div>
    `;
}

// Черты рас
function createRaceTraits(raceId) {
    if (!database.черты_рас) return '';
    
    const traits = database.черты_рас.filter(trait => trait && trait.раса_id === raceId);
    if (traits.length === 0) return '';
    
    return `
        <div class="modal-section">
            <h3 class="modal-section__title">Черты расы</h3>
            ${traits.map(trait => `
                <div class="modal-section__content">
                    <strong>${trait.название || 'Без названия'}</strong>${trait.тип ? ` (${trait.тип})` : ''}<br>
                    ${trait.описание || 'Описание отсутствует'}
                </div>
            `).join('')}
        </div>
    `;
}

// Контент модального окна для классов
function createClassModalContent(cls) {
    return `
        <div class="modal-section">
            <p class="modal-section__content">${cls.описание || 'Описание отсутствует'}</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-item__label">Хиты за уровень</div>
                <div class="stat-item__value">${cls.хиты_за_уровень || 'N/A'}</div>
            </div>
        </div>
        
        ${createProficiencies(cls)}
        
        ${createClassFeatures(cls.id)}
    `;
}

// Владения классов
function createProficiencies(cls) {
    let content = '';
    
    if (cls.спасительные_броски && cls.спасительные_броски.length > 0) {
        content += `
            <div class="modal-section">
                <h3 class="modal-section__title">Спасительные броски</h3>
                <div class="tags-container">
                    ${cls.спасительные_броски.map(ability => 
                        `<span class="tag">${ability}</span>`
                    ).join('')}
                </div>
            </div>
        `;
    }
    
    const proficiencies = [];
    if (cls.владение_доспехами && cls.владение_доспехами.length > 0) {
        proficiencies.push(createTags(cls.владение_доспехами, 'Доспехи'));
    }
    if (cls.владение_оружием && cls.владение_оружием.length > 0) {
        proficiencies.push(createTags(cls.владение_оружием, 'Оружие'));
    }
    if (cls.владение_инструментами && cls.владение_инструментами.length > 0) {
        proficiencies.push(createTags(cls.владение_инструментами, 'Инструменты'));
    }
    
    if (proficiencies.length > 0) {
        content += `
            <div class="modal-section">
                <h3 class="modal-section__title">Владение</h3>
                <div class="tags-container">
                    ${proficiencies.join('')}
                </div>
            </div>
        `;
    }
    
    return content;
}

// Умения классов
function createClassFeatures(classId) {
    if (!database.умения_классов) return '';
    
    const features = database.умения_классов.filter(feature => feature && feature.класс_id === classId);
    if (features.length === 0) return '';
    
    return `
        <div class="modal-section">
            <h3 class="modal-section__title">Умения</h3>
            ${features.map(feature => `
                <div class="modal-section__content">
                    <strong>${feature.название || 'Без названия'}</strong>${feature.уровень ? ` (Уровень ${feature.уровень})` : ''}<br>
                    ${feature.описание || 'Описание отсутствует'}
                </div>
            `).join('')}
        </div>
    `;
}

// Контент модального окна для заклинаний
function createSpellModalContent(spell) {
    return `
        <div class="modal-section">
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-item__label">Уровень</div>
                    <div class="stat-item__value">${spell.уровень === 0 ? 'Заговор' : (spell.уровень || 'N/A')}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-item__label">Школа</div>
                    <div class="stat-item__value">${spell.школа || 'N/A'}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-item__label">Время</div>
                    <div class="stat-item__value">${spell.время_накладывания || 'N/A'}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-item__label">Дистанция</div>
                    <div class="stat-item__value">${spell.дистанция || 'N/A'}</div>
                </div>
            </div>
        </div>
        
        ${createSpellComponents(spell)}
        
        <div class="modal-section">
            <h3 class="modal-section__title">Описание</h3>
            <p class="modal-section__content">${spell.описание || 'Описание отсутствует'}</p>
        </div>
        
        ${spell.на_высших_уровнях ? `
            <div class="modal-section">
                <h3 class="modal-section__title">На высших уровнях</h3>
                <p class="modal-section__content">${spell.на_высших_уровнях}</p>
            </div>
        ` : ''}
        
        ${createSpellClasses(spell.id)}
    `;
}

// Компоненты заклинаний
function createSpellComponents(spell) {
    const components = [];
    if (spell.компоненты && spell.компоненты.length > 0) {
        components.push(...spell.компоненты.map(comp => `<span class="tag">${comp}</span>`));
    }
    if (spell.ритуал) {
        components.push('<span class="tag">Ритуал</span>');
    }
    if (spell.концентрация) {
        components.push('<span class="tag">Концентрация</span>');
    }
    
    if (components.length === 0) return '';
    
    return `
        <div class="modal-section">
            <h3 class="modal-section__title">Компоненты</h3>
            <div class="tags-container">
                ${components.join('')}
            </div>
        </div>
    `;
}

// Классы, которые могут использовать заклинание
function createSpellClasses(spellId) {
    if (!database.классы_заклинаний || !database.классы) return '';
    
    const spellClasses = database.классы_заклинаний
        .filter(sc => sc && sc.заклинание_id === spellId)
        .map(sc => database.классы.find(c => c && c.id === sc.класс_id))
        .filter(Boolean);
    
    if (spellClasses.length === 0) return '';
    
    return `
        <div class="modal-section">
            <h3 class="modal-section__title">Доступно классам</h3>
            <div class="tags-container">
                ${spellClasses.map(cls => `<span class="tag">${cls.название || 'N/A'}</span>`).join('')}
            </div>
        </div>
    `;
}

// Контент модального окна для монстров
function createMonsterModalContent(monster) {
    return `
        <div class="modal-section">
            <p class="modal-section__content">${monster.описание || 'Описание отсутствует'}</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-item__label">Сложность</div>
                <div class="stat-item__value">${monster.рейтинг_сложности || 'N/A'}</div>
            </div>
            <div class="stat-item">
                <div class="stat-item__label">Размер</div>
                <div class="stat-item__value">${monster.размер || 'N/A'}</div>
            </div>
            <div class="stat-item">
                <div class="stat-item__label">Тип</div>
                <div class="stat-item__value">${monster.тип || 'N/A'}</div>
            </div>
            <div class="stat-item">
                <div class="stat-item__label">КД</div>
                <div class="stat-item__value">${monster.класс_доспеха || 'N/A'}</div>
            </div>
            <div class="stat-item">
                <div class="stat-item__label">Хиты</div>
                <div class="stat-item__value">${monster.хиты || 'N/A'}</div>
            </div>
            <div class="stat-item">
                <div class="stat-item__label">Скорость</div>
                <div class="stat-item__value">${monster.скорость || 'N/A'}</div>
            </div>
        </div>
        
        ${createMonsterAbilities(monster)}
        
        ${createMonsterSpecificAbilities(monster.id)}
    `;
}

// Характеристики монстров
function createMonsterAbilities(monster) {
    const abilities = ['сила', 'ловкость', 'телосложение', 'интеллект', 'мудрость', 'харизма'];
    const abilityStats = abilities.map(ability => {
        const value = monster[ability];
        if (value !== undefined) {
            return `
                <div class="stat-item">
                    <div class="stat-item__label">${ability.toUpperCase()}</div>
                    <div class="stat-item__value">${value}</div>
                </div>
            `;
        }
        return '';
    }).join('');
    
    if (!abilityStats) return '';
    
    return `
        <div class="modal-section">
            <h3 class="modal-section__title">Характеристики</h3>
            <div class="stats-grid">
                ${abilityStats}
            </div>
        </div>
    `;
}

// Способности монстров
function createMonsterSpecificAbilities(monsterId) {
    if (!database.способности_монстров) return '';
    
    const abilities = database.способности_монстров.filter(ability => ability && ability.монстр_id === monsterId);
    if (abilities.length === 0) return '';
    
    return `
        <div class="modal-section">
            <h3 class="modal-section__title">Способности</h3>
            ${abilities.map(ability => `
                <div class="modal-section__content">
                    <strong>${ability.название || 'Без названия'}</strong>${ability.тип ? ` (${ability.тип})` : ''}<br>
                    ${ability.описание || 'Описание отсутствует'}
                </div>
            `).join('')}
        </div>
    `;
}

// Контент модального окна для предметов
function createItemModalContent(item) {
    return `
        <div class="modal-section">
            <p class="modal-section__content">${item.описание || 'Описание отсутствует'}</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-item__label">Тип</div>
                <div class="stat-item__value">${item.тип || 'N/A'}</div>
            </div>
            <div class="stat-item">
                <div class="stat-item__label">Редкость</div>
                <div class="stat-item__value">${item.редкость || 'N/A'}</div>
            </div>
            <div class="stat-item">
                <div class="stat-item__label">Стоимость</div>
                <div class="stat-item__value">${item.стоимость || 'N/A'}</div>
            </div>
            <div class="stat-item">
                <div class="stat-item__label">Вес</div>
                <div class="stat-item__value">${item.вес || 'N/A'} фн.</div>
            </div>
        </div>
        
        ${createItemProperties(item)}
    `;
}

// Свойства предметов
function createItemProperties(item) {
    const properties = [];
    if (item.свойства && item.свойства.length > 0) {
        properties.push(...item.свойства.map(prop => `<span class="tag">${prop}</span>`));
    }
    if (item.магический) {
        properties.push('<span class="tag">Магический</span>');
    }
    
    if (properties.length === 0) return '';
    
    return `
        <div class="modal-section">
            <h3 class="modal-section__title">Свойства</h3>
            <div class="tags-container">
                ${properties.join('')}
            </div>
        </div>
    `;
}

// Контент для черт рас
function createTraitModalContent(trait) {
    return `
        <div class="modal-section">
            <p class="modal-section__content">${trait.описание || 'Описание отсутствует'}</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-item__label">Тип</div>
                <div class="stat-item__value">${trait.тип || 'N/A'}</div>
            </div>
        </div>
    `;
}

// Контент для умений классов
function createFeatureModalContent(feature) {
    return `
        <div class="modal-section">
            <p class="modal-section__content">${feature.описание || 'Описание отсутствует'}</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-item__label">Уровень</div>
                <div class="stat-item__value">${feature.уровень || 'N/A'}</div>
            </div>
        </div>
    `;
}

// Контент для способностей монстров
function createAbilityModalContent(ability) {
    return `
        <div class="modal-section">
            <p class="modal-section__content">${ability.описание || 'Описание отсутствует'}</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-item__label">Тип</div>
                <div class="stat-item__value">${ability.тип || 'N/A'}</div>
            </div>
        </div>
    `;
}

// Универсальный контент модального окна
function createGenericModalContent(item) {
    return `
        <div class="modal-section">
            <p class="modal-section__content">${item.описание || 'Описание отсутствует'}</p>
        </div>
    `;
}

// Создание тегов
function createTags(items, label) {
    if (!items || items.length === 0) return '';
    return `
        <div>
            <strong>${label}:</strong>
            ${items.map(item => `<span class="tag">${item}</span>`).join('')}
        </div>
    `;
}

// Закрытие модального окна
function closeModal() {
    const modal = document.getElementById('detailModal');
    modal.classList.add('hidden');
}

// Показать ошибку
function showError(message) {
    const grid = document.getElementById('contentGrid');
    grid.innerHTML = `
        <div class="empty-message">
            ${message}
        </div>
    `;
}