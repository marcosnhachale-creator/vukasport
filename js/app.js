/**
 * VukaSport - Aplicação Principal (Atualizada v5)
 * Renderização compacta otimizada para dispositivos móveis
 * Com suporte para jogos ao vivo, organização inteligente por data e persistência offline
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
        
        // Atualizar apenas a UI a cada segundo (para o cronómetro visual)
        setInterval(() => this.renderGames(), 1000);
        
        // O Firestore já trata da sincronização em tempo real via onSnapshot em firebase.js
    }

    async loadGames() {
        // Com Firestore, os dados iniciais e atualizações vêm pelo onSnapshot
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

    // syncWithFirebase removido pois o Firestore onSnapshot trata disso automaticamente

    getGames() { return this.games; }
    getGameById(gameId) { return this.games.find(g => g.id == gameId); }

    /**
     * Obtém jogos ao vivo (incluindo em intervalo)
     * Jogos só desaparecem quando o estado é 'finished'
     */
    getLiveGames() {
        return this.games.filter(game => game.status === 'live' || game.status === 'halftime' || game.status === 'extra');
    }

    /**
     * Renderiza os jogos agrupados de forma inteligente
     */
    renderGames() {
        const container = document.getElementById('gamesList');
        if (!container) return;

        // Verificar se estamos a mostrar jogos ao vivo
        const showLiveOnly = window.showLiveOnly || false;
        let filteredGames = [];

        if (showLiveOnly) {
            // Mostrar apenas jogos ao vivo
            filteredGames = this.getLiveGames();
        } else {
            // Mostrar jogos da data selecionada
            const selectedDate = window.selectedDate || new Date().toISOString().split('T')[0];
            filteredGames = this.games.filter(game => {
                const gameDate = game.date ? game.date.split('T')[0] : '';
                return gameDate === selectedDate;
            });
        }

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

            html += `</div>`;
        });

        container.innerHTML = html;
    }

    /**
     * Renderiza os jogos agrupados por período inteligente (HOJE, AMANHÃ, etc.)
     */
    renderGamesBySmartPeriod() {
        const container = document.getElementById('gamesList');
        if (!container) return;

        // Agrupar jogos por período inteligente
        const grouped = DateUtils.groupGamesBySmartPeriod(this.games);
        const periodOrder = DateUtils.getPeriodOrder();

        let html = '';
        
        periodOrder.forEach(periodKey => {
            const period = grouped[periodKey];
            if (!period.games || period.games.length === 0) return;

            html += `
                <div class="period-group">
                    <div class="period-header">
                        <span class="period-label">${period.label}</span>
                        <span class="period-count">${period.games.length} jogo${period.games.length !== 1 ? 's' : ''}</span>
                    </div>
            `;

            // Agrupar por competição dentro do período
            const competitionGrouped = {};
            period.games.forEach(game => {
                const comp = game.competition || 'OUTRAS COMPETIÇÕES';
                if (!competitionGrouped[comp]) competitionGrouped[comp] = [];
                competitionGrouped[comp].push(game);
            });

            Object.keys(competitionGrouped).forEach(compName => {
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

                competitionGrouped[compName].forEach((game, index) => {
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

                html += `</div>`;
            });

            html += `</div>`;
        });

        if (html === '') {
            document.getElementById('emptyState').style.display = 'block';
            container.innerHTML = '';
        } else {
            document.getElementById('emptyState').style.display = 'none';
            container.innerHTML = html;
        }
    }

    getStatusHtml(game) {
        if (game.status === 'live') {
            const elapsedMinutes = this.getElapsedMinutes(game);
            const phaseText = this.getPhaseText(game.phase);
            return `<span class="status-live-text"><span class="status-live-dot"></span>AO VIVO ${elapsedMinutes}' (${phaseText})</span>`;
        }
        if (game.status === 'halftime') {
            const phaseText = this.getPhaseText(game.phase);
            return `<span class="status-halftime-text">INTERVALO (${phaseText})</span>`;
        }
        if (game.status === 'extra') return `PROLONGAMENTO ${game.minute || 90}'`;
        if (game.status === 'finished') return 'FIM';
        
        if (game.date) {
            const time = new Date(game.date).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
            return time;
        }
        return 'AGENDADO';
    }

    /**
     * Obtém o texto da fase do jogo
     */
    getPhaseText(phase) {
        const phaseMap = {
            'first': '1ª PARTE',
            'second': '2ª PARTE',
            'extra': 'PROL.',
            'finished': 'FIM'
        };
        return phaseMap[phase] || '1ª PARTE';
    }

    /**
     * Calcula minutos decorridos baseado no startTime
     */
    getElapsedMinutes(game) {
        if (!game.startTime) return game.minute || 0;
        
        const elapsedMs = Date.now() - game.startTime;
        const elapsedMinutes = Math.floor(elapsedMs / 60000);
        return elapsedMinutes;
    }

    async updateGame(gameId, updates) {
        const game = this.getGameById(gameId);
        if (!game) return false;

        if (updates.homeGoals > game.homeGoals || updates.awayGoals > game.awayGoals) {
            updates.flashing = true;
            setTimeout(() => {
                this.updateGameInState(gameId, { flashing: false });
            }, 2000);
        }

        Object.assign(game, updates);
        this.saveGamesLocal();
        
        if (typeof firebaseManager !== 'undefined' && firebaseManager.db) {
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
            minute: 0,
            phase: 'first',
            startTime: null
        };
        this.games.push(newGame);
        this.saveGamesLocal();
        
        if (typeof firebaseManager !== 'undefined' && firebaseManager.db) {
            await firebaseManager.addGameToFirebase(newGame);
        }
        return newGame;
    }

    async deleteGame(gameId) {
        const gameIndex = this.games.findIndex(g => g.id == gameId);
        if (gameIndex !== -1) {
            this.games.splice(gameIndex, 1);
            this.saveGamesLocal();
            
            if (typeof firebaseManager !== 'undefined' && firebaseManager.db) {
                await firebaseManager.deleteGameFromFirebase(gameId);
            }
            
            this.renderGames();
            
            // Disparar evento para sincronizar em outras abas
            window.dispatchEvent(new CustomEvent('gamesUpdated', { detail: this.games }));
        }
    }
}

const gameManager = new GameManager();
window.gameManager = gameManager;
