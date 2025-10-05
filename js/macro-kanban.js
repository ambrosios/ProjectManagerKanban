/**
 * 🌍 Gestion du Macro Kanban (vue globale de toutes les tâches)
 */

let currentFilters = {
    project: 'all',
    search: ''
};

document.addEventListener('DOMContentLoaded', async () => {
    console.log('📊 Initialisation de la vue globale...');

    // Vérifier l'authentification
    if (!AuthManager.checkAuth()) {
        console.log('❌ Non authentifié');
        return;
    }

    // Charger les données
    try {
        initializeMacroKanban();
    } catch (error) {
        console.error('❌ Erreur de chargement:', error);
        showNotification('Erreur de chargement des données', 'error');
        //AuthManager.logout();
    }
});

/**
 * Initialise le Macro Kanban
 */
function initializeMacroKanban() {
    setupHeader();
    setupFilters();
    renderKanban();
    setupEventListeners();
    startAutoRefresh();
}

/**
 * Configure le header
 */
function setupHeader() {
    const userInfo = document.getElementById('userInfo');
    const logoutBtn = document.getElementById('logoutBtn');
    const dashboardBtn = document.getElementById('dashboardBtn');
    // const macroKanbanBtn = document.getElementById('macroKanbanBtn');

    // Afficher les stats
    //const stats = StorageManager.getGlobalStats(AuthManager.userData);
    //userInfo.textContent = `${stats.totalProjects} projet(s) • ${stats.totalCards} tâche(s)`;

    // Navigation
    dashboardBtn.addEventListener('click', () => {
        window.location.href = 'dashboard.html';
    });

    // macroKanbanBtn.classList.add('active');

    // Déconnexion
    logoutBtn.addEventListener('click', () => {
        if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
            AuthManager.logout();
            window.location.href = 'index.html';
        }
    });
}

/**
 * Configure les filtres
 */
function setupFilters() {
    const projectFilter = document.getElementById('projectFilter');
    const searchInput = document.getElementById('searchInput');

    // Remplir le filtre de projets
    const projects = AuthManager.userData.projects;
    projectFilter.innerHTML = `
        <option value="all">Tous les projets</option>
        ${projects.map(p => `
            <option value="${p.id}">${escapeHtml(p.title)}</option>
        `).join('')}
    `;

    // Événements de filtrage
    projectFilter.addEventListener('change', (e) => {
        currentFilters.project = e.target.value;
        renderKanban();
    });

    searchInput.addEventListener('input', (e) => {
        currentFilters.search = e.target.value.toLowerCase();
        renderKanban();
    });
}

/**
 * Affiche le Kanban
 */
function renderKanban() {
    renderColumn('todo', 'À faire', '📋');
    renderColumn('inprogress', 'En cours', '🔄');
    renderColumn('done', 'Terminé', '✅');
}

/**
 * Affiche une colonne
 */
function renderColumn(status, title, icon) {
    const columnElement = document.getElementById(`column-${status}`);
    const cards = getFilteredCards(status);

    const columnHeader = `
        <div class="column-header">
            <h2 class="column-title">${icon} ${title}</h2>
            <span class="column-count">${cards.length}</span>
        </div>
    `;

    const columnBody = cards.length === 0 
        ? `<div class="column-empty">Aucune tâche</div>`
        : cards.map(card => renderCard(card)).join('');

    columnElement.innerHTML = columnHeader + `<div class="column-body">${columnBody}</div>`;
}

/**
 * Obtient les cartes filtrées
 */
function getFilteredCards(status) {
    let allCards = StorageManager.getAllCards(AuthManager.userData);

    // Filtrer par statut
    allCards = allCards.filter(card => card.status === status);

    // Filtrer par projet
    if (currentFilters.project !== 'all') {
        allCards = allCards.filter(card => card.projectId === currentFilters.project);
    }

    // Filtrer par recherche
    if (currentFilters.search) {
        allCards = allCards.filter(card => 
            card.title.toLowerCase().includes(currentFilters.search) ||
            (card.description && card.description.toLowerCase().includes(currentFilters.search))
        );
    }

    // Trier par date de création (plus récent en premier)
    allCards.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return allCards;
}

/**
 * Génère le HTML d'une carte
 */
function renderCard(card) {
    const project = StorageManager.getProject(AuthManager.userData, card.projectId);
    const isOverdue = card.dueDate && new Date(card.dueDate) < new Date() && card.status !== 'done';

    return `
        <div class="kanban-card ${isOverdue ? 'overdue' : ''}" 
             data-card-id="${card.id}" 
             data-project-id="${card.projectId}"
             draggable="true"
             ondragstart="handleDragStart(event)"
             ondragend="handleDragEnd(event)">
            
            <div class="card-project-badge" style="background: ${project.color};">
                ${escapeHtml(project.title)}
            </div>

            <h3 class="card-title">${escapeHtml(card.title)}</h3>
            
            ${card.description ? `
                <p class="card-description">${escapeHtml(card.description)}</p>
            ` : ''}

            <div class="card-footer">
                <div class="card-meta">
                    ${card.dueDate ? `
                        <span class="card-date ${isOverdue ? 'overdue' : ''}">
                            📅 ${formatDate(card.dueDate)}
                        </span>
                    ` : ''}
                </div>
                <div class="card-actions">
                    <button class="btn-icon" onclick="viewCardDetails('${card.projectId}', '${card.id}')" title="Voir les détails">
                        👁️
                    </button>
                    <button class="btn-icon" onclick="editCard('${card.projectId}', '${card.id}')" title="Modifier">
                        ✏️
                    </button>
                    <button class="btn-icon" onclick="deleteCard('${card.projectId}', '${card.id}')" title="Supprimer">
                        🗑️
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Configure les événements
 */
function setupEventListeners() {
    // Drag & Drop sur les colonnes
    ['todo', 'inprogress', 'done'].forEach(status => {
        const column = document.getElementById(`column-${status}`);
        
        column.addEventListener('dragover', handleDragOver);
        column.addEventListener('drop', handleDrop);
        column.addEventListener('dragleave', handleDragLeave);
    });
}

/**
 * Gestion du drag & drop
 */
function handleDragStart(event) {
    const card = event.target;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/html', card.innerHTML);
    event.dataTransfer.setData('cardId', card.dataset.cardId);
    event.dataTransfer.setData('projectId', card.dataset.projectId);
    
    card.classList.add('dragging');
}

function handleDragEnd(event) {
    event.target.classList.remove('dragging');
    
    // Retirer les indicateurs de survol
    document.querySelectorAll('.column').forEach(col => {
        col.classList.remove('drag-over');
    });
}

function handleDragOver(event) {
    if (event.preventDefault) {
        event.preventDefault();
    }
    
    event.dataTransfer.dropEffect = 'move';
    
    const column = event.currentTarget;
    column.classList.add('drag-over');
    
    return false;
}

function handleDragLeave(event) {
    event.currentTarget.classList.remove('drag-over');
}

async function handleDrop(event) {
    if (event.stopPropagation) {
        event.stopPropagation();
    }
    
    event.preventDefault();
    
    const column = event.currentTarget;
    column.classList.remove('drag-over');
    
    const cardId = event.dataTransfer.getData('cardId');
    const projectId = event.dataTransfer.getData('projectId');
    const newStatus = column.id.replace('column-', '');
    
    try {
        await StorageManager.updateCard(
            AuthManager.userData,
            AuthManager.currentPassword,
            projectId,
            cardId,
            { status: newStatus }
        );
        
        renderKanban();
        showNotification('Tâche déplacée avec succès', 'success');
        
    } catch (error) {
        console.error('Erreur de déplacement:', error);
        showNotification('Erreur lors du déplacement', 'error');
    }
    
    return false;
}

/**
 * Affiche les détails d'une carte
 */
function viewCardDetails(projectId, cardId) {
    const project = StorageManager.getProject(AuthManager.userData, projectId);
    const card = project.cards.find(c => c.id === cardId);

    if (!card) return;

    const isOverdue = card.dueDate && new Date(card.dueDate) < new Date() && card.status !== 'done';

    const modalHTML = `
        <div class="modal active" id="cardDetailsModal">
            <div class="modal-overlay" onclick="closeCardDetailsModal()"></div>
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <div>
                        <h2>👁️ Détails de la tâche</h2>
                        <div class="card-project-badge" style="background: ${project.color}; display: inline-block; margin-top: 0.5rem;">
                            ${escapeHtml(project.title)}
                        </div>
                    </div>
                    <button class="btn-close" onclick="closeCardDetailsModal()">×</button>
                </div>
                <div class="modal-body">
                    <div class="card-details-grid">
                        <div class="card-details-main">
                            <h3 class="card-details-title">${escapeHtml(card.title)}</h3>
                            
                            ${card.description ? `
                                <div class="card-details-section">
                                    <h4>📝 Description</h4>
                                    <p>${escapeHtml(card.description)}</p>
                                </div>
                            ` : ''}
                        </div>
                        
                        <div class="card-details-sidebar">
                            <div class="card-details-section">
                                <h4>📊 Statut</h4>
                                <div class="status-badge status-${card.status}">
                                    ${getStatusLabel(card.status)}
                                </div>
                            </div>

                            ${card.dueDate ? `
                                <div class="card-details-section">
                                    <h4>📅 Échéance</h4>
                                    <div class="info-value ${isOverdue ? 'text-danger' : ''}">
                                        ${formatDate(card.dueDate)}
                                        ${isOverdue ? '<br><small>⚠️ En retard</small>' : ''}
                                    </div>
                                </div>
                            ` : ''}

                            <div class="card-details-section">
                                <h4>ℹ️ Informations</h4>
                                <div class="info-item">
                                    <span class="info-label">Créée le</span>
                                    <span class="info-value">${formatDate(card.createdAt)}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Modifiée le</span>
                                    <span class="info-value">${formatDate(card.lastModified)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeCardDetailsModal()">
                        Fermer
                    </button>
                    <button class="btn btn-primary" onclick="editCard('${projectId}', '${cardId}')">
                        ✏️ Modifier
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeCardDetailsModal() {
    const modal = document.getElementById('cardDetailsModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    }
}

/**
 * Modifie une carte
 */
function editCard(projectId, cardId) {
    // Fermer le modal de détails s'il est ouvert
    closeCardDetailsModal();
    
    // Rediriger vers le kanban du projet avec l'ID de la carte
    window.location.href = `project-kanban.html?id=${projectId}&edit=${cardId}`;
}

/**
 * Supprime une carte
 */
async function deleteCard(projectId, cardId) {
    const project = StorageManager.getProject(AuthManager.userData, projectId);
    const card = project.cards.find(c => c.id === cardId);

    if (!confirm(`Voulez-vous vraiment supprimer la tâche "${card.title}" ?`)) {
        return;
    }

    try {
        await StorageManager.deleteCard(
            AuthManager.userData,
            AuthManager.currentPassword,
            projectId,
            cardId
        );

        renderKanban();
        showNotification('Tâche supprimée avec succès', 'success');

    } catch (error) {
        console.error('Erreur de suppression:', error);
        showNotification('Erreur lors de la suppression', 'error');
    }
}

/**
 * Auto-refresh toutes les 30 secondes
 */
function startAutoRefresh() {
    setInterval(() => {
        renderKanban();
    }, 30000);
}

/**
 * Obtient le libellé d'un statut
 */
function getStatusLabel(status) {
    const labels = {
        'todo': 'À faire',
        'inprogress': 'En cours',
        'done': 'Terminé'
    };
    return labels[status] || status;
}

/**
 * Formate une date
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

/**
 * Échappe le HTML
 */
function escapeHtml(text) {
    return SecurityManager.escapeHtml(text || '');
}

/**
 * Affiche une notification
 */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type} show`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
