// ============================================
// STORAGE.JS - Gestion du stockage chiffré
// ============================================

const StorageManager = {
    STORAGE_KEY: 'kanban_secure_data',
    SALT_KEY: 'kanban_salt',

    /**
     * Structure par défaut des données
     */
    getDefaultData() {
        return {
            projects: [],
            settings: {
                theme: 'light',
                language: 'fr',
                sessionTimeout: 15,
                createdAt: new Date().toISOString()
            },
            metadata: {
                version: '2.0',
                lastModified: new Date().toISOString()
            }
        };
    },

    /**
     * Vérifie si des données chiffrées existent
     */
    hasStoredData() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        const salt = localStorage.getItem(this.SALT_KEY);
        return !!(data && salt);
    },

    /**
     * Génère un nouveau salt
     */
    async generateSalt() {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const saltHex = Array.from(salt)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        
        localStorage.setItem(this.SALT_KEY, saltHex);
        return saltHex;
    },

    /**
     * Récupère le salt stocké
     */
    getSalt() {
        return localStorage.getItem(this.SALT_KEY);
    },

    /**
     * Sauvegarde les données de manière chiffrée
     */
    async saveData(password, data) {
        try {
            console.log('💾 Sauvegarde des données...');

            // Obtenir ou créer le salt
            let salt = this.getSalt();
            if (!salt) {
                salt = await this.generateSalt();
            }

            // Dériver la clé depuis le mot de passe
            const key = await CryptoManager.deriveKey(password, salt);

            // Mettre à jour la date de modification
            data.metadata = data.metadata || {};
            data.metadata.lastModified = new Date().toISOString();
            data.metadata.version = '2.0';

            // Chiffrer les données
            const dataString = JSON.stringify(data);
            const encrypted = await CryptoManager.encrypt(dataString, key);

            // Sauvegarder dans localStorage
            localStorage.setItem(this.STORAGE_KEY, encrypted);

            console.log('✅ Données sauvegardées avec succès');
            return true;

        } catch (error) {
            console.error('❌ Erreur lors de la sauvegarde:', error);
            throw new Error('Impossible de sauvegarder les données');
        }
    },

    /**
     * Charge les données chiffrées
     */
    async loadData(password) {
        try {
            console.log('📂 Chargement des données...');

            // Vérifier que les données existent
            if (!this.hasStoredData()) {
                console.log('ℹ️ Aucune donnée stockée, création des données par défaut');
                return this.getDefaultData();
            }

            // Récupérer les données chiffrées et le salt
            const encrypted = localStorage.getItem(this.STORAGE_KEY);
            const salt = this.getSalt();

            if (!encrypted || !salt) {
                throw new Error('Données corrompues');
            }

            // Dériver la clé depuis le mot de passe
            const key = await CryptoManager.deriveKey(password, salt);

            // Déchiffrer
            const decrypted = await CryptoManager.decrypt(encrypted, key);
            const data = JSON.parse(decrypted);

            console.log('✅ Données chargées avec succès');
            return data;

        } catch (error) {
            console.error('❌ Erreur lors du chargement:', error);
            
            // Si c'est une erreur de déchiffrement, c'est probablement un mauvais mot de passe
            if (error.message.includes('decrypt') || error.name === 'OperationError') {
                throw new Error('Mot de passe incorrect');
            }
            
            throw new Error('Impossible de charger les données');
        }
    },

    /**
     * Vérifie si le mot de passe est correct
     */
    async verifyPassword(password) {
        try {
            await this.loadData(password);
            return true;
        } catch (error) {
            return false;
        }
    },

    /**
     * Initialise le stockage avec des données par défaut
     */
    async initialize(password) {
        try {
            console.log('🎉 Initialisation du stockage...');

            // Créer les données par défaut
            const defaultData = this.getDefaultData();

            // Générer un nouveau salt
            await this.generateSalt();

            // Sauvegarder les données
            await this.saveData(password, defaultData);

            console.log('✅ Stockage initialisé avec succès');
            return defaultData;

        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation:', error);
            throw error;
        }
    },

    /**
     * Exporte les données chiffrées (pour sauvegarde)
     */
    exportData() {
        const encrypted = localStorage.getItem(this.STORAGE_KEY);
        const salt = this.getSalt();

        if (!encrypted || !salt) {
            throw new Error('Aucune donnée à exporter');
        }

        return {
            version: '2.0',
            timestamp: new Date().toISOString(),
            data: encrypted,
            salt: salt
        };
    },

    /**
     * Importe des données chiffrées
     */
    importData(exportedData) {
        if (!exportedData.data || !exportedData.salt) {
            throw new Error('Données d\'import invalides');
        }

        localStorage.setItem(this.STORAGE_KEY, exportedData.data);
        localStorage.setItem(this.SALT_KEY, exportedData.salt);

        console.log('✅ Données importées avec succès');
    },

    /**
     * Efface toutes les données (réinitialisation complète)
     */
    clearAll() {
        localStorage.removeItem(this.STORAGE_KEY);
        localStorage.removeItem(this.SALT_KEY);
        console.log('🗑️ Toutes les données ont été effacées');
    },

    /**
     * Change le mot de passe
     */
    async changePassword(oldPassword, newPassword) {
        try {
            console.log('🔄 Changement de mot de passe...');

            // Charger les données avec l'ancien mot de passe
            const data = await this.loadData(oldPassword);

            // Générer un nouveau salt
            await this.generateSalt();

            // Sauvegarder avec le nouveau mot de passe
            await this.saveData(newPassword, data);

            console.log('✅ Mot de passe changé avec succès');
            return true;

        } catch (error) {
            console.error('❌ Erreur lors du changement de mot de passe:', error);
            throw error;
        }
    },

    /**
     * Récupère uniquement les projets
     */
    async getProjects(password) {
        const data = await this.loadData(password);
        return data.projects || [];
    },

    /**
     * Sauvegarde uniquement les projets
     */
    async saveProjects(password, projects) {
        const data = await this.loadData(password);
        data.projects = projects;
        await this.saveData(password, data);
    },

    /**
     * Récupère les paramètres
     */
    async getSettings(password) {
        const data = await this.loadData(password);
        return data.settings || this.getDefaultData().settings;
    },

    /**
     * Sauvegarde les paramètres
     */
    async saveSettings(password, settings) {
        const data = await this.loadData(password);
        data.settings = { ...data.settings, ...settings };
        await this.saveData(password, data);
    }
};

// Test au chargement
console.log('📦 StorageManager chargé');
console.log('📊 Données existantes:', StorageManager.hasStoredData());
