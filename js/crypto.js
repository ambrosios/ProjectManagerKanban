// ============================================
// CRYPTO.JS - Gestion du chiffrement AES-GCM
// ============================================

const CryptoManager = {
    /**
     * Dérive une clé depuis un mot de passe
     */
    async deriveKey(password, salt) {
        const encoder = new TextEncoder();
        const passwordBuffer = encoder.encode(password);

        // Convertir le salt hex en Uint8Array
        const saltBuffer = new Uint8Array(
            salt.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
        );

        // Importer le mot de passe comme clé
        const baseKey = await crypto.subtle.importKey(
            'raw',
            passwordBuffer,
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );

        // Dériver la clé AES
        return await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: saltBuffer,
                iterations: 100000,
                hash: 'SHA-256'
            },
            baseKey,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    },

    /**
     * Chiffre des données avec AES-GCM
     */
    async encrypt(data, key) {
        try {
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(data);

            // Générer un IV aléatoire
            const iv = crypto.getRandomValues(new Uint8Array(12));

            // Chiffrer
            const encryptedBuffer = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                dataBuffer
            );

            // Combiner IV + données chiffrées
            const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
            combined.set(iv, 0);
            combined.set(new Uint8Array(encryptedBuffer), iv.length);

            // ✅ Convertir en Base64 pour le stockage
            return this.arrayBufferToBase64(combined);

        } catch (error) {
            console.error('❌ Erreur de chiffrement:', error);
            throw new Error('Échec du chiffrement');
        }
    },

    /**
     * Déchiffre des données AES-GCM
     */
    async decrypt(encryptedData, key) {
        try {
            // ✅ Convertir depuis Base64
            const combined = this.base64ToArrayBuffer(encryptedData);

            // Extraire IV et données
            const iv = combined.slice(0, 12);
            const data = combined.slice(12);

            // Déchiffrer
            const decryptedBuffer = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                data
            );

            // Décoder en string
            const decoder = new TextDecoder();
            return decoder.decode(decryptedBuffer);

        } catch (error) {
            console.error('❌ Erreur de déchiffrement:', error);
            throw new Error('Mot de passe incorrect ou données corrompues');
        }
    },

    /**
     * Convertit un ArrayBuffer en Base64
     */
    arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        
        return btoa(binary);
    },

    /**
     * Convertit du Base64 en ArrayBuffer
     */
    base64ToArrayBuffer(base64) {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        return bytes;
    },

    /**
     * Hash un mot de passe (pour vérification sans déchiffrer)
     */
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
};

// Test au chargement
console.log('🔐 CryptoManager chargé');
