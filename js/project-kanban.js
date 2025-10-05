// ========================================
// 🎯 CLASSE PRINCIPALE KANBAN
// ========================================
class ProjectKanban {
    constructor() {
        this.projectId = this.getProjectIdFromUrl();
        this.project = null;
        this.tasks = [];
        this.currentTaskId = null;
    }

    // ========================================
    // 🚀 INITIALISATION
    // ========================================
    async init() {
        console.log('🎯 Initialisation du Kanban pour le projet:', this.projectId);
        await this.loadProject();
        this.loadTasks();
        this.renderTasks();
        this.setupEventListeners();
        this.setupDragAndDrop();
    }

    // ========================================
    // 🔗 RÉCUPÉRER L'ID DU PROJET DEPUIS L'URL
    // ========================================
    getProjectIdFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        console.log('📍 ID du projet depuis URL:', id);
        return id;
    }

    // ========================================
    // 📂 CHARGER LE PROJET
    // ========================================
    async loadProject() {
        console.log('📂 Chargement du projet...');
        try {
            const password = AuthManager.getCurrentPassword();
            if (!password) {
                throw new Error('Mot de passe non trouvé');
            }

            const userData = await StorageManager.loadData(password);
            const projects = userData.projects || [];
            this.project = projects.find(p => p.id === this.projectId);

            if (!this.project) {
                console.error('❌ Projet introuvable');
                alert('Projet introuvable');
                window.location.href = 'dashboard.html';
                return;
            }

            console.log('✅ Projet chargé:', this.project);
            this.displayProjectInfo();
        } catch (error) {
            console.error('❌ Erreur chargement:', error);
            alert('Erreur lors du chargement du projet');
            window.location.href = 'dashboard.html';
        }
    }

    // ========================================
    // 📊 AFFICHER LES INFOS DU PROJET
    // ========================================
    displayProjectInfo() {
        const nameEl = document.getElementById('projectName');
        if (nameEl && this.project) {
            nameEl.textContent = this.project.title;
        }
        console.log('✅ Infos du projet affichées');
    }

    // ========================================
    // 📋 CHARGER LES TÂCHES
    // ========================================
    loadTasks() {
        console.log('📋 Chargement des tâches...');
        const stored = localStorage.getItem(`tasks_${this.projectId}`);
        this.tasks = stored ? JSON.parse(stored) : [];
        console.log('✅ Tâches chargées:', this.tasks.length);
        this.updateStats();
    }

    // ========================================
    // 🎧 CONFIGURATION DES ÉVÉNEMENTS
    // ========================================
    setupEventListeners() {
        console.log('🎧 Configuration des événements...');

        // Boutons "Ajouter une tâche"
        document.querySelectorAll('.add-task-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                console.log('🆕 Clic sur bouton nouvelle tâche');
                const column = e.target.closest('.kanban-column');
                const status = column.dataset.status;
                console.log('📍 Status de la colonne:', status);
                this.showTaskModal(status);
            });
        });

        // Formulaire de tâche
        const taskForm = document.getElementById('taskForm');
        if (taskForm) {
            taskForm.addEventListener('submit', (e) => this.saveTask(e));
        }

        // Fermeture du modal
        const closeBtn = document.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeTaskModal());
        }

        // Fermeture si clic en dehors
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('taskModal');
            if (e.target === modal) {
                this.closeTaskModal();
            }
        });

        console.log('✅ Événements configurés');
    }

    // ========================================
    // 🎯 DRAG & DROP - CONFIGURATION
    // ========================================
    setupDragAndDrop() {
        console.log('🎯 Configuration Drag & Drop...');

        const containers = document.querySelectorAll('.cards-container');
        
        containers.forEach(container => {
            // Autoriser le survol
            container.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                container.classList.add('drag-over');
            });

            // Retirer la classe au départ
            container.addEventListener('dragleave', (e) => {
                e.preventDefault();
                e.stopPropagation();
                container.classList.remove('drag-over');
            });

            // Gérer le drop
            container.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                container.classList.remove('drag-over');
                
                const taskId = e.dataTransfer.getData('text/plain');
                const newStatus = container.id.replace('-cards', '');
                
                console.log('📦 Drop détecté - TaskID:', taskId, 'Nouveau status:', newStatus);
                
                if (taskId) {
                    this.moveTask(taskId, newStatus);
                }
            });
        });

        this.makeDraggable();
        
        console.log('✅ Drag & Drop configuré');
    }

    // ========================================
    // 🎯 RENDRE LES CARTES DRAGGABLES
    // ========================================
    makeDraggable() {
        const cards = document.querySelectorAll('.task-card');
        console.log('🎴 Configuration de', cards.length, 'cartes draggables');
        
        cards.forEach(card => {
            card.setAttribute('draggable', 'true');
            
            // Début du drag
            card.addEventListener('dragstart', (e) => {
                const taskId = card.dataset.taskId;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', taskId);
                card.classList.add('dragging');
                console.log('🎯 Drag start - TaskID:', taskId);
            });

            // Fin du drag
            card.addEventListener('dragend', (e) => {
                card.classList.remove('dragging');
                document.querySelectorAll('.drag-over').forEach(el => {
                    el.classList.remove('drag-over');
                });
                console.log('✅ Drag end');
            });
        });
    }

    // ========================================
    // 🔄 DÉPLACER UNE TÂCHE
    // ========================================
    moveTask(taskId, newStatus) {
        console.log('🔄 moveTask appelé - TaskID:', taskId, 'Nouveau status:', newStatus);
        
        const task = this.tasks.find(t => t.id === taskId);
        
        if (!task) {
            console.error('❌ Tâche introuvable:', taskId);
            return;
        }

        const oldStatus = task.status;
        
        if (oldStatus === newStatus) {
            console.log('ℹ️ Même statut, pas de changement');
            return;
        }

        // Mettre à jour la tâche
        task.status = newStatus;
        task.updatedAt = new Date().toISOString();
        
        console.log('✅ Tâche mise à jour:', task.name, oldStatus, '→', newStatus);
        
        // Sauvegarder
        localStorage.setItem(`tasks_${this.projectId}`, JSON.stringify(this.tasks));
        
        // Re-rendre l'interface
        this.renderTasks();
        this.updateStats();
        
        console.log('✅ Interface mise à jour');
    }

    // ========================================
    // 📝 AFFICHER LE MODAL DE TÂCHE
    // ========================================
    showTaskModal(status = 'todo', taskId = null) {
        console.log('📝 Ouverture modal - Status:', status, 'TaskID:', taskId);
        
        const modal = document.getElementById('taskModal');
        const form = document.getElementById('taskForm');
        const title = document.getElementById('modalTitle');

        this.currentTaskId = taskId;

        if (taskId) {
            // Mode édition
            const task = this.tasks.find(t => t.id === taskId);
            if (task) {
                title.textContent = 'Modifier la tâche';
                document.getElementById('taskName').value = task.name;
                document.getElementById('taskDescription').value = task.description || '';
                document.getElementById('taskPriority').value = task.priority;
                document.getElementById('taskDueDate').value = task.dueDate || '';
                document.getElementById('taskStatus').value = task.status;
                document.getElementById('taskAssignee').value = task.assignee || '';
                console.log('📝 Mode édition - Tâche chargée:', task.name);
            }
        } else {
            // Mode création
            title.textContent = 'Nouvelle tâche';
            form.reset();
            document.getElementById('taskStatus').value = status;
            console.log('📝 Mode création - Status par défaut:', status);
        }

        modal.classList.add('active');
    }

    // ========================================
    // ❌ FERMER LE MODAL
    // ========================================
    closeTaskModal() {
        console.log('❌ Fermeture du modal');
        const modal = document.getElementById('taskModal');
        modal.classList.remove('active');
        this.currentTaskId = null;
        document.getElementById('taskForm').reset();
    }

    // ========================================
    // 💾 SAUVEGARDER UNE TÂCHE
    // ========================================
    saveTask(e) {
        e.preventDefault();
        console.log('💾 Sauvegarde de la tâche...');

        const formData = {
            name: document.getElementById('taskName').value.trim(),
            description: document.getElementById('taskDescription').value.trim(),
            priority: document.getElementById('taskPriority').value,
            dueDate: document.getElementById('taskDueDate').value,
            status: document.getElementById('taskStatus').value,
            assignee: document.getElementById('taskAssignee').value.trim()
        };

        console.log('📋 Données du formulaire:', formData);

        if (this.currentTaskId) {
            // Mise à jour
            const task = this.tasks.find(t => t.id === this.currentTaskId);
            if (task) {
                Object.assign(task, formData);
                task.updatedAt = new Date().toISOString();
                console.log('✅ Tâche mise à jour:', task.name);
            }
        } else {
            // Création
            const newTask = {
                id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                ...formData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            this.tasks.push(newTask);
            console.log('✅ Nouvelle tâche créée:', newTask.name, 'ID:', newTask.id);
        }

        // Sauvegarder
        localStorage.setItem(`tasks_${this.projectId}`, JSON.stringify(this.tasks));
        console.log('💾 Tâches sauvegardées dans localStorage');

        // Mettre à jour l'affichage
        this.renderTasks();
        this.updateStats();
        this.closeTaskModal();

        console.log('✅ Sauvegarde terminée');
    }

    // ========================================
    // 🎨 AFFICHER LES TÂCHES
    // ========================================
    renderTasks() {
        console.log('🎨 Rendu des tâches...');
        
        // Vider les colonnes
        ['todo', 'in-progress', 'done'].forEach(status => {
            const container = document.getElementById(`${status}-cards`);
            if (container) {
                container.innerHTML = '';
            }
        });

        // Ajouter les tâches
        this.tasks.forEach(task => {
            const card = this.createTaskCard(task);
            const container = document.getElementById(`${task.status}-cards`);
            if (container) {
                container.appendChild(card);
            }
        });

        // Reconfigurer le drag & drop
        this.makeDraggable();

        // Mettre à jour les compteurs
        this.updateTaskCounts();
        
        console.log('✅ Tâches rendues:', this.tasks.length);
    }

    // ========================================
    // 🎴 CRÉER UNE CARTE DE TÂCHE
    // ========================================
    createTaskCard(task) {
        const card = document.createElement('div');
        card.className = 'task-card';
        card.dataset.priority = task.priority;
        card.dataset.taskId = task.id;

        const priorityLabels = {
            low: '🟢 Basse',
            medium: '🟡 Moyenne',
            high: '🔴 Haute'
        };

        // Gestion de la date d'échéance
        let dateClass = '';
        let dateText = '';
        if (task.dueDate) {
            const dueDate = new Date(task.dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            dueDate.setHours(0, 0, 0, 0);

            const diffTime = dueDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 0) {
                dateClass = 'overdue';
            } else if (diffDays <= 2) {
                // Vérifier si c'est un jour ouvré
                const dayOfWeek = dueDate.getDay();
                if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                    dateClass = 'due-soon';
                }
            }

            dateText = dueDate.toLocaleDateString('fr-FR');
        }

        card.innerHTML = `
            <div class="task-header">
                <h4 class="task-title">${task.name}</h4>
                <div class="task-actions">
                    <button class="task-btn" onclick="app.editTask('${task.id}')" title="Modifier">
                        ✏️
                    </button>
                    <button class="task-btn" onclick="app.deleteTask('${task.id}')" title="Supprimer">
                        🗑️
                    </button>
                </div>
            </div>
            ${task.description ? `<p class="task-description">${task.description}</p>` : ''}
            <div class="task-footer">
                <span class="task-priority">${priorityLabels[task.priority]}</span>
                ${dateText ? `<span class="task-date ${dateClass}">📅 ${dateText}</span>` : ''}
            </div>
        `;

        return card;
    }

    // ========================================
    // ✏️ ÉDITER UNE TÂCHE
    // ========================================
    editTask(taskId) {
        console.log('✏️ Édition de la tâche:', taskId);
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            this.showTaskModal(task.status, taskId);
        }
    }

    // ========================================
    // 🗑️ SUPPRIMER UNE TÂCHE
    // ========================================
    deleteTask(taskId) {
        console.log('🗑️ Demande de suppression:', taskId);
        const task = this.tasks.find(t => t.id === taskId);
        
        if (task && confirm(`Voulez-vous vraiment supprimer la tâche "${task.name}" ?`)) {
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            localStorage.setItem(`tasks_${this.projectId}`, JSON.stringify(this.tasks));
            this.renderTasks();
            this.updateStats();
            console.log('✅ Tâche supprimée');
        } else {
            console.log('❌ Suppression annulée');
        }
    }

    // ========================================
    // 🔢 METTRE À JOUR LES COMPTEURS
    // ========================================
    updateTaskCounts() {
        const counts = {
            'todo': 0,
            'in-progress': 0,
            'done': 0
        };

        this.tasks.forEach(task => {
            if (counts.hasOwnProperty(task.status)) {
                counts[task.status]++;
            }
        });

        Object.keys(counts).forEach(status => {
            const countEl = document.getElementById(`${status}-count`);
            if (countEl) {
                countEl.textContent = counts[status];
            }
        });

        console.log('🔢 Compteurs mis à jour:', counts);
    }

    // ========================================
    // 📊 METTRE À JOUR LES STATISTIQUES
    // ========================================
    updateStats() {
        const total = this.tasks.length;
        const done = this.tasks.filter(t => t.status === 'done').length;
        const progress = total > 0 ? Math.round((done / total) * 100) : 0;

        const totalEl = document.getElementById('totalTasks');
        const doneEl = document.getElementById('doneTasks');
        const progressEl = document.getElementById('progressPercent');

        if (totalEl) totalEl.textContent = total;
        if (doneEl) doneEl.textContent = done;
        if (progressEl) progressEl.textContent = `${progress}%`;

        console.log('📊 Stats mises à jour - Total:', total, 'Terminées:', done, 'Progrès:', progress + '%');
    }

    // ========================================
    // 🗑️ SUPPRIMER LE PROJET
    // ========================================
    async deleteProject() {
        console.log('🗑️ Demande de suppression du projet');
        
        if (confirm(`Voulez-vous vraiment supprimer le projet "${this.project.name}" et toutes ses tâches ?`)) {
            try {
                const password = AuthManager.getCurrentPassword();
                const userData = await StorageManager.loadData(password);
                
                // Supprimer le projet
                userData.projects = userData.projects.filter(p => p.id !== this.projectId);
                
                // Sauvegarder
                await StorageManager.saveData(userData, password);
                
                // Supprimer les tâches
                localStorage.removeItem(`tasks_${this.projectId}`);

                console.log('✅ Projet supprimé');

                // Retour au dashboard
                window.location.href = 'dashboard.html';
            } catch (error) {
                console.error('❌ Erreur suppression:', error);
                alert('Erreur lors de la suppression du projet');
            }
        } else {
            console.log('❌ Suppression annulée');
        }
    }
}

// ========================================
// 🚀 INITIALISATION AU CHARGEMENT
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM chargé, création de l\'instance ProjectKanban...');
    window.app = new ProjectKanban();
    window.app.init();
});
