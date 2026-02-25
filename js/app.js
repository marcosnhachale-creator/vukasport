/**
 * VukaSport - Aplicação Principal (Atualizada)
 * Renderização compacta otimizada para dispositivos móveis
 */

class GameManager {
    constructor() {
        this.games = [];
        this.sponsors = [
            { name: 'Sponsor Local 1', logo: 'https://via.placeholder.com/150x50?text=SPONSOR+1', link: '#' },
            { name: 'Sponsor Local 2', logo: 'https://via.placeholder.com/150x50?text=SPONSOR+2', link: '#' }
        ];
        this.initializeApp();
    }

    async initializeApp() {
        await this.loadGames();
        this.renderGames();
        
        // Polling para simular tempo real
        setInterval(() => this.renderGames(), 1000);
        setInterval(() => this.syncWithFirebase(), 3000);
    }

    async loadGames() {
        try {
            if (typeof firebaseManager !== 'undefined' && firebaseManager.isOnline) {
                const firebaseGames = await firebaseManager.loadGamesFromFirebase();
                if (firebaseGames) {
                    this.games = Object.values(firebaseGames).filter(game => game && game.id);
                    this.saveGamesLocal();
                    return;
                }
            }
        } catch (error) { console.error('Erro Firebase:', error); }
        this.loadGamesFromLocal();
    }

    loadGamesFromLocal() {
        const gamesStr = localStorage.getItem('vukasport_games');
        if (gamesStr) {
            try { this.games = JSON.parse(gamesStr); }
            catch (e) { this.games = []; }
        }
    }

    saveGamesLocal() {
        localStorage.setItem('vukasport_games', JSON.stringify(this.games));
    }

    async syncWithFirebase() {
        if (typeof firebaseManager === 'undefined' || !firebaseManager.isOnline) return;
        try {
            const firebaseGames = await firebaseManager.loadGamesFromFirebase();
            if (firebaseGames) {
                const gamesArray = Object.values(firebaseGames).filter(game => game && game.id);
                if (JSON.stringify(gamesArray) !== JSON.stringify(this.games)) {
                    this.games = gamesArray;
                    this.saveGamesLocal();
                    this.renderGames();
                }
            }
        } catch (e) { console.error('Sync Error:', e); }
    }

    getGames() { return this.games; }
    getGameById(gameId) { return this.games.find(g => g.id == gameId); }

    /**
     * Renderiza os jogos agrupados por competição com banners de patrocínio
     */
    renderGames() {
        const container = document.getElementById('gamesList');
        if (!container) return;

        // Obter data selecionada do script global
        const selectedDate = window.selectedDate || new Date().toISOString().split('T')[0];
        
        // Filtrar jogos pela data
        const filteredGames = this.games.filter(game => {
            const gameDate = game.date ? game.date.split('T')[0] : '';
            return gameDate === selectedDate;
        });

        if (filteredGames.length === 0) {
            document.getElementById('emptyState').style.display = 'block';
            container.innerHTML = '';
            return;
        }

        document.getElementById('emptyState').style.display = 'none';

        // Agrupar por competição
        const grouped = {};
        filteredGames.forEach(game => {
            const comp = game.competition || 'OUTRAS COMPETIÇÕES';
            if (!grouped[comp]) grouped[comp] = [];
            grouped[comp].push(game);
        });

        let html = '';
        Object.keys(grouped).forEach(compName => {
            // Header da competição
            html += `
                <div class="competition-group">
                    <div class="competition-header">
                        <div class="comp-info">
                            <span class="comp-icon">🏆</span>
                            <span class="comp-name">${compName}</span>
                        </div>
                        <div class="comp-options">•••</div>
                    </div>
            `;

            // Jogos da competição
            grouped[compName].forEach((game, index) => {
                const statusHtml = this.getStatusHtml(game);
                
                html += `
                    <div class="match-card" onclick="window.location.href='game-details.html?id=${game.id}'">
                        <div class="team-side home">
                            <span class="team-name">${game.homeTeam}</span>
                            <div class="team-shield">${game.homeTeam.charAt(0)}</div>
                        </div>
                        <div class="match-center">
                            <div class="match-score ${game.flashing ? 'flashing' : ''}">
                                ${game.homeGoals} - ${game.awayGoals}
                            </div>
                            <div class="match-status">${statusHtml}</div>
                        </div>
                        <div class="team-side away">
                            <div class="team-shield">${game.awayTeam.charAt(0)}</div>
                            <span class="team-name">${game.awayTeam}</span>
                        </div>
                    </div>
                `;

                // Banner de patrocínio a cada 3 jogos
                if ((index + 1) % 3 === 0) {
                    const sponsor = this.sponsors[Math.floor(Math.random() * this.sponsors.length)];
                    html += `
                        <div class="sponsor-banner">
                            <span class="sponsor-label">Patrocinador Local</span>
                            <img src="${sponsor.logo}" alt="${sponsor.name}" class="sponsor-img">
                        </div>
                    `;
                }
            });

            html += `</div>`; // Fechar grupo
        });

        container.innerHTML = html;
    }

    getStatusHtml(game) {
        if (game.status === 'live') {
            return `<span class="status-live-text"><span class="status-live-dot"></span>AO VIVO ${game.minute || 0}'</span>`;
        }
        if (game.status === 'halftime') return 'INTERVALO';
        if (game.status === 'extra') return `PROLONGAMENTO ${game.minute || 90}'`;
        if (game.status === 'finished') return 'FIM';
        
        // Scheduled: mostrar apenas o horário
        if (game.date) {
            const time = new Date(game.date).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
            return time;
        }
        return 'AGENDADO';
    }

    // Métodos de administração adaptados para o novo painel
    async updateGame(gameId, updates) {
        const game = this.getGameById(gameId);
        if (!game) return false;

        // Notificação visual de golo
        if (updates.homeGoals > game.homeGoals || updates.awayGoals > game.awayGoals) {
            updates.flashing = true;
            setTimeout(() => {
                this.updateGameInState(gameId, { flashing: false });
            }, 2000);
        }

        Object.assign(game, updates);
        this.saveGamesLocal();
        
        if (typeof firebaseManager !== 'undefined' && firebaseManager.isOnline) {
            await firebaseManager.updateGameInFirebase(gameId, updates);
        }
        this.renderGames();
        return true;
    }

    updateGameInState(gameId, updates) {
        const game = this.getGameById(gameId);
        if (game) {
            Object.assign(game, updates);
            this.renderGames();
        }
    }

    async addGame(data) {
        const newGame = {
            id: Date.now(),
            ...data,
            homeGoals: 0,
            awayGoals: 0,
            status: 'scheduled',
            minute: 0
        };
        this.games.push(newGame);
        this.saveGamesLocal();
        if (typeof firebaseManager !== 'undefined' && firebaseManager.isOnline) {
            await firebaseManager.addGameToFirebase(newGame);
        }
        return newGame;
    }

    async deleteGame(gameId) {
        this.games = this.games.filter(g => g.id != gameId);
        this.saveGamesLocal();
        if (typeof firebaseManager !== 'undefined' && firebaseManager.isOnline) {
            await firebaseManager.deleteGameFromFirebase(gameId);
        }
        this.renderGames();
    }
}

const gameManager = new GameManager();
window.gameManager = gameManager;
