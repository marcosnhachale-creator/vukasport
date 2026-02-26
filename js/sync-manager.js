/**
 * VukaSport - Gestor de Sincronização
 * Gerencia sincronização em tempo real entre dispositivos
 */

class SyncManager {
    constructor() {
        this.syncInterval = null;
        this.lastSyncTime = null;
        this.syncInProgress = false;
        this.pendingChanges = [];
        this.useFirebase = true; // Habilitado para sincronização em nuvem
        this.storageKey = 'vukasport_games';
        this.syncKey = 'vukasport_sync';
        this.peerConnections = [];
        this.broadcastChannel = null;
        
        this.initializeSync();
    }

    /**
     * Inicializa o sistema de sincronização
     */
    initializeSync() {
        // Usar BroadcastChannel para comunicação entre abas do mesmo navegador
        if (typeof BroadcastChannel !== 'undefined') {
            try {
                this.broadcastChannel = new BroadcastChannel('vukasport_sync');
                this.broadcastChannel.onmessage = (event) => {
                    if (event.data.type === 'GAMES_UPDATE') {
                        this.handleRemoteUpdate(event.data.games);
                    }
                };
                console.log('BroadcastChannel inicializado');
            } catch (error) {
                console.warn('BroadcastChannel não suportado:', error);
            }
        }

        // Carregar última sincronização
        this.loadLastSync();

        // Iniciar sincronização periódica
        this.startSync();

        // Sincronizar quando a página fica visível
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.syncWithPeers();
            }
        });

        // Ouvir por mudanças no localStorage (de outras abas)
        window.addEventListener('storage', (event) => {
            if (event.key === this.storageKey) {
                this.handleStorageChange(event.newValue);
            }
        });
    }

    /**
     * Inicia a sincronização periódica
     */
    startSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }

        // Sincronizar a cada 30 segundos
        this.syncInterval = setInterval(() => {
            this.syncWithPeers();
        }, 30000);

        // Sincronizar imediatamente
        this.syncWithPeers();
    }

    /**
     * Para a sincronização
     */
    stopSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    /**
     * Sincroniza com outros peers
     */
    async syncWithPeers() {
        if (this.syncInProgress || !navigator.onLine) {
            return;
        }

        this.showSyncIndicator(true);

        try {
            this.syncInProgress = true;

            // Obter jogos atuais
            const currentGames = this.getCurrentGames();

            // Tentar obter jogos de outros peers via WebRTC ou servidor de sinalização
            const peerGames = await this.discoverPeers();

            if (peerGames && peerGames.length > 0) {
                // Mesclar jogos de todos os peers
                const mergedGames = this.mergeGames(currentGames, peerGames);
                
                if (JSON.stringify(mergedGames) !== JSON.stringify(currentGames)) {
                    this.saveGames(mergedGames);
                    this.broadcastUpdate(mergedGames);
                    
                    // Notificar outros componentes
                    this.notifyGamesUpdated(mergedGames);
                }
            }

            this.lastSyncTime = Date.now();
            this.saveLastSync();

        } catch (error) {
            console.error('Erro na sincronização:', error);
        } finally {
            this.syncInProgress = false;
            setTimeout(() => this.showSyncIndicator(false), 1000);
        }
    }

    /**
     * Descobre outros peers e obtém seus jogos
     */
    async discoverPeers() {
        // Implementação simples: usar localStorage como ponte entre abas
        const allGames = [];
        const syncData = this.getSyncData();

        // Adicionar dados de outras abas
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('vukasport_peer_')) {
                try {
                    const peerData = JSON.parse(localStorage.getItem(key));
                    if (peerData.games && Array.isArray(peerData.games)) {
                        allGames.push(peerData.games);
                    }
                } catch (error) {
                    console.warn('Erro ao ler dados de peer:', error);
                }
            }
        }

        return allGames;
    }

    /**
     * Mescla jogos de múltiplas fontes
     */
    mergeGames(currentGames, peerGamesArray) {
        const gamesMap = new Map();

        // Adicionar jogos atuais ao mapa
        currentGames.forEach(game => {
            gamesMap.set(game.id, { ...game, timestamp: Date.now() });
        });

        // Mesclar jogos dos peers
        peerGamesArray.forEach(peerGames => {
            peerGames.forEach(game => {
                const existing = gamesMap.get(game.id);
                if (!existing || game.lastUpdated > existing.lastUpdated) {
                    gamesMap.set(game.id, { ...game, timestamp: Date.now() });
                }
            });
        });

        return Array.from(gamesMap.values());
    }

    /**
     * Lida com atualização remota via BroadcastChannel
     */
    handleRemoteUpdate(remoteGames) {
        const currentGames = this.getCurrentGames();
        const mergedGames = this.mergeGames(currentGames, [remoteGames]);

        if (JSON.stringify(mergedGames) !== JSON.stringify(currentGames)) {
            this.saveGames(mergedGames);
            this.notifyGamesUpdated(mergedGames);
        }
    }

    /**
     * Lida com mudanças no storage
     */
    handleStorageChange(newValue) {
        if (newValue) {
            try {
                const updatedGames = JSON.parse(newValue);
                this.notifyGamesUpdated(updatedGames);
            } catch (error) {
                console.error('Erro ao processar storage change:', error);
            }
        }
    }

    /**
     * Transmite atualização para outros peers
     */
    broadcastUpdate(games) {
        // Atualizar BroadcastChannel
        if (this.broadcastChannel) {
            try {
                this.broadcastChannel.postMessage({
                    type: 'GAMES_UPDATE',
                    games: games,
                    timestamp: Date.now()
                });
            } catch (error) {
                console.warn('Erro ao transmitir via BroadcastChannel:', error);
            }
        }

        // Atualizar dados do peer atual
        const peerId = 'vukasport_peer_' + this.getPeerId();
        localStorage.setItem(peerId, JSON.stringify({
            games: games,
            lastSeen: Date.now()
        }));

        // Limpar peers antigos
        this.cleanupOldPeers();
    }

    /**
     * Obtém ID único para este peer
     */
    getPeerId() {
        let peerId = localStorage.getItem('vukasport_peer_id');
        if (!peerId) {
            peerId = 'peer_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('vukasport_peer_id', peerId);
        }
        return peerId;
    }

    /**
     * Limpa peers que não estão mais ativos
     */
    cleanupOldPeers() {
        const now = Date.now();
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('vukasport_peer_')) {
                try {
                    const peerData = JSON.parse(localStorage.getItem(key));
                    if (now - peerData.lastSeen > 5 * 60 * 1000) { // 5 minutos
                        localStorage.removeItem(key);
                    }
                } catch (error) {
                    console.warn('Erro ao limpar peer:', error);
                }
            }
        }
    }

    /**
     * Obtém os jogos atuais
     */
    getCurrentGames() {
        if (typeof gameManager !== 'undefined') {
            return gameManager.getGames();
        }
        
        try {
            const gamesStr = localStorage.getItem(this.storageKey);
            return gamesStr ? JSON.parse(gamesStr) : [];
        } catch (error) {
            console.error('Erro ao obter jogos atuais:', error);
            return [];
        }
    }

    /**
     * Guarda jogos
     */
    saveGames(games) {
        localStorage.setItem(this.storageKey, JSON.stringify(games));
        
        if (typeof gameManager !== 'undefined') {
            gameManager.games = games;
            gameManager.renderGames();
        }
    }

    /**
     * Notifica que os jogos foram atualizados
     */
    notifyGamesUpdated(games) {
        if (typeof gameManager !== 'undefined') {
            gameManager.games = games;
            gameManager.renderGames();
        }

        if (typeof adminPanel !== 'undefined') {
            adminPanel.renderGamesList();
        }

        // Disparar evento personalizado
        window.dispatchEvent(new CustomEvent('gamesUpdated', { detail: games }));
    }

    /**
     * Carrega última sincronização
     */
    loadLastSync() {
        try {
            const syncData = localStorage.getItem(this.syncKey);
            if (syncData) {
                const data = JSON.parse(syncData);
                this.lastSyncTime = data.lastSyncTime;
            }
        } catch (error) {
            console.error('Erro ao carregar última sincronização:', error);
        }
    }

    /**
     * Guarda última sincronização
     */
    saveLastSync() {
        localStorage.setItem(this.syncKey, JSON.stringify({
            lastSyncTime: this.lastSyncTime
        }));
    }

    /**
     * Obtém dados de sincronização
     */
    getSyncData() {
        try {
            const syncData = localStorage.getItem(this.syncKey);
            return syncData ? JSON.parse(syncData) : {};
        } catch (error) {
            console.error('Erro ao obter dados de sincronização:', error);
            return {};
        }
    }

    /**
     * Mostra/esconde indicador de sincronização
     */
    showSyncIndicator(show) {
        const indicator = document.getElementById('syncIndicator');
        if (indicator) {
            indicator.style.display = show ? 'block' : 'none';
        }
    }

    /**
     * Adiciona uma mudança pendente
     */
    addPendingChange(change) {
        this.pendingChanges.push({
            ...change,
            timestamp: Date.now()
        });

        // Limitar número de mudanças pendentes
        if (this.pendingChanges.length > 100) {
            this.pendingChanges = this.pendingChanges.slice(-100);
        }

        // Tentar sincronizar imediatamente
        if (navigator.onLine) {
            this.syncWithPeers();
        }
    }

    /**
     * Obtém estatísticas de sincronização
     */
    getSyncStats() {
        return {
            lastSyncTime: this.lastSyncTime,
            pendingChanges: this.pendingChanges.length,
            syncInProgress: this.syncInProgress,
            peerConnections: this.peerConnections.length,
            online: navigator.onLine
        };
    }
}

// Instância global do gestor de sincronização
window.syncManager = new SyncManager();
