/* ========================================
   🎯 PROJECT KANBAN - GESTION COMPLÈTE
======================================== */

class ProjectKanban {
    constructor() {
        this.projectId = null;
        this.project = null;
        this.tasks = [];
        this.draggedTask = null;
        this.editingTaskId = null;
        
        this.init();
    }

    // ============================================
    // 🚀 INITIALISATION
    // ============================================
    
    async init() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            this.projectId = urlParams.get('id');

            if (!this.projectId) {
                throw new Error('Aucun projet spécifié');
            }

            await this.loadProject();
            await this.loadTasks();
            this.initEventListeners();

        } catch (error) {
            console.error('❌ Erreur initialisation:', error);
            alert('Erreur lors du chargement du projet');
            window.location.href = 'dashboard.html';
        }
    }

    // ============================================
    // 📂 CHARGEMENT DES DONNÉES
    // ============================================

    async loadProject() {
        this.project = await StorageManager.getProject(this.projectId);
        
        if (!this.project) {
            throw new Error('Projet introuvable');
        }
        
        document.getElementById('project-name').textContent = this.project.title;
        document.getElementById('project-description').textContent = 
            this.project.description || 'Aucune description';
    }

    async loadTasks() {
        this.tasks = await StorageManager.getTasks(this.projectId);
        this.renderKanban();
        this.updateCounters();
    }

    // ============================================
    // 🎨 AFFICHAGE DU KANBAN
    // ============================================

    renderKanban() {
        // Vider les colonnes
        ['todo', 'in-progress', 'done'].forEach(status => {
            const column = document.getElementById(`column-${status}`);
            column.innerHTML = '';
        });

        // Afficher les tâches
        this.tasks.forEach(task => {
            const card = this.createTaskCard(task);
            const column = document.getElementById(`column-${task.status}`);
            column.appendChild(card);
        });
    }

    createTaskCard(task) {
        const card = document.createElement('div');
        card.className = 'task-card';
        card.draggable = true;
        card.dataset.taskId = task.id;

        // Priorité
        const priorityEmoji = {
            'low': '🟢',
            'medium': '🟡',
            'high': '🔴'
        };

        // Date d'échéance avec couleur
        let dueDateHTML = '';
        if (task.dueDate) {
            const dueClass = this.getDueDateClass(task.dueDate);
            const dateFormatted = new Date(task.dueDate).toLocaleDateString('fr-FR');
            dueDateHTML = `<div class="task-due-date ${dueClass}">📅 ${dateFormatted}</div>`;
        }

        // Description tronquée (2 lignes max)
        const shortDescription = this.truncateDescription(task.description);

        card.innerHTML = `
            <div class="task-header">
                <span class="task-priority">${priorityEmoji[task.priority || 'medium']}</span>
                <h3 class="task-title">${this.escapeHtml(task.title)}</h3>
            </div>
            ${shortDescription ? `<p class="task-description">${this.escapeHtml(shortDescription)}</p>` : ''}
            ${dueDateHTML}
        `;

        // Événements
        card.addEventListener('click', () => this.openEditModal(task));
        card.addEventListener('dragstart', (e) => this.handleDragStart(e, task));
        card.addEventListener('dragend', (e) => this.handleDragEnd(e));

        return card;
    }

    truncateDescription(text) {
        if (!text) return '';
        const maxLength = 80;
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    getDueDateClass(dueDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const due = new Date(dueDate);
        due.setHours(0, 0, 0, 0);
        
        const diffTime = due - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'overdue'; // Passé = rouge
        if (diffDays <= 2 && this.isWorkingDay(due)) return 'due-soon'; // 2j ouvrés = orange
        return '';
    }

    isWorkingDay(date) {
        const day = date.getDay();
        return day !== 0 && day !== 6; // Pas samedi (6) ni dimanche (0)
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ============================================
    // 🖱️ DRAG & DROP
    // ============================================

    initEventListeners() {
        // Bouton nouvelle tâche
        document.getElementById('btn-add-task').addEventListener('click', () => {
            this.openCreateModal();
        });

        // Fermeture modal
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });

        // Formulaire
        document.getElementById('form-task').addEventListener('submit', (e) => {
            this.handleSubmitTask(e);
        });

        // Bouton supprimer
        document.getElementById('btn-delete-task').addEventListener('click', () => {
            this.handleDeleteTask();
        });

        // Drop zones
        document.querySelectorAll('.column-content').forEach(column => {
            column.addEventListener('dragover', (e) => this.handleDragOver(e));
            column.addEventListener('drop', (e) => this.handleDrop(e));
            column.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        });
    }

    handleDragStart(e, task) {
        this.draggedTask = task;
        e.currentTarget.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    }

    handleDragEnd(e) {
        e.currentTarget.classList.remove('dragging');
        document.querySelectorAll('.column-content').forEach(col => {
            col.classList.remove('drag-over');
        });
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        e.currentTarget.classList.add('drag-over');
    }

    handleDragLeave(e) {
        if (e.currentTarget === e.target) {
            e.currentTarget.classList.remove('drag-over');
        }
    }

    async handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');

        if (!this.draggedTask) return;

        const newStatus = e.currentTarget.dataset.status;
        
        if (this.draggedTask.status !== newStatus) {
            this.draggedTask.status = newStatus;
            this.draggedTask.modifiedAt = new Date().toISOString();
            
            await StorageManager.updateTask(this.projectId, this.draggedTask.id,    this.draggedTask);
            await this.loadTasks();
        }

        this.draggedTask = null;
    }

    // ============================================
    // 📝 GESTION DES MODALS
    // ============================================

    openCreateModal() {
        this.editingTaskId = null;
        
        document.getElementById('modal-title').textContent = 'Nouvelle tâche';
        document.getElementById('btn-submit-text').textContent = 'Créer la tâche';
        document.getElementById('btn-delete-task').style.display = 'none';
        document.getElementById('task-metadata').style.display = 'none';
        
        document.getElementById('form-task').reset();
        document.getElementById('task-status').value = 'todo';
        document.getElementById('task-priority').value = 'medium';
        
        document.getElementById('modal-task').classList.add('active');
    }

    openEditModal(task) {
        this.editingTaskId = task.id;
        
        document.getElementById('modal-title').textContent = 'Modifier la tâche';
        document.getElementById('btn-submit-text').textContent = 'Enregistrer';
        document.getElementById('btn-delete-task').style.display = 'block';
        
        // Remplir le formulaire
        document.getElementById('task-title').value = task.title;
        document.getElementById('task-description').value = task.description || '';
        document.getElementById('task-dueDate').value = task.dueDate || '';
        document.getElementById('task-status').value = task.status;
        document.getElementById('task-priority').value = task.priority || 'medium';
        
        // Afficher métadonnées
        this.displayMetadata(task);
        
        document.getElementById('modal-task').classList.add('active');
    }

    displayMetadata(task) {
        const metaSection = document.getElementById('task-metadata');
        metaSection.style.display = 'block';
        
        const createdDate = new Date(task.createdAt).toLocaleString('fr-FR');
        const modifiedDate = task.modifiedAt ? 
            new Date(task.modifiedAt).toLocaleString('fr-FR') : 
            'Jamais modifiée';
        
        const lifetime = this.calculateLifetime(task.createdAt);
        
        document.getElementById('meta-created').textContent = createdDate;
        document.getElementById('meta-modified').textContent = modifiedDate;
        document.getElementById('meta-lifetime').textContent = lifetime;
    }

    calculateLifetime(createdAt) {
        const created = new Date(createdAt);
        const now = new Date();
        const diffMs = now - created;
        
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        if (days > 0) return `${days}j ${hours}h`;
        return `${hours}h`;
    }

    closeModal() {
        document.getElementById('modal-task').classList.remove('active');
        document.getElementById('form-task').reset();
        this.editingTaskId = null;
    }

    // ============================================
    // 💾 CRUD TÂCHES
    // ============================================

    async handleSubmitTask(e) {
        e.preventDefault();

        const taskData = {
            title: document.getElementById('task-title').value.trim(),
            description: document.getElementById('task-description').value.trim(),
            dueDate: document.getElementById('task-dueDate').value,
            status: document.getElementById('task-status').value,
            priority: document.getElementById('task-priority').value,
            projectId: this.projectId
        };

        try {
            if (this.editingTaskId) {
                // Mise à jour
                const existingTask = this.tasks.find(t => t.id === this.editingTaskId);
                const updatedTask = {
                    ...existingTask,
                    ...taskData,
                    modifiedAt: new Date().toISOString()
                };

                await StorageManager.updateTask(this.projectId, existingTask.id, updatedTask);
            } else {
                // Création
                await StorageManager.createTask(taskData);
            }

            await this.loadTasks();
            this.closeModal();

        } catch (error) {
            console.error('❌ Erreur sauvegarde tâche:', error);
            alert('Erreur lors de la sauvegarde');
        }
    }

    async handleDeleteTask() {
        if (!confirm('Supprimer cette tâche ?')) return;

        try {
            await StorageManager.deleteTask(this.projectId, this.editingTaskId);
            await this.loadTasks();
            this.closeModal();
        } catch (error) {
            console.error('❌ Erreur suppression:', error);
            alert('Erreur lors de la suppression');
        }
    }

    // ============================================
    // 📊 COMPTEURS
    // ============================================

    updateCounters() {
        const counts = {
            'todo': 0,
            'in-progress': 0,
            'done': 0
        };

        this.tasks.forEach(task => {
            counts[task.status]++;
        });

        document.getElementById('count-todo').textContent = counts['todo'];
        document.getElementById('count-in-progress').textContent = counts['in-progress'];
        document.getElementById('count-done').textContent = counts['done'];
    }
}

// ============================================
// 🚀 DÉMARRAGE
// ============================================

let kanban;
document.addEventListener('DOMContentLoaded', () => {
    kanban = new ProjectKanban();
});
