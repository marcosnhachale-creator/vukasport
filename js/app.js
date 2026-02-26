/**
 * VukaSport - Aplicação Principal (Atualizada v7)
 * Renderização compacta otimizada para dispositivos móveis
 * Com suporte para jogos ao vivo, agendamento, adiamento e organização inteligente por data
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
     * Obtém todos os jogos agendados (não terminados)
     * Inclui jogos ao vivo, agendados, adiados, etc.
     */
    getScheduledGames() {
        return this.games.filter(game => game.status !== 'finished');
    }

    /**
     * Obtém todos os jogos visíveis para o utilizador
     * Inclui jogos ao vivo, agendados e adiados
     */
    getVisibleGames() {
        return this.getScheduledGames();
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
                const gameTime = game.date ? new Date(game.date).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : '--:--';
                
                html += `
                    <div class="match-card" onclick="window.location.href='game-details.html?id=${game.id}'">
                        <div class="match-time-badge">${gameTime}</div>
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
     * Com estrutura clara e bem organizada
     * Mostra TODOS os jogos agendados (não terminados) agrupados por período
     */
    renderGamesBySmartPeriod() {
        const container = document.getElementById('gamesList');
        if (!container) return;

        // Agrupar TODOS os jogos visíveis por período inteligente
        const visibleGames = this.getVisibleGames();
        const grouped = DateUtils.groupGamesBySmartPeriod(visibleGames);
        const periodOrder = DateUtils.getPeriodOrder();

        let html = '';
        let sponsorCounter = 0;
        
        periodOrder.forEach(periodKey => {
            const period = grouped[periodKey];
            if (!period.games || period.games.length === 0) return;

            // Header do período com ícone e contagem
            const periodIcon = this.getPeriodIcon(periodKey);
            html += `
                <div class="period-group">
                    <div class="period-header">
                        <div class="period-info">
                            <span class="period-icon">${periodIcon}</span>
                            <div class="period-details">
                                <span class="period-label">${period.label}</span>
                                <span class="period-count">${period.games.length} jogo${period.games.length !== 1 ? 's' : ''}</span>
                            </div>
                        </div>
                    </div>
                    <div class="period-content">
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
                        </div>
                `;

                competitionGrouped[compName].forEach((game, index) => {
                    const statusHtml = this.getStatusHtml(game);
                    const gameTime = game.date ? new Date(game.date).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : '--:--';
                    
                    html += `
                        <div class="match-card" onclick="window.location.href='game-details.html?id=${game.id}'">
                            <div class="match-time-badge">${gameTime}</div>
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

                    sponsorCounter++;
                    if (sponsorCounter % 3 === 0) {
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

            html += `
                    </div>
                </div>
            `;
        });

        if (html === '') {
            document.getElementById('emptyState').style.display = 'block';
            container.innerHTML = '';
        } else {
            document.getElementById('emptyState').style.display = 'none';
            container.innerHTML = html;
        }
    }

    /**
     * Retorna o ícone apropriado para cada período
     */
    getPeriodIcon(periodKey) {
        const iconMap = {
            'HOJE': '📍',
            'AMANHA': '⏭️',
            'ESTA_SEMANA': '📅',
            'PROXIMA_SEMANA': '🗓️',
            'FUTURO': '🔮',
            'PASSADO': '✅'
        };
        return iconMap[periodKey] || '📅';
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
        if (game.status === 'postponed') return '⏸️ ADIADO';
        if (game.status === 'scheduled') {
            const gameDate = game.date ? new Date(game.date) : null;
            if (!gameDate) return 'AGENDADO';
            const now = new Date();
            const diffMs = gameDate - now;
            if (diffMs < 0) return 'AGENDADO';
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            if (diffHours > 24) return `AGENDADO (${Math.floor(diffHours / 24)}d)`;
            if (diffHours > 0) return `AGENDADO (${diffHours}h)`;
            return `AGENDADO (${diffMins}m)`;
        }
        return 'AGENDADO';
    }

    getPhaseText(phase) {
        const phaseMap = {
            'first': '1ª Parte',
            'halftime': 'Intervalo',
            'second': '2ª Parte',
            'extra': 'Prolongamento'
        };
        return phaseMap[phase] || phase;
    }

    getElapsedMinutes(game) {
        if (!game.startTime) return game.minute || 0;
        const elapsed = Math.floor((Date.now() - new Date(game.startTime).getTime()) / 60000);
        return Math.max(game.minute || 0, elapsed);
    }

    /**
     * Adiciona um novo jogo
     */
    async addGame(gameData) {
        const id = Date.now().toString();
        const game = {
            id,
            homeTeam: gameData.homeTeam,
            awayTeam: gameData.awayTeam,
            competition: gameData.competition,
            date: gameData.date,
            phase: gameData.phase || 'first',
            status: 'scheduled',
            homeGoals: 0,
            awayGoals: 0,
            events: [],
            minute: 0,
            startTime: null
        };

        this.games.push(game);
        this.saveGamesLocal();

        // Sincronizar com Firebase
        if (firebaseManager) {
            await firebaseManager.addGameToFirebase(game);
        }

        return game;
    }

    /**
     * Atualiza um jogo
     */
    async updateGame(gameId, updates) {
        const game = this.getGameById(gameId);
        if (!game) return;

        Object.assign(game, updates);
        this.saveGamesLocal();

        // Sincronizar com Firebase
        if (firebaseManager) {
            await firebaseManager.updateGameInFirebase(gameId, updates);
        }

        // Renderizar UI
        this.renderGames();
    }

    /**
     * Deleta um jogo
     */
    async deleteGame(gameId) {
        this.games = this.games.filter(g => g.id !== gameId);
        this.saveGamesLocal();

        // Sincronizar com Firebase
        if (firebaseManager) {
            await firebaseManager.deleteGameFromFirebase(gameId);
        }

        this.renderGames();
    }

    /**
     * Inicia um jogo (muda status para 'live')
     */
    async startGame(gameId) {
        const game = this.getGameById(gameId);
        if (!game) return;

        game.status = 'live';
        game.phase = 'first';
        game.startTime = new Date().toISOString();
        game.minute = 0;

        await this.updateGame(gameId, {
            status: 'live',
            phase: 'first',
            startTime: game.startTime,
            minute: 0
        });
    }

    /**
     * Termina um jogo (muda status para 'finished')
     */
    async finishGame(gameId) {
        const game = this.getGameById(gameId);
        if (!game) return;

        game.status = 'finished';

        await this.updateGame(gameId, { status: 'finished' });
    }

    /**
     * Adia um jogo (muda status para 'postponed')
     */
    async postponeGame(gameId, newDate) {
        const game = this.getGameById(gameId);
        if (!game) return;

        game.status = 'postponed';
        game.date = newDate;

        await this.updateGame(gameId, {
            status: 'postponed',
            date: newDate
        });
    }
}

// Inicializar o gestor
const gameManager = new GameManager();
window.gameManager = gameManager;
