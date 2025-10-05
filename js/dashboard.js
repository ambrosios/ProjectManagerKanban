// ============================================
// DASHBOARD.JS - Tableau de bord principal
// ============================================

/**
 * État global du dashboard
 */
const DashboardState = {
    projects: [],
    currentUser: null,
    stats: {
        totalProjects: 0,
        totalTasks: 0,
        completedTasks: 0,
        progressPercentage: 0
    }
};

/**
 * Initialisation au chargement
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📊 Initialisation du dashboard...');

    // Vérifier l'authentification
    if (!AuthManager.checkAuth()) {
        console.log('❌ Non authentifié');
        window.location.href = 'index.html';
        return;
    }

    // Charger les données
    try {
        await AuthManager.reloadData();
        await loadDashboardData();
        initializeDashboard();
    } catch (error) {
        console.error('❌ Erreur de chargement:', error);
        showNotification('Erreur de chargement des données', 'error');
        AuthManager.logout();
    }
});

/**
 * Charge les données depuis le stockage
 */
async function loadDashboardData() {
    try {
        console.log('📥 Chargement des données...');
        
        const password = AuthManager.getCurrentPassword();
        const data = await StorageManager.loadData(password);

        if (!data) {
            throw new Error('Impossible de charger les données');
        }
        // Mettre à jour l'état
        DashboardState.projects = data.projects || [];
        
        console.log('✅ Données chargées:', DashboardState.projects.length, 'projets');
        
        return data;
    } catch (error) {
        console.error('❌ Erreur loadDashboardData:', error);
        throw error;
    }
}

/**
 * Sauvegarde les données
 */
async function saveDashboardData() {
    try {
        console.log('💾 Sauvegarde des données...');
        
        const password = AuthManager.getCurrentPassword();
        const currentData = await StorageManager.loadData(password);
        
        // Mettre à jour uniquement les projets
        currentData.projects = DashboardState.projects;
        currentData.metadata.lastModified = new Date().toISOString();
        
        await StorageManager.saveData(password, currentData);
        
        console.log('✅ Données sauvegardées');
    } catch (error) {
        console.error('❌ Erreur saveDashboardData:', error);
        showNotification('Erreur lors de la sauvegarde', 'error');
        throw error;
    }
}

/**
 * Initialise le tableau de bord
 */
/**
 * Initialise le dashboard (VERSION ASYNC)
 */
async function initializeDashboard() {
    console.log('🎯 Initialisation du dashboard...');

    try {

        // Afficher les projets et stats en parallèle
        await Promise.all([
            await refreshDashboard()
        ]);

        // Événements
        await setupEventListeners();

        console.log('✅ Dashboard initialisé');

    } catch (error) {
        console.error('❌ Erreur initialisation:', error);
        showNotification('Erreur lors de l\'initialisation', 'error');
    }
}


/**
 * Configure l'en-tête
 */
function logOut() {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
        AuthManager.logout();
    }
}

/**
 * Affiche les projets
 */
/**
 * Affiche les projets (VERSION ASYNC)
 */
async function renderProjects() {
    const projectsList = document.getElementById('projectsList');
    if (!projectsList) return;

    console.log('🎨 Affichage des projets...');

    if (DashboardState.projects.length === 0) {
        projectsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <h3>Aucun projet</h3>
                <p>Créez votre premier projet pour commencer</p>
            </div>
        `;
        return;
    }

    // Calculer les stats en parallèle
    const projectsWithStats = await Promise.all(
        DashboardState.projects.map(async (project) => {
            const taskCount = await getProjectTaskCount(project.id);
            const completedCount = await getProjectCompletedCount(project.id);
            const progress = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;
            
            return {
                ...project,
                stats: { taskCount, completedCount, progress }
            };
        })
    );

    // Générer le HTML
    projectsList.innerHTML = projectsWithStats.map(project => `
        <div class="project-card" data-project-id="${project.id}">
            <div class="project-header">
                <h3>${escapeHtml(project.title)}</h3>
                <div class="project-actions">
                    <button class="btn-icon" onclick="editProject('${project.id}')" title="Modifier">
                        ✍️
                    </button>
                    <button class="btn-icon btn-danger" onclick="deleteProject('${project.id}')" title="Supprimer">
                        🗑️
                    </button>
                </div>
            </div>
            
            <p class="project-description">${escapeHtml(project.description)}</p>
            
            <div class="project-stats">
                <div class="stat-item">
                    🧷
                    <span>${project.stats.taskCount} tâche${project.stats.taskCount > 1 ? 's' : ''}</span>
                </div>
                <div class="stat-item">
                    ✅
                    <span>${project.stats.completedCount} terminée${project.stats.completedCount > 1 ? 's' : ''}</span>
                </div>
            </div>
            
            <div class="project-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${project.stats.progress}%"></div>
                </div>
                <span class="progress-text">${project.stats.progress}%</span>
            </div>
            
            <div class="project-footer">
                <span class="project-date">
                    <i class="fas fa-calendar"></i>
                    Créé le : ${new Date(project.createdAt).toLocaleDateString('fr-FR')}
                </span>
                <button class="btn btn-sm btn-primary" onclick="openProject('${project.id}')">
                    🔍 Ouvrir
                </button>
            </div>
        </div>
    `).join('');

    console.log('✅ Projets affichés');
}

/**
 * Met à jour les statistiques globales
 */
/**
 * Met à jour les statistiques globales (VERSION ASYNC)
 */
async function updateStats() {
    console.log('📊 Calcul des statistiques globales...');
    
    const totalProjects = DashboardState.projects.length;
    
    // Calculer en parallèle
    const statsPromises = DashboardState.projects.map(async (project) => {
        const taskCount = await getProjectTaskCount(project.id);
        const completedCount = await getProjectCompletedCount(project.id);
        return { taskCount, completedCount };
    });
    
    const allStats = await Promise.all(statsPromises);
    
    // Agréger les résultats
    let totalTasks = 0;
    let completedTasks = 0;
    
    allStats.forEach(stat => {
        totalTasks += stat.taskCount;
        completedTasks += stat.completedCount;
    });
    
    const progressPercentage = totalTasks > 0 
        ? Math.round((completedTasks / totalTasks) * 100) 
        : 0;

    // Mettre à jour l'état
    DashboardState.stats = {
        totalProjects,
        totalTasks,
        completedTasks,
        progressPercentage
    };

    console.log('📊 Stats calculées:', DashboardState.stats);

    // Afficher
    updateStatsDisplay();
}


/**
 * Affiche les statistiques
 */
function updateStatsDisplay() {
    const elements = {
        totalProjects: document.getElementById('totalProjects'),
        totalTasks: document.getElementById('totalTasks'),
        completedTasks: document.getElementById('completedTasks'),
        progressPercentage: document.getElementById('progressPercentage')
    };

    if (elements.totalProjects) {
        elements.totalProjects.textContent = DashboardState.stats.totalProjects;
    }
    if (elements.totalTasks) {
        elements.totalTasks.textContent = DashboardState.stats.totalTasks;
    }
    if (elements.completedTasks) {
        elements.completedTasks.textContent = DashboardState.stats.completedTasks;
    }
    if (elements.progressPercentage) {
        elements.progressPercentage.textContent = DashboardState.stats.progressPercentage + '%';
    }
}

/**
 * Configure les écouteurs d'événements
 */
function setupEventListeners() {
    const newProjectBtn = document.getElementById('newProjectBtn');
    
    if (newProjectBtn) {
        newProjectBtn.addEventListener('click', () => showProjectModal());
    }
}

/**
 * Affiche la modale de création/édition de projet
 */
function showProjectModal(projectId = null) {
    const isEdit = !!projectId;
    const project = isEdit ? DashboardState.projects.find(p => p.id === projectId) : null;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${isEdit ? '✏️ Modifier le projet' : '➕ Nouveau projet'}</h2>
                <button class="btn-close" onclick="this.closest('.modal').remove()">✕</button>
            </div>
            <div class="modal-body">
                <form id="projectForm">
                    <div class="form-group">
                        <label for="modalProjectTitle">Nom du projet *</label>
                        <input 
                            type="text" 
                            id="modalProjectTitle" 
                            class="form-control"
                            placeholder="Ex: Refonte du site web"
                            value="${isEdit ? escapeHtml(project.title) : ''}"
                            required
                        >
                    </div>
                    
                    <div class="form-group">
                        <label for="modalProjectDescription">Description</label>
                        <textarea 
                            id="modalProjectDescription" 
                            class="form-control"
                            placeholder="Description du projet..."
                            rows="4"
                        >${isEdit ? escapeHtml(project.description || '') : ''}</textarea>
                    </div>
                </form>
            </div>
            <div class="modal-actions">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                    Annuler
                </button>
                <button class="btn btn-primary" id="saveProjectBtn">
                    ${isEdit ? '💾 Enregistrer' : '➕ Créer'}
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Fermeture au clic sur le fond
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    // Focus sur le champ titre
    setTimeout(() => {
        document.getElementById('modalProjectTitle').focus();
    }, 100);

    // Gestion de la sauvegarde
    document.getElementById('saveProjectBtn').addEventListener('click', async () => {
        await handleProjectSave(projectId, modal);
    });

    // Soumission au Enter
    document.getElementById('projectForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleProjectSave(projectId, modal);
    });
}

/**
 * Gère la sauvegarde d'un projet
 */
/**
 * Gère la sauvegarde d'un projet
 */
async function handleProjectSave(projectId, modal) {
    console.log('🚀 handleProjectSave appelée');
    console.log('📌 projectId:', projectId);
    console.log('📌 modal:', modal);

    // 🔍 Utilise les IDs corrects avec le préfixe "modal"
    const titleInput = document.getElementById('modalProjectTitle');
    const descriptionInput = document.getElementById('modalProjectDescription');

    console.log('📝 Recherche des champs...');
    console.log('🔍 titleInput:', titleInput);
    console.log('🔍 descriptionInput:', descriptionInput);

    if (!titleInput) {
        console.error('❌ Champ titre non trouvé dans le DOM');
        showNotification('Erreur : champ titre non trouvé', 'error');
        return;
    }

    const title = titleInput.value.trim();
    const description = descriptionInput?.value.trim() || '';

    console.log('✏️ Valeurs récupérées:');
    console.log('   - Titre:', title);
    console.log('   - Description:', description);

    if (!title) {
        console.warn('⚠️ Titre vide');
        showNotification('Le nom du projet est requis', 'error');
        titleInput.focus();
        return;
    }

    try {
        console.log('💾 Début de la sauvegarde...');
        
        const saveBtn = document.getElementById('saveProjectBtn');
        console.log('🔘 Bouton sauvegarde:', saveBtn);
        
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = '💾 Enregistrement...';
        }

        if (projectId) {
            // Modification
            console.log('✏️ Mode modification pour projet:', projectId);
            const project = DashboardState.projects.find(p => p.id === projectId);
            if (project) {
                project.title = title;
                project.description = description;
                project.updatedAt = new Date().toISOString();
                console.log('✅ Projet modifié:', project);
            }
        } else {
            // Création
            console.log('➕ Mode création de nouveau projet');
            const newProject = {
                id: generateId(),
                title: title,
                description: description,
                columns: [
                    { id: generateId(), title: 'À faire', tasks: [] },
                    { id: generateId(), title: 'En cours', tasks: [] },
                    { id: generateId(), title: 'Terminé', tasks: [] }
                ],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            console.log('📦 Nouveau projet créé:', newProject);
            DashboardState.projects.push(newProject);
            console.log('📊 Nombre total de projets:', DashboardState.projects.length);
        }

        // Sauvegarder
        console.log('💾 Appel de saveDashboardData()...');
        await saveDashboardData();
        console.log('✅ Données sauvegardées');
        
        // Recharger l'affichage
        console.log('🔄 Rafraîchissement de l\'affichage...');
        await refreshDashboard();
        console.log('✅ Affichage mis à jour');
        
        // Fermer la modale
        console.log('🚪 Fermeture de la modale...');
        modal.remove();
        console.log('✅ Modale fermée');
        
        showNotification(
            projectId ? 'Projet modifié avec succès' : 'Projet créé avec succès',
            'success'
        );
        
        console.log('🎉 Opération terminée avec succès !');

    } catch (error) {
        console.error('❌ ERREUR lors de la sauvegarde:', error);
        console.error('Stack trace:', error.stack);
        showNotification('Erreur lors de la sauvegarde: ' + error.message, 'error');
        
        const saveBtn = document.getElementById('saveProjectBtn');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = projectId ? '💾 Enregistrer' : '➕ Créer';
        }
    }
}



/**
 * Ferme le modal
 */
function closeProjectModal() {
    const modal = document.getElementById('projectModal');
    if (modal) {
        modal.remove();
    }
}



/**
 * Crée un nouveau projet
 */
const newProjectBtn = document.getElementById('newProjectBtn');

if (newProjectBtn) {
    newProjectBtn.addEventListener('click', () => showProjectModal());
}

/**
 * Ouvre un projet dans le kanban
 */
function openProject(projectId) {
    console.log('🚀 Ouverture du projet:', projectId);
    
    // HACK pour file:// - Sauvegarder toutes les données nécessaires
    const encryptedData = localStorage.getItem('kanban_secure_data');
    const password = sessionStorage.getItem('currentPassword');
    
    if (!encryptedData || !password) {
        alert('Erreur : données manquantes');
        return;
    }
    
    // Sauvegarder dans sessionStorage (partagé entre les pages)
    sessionStorage.setItem('kanban_backup_data', encryptedData);
    sessionStorage.setItem('currentPassword', password);
    sessionStorage.setItem('opening_project_id', projectId);
    
    console.log('💾 Données transférées vers sessionStorage');
    
    // Navigation
    window.location.href = `project-kanban.html?id=${encodeURIComponent(projectId)}`;
}


/**
 * Édite un projet
 */
function editProject(projectId) {
    showProjectModal(projectId);
}

/**
 * Supprime un projet
 */
async function deleteProject(projectId) {
    const project = DashboardState.projects.find(p => p.id === projectId);
    
    if (!project) return;

    if (!confirm(`Voulez-vous vraiment supprimer le projet "${project.title}" ?\n\nCette action est irréversible.`)) {
        return;
    }

    try {
        // Retirer le projet
        DashboardState.projects = DashboardState.projects.filter(p => p.id !== projectId);

        // Sauvegarder
        await saveDashboardData();

        // Rafraîchir l'affichage
        renderProjects();
        updateStats();

        showNotification('Projet supprimé avec succès', 'success');

    } catch (error) {
        console.error('❌ Erreur suppression:', error);
        showNotification('Erreur lors de la suppression', 'error');
    }
}

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

/**
 * Compte les tâches d'un projet
 */
async function getProjectTaskCount(projectId) {
    try {
        const tasks = await StorageManager.getTasks(projectId);
        console.log(`📊 Projet ${projectId}: ${tasks.length} tâches`);
        return tasks.length;
    } catch (error) {
        console.error(`❌ Erreur lecture tâches pour ${projectId}:`, error);
        return 0;
    }
}

/**
 * Compte les tâches terminées d'un projet
 */
async function getProjectCompletedCount(projectId) {
    try {
        const tasks = await StorageManager.getTasks(projectId);
        const completedTasks = tasks.filter(task => 
            task.status === 'done' || task.columnId === 'done'
        );
        
        console.log(`✅ Projet ${projectId}: ${completedTasks.length} tâches terminées`);
        return completedTasks.length;
    } catch (error) {
        console.error(`❌ Erreur lecture tâches terminées pour ${projectId}:`, error);
        return 0;
    }
}

/**
 * Calcule la progression d'un projet
 */
async function getProjectProgress(projectId) {
    try {
        const totalTasks = await getProjectTaskCount(projectId);
        
        if (totalTasks === 0) {
            return 0;
        }
        
        const completedTasks = await getProjectCompletedCount(projectId);
        const progress = Math.round((completedTasks / totalTasks) * 100);
        
        console.log(`📈 Projet ${projectId}: ${progress}% (${completedTasks}/${totalTasks})`);
        return progress;
    } catch (error) {
        console.error(`❌ Erreur calcul progression pour ${projectId}:`, error);
        return 0;
    }
}

/**
 * Récupère toutes les tâches d'un projet
 */
function getAllProjectTasks(project) {
    if (!project.columns) return [];
    return project.columns.flatMap(col => col.tasks || []);
}

/**
 * Génère un ID unique
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Échappe le HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Affiche une notification
 */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

console.log('📊 Dashboard.js chargé');

/**
 * Rafraîchit l'affichage complet
 */
async function refreshDashboard() {
    console.log('🔄 Rafraîchissement du dashboard...');
    await loadDashboardData(); // Recharger les données
    await renderProjects();
    await updateStats();
}
