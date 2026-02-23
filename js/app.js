/**
 * VukaSport - Aplicação Principal
 * Gerencia a exibição de jogos e sincronização em tempo real
 */

class GameManager {
    constructor() {
        this.games = [];
        this.timerInterval = null;
        this.lastUpdate = null;
        this.initializeApp();
    }

    /**
     * Inicializa a aplicação
     */
    async initializeApp() {
        // Carregar jogos
        await this.loadGames();
        
        // Renderizar jogos
        this.renderGames();

        // Iniciar cronómetro automático
        this.startTimer();

        // Sincronizar com outros dispositivos
        this.setupSyncListeners();

        console.log('Aplicação inicializada');
    }

    /**
     * Inicia o cronómetro automático
     */
    startTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        // Atualizar a cada 60 segundos (1 minuto real)
        this.timerInterval = setInterval(() => {
            this.updateLiveGames();
        }, 60000);

        // Atualização rápida para testes (remover em produção)
        // setInterval(() => {
        //     this.updateLiveGames();
        // }, 5000);
    }

    /**
     * Atualiza jogos em direto (cronómetro automático)
     */
    updateLiveGames() {
        let hasChanges = false;
        const now = Date.now();

        this.games.forEach(game => {
            if (game.status === 'live' || game.status === 'extra') {
                const maxMinute = (game.status === 'extra') ? 120 : 90;
                
                if (game.minute < maxMinute) {
                    // Incrementar minuto baseado no tempo real
                    if (game.lastMinuteUpdate) {
                        const minutesPassed = Math.floor((now - game.lastMinuteUpdate) / 60000);
                        if (minutesPassed > 0) {
                            game.minute = Math.min(game.minute + minutesPassed, maxMinute);
                            game.lastMinuteUpdate = now;
                            hasChanges = true;
                        }
                    } else {
                        game.lastMinuteUpdate = now;
                    }
                }
            }
        });

        if (hasChanges) {
            this.saveGames();
            this.renderGames();
            
            // Disparar evento de atualização
            window.dispatchEvent(new CustomEvent('gamesUpdated', { detail: this.games }));
        }
    }

    /**
     * Configura listeners para sincronização
     */
    setupSyncListeners() {
        // Ouvir por atualizações de jogos
        window.addEventListener('gamesUpdated', (event) => {
            const updatedGames = event.detail;
            
            // Verificar se há mudanças
            if (JSON.stringify(updatedGames) !== JSON.stringify(this.games)) {
                this.games = updatedGames;
                this.renderGames();
            }
        });

        // Sincronizar quando a página fica visível
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                if (window.syncManager) {
                    window.syncManager.syncWithPeers();
                }
            }
        });
    }

    /**
     * Carrega os jogos
     */
    async loadGames() {
        try {
            // Tentar carregar do localStorage primeiro
            this.loadGamesFromLocal();

            // Se não houver jogos, criar exemplos
            if (this.games.length === 0) {
                this.createSampleGames();
            }

            // Sincronizar com outros dispositivos
            if (window.syncManager) {
                await window.syncManager.syncWithPeers();
            }

        } catch (error) {
            console.error('Erro ao carregar jogos:', error);
        }
    }

    /**
     * Cria jogos de exemplo
     */
    createSampleGames() {
        const now = Date.now();
        const sampleGames = [
            {
                id: 1,
                homeTeam: 'Sporting CP',
                awayTeam: 'Benfica',
                homeGoals: 2,
                awayGoals: 1,
                status: 'live',
                minute: 67,
                competition: 'Primeira Liga',
                date: new Date(now).toISOString(),
                lastUpdated: now
            },
            {
                id: 2,
                homeTeam: 'Porto',
                awayTeam: 'Braga',
                homeGoals: 1,
                awayGoals: 1,
                status: 'halftime',
                minute: 45,
                competition: 'Primeira Liga',
                date: new Date(now).toISOString(),
                lastUpdated: now
            },
            {
                id: 3,
                homeTeam: 'Barcelona',
                awayTeam: 'Real Madrid',
                homeGoals: 3,
                awayGoals: 0,
                status: 'finished',
                minute: 90,
                competition: 'La Liga',
                date: new Date(now - 3600000).toISOString(),
                lastUpdated: now
            },
            {
                id: 4,
                homeTeam: 'Manchester City',
                awayTeam: 'Liverpool',
                homeGoals: 4,
                awayGoals: 1,
                status: 'live',
                minute: 78,
                competition: 'Premier League',
                date: new Date(now).toISOString(),
                lastUpdated: now
            },
            {
                id: 5,
                homeTeam: 'Bayern Munich',
                awayTeam: 'Borussia Dortmund',
                homeGoals: 5,
                awayGoals: 2,
                status: 'finished',
                minute: 90,
                competition: 'Bundesliga',
                date: new Date(now - 7200000).toISOString(),
                lastUpdated: now
            }
        ];

        this.games = sampleGames;
        this.saveGames();
    }

    /**
     * Carrega os jogos do localStorage
     */
    loadGamesFromLocal() {
        const gamesStr = localStorage.getItem('vukasport_games');
        
        if (gamesStr) {
            try {
                this.games = JSON.parse(gamesStr);
                console.log('Jogos carregados do localStorage:', this.games.length);
            } catch (error) {
                console.error('Erro ao carregar jogos:', error);
                this.games = [];
            }
        }
    }

    /**
     * Guarda os jogos
     */
    saveGames() {
        // Adicionar timestamp de atualização
        const now = Date.now();
        this.games = this.games.map(game => ({
            ...game,
            lastUpdated: now
        }));

        // Guardar no localStorage
        localStorage.setItem('vukasport_games', JSON.stringify(this.games));

        // Adicionar mudança pendente para sincronização
        if (window.syncManager) {
            window.syncManager.addPendingChange({
                type: 'GAMES_UPDATE',
                games: this.games,
                timestamp: now
            });
        }

        // Disparar evento de atualização
        window.dispatchEvent(new CustomEvent('gamesUpdated', { detail: this.games }));
    }

    /**
     * Obtém todos os jogos
     */
    getGames() {
        return this.games;
    }

    /**
     * Obtém um jogo pelo ID
     */
    getGameById(gameId) {
        return this.games.find(game => game.id === parseInt(gameId));
    }

    /**
     * Adiciona um novo jogo
     */
    async addGame(gameData) {
        const newGame = {
            id: Date.now(),
            homeTeam: gameData.homeTeam,
            awayTeam: gameData.awayTeam,
            homeGoals: 0,
            awayGoals: 0,
            status: 'scheduled',
            minute: 0,
            competition: gameData.competition,
            date: gameData.gameDate,
            lastUpdated: Date.now()
        };

        this.games.push(newGame);
        this.saveGames();
        
        console.log('Novo jogo adicionado:', newGame);
        return newGame;
    }

    /**
     * Atualiza um jogo existente
     */
    async updateGame(gameId, updates) {
        const game = this.getGameById(gameId);
        
        if (!game) {
            console.error('Jogo não encontrado:', gameId);
            return false;
        }

        // Atualizar apenas os campos fornecidos
        Object.assign(game, updates);
        game.lastUpdated = Date.now();

        // Se o status mudar para 'live', iniciar cronómetro
        if (updates.status === 'live' && game.status !== 'live') {
            game.lastMinuteUpdate = Date.now();
        }

        this.saveGames();
        
        console.log('Jogo atualizado:', game);
        return true;
    }

    /**
     * Elimina um jogo
     */
    async deleteGame(gameId) {
        const index = this.games.findIndex(game => game.id === parseInt(gameId));
        
        if (index === -1) {
            console.error('Jogo não encontrado:', gameId);
            return false;
        }

        this.games.splice(index, 1);
        this.saveGames();
        
        console.log('Jogo eliminado:', gameId);
        return true;
    }

    /**
     * Obtém o texto do status do jogo
     */
    getStatusText(status) {
        const statusMap = {
            'scheduled': 'Agendado',
            'live': 'Em Direto',
            'halftime': 'Intervalo',
            'extra': 'Prolongamento',
            'finished': 'Terminado'
        };
        return statusMap[status] || status;
    }

    /**
     * Renderiza os jogos na página
     */
    renderGames() {
        const gamesList = document.getElementById('gamesList');
        const emptyState = document.getElementById('emptyState');

        if (!gamesList) return;

        if (this.games.length === 0) {
            gamesList.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        // Ordenar jogos: em direto primeiro, depois por data
        const sortedGames = [...this.games].sort((a, b) => {
            if (a.status === 'live' && b.status !== 'live') return -1;
            if (a.status !== 'live' && b.status === 'live') return 1;
            return new Date(b.date) - new Date(a.date);
        });

        gamesList.innerHTML = sortedGames.map(game => this.createGameCard(game)).join('');
    }

    /**
     * Cria o HTML de um cartão de jogo
     */
    createGameCard(game) {
        const statusClass = `status-${game.status}`;
        const statusText = this.getStatusText(game.status);
        const gameDate = new Date(game.date);
        const dateStr = gameDate.toLocaleDateString('pt-PT', {
            weekday: 'short',
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });

        let minuteDisplay = '';
        if (game.status === 'live') {
            minuteDisplay = `<div class="minute-indicator">⚽ ${game.minute}'</div>`;
        } else if (game.status === 'halftime') {
            minuteDisplay = `<div class="minute-indicator">⏸️ 45' (Intervalo)</div>`;
        } else if (game.status === 'extra') {
            minuteDisplay = `<div class="minute-indicator">⏱️ ${game.minute}' (Prolongamento)</div>`;
        } else if (game.status === 'finished') {
            minuteDisplay = `<div class="minute-indicator">✅ Terminado</div>`;
        }

        return `
            <div class="game-card">
                <div class="game-header">
                    <span class="game-competition">${game.competition}</span>
                    <span class="game-status ${statusClass}">${statusText}</span>
                </div>

                <div class="game-teams">
                    <div class="teams-row">
                        <div class="team">
                            <div class="team-name">${game.homeTeam}</div>
                            <div class="score">${game.homeGoals}</div>
                        </div>
                        <div class="vs">vs</div>
                        <div class="team">
                            <div class="team-name">${game.awayTeam}</div>
                            <div class="score">${game.awayGoals}</div>
                        </div>
                    </div>
                </div>

                <div class="game-info">
                    <div class="info-row">
                        <span class="info-label">Data:</span>
                        <span class="info-value">${dateStr}</span>
                    </div>
                    ${minuteDisplay ? `<div class="info-row">${minuteDisplay}</div>` : ''}
                </div>
            </div>
        `;
    }
}

// Instância global do gestor de jogos
const gameManager = new GameManager();

// Atualizar jogos quando a página fica visível
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        gameManager.renderGames();
    }
});
