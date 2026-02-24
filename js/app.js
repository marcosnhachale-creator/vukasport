/**
 * VukaSport - Aplicação Principal
 * Sincronização automática em tempo real com Firebase
 * Tempo sincronizado com o aparelho do utilizador
 */

class GameManager {
    constructor() {
        this.games = [];
        this.initializeApp();
    }

    /**
     * Inicializa a aplicação
     */
    async initializeApp() {
        // Carregar jogos do Firebase
        await this.loadGames();
        
        // Renderizar jogos
        this.renderGames();

        // Atualizar a visualização a cada 1 segundo (para mostrar tempo real)
        setInterval(() => this.renderGames(), 1000);

        // Sincronizar com Firebase a cada 3 segundos
        setInterval(() => this.syncWithFirebase(), 3000);
    }

    /**
     * Carrega os jogos (Firebase ou localStorage como fallback)
     */
    async loadGames() {
        try {
            // Tentar carregar do Firebase primeiro
            if (typeof firebaseManager !== 'undefined' && firebaseManager.isOnline) {
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
            // Sem dados de exemplo - lista vazia até o admin adicionar
            console.log('Nenhum jogo disponível - aguardando adição via admin');
            this.games = [];
        }
    }

    /**
     * Guarda os jogos no localStorage (cache)
     */
    saveGamesLocal() {
        localStorage.setItem('vukasport_games', JSON.stringify(this.games));
    }

    /**
     * Sincroniza com Firebase
     */
    async syncWithFirebase() {
        if (typeof firebaseManager === 'undefined' || !firebaseManager.isOnline) {
            return;
        }

        try {
            const firebaseGames = await firebaseManager.loadGamesFromFirebase();
            
            if (firebaseGames && typeof firebaseGames === 'object') {
                const gamesArray = Object.values(firebaseGames).filter(game => game && game.id);
                
                // Comparar com jogos locais
                if (JSON.stringify(gamesArray) !== JSON.stringify(this.games)) {
                    console.log('Atualizações detectadas - sincronizando...');
                    this.games = gamesArray;
                    this.saveGamesLocal();
                    this.renderGames();
                    
                    // Atualizar admin se estiver aberto
                    if (typeof adminPanel !== 'undefined') {
                        adminPanel.renderGamesList();
                    }
                }
            }
        } catch (error) {
            console.error('Erro na sincronização com Firebase:', error);
        }
    }

    /**
     * Guarda os jogos (Firebase e localStorage)
     */
    async saveGames() {
        // Guardar em localStorage como cache
        this.saveGamesLocal();

        // Guardar no Firebase
        if (typeof firebaseManager !== 'undefined' && firebaseManager.isOnline) {
            try {
                await firebaseManager.syncGames();
            } catch (error) {
                console.error('Erro ao guardar no Firebase:', error);
            }
        }
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
     * Calcula os minutos de jogo com base no tempo real do aparelho
     */
    calculateGameMinute(game) {
        if (game.status === 'scheduled') {
            return 0;
        }

        if (game.status === 'finished') {
            return 90;
        }

        if (game.status === 'halftime') {
            return 45;
        }

        if (game.status === 'extra') {
            // Prolongamento começa aos 90 minutos
            return Math.min(120, game.minute || 90);
        }

        // Para jogos em direto (live)
        if (game.status === 'live') {
            // Se o jogo tem um startTime, calcular com base nele
            if (game.startTime) {
                const startTime = new Date(game.startTime).getTime();
                const currentTime = new Date().getTime();
                const elapsedSeconds = Math.floor((currentTime - startTime) / 1000);
                const elapsedMinutes = Math.floor(elapsedSeconds / 60);
                
                // Limitar a 90 minutos para o tempo normal
                return Math.min(90, elapsedMinutes);
            }
            
            // Se não tem startTime, usar o valor armazenado
            return game.minute || 0;
        }

        return game.minute || 0;
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
            startTime: null,
            competition: gameData.competition,
            date: gameData.gameDate
        };

        this.games.push(newGame);
        await this.saveGames();
        
        // Sincronizar com Firebase
        if (typeof firebaseManager !== 'undefined' && firebaseManager.isOnline) {
            await firebaseManager.addGameToFirebase(newGame);
        }
        
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

        const oldGoals = { home: game.homeGoals, away: game.awayGoals };
        const oldStatus = game.status;

        // Se o status mudar para "live", registar o tempo de início
        if (updates.status === 'live' && oldStatus !== 'live') {
            updates.startTime = new Date().toISOString();
            updates.minute = 0;
        }

        // Se o status mudar para "finished" ou "halftime", parar o cronómetro
        if ((updates.status === 'finished' || updates.status === 'halftime') && oldStatus === 'live') {
            updates.startTime = null;
        }

        // Atualizar apenas os campos fornecidos
        Object.assign(game, updates);
        await this.saveGames();
        
        // Sincronizar com Firebase
        if (typeof firebaseManager !== 'undefined' && firebaseManager.isOnline) {
            await firebaseManager.updateGameInFirebase(gameId, updates);
        }

        // Verificar se houve golo
        if (updates.homeGoals !== undefined && updates.homeGoals > oldGoals.home) {
            this.notifyGoal(game.homeTeam, updates.homeGoals);
        }
        if (updates.awayGoals !== undefined && updates.awayGoals > oldGoals.away) {
            this.notifyGoal(game.awayTeam, updates.awayGoals);
        }
        
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
        await this.saveGames();
        
        // Sincronizar com Firebase
        if (typeof firebaseManager !== 'undefined' && firebaseManager.isOnline) {
            await firebaseManager.deleteGameFromFirebase(gameId);
        }
        
        console.log('Jogo eliminado:', gameId);
        return true;
    }

    /**
     * Notifica um golo
     */
    notifyGoal(teamName, goals) {
        const message = `⚽ GOLO! ${teamName} marcou! (${goals})`;
        
        // Notificação visual
        this.showNotification(message);
        
        // Notificação push se disponível
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('VukaSport - GOLO!', {
                body: message,
                icon: 'icons/icon-192.png',
                badge: 'icons/icon-192.png',
                tag: 'goal-notification',
                requireInteraction: false
            });
        }

        // Enviar para Service Worker
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'SHOW_GOAL_NOTIFICATION',
                teamName: teamName,
                goals: goals
            });
        }
    }

    /**
     * Mostra notificação visual no app
     */
    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'goal-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <p>${message}</p>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animar entrada
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Remover após 4 segundos
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 4000);
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

        // Ordenar jogos por data
        const sortedGames = [...this.games].sort((a, b) => 
            new Date(a.date) - new Date(b.date)
        );

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

        // Calcular minutos de jogo em tempo real
        const currentMinute = this.calculateGameMinute(game);

        let minuteDisplay = '';
        if (game.status === 'live') {
            minuteDisplay = `<div class="minute-indicator">${currentMinute}'</div>`;
        } else if (game.status === 'halftime') {
            minuteDisplay = `<div class="minute-indicator">45' (Intervalo)</div>`;
        } else if (game.status === 'extra') {
            minuteDisplay = `<div class="minute-indicator">${currentMinute}' (Prolongamento)</div>`;
        } else if (game.status === 'finished') {
            minuteDisplay = `<div class="minute-indicator">90' (Terminado)</div>`;
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
        gameManager.loadGames();
        gameManager.renderGames();
    }
});

// Pedir permissão para notificações
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}
