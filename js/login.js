// ============================================
// LOGIN.JS - Gestion de la page de connexion
// ============================================

const LoginHandler = {
    passwordInput: null,
    loginBtn: null,
    errorMessage: null,
    setupBtn: null,

    init() {
        console.log('🔐 Initialisation LoginHandler');
        
        // Récupération des éléments DOM
        this.passwordInput = document.getElementById('masterPassword');
        this.loginBtn = document.getElementById('submitBtn');
        this.errorMessage = document.getElementById('errorMessage');
        this.setupBtn = document.getElementById('setupBtn');

        // Vérifier si on est déjà authentifié
        if (AuthManager.isAuthenticated) {
            console.log('✅ Déjà authentifié, redirection...');
            this.redirectToDashboard();
            return;
        }

        // Vérifier si c'est la première utilisation
        this.checkFirstUse();

        // Event listeners
        this.setupEventListeners();
    },

    async checkFirstUse() {
        try {
            // ✅ hasStoredData() est synchrone, pas besoin de await
            console.log("AC0")
            const hasData = StorageManager.hasStoredData();
            console.log("AC1")
            
            if (!hasData) {
                // Première utilisation - mode configuration
                this.showSetupMode();
                console.log("AC2")
            } else {
                // Mode connexion normal
                this.showLoginMode();
                console.log("AC3")
            }
        } catch (error) {
            console.error('❌ Erreur vérification première utilisation:', error);
            this.showError('Erreur lors de la vérification');
        }
    },    

    showSetupMode() {
        console.log('🎉 Première utilisation détectée');
        document.querySelector('.login-container h1').textContent = '🎉 Première connexion';
        this.passwordInput.placeholder = 'Créez votre mot de passe';
        this.loginBtn.textContent = 'Créer et se connecter';
        
        if (this.setupBtn) {
            this.setupBtn.style.display = 'none';
        }
        
        this.showMessage('Bienvenue ! Créez votre mot de passe sécurisé.', 'info');
    },

    showLoginMode() {
        console.log('🔐 Mode connexion normal');
        document.querySelector('.login-container h1').textContent = '🔐 Connexion';
        document.querySelector("#confirmGroup").style.display = "none";
        this.passwordInput.placeholder = 'Mot de passe';
        this.loginBtn.textContent = 'Se connecter';
    },

    setupEventListeners() {
        // Connexion au clic sur le bouton
        this.loginBtn.addEventListener('click', () => {
            this.handleLogin();
        });

        // Connexion à la touche Entrée
        this.passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleLogin();
            }
        });

        // Effacer le message d'erreur quand on tape
        this.passwordInput.addEventListener('input', () => {
            this.clearError();
        });

        // Bouton de configuration (si présent)
        if (this.setupBtn) {
            this.setupBtn.addEventListener('click', () => {
                this.showSetupMode();
            });
        }
    },

    async handleLogin() {
        const password = this.passwordInput.value.trim();
    
        // Validation basique
        if (!password) {
            this.showError('Veuillez entrer un mot de passe');
            return;
        }
    
        if (password.length < 4) {
            this.showError('Le mot de passe doit contenir au moins 4 caractères');
            return;
        }
    
        this.setLoading(true);
    
        try {
            // ✅ Pas de await ici non plus
            const hasData = StorageManager.hasStoredData();
    
            if (!hasData) {
                await this.setupFirstTime(password);
            } else {
                await this.loginExisting(password);
            }
        } catch (error) {
            console.error('❌ Erreur lors de la connexion:', error);
            this.showError('Erreur lors de la connexion');
            this.setLoading(false);
        }
    },
    

    async setupFirstTime(password) {
        try {
            console.log('🎉 Configuration initiale...');

            // Créer la structure de données initiale
            const initialData = {
                projects: [],
                settings: {
                    theme: 'light',
                    language: 'fr',
                    createdAt: new Date().toISOString()
                }
            };

            // Sauvegarder avec le mot de passe
            await StorageManager.saveData(password, initialData);

            // Authentifier l'utilisateur
            await AuthManager.login(password);

            console.log('✅ Configuration initiale terminée');
            this.showMessage('✅ Compte créé avec succès !', 'success');

            // Redirection après un court délai
            setTimeout(() => {
                this.redirectToDashboard();
            }, 1000);

        } catch (error) {
            console.error('❌ Erreur configuration initiale:', error);
            this.showError('Erreur lors de la création du compte');
            this.setLoading(false);
            throw error;
        }
    },

    async loginExisting(password) {
        try {
            console.log('🔐 Tentative de connexion...');

            // Tenter de charger les données avec ce mot de passe
            const authenticated = await AuthManager.login(password);

            if (authenticated) {
                console.log('✅ Connexion réussie');
                this.showMessage('✅ Connexion réussie !', 'success');

                // Redirection après un court délai
                setTimeout(() => {
                    this.redirectToDashboard();
                }, 500);
            } else {
                this.showError('❌ Mot de passe incorrect');
                this.setLoading(false);
                this.passwordInput.value = '';
                this.passwordInput.focus();
            }

        } catch (error) {
            console.error('❌ Erreur authentification:', error);
            this.showError('❌ Mot de passe incorrect');
            this.setLoading(false);
            this.passwordInput.value = '';
            this.passwordInput.focus();
        }
    },

    redirectToDashboard() {
        console.log('🚀 Redirection vers dashboard.html');
        window.location.href = 'dashboard.html';
    },

    showError(message) {
        if (this.errorMessage) {
            this.errorMessage.textContent = message;
            this.errorMessage.className = 'error-message show';
        }
    },

    showMessage(message, type = 'info') {
        if (this.errorMessage) {
            this.errorMessage.textContent = message;
            this.errorMessage.className = `error-message ${type} show`;
        }
    },

    clearError() {
        if (this.errorMessage) {
            this.errorMessage.className = 'error-message';
        }
    },

    setLoading(loading) {
        this.loginBtn.disabled = loading;
        this.passwordInput.disabled = loading;
        
        if (loading) {
            this.loginBtn.textContent = '⏳ Connexion...';
        } else {
            const hasData = StorageManager.hasStoredData();
            this.loginBtn.textContent = hasData ? 'Se connecter' : 'Créer et se connecter';
        }
    }
};

// ============================================
// INITIALISATION
// ============================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        LoginHandler.init();
    });
} else {
    LoginHandler.init();
}
