/**
 * VukaSport - Aplicação Principal
 * Gerencia a exibição de jogos e sincronização com Firebase
 */

class GameManager {
    constructor() {
        this.games = [];
        this.useFirebase = true; // Usar Firebase como principal
        this.initializeApp();
    }

    /**
     * Inicializa a aplicação
     */
    async initializeApp() {
        // Carregar jogos (primeiro Firebase, depois localStorage como fallback)
        await this.loadGames();
        
        // Renderizar jogos
        this.renderGames();

        // Atualizar o cronómetro a cada 60 segundos (1 minuto real)
        setInterval(() => this.updateLiveGames(), 60000);

        // Sincronização em tempo real entre abas (Admin -> Jogos)
        window.addEventListener('storage', (e) => {
            if (e.key === 'vukasport_games') {
                this.loadGamesFromLocal();
                this.renderGames();
                // Se estivermos no admin, atualizar a lista lá também
                if (typeof adminPanel !== 'undefined') {
                    adminPanel.renderGamesList();
                }
            }
        });
    }

    /**
     * Cria jogos de exemplo para demonstração (apenas na primeira utilização)
     */
    createSampleGames() {
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
                date: new Date(Date.now() + 3600000).toISOString()
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
                date: new Date(Date.now() + 7200000).toISOString()
            },
            {
                id: 3,
                homeTeam: 'Vitória SC',
                awayTeam: 'Santa Clara',
                homeGoals: 0,
                awayGoals: 0,
                status: 'scheduled',
                minute: 0,
                competition: 'Primeira Liga',
                date: new Date(Date.now() + 86400000).toISOString()
            },
            {
                id: 4,
                homeTeam: 'Arouca',
                awayTeam: 'Moreirense',
                homeGoals: 3,
                awayGoals: 2,
                status: 'finished',
                minute: 90,
                competition: 'Primeira Liga',
                date: new Date(Date.now() - 3600000).toISOString()
            },
            {
                id: 5,
                homeTeam: 'Boavista',
                awayTeam: 'Académica',
                homeGoals: 1,
                awayGoals: 0,
                status: 'live',
                minute: 34,
                competition: 'Primeira Liga',
                date: new Date(Date.now() + 1800000).toISOString()
            },
            {
                id: 6,
                homeTeam: 'Estoril',
                awayTeam: 'Guarda',
                homeGoals: 2,
                awayGoals: 2,
                status: 'live',
                minute: 78,
                competition: 'Primeira Liga',
                date: new Date(Date.now() + 5400000).toISOString()
            },
            {
                id: 7,
                homeTeam: 'Paços Ferreira',
                awayTeam: 'Farense',
                homeGoals: 0,
                awayGoals: 1,
                status: 'scheduled',
                minute: 0,
                competition: 'Primeira Liga',
                date: new Date(Date.now() + 172800000).toISOString()
            },
            {
                id: 8,
                homeTeam: 'Vizela',
                awayTeam: 'Chaves',
                homeGoals: 2,
                awayGoals: 1,
                status: 'finished',
                minute: 90,
                competition: 'Primeira Liga',
                date: new Date(Date.now() - 7200000).toISOString()
            },
            {
                id: 9,
                homeTeam: 'Marítimo',
                awayTeam: 'Nacional',
                homeGoals: 1,
                awayGoals: 1,
                status: 'live',
                minute: 52,
                competition: 'Segunda Liga',
                date: new Date(Date.now() + 9000000).toISOString()
            },
            {
                id: 10,
                homeTeam: 'Tondela',
                awayTeam: 'Penafiel',
                homeGoals: 3,
                awayGoals: 0,
                status: 'finished',
                minute: 90,
                competition: 'Segunda Liga',
                date: new Date(Date.now() - 10800000).toISOString()
            },
            {
                id: 11,
                homeTeam: 'Leiria',
                awayTeam: 'Oliveirense',
                homeGoals: 0,
                awayGoals: 0,
                status: 'scheduled',
                minute: 0,
                competition: 'Segunda Liga',
                date: new Date(Date.now() + 259200000).toISOString()
            },
            {
                id: 12,
                homeTeam: 'Arouca B',
                awayTeam: 'Felgueiras',
                homeGoals: 2,
                awayGoals: 1,
                status: 'live',
                minute: 88,
                competition: 'Segunda Liga',
                date: new Date(Date.now() + 10800000).toISOString()
            }
        ];

        this.games = sampleGames;
        this.saveGames();
    }

    /**
     * Carrega os jogos (Firebase ou localStorage)
     */
    async loadGames() {
        try {
            // Tentar carregar do Firebase primeiro
            if (this.useFirebase && typeof firebaseManager !== 'undefined' && firebaseManager.isOnline) {
                const firebaseGames = await firebaseManager.loadGamesFromFirebase();
                
                if (firebaseGames && typeof firebaseGames === 'object') {
                    // Converter objeto Firebase para array
                    this.games = Object.values(firebaseGames).filter(game => game && game.id);
                    console.log('Jogos carregados do Firebase:', this.games.length);
                    this.saveGamesLocal(); // Guardar em cache local
                    return;
                }
            }
        } catch (error) {
            console.error('Erro ao carregar do Firebase:', error);
        }

        // Fallback para localStorage
        this.loadGamesFromLocal();
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
                console.error('Erro ao carregar jogos do localStorage:', error);
                this.games = [];
            }
        } else {
            // Apenas criar jogos de exemplo na primeira utilização
            console.log('Primeira utilização - criando jogos de exemplo');
      //      this.createSampleGames();
        }
    }

    /**
     * Guarda os jogos no localStorage (cache)
     */
    saveGamesLocal() {
        localStorage.setItem('vukasport_games', JSON.stringify(this.games));
        console.log('Jogos guardados no localStorage');
    }

    /**
     * Guarda os jogos (Firebase e localStorage)
     */
    async saveGames() {
        // Guardar em localStorage como cache
        this.saveGamesLocal();

        // Guardar no Firebase
        if (this.useFirebase && typeof firebaseManager !== 'undefined' && firebaseManager.isOnline) {
            try {
                await firebaseManager.syncGames();
            } catch (error) {
                console.error('Erro ao guardar no Firebase:', error);
            }
        }
    }

    /**
     * Obtém todos os jogos
     * @returns {array} - Array de jogos
     */
    getGames() {
        return this.games;
    }

    /**
     * Obtém um jogo pelo ID
     * @param {number} gameId - ID do jogo
     * @returns {object|null} - Jogo ou null
     */
    getGameById(gameId) {
        return this.games.find(game => game.id === parseInt(gameId));
    }

    /**
     * Adiciona um novo jogo
     * @param {object} gameData - Dados do jogo
     * @returns {object} - Jogo criado
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
            date: gameData.gameDate
        };

        this.games.push(newGame);
        await this.saveGames();
        
        // Sincronizar com Firebase
        if (this.useFirebase && typeof firebaseManager !== 'undefined' && firebaseManager.isOnline) {
            await firebaseManager.addGameToFirebase(newGame);
        }
        
        console.log('Novo jogo adicionado:', newGame);
        return newGame;
    }

    /**
     * Atualiza um jogo existente
     * @param {number} gameId - ID do jogo
     * @param {object} updates - Dados a atualizar
     * @returns {boolean} - True se atualizado com sucesso
     */
    async updateGame(gameId, updates) {
        const game = this.getGameById(gameId);
        
        if (!game) {
            console.error('Jogo não encontrado:', gameId);
            return false;
        }

        // Atualizar apenas os campos fornecidos
        Object.assign(game, updates);
        await this.saveGames();
        
        // Sincronizar com Firebase
        if (this.useFirebase && typeof firebaseManager !== 'undefined' && firebaseManager.isOnline) {
            await firebaseManager.updateGameInFirebase(gameId, updates);
        }
        
        console.log('Jogo atualizado:', game);
        return true;
    }

    /**
     * Elimina um jogo
     * @param {number} gameId - ID do jogo
     * @returns {boolean} - True se eliminado com sucesso
     */
    async deleteGame(gameId) {
        const index = this.games.findIndex(game => game.id === parseInt(gameId));
        
        if (index === -1) {
            console.error('Jogo não encontrado:', gameId);
            return false;
        }

        this.games.splice(index, 1);
        await this.saveGames();
        
        // Sincronizar com Firebase
        if (this.useFirebase && typeof firebaseManager !== 'undefined' && firebaseManager.isOnline) {
            await firebaseManager.deleteGameFromFirebase(gameId);
        }
        
        console.log('Jogo eliminado:', gameId);
        return true;
    }

    /**
     * Obtém o texto do status do jogo
     * @param {string} status - Status do jogo
     * @returns {string} - Texto do status
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
     * Atualiza os jogos em direto (cronómetro automático)
     */
    async updateLiveGames() {
        let hasChanges = false;

        this.games.forEach(game => {
            // Apenas avança o tempo se o jogo estiver "Em Direto" ou "Prolongamento"
            if (game.status === 'live' || game.status === 'extra') {
                // Limite máximo de 120 minutos para prolongamentos
                const maxMinute = (game.status === 'extra') ? 120 : 90;
                
                if (game.minute < maxMinute) {
                    game.minute += 1;
                    hasChanges = true;
                }
            }
        });

        if (hasChanges) {
            await this.saveGames();
            this.renderGames();
            
            // Se estivermos no admin, atualizar a lista lá também
            if (typeof adminPanel !== 'undefined') {
                adminPanel.renderGamesList();
            }
        }
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

        // Ordenar jogos por data
        const sortedGames = [...this.games].sort((a, b) => 
            new Date(a.date) - new Date(b.date)
        );

        gamesList.innerHTML = sortedGames.map(game => this.createGameCard(game)).join('');
    }

    /**
     * Cria o HTML de um cartão de jogo
     * @param {object} game - Dados do jogo
     * @returns {string} - HTML do cartão
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
            minuteDisplay = `<div class="minute-indicator">${game.minute}'</div>`;
        } else if (game.status === 'halftime') {
            minuteDisplay = `<div class="minute-indicator">45' (Intervalo)</div>`;
        } else if (game.status === 'extra') {
            minuteDisplay = `<div class="minute-indicator">${game.minute}' (Prolongamento)</div>`;
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

// Atualizar jogos quando a página fica visível (após voltar do separador)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        gameManager.renderGames();
    }
});
