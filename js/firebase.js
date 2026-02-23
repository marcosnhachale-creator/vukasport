/**
 * VukaSport - Integração Firebase
 * Gerencia a sincronização com a base de dados em tempo real
 */

class FirebaseManager {
    constructor() {
        this.databaseURL = 'https://vukasport-b375e-default-rtdb.firebaseio.com';
        this.isOnline = navigator.onLine;
        this.syncEnabled = true;
        this.initializeEventListeners();
    }

    /**
     * Inicializa os event listeners para online/offline
     */
    initializeEventListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('Conectado à internet - sincronizando com Firebase');
            this.syncAllData();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('Desconectado da internet - usando cache local');
        });
    }

    /**
     * Sincroniza todos os dados com Firebase
     */
    async syncAllData() {
        if (!this.isOnline || !this.syncEnabled) return;

        try {
            // Sincronizar jogos
            await this.syncGames();
            // Sincronizar credenciais de admin
            await this.syncAdminCredentials();
            console.log('Sincronização com Firebase concluída com sucesso');
        } catch (error) {
            console.error('Erro ao sincronizar com Firebase:', error);
        }
    }

    /**
     * Sincroniza os jogos com Firebase
     */
    async syncGames() {
        if (!this.isOnline) return;

        try {
            const games = gameManager.getGames();
            const response = await fetch(`${this.databaseURL}/games.json`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(games)
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            console.log('Jogos sincronizados com Firebase');
            return await response.json();
        } catch (error) {
            console.error('Erro ao sincronizar jogos:', error);
            throw error;
        }
    }

    /**
     * Carrega os jogos do Firebase
     */
    async loadGamesFromFirebase() {
        if (!this.isOnline) {
            console.log('Offline - usando dados locais');
            return null;
        }

        try {
            const response = await fetch(`${this.databaseURL}/games.json`);

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            const games = await response.json();
            console.log('Jogos carregados do Firebase:', games);
            return games;
        } catch (error) {
            console.error('Erro ao carregar jogos do Firebase:', error);
            return null;
        }
    }

    /**
     * Sincroniza as credenciais de admin com Firebase
     */
    async syncAdminCredentials() {
        if (!this.isOnline) return;

        try {
            const credentials = {
                username: authManager.validCredentials.username,
                passwordHash: this.hashPassword(authManager.validCredentials.password),
                lastUpdated: new Date().toISOString()
            };

            const response = await fetch(`${this.databaseURL}/admin/credentials.json`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(credentials)
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            console.log('Credenciais de admin sincronizadas com Firebase');
            return await response.json();
        } catch (error) {
            console.error('Erro ao sincronizar credenciais:', error);
            throw error;
        }
    }

    /**
     * Carrega as credenciais de admin do Firebase
     */
    async loadAdminCredentialsFromFirebase() {
        if (!this.isOnline) {
            console.log('Offline - usando credenciais locais');
            return null;
        }

        try {
            const response = await fetch(`${this.databaseURL}/admin/credentials.json`);

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            const credentials = await response.json();
            console.log('Credenciais de admin carregadas do Firebase');
            return credentials;
        } catch (error) {
            console.error('Erro ao carregar credenciais do Firebase:', error);
            return null;
        }
    }

    /**
     * Atualiza a senha do admin no Firebase
     * @param {string} newPassword - Nova senha
     */
    async updateAdminPassword(newPassword) {
        if (!this.isOnline) {
            console.warn('Offline - não é possível atualizar a senha no Firebase');
            return false;
        }

        try {
            const credentials = {
                username: authManager.validCredentials.username,
                passwordHash: this.hashPassword(newPassword),
                lastUpdated: new Date().toISOString()
            };

            const response = await fetch(`${this.databaseURL}/admin/credentials.json`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(credentials)
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            console.log('Senha de admin atualizada no Firebase');
            return true;
        } catch (error) {
            console.error('Erro ao atualizar senha no Firebase:', error);
            return false;
        }
    }

    /**
     * Hash simples de senha (em produção, usar bcrypt ou similar)
     * @param {string} password - Senha a fazer hash
     * @returns {string} - Hash da senha
     */
    hashPassword(password) {
        // Implementação simples de hash - em produção usar biblioteca apropriada
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Converter para inteiro de 32 bits
        }
        return 'hash_' + Math.abs(hash).toString(16);
    }

    /**
     * Ativa ou desativa a sincronização
     * @param {boolean} enabled - Ativar ou desativar
     */
    setSyncEnabled(enabled) {
        this.syncEnabled = enabled;
        console.log(`Sincronização Firebase ${enabled ? 'ativada' : 'desativada'}`);
    }

    /**
     * Obtém o estado da conexão
     * @returns {boolean} - True se online
     */
    getConnectionStatus() {
        return this.isOnline;
    }
}

// Instância global do gestor Firebase
const firebaseManager = new FirebaseManager();

// Sincronizar dados quando a página fica visível
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && firebaseManager.isOnline) {
        firebaseManager.syncAllData();
    }
});
