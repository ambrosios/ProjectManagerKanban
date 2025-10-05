/**
 * 🛡️ Module de sécurité
 * Validation, verrouillage et protection
 */

const SecurityManager = {
    MAX_ATTEMPTS: 5,
    LOCKOUT_DURATION: 5 * 60 * 1000, // 5 minutes

    /**
     * Valide la force d'un mot de passe
     */
    validatePassword(password) {
        const errors = [];
        
        if (password.length < 12) {
            errors.push('Minimum 12 caractères requis');
        }
        
        if (!/[a-z]/.test(password)) {
            errors.push('Au moins une minuscule requise');
        }
        
        if (!/[A-Z]/.test(password)) {
            errors.push('Au moins une majuscule requise');
        }
        
        if (!/[0-9]/.test(password)) {
            errors.push('Au moins un chiffre requis');
        }
        
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            errors.push('Au moins un caractère spécial requis');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    },

    /**
     * Calcule la force d'un mot de passe (0-100)
     */
    calculatePasswordStrength(password) {
        let strength = 0;
        
        if (password.length >= 12) strength += 20;
        if (password.length >= 16) strength += 10;
        if (/[a-z]/.test(password)) strength += 20;
        if (/[A-Z]/.test(password)) strength += 20;
        if (/[0-9]/.test(password)) strength += 15;
        if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength += 15;
        
        return Math.min(strength, 100);
    },

    /**
     * Enregistre une tentative de connexion échouée
     */
    recordFailedAttempt() {
        const attempts = this.getFailedAttempts();
        const data = {
            count: attempts + 1,
            lastAttempt: Date.now()
        };
        
        localStorage.setItem('failed_attempts', JSON.stringify(data));
        
        // Si limite atteinte, enregistrer le verrouillage
        if (data.count >= this.MAX_ATTEMPTS) {
            localStorage.setItem('lockout_until', Date.now() + this.LOCKOUT_DURATION);
        }
    },

    /**
     * Récupère le nombre de tentatives échouées
     */
    getFailedAttempts() {
        try {
            const data = localStorage.getItem('failed_attempts');
            if (!data) return 0;
            
            const parsed = JSON.parse(data);
            return parsed.count || 0;
        } catch (error) {
            return 0;
        }
    },

    /**
     * Réinitialise le compteur de tentatives échouées
     */
    resetFailedAttempts() {
        localStorage.removeItem('failed_attempts');
        localStorage.removeItem('lockout_until');
    },

    /**
     * Vérifie si le compte est verrouillé
     */
    isLockedOut() {
        const lockoutUntil = localStorage.getItem('lockout_until');
        
        if (!lockoutUntil) {
            return { locked: false };
        }

        const lockoutTime = parseInt(lockoutUntil);
        const now = Date.now();

        if (now < lockoutTime) {
            return {
                locked: true,
                remainingTime: lockoutTime - now
            };
        }

        // Le verrouillage est expiré, nettoyer
        this.resetFailedAttempts();
        return { locked: false };
    },

    /**
     * Nettoie les entrées utilisateur (XSS protection)
     */
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    },

    /**
     * Valide une tâche avant sauvegarde
     */
    validateTask(task) {
        const errors = [];

        if (!task.title || task.title.trim().length === 0) {
            errors.push('Le titre est requis');
        }

        if (task.title && task.title.length > 200) {
            errors.push('Le titre ne peut pas dépasser 200 caractères');
        }

        if (task.description && task.description.length > 5000) {
            errors.push('La description ne peut pas dépasser 5000 caractères');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    },

    /**
     * Génère un ID sécurisé pour une tâche
     */
    generateSecureId(prefix = 'task') {
        const timestamp = Date.now();
        const randomPart = Math.random().toString(36).substr(2, 9);
        return `${prefix}-${timestamp}-${randomPart}`;
    },

    /**
     * Vérifie l'intégrité des données
     */
    validateDataStructure(data) {
        try {
            // Vérifier la présence des champs essentiels
            if (!data.version) return false;
            if (!data.macroKanban) return false;
            if (!Array.isArray(data.macroKanban.columns)) return false;
            if (!data.microKanbans) return false;
            if (!data.settings) return false;

            // Vérifier chaque colonne
            for (const column of data.macroKanban.columns) {
                if (!column.id || !column.title) return false;
                if (!Array.isArray(column.tasks)) return false;
            }

            return true;
        } catch (error) {
            return false;
        }
    },

    /**
     * Nettoie les anciennes données de verrouillage
     */
    cleanupOldLockouts() {
        const lockoutUntil = localStorage.getItem('lockout_until');
        if (lockoutUntil) {
            const lockoutTime = parseInt(lockoutUntil);
            if (Date.now() > lockoutTime) {
                this.resetFailedAttempts();
            }
        }
    }
};

// Nettoyer les verrouillages expirés au chargement
SecurityManager.cleanupOldLockouts();
