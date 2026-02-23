/**
 * VukaSport - Integração Firebase
 * Gerencia a sincronização em tempo real com a base de dados Firebase
 */

class FirebaseManager {
    constructor() {
        this.databaseURL = 'https://vukasport-b375e-default-rtdb.firebaseio.com';
        this.isOnline = navigator.onLine;
        this.syncEnabled = true;
        this.listeners = [];
        this.initializeEventListeners();
        this.setupRealtimeSync();
    }

    /**
     * Inicializa os event listeners para online/offline
     */
    initializeEventListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('Conectado à internet - sincronizando com Firebase');
            this.syncAllData();
            this.setupRealtimeSync();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('Desconectado da internet - usando cache local');
        });
    }

    /**
     * Configura a sincronização em tempo real com Firebase
     */
    setupRealtimeSync() {
        if (!this.isOnline || !this.syncEnabled) return;

        try {
            // Limpar listeners anteriores
            this.listeners.forEach(listener => {
                if (listener && typeof listener === 'function') {
                    listener();
                }
            });
            this.listeners = [];

            // Configurar listener para jogos
            this.setupGamesListener();
            console.log('Sincronização em tempo real configurada');
        } catch (error) {
            console.error('Erro ao configurar sincronização em tempo real:', error);
        }
    }

    /**
     * Configura o listener em tempo real para jogos
     */
    setupGamesListener() {
        if (!this.isOnline) return;

        // Polling a cada 2 segundos para simular tempo real (alternativa ao WebSocket)
        const pollInterval = setInterval(async () => {
            if (!this.isOnline || !this.syncEnabled) {
                clearInterval(pollInterval);
                return;
            }

            try {
                const firebaseGames = await this.loadGamesFromFirebase();
                
                if (firebaseGames && typeof firebaseGames === 'object') {
                    // Converter objeto Firebase para array
                    const gamesArray = Object.values(firebaseGames).filter(game => game && game.id);
                    
                    // Comparar com jogos locais e atualizar se houver mudanças
                    const localGames = gameManager.getGames();
                    
                    if (JSON.stringify(gamesArray) !== JSON.stringify(localGames)) {
                        console.log('Atualizações de jogos detectadas - sincronizando...');
                        gameManager.games = gamesArray;
                        gameManager.saveGames();
                        gameManager.renderGames();
                        
                        // Atualizar admin se estiver aberto
                        if (typeof adminPanel !== 'undefined') {
                            adminPanel.renderGamesList();
                        }
                    }
                }
            } catch (error) {
                console.error('Erro no polling de jogos:', error);
            }
        }, 2000);

        this.listeners.push(() => clearInterval(pollInterval));
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
            
            // Converter array para objeto com IDs como chaves
            const gamesObject = {};
            games.forEach(game => {
                gamesObject[game.id] = game;
            });

            const response = await fetch(`${this.databaseURL}/games.json`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(gamesObject)
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

            const data = await response.json();
            console.log('Jogos carregados do Firebase:', data);
            return data;
        } catch (error) {
            console.error('Erro ao carregar jogos do Firebase:', error);
            return null;
        }
    }

    /**
     * Adiciona um novo jogo ao Firebase
     */
    async addGameToFirebase(gameData) {
        if (!this.isOnline) {
            console.warn('Offline - jogo será sincronizado quando online');
            return false;
        }

        try {
            const gameId = gameData.id || Date.now();
            const response = await fetch(`${this.databaseURL}/games/${gameId}.json`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(gameData)
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            console.log('Jogo adicionado ao Firebase:', gameId);
            return true;
        } catch (error) {
            console.error('Erro ao adicionar jogo ao Firebase:', error);
            return false;
        }
    }

    /**
     * Atualiza um jogo no Firebase
     */
    async updateGameInFirebase(gameId, updates) {
        if (!this.isOnline) {
            console.warn('Offline - atualizações serão sincronizadas quando online');
            return false;
        }

        try {
            const response = await fetch(`${this.databaseURL}/games/${gameId}.json`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            console.log('Jogo atualizado no Firebase:', gameId);
            return true;
        } catch (error) {
            console.error('Erro ao atualizar jogo no Firebase:', error);
            return false;
        }
    }

    /**
     * Elimina um jogo do Firebase
     */
    async deleteGameFromFirebase(gameId) {
        if (!this.isOnline) {
            console.warn('Offline - eliminação será sincronizada quando online');
            return false;
        }

        try {
            const response = await fetch(`${this.databaseURL}/games/${gameId}.json`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            console.log('Jogo eliminado do Firebase:', gameId);
            return true;
        } catch (error) {
            console.error('Erro ao eliminar jogo do Firebase:', error);
            return false;
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
        
        if (enabled && this.isOnline) {
            this.setupRealtimeSync();
        }
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
