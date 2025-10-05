/**
 * 🔐 Module de gestion de l'authentification
 */

const AuthManager = {
    currentPassword: null,
    isAuthenticated: false,
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    sessionTimer: null,

    constructor() {
        this.isAuthenticated = this.checkAuth();
    },

    /**
     * Retourne le mot de passe
     */
    getCurrentPassword() {
        return sessionStorage.getItem('currentPassword');
    },

    /**
     * Vérifie l'authentification au chargement
     */
    checkAuth() {
        if (sessionStorage.getItem('authenticated') === 'true' && sessionStorage.getItem('currentPassword')) {
            this.currentPassword = sessionStorage.getItem('currentPassword');
            this.isAuthenticated = true;
            this.startSessionTimer();
            return true;
        }

        // ✅ Redirige vers index.html si non authentifié
        if (!window.location.pathname.endsWith('index.html')) {
            window.location.href = 'index.html';
        }
        return false;
    },

    /**
     * Connexion utilisateur
     */
    async login(password) {
        try {
            const data = await StorageManager.loadData(password);

            this.currentPassword = password;
            this.isAuthenticated = true;

            sessionStorage.setItem('authenticated', 'true');
            sessionStorage.setItem('currentPassword', password);

            this.startSessionTimer();

            console.log('✅ Connexion réussie');
            return data;
        } catch (error) {
            console.error('❌ Erreur connexion:', error);
            throw error;
        }
    },

    /**
     * Recharge les données de l'utilisateur actuellement connecté
     * 
     * 🎯 Utilisée après une modification pour avoir les données à jour
     * 
     * @returns {Promise<Object>} Les données rechargées
     * @throws {Error} Si pas d'utilisateur connecté ou erreur de chargement
     */
    async reloadData() {
        console.log('🔄 Rechargement des données...');

        // ✅ Vérification 1 : Un utilisateur est-il connecté ?
        if (!sessionStorage.getItem('authenticated')) {
            console.error('❌ Aucun utilisateur connecté');
            throw new Error('Aucun utilisateur connecté');
        }

        // ✅ Vérification 2 : Le mot de passe est-il disponible ?
        if (!this.currentPassword) {
            console.error('❌ Mot de passe non disponible');
            throw new Error('Mot de passe non disponible pour le rechargement');
        }

        try {
            // 📥 Étape 1 : Charger les données depuis le localStorage
            console.log('📥 Chargement des données depuis le storage...');
            const data = await StorageManager.loadData(this.currentPassword);

            // ✅ Vérification 3 : Les données existent-elles ?
            if (!data) {
                console.error('❌ Aucune donnée trouvée');
                throw new Error('Aucune donnée trouvée');
            }

            // 📊 Étape 2 : Vérifier la structure des données
            console.log('📊 Données rechargées:', {
                hasProjects: !!data.projects,
                projectsCount: data.projects?.length || 0,
                hasUser: !!data.user
            });

            // 🔄 Étape 3 : Mettre à jour les informations de l'utilisateur
            if (data.user) {
                this.currentUser = data.user;
                console.log('✅ Informations utilisateur mises à jour');
            }

            // ✅ Étape 4 : Retourner les données complètes
            console.log('✅ Rechargement terminé avec succès');
            return data;

        } catch (error) {
            console.error('❌ Erreur lors du rechargement:', error);
            
            // 🚨 Si erreur de déchiffrement, déconnecter l'utilisateur
            if (error.message.includes('déchiffrement')) {
                console.warn('⚠️ Erreur de déchiffrement détectée, déconnexion...');
                this.logout();
            }
            
            throw error;
        }
    },

    /**
     * Déconnexion
     */
    logout() {
        this.currentPassword = null;
        this.isAuthenticated = false;

        sessionStorage.setItem('authenticated', 'false');
        sessionStorage.setItem('currentPassword', this.currentPassword);

        sessionStorage.clear();
        this.stopSessionTimer();

        window.location.href = 'index.html';
        console.log('✅ Déconnexion');
    },

    /**
     * Démarre le timer de session
     */
    startSessionTimer() {
        this.stopSessionTimer();

        this.sessionTimer = setTimeout(() => {
            alert('⏰ Session expirée pour votre sécurité');
            this.logout();
        }, this.sessionTimeout);
    },

    /**
     * Arrête le timer de session
     */
    stopSessionTimer() {
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
            this.sessionTimer = null;
        }
    },

    /**
     * Réinitialise le timer (activité utilisateur)
     */
    resetTimer() {
        if (sessionStorage.getItem('authenticated')) {
            this.startSessionTimer();
        }
    },

    /**
     * Change le mot de passe
     */
    async changePassword(oldPassword, newPassword) {
        try {
            // Vérifier l'ancien mot de passe
            const data = await StorageManager.loadData(oldPassword);

            // Sauvegarder avec le nouveau
            await StorageManager.saveData(newPassword, data);

            // Mettre à jour la session
            this.currentPassword = newPassword;
            sessionStorage.setItem('currentPassword', newPassword);

            console.log('✅ Mot de passe changé');
            return true;
        } catch (error) {
            console.error('❌ Erreur changement mot de passe:', error);
            throw error;
        }
    }
};

// Initialisation au chargement de la page
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        AuthManager.checkAuth();
    });
} else {
    AuthManager.checkAuth();
}

// Réinitialiser le timer sur activité utilisateur
['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
    document.addEventListener(event, () => {
        AuthManager.resetTimer();
    }, { passive: true });
});
