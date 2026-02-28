/**
 * VukaSport - Aplicação Principal (Atualizada v10)
 * Renderização compacta otimizada para dispositivos móveis
 * Com suporte para automação de cronómetro e fases do jogo
 * Lógica de temporização: 1ª parte (45min) + intervalo (5-20min) + 2ª parte (45min) + prolongamento (0-20min)
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
        
        // Loop principal de automação e renderização (a cada segundo)
        setInterval(() => {
            this.processAutomations();
            this.renderGames();
        }, 1000);
    }

    async loadGames() {
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

    getGames() { return this.games; }
    getGameById(gameId) { return this.games.find(g => g.id == gameId); }

    getLiveGames() {
        return this.games.filter(game => game.status === 'live' || game.status === 'halftime' || game.status === 'extra');
    }

    getScheduledGames() {
        return this.games.filter(game => game.status !== 'finished');
    }

    getVisibleGames() {
        return this.games;
    }

    /**
     * Processa automações de tempo e fases para todos os jogos
     * Lógica de fases:
     * - 0-45 min: 1ª Parte
     * - 45 a (45 + intervalTime): Intervalo
     * - (45 + intervalTime) a (90 + intervalTime): 2ª Parte (minutos exibidos: 46-90)
     * - (90 + intervalTime) a (90 + intervalTime + extraTime): Prolongamento
     * - Após: Terminado
     */
    processAutomations() {
        const now = Date.now();
        let needsSave = false;

        this.games.forEach(game => {
            // 1. Início Automático de Jogos Agendados
            if (game.status === 'scheduled' && game.date) {
                const scheduledTime = new Date(game.date).getTime();
                if (now >= scheduledTime) {
                    console.log(`Jogo ${game.id} iniciado automaticamente.`);
                    game.status = 'live';
                    game.phase = 'first';
                    game.startTime = now;
                    game.minute = 0;
                    needsSave = true;
                    
                    if (firebaseManager) {
                        firebaseManager.updateGameInFirebase(game.id, {
                            status: 'live',
                            phase: 'first',
                            startTime: game.startTime,
                            minute: 0
                        });
                    }
                }
            }

            // 2. Gestão de Fases para Jogos em Direto
            if (game.status === 'live' || game.status === 'halftime' || game.status === 'extra') {
                if (!game.startTime) return;

                // Valores padrão para intervalo e prolongamento
                const intervalTime = game.intervalTime || 5;
                const extraTime = game.extraTime || 0;

                const elapsedMs = now - game.startTime;
                const elapsedMinutes = Math.floor(elapsedMs / 60000);
                
                // Calcular os limites de tempo
                const firstPartEnd = 45;
                const halftimeEnd = firstPartEnd + intervalTime;
                const secondPartEnd = halftimeEnd + 45;
                const extraPartEnd = secondPartEnd + extraTime;

                let gameMinute = elapsedMinutes;
                let newPhase = game.phase;
                let newStatus = game.status;

                // Lógica de Fases:
                if (elapsedMinutes < firstPartEnd) {
                    // 1ª Parte (0-45 minutos)
                    newPhase = 'first';
                    newStatus = 'live';
                    gameMinute = elapsedMinutes;
                } else if (elapsedMinutes >= firstPartEnd && elapsedMinutes < halftimeEnd) {
                    // Intervalo (45 a 45+intervalTime)
                    newPhase = 'halftime';
                    newStatus = 'halftime';
                    gameMinute = elapsedMinutes; // Mostrar tempo de intervalo
                } else if (elapsedMinutes >= halftimeEnd && elapsedMinutes < secondPartEnd) {
                    // 2ª Parte (45+intervalTime a 90+intervalTime)
                    newPhase = 'second';
                    newStatus = 'live';
                    // Ajustar minuto exibido para mostrar 46-90 (subtraindo intervalo)
                    gameMinute = elapsedMinutes - intervalTime;
                } else if (extraTime > 0 && elapsedMinutes >= secondPartEnd && elapsedMinutes < extraPartEnd) {
                    // Prolongamento (se configurado)
                    newPhase = 'extra';
                    newStatus = 'extra';
                    // Ajustar minuto exibido para mostrar 90+ (subtraindo intervalo)
                    gameMinute = elapsedMinutes - intervalTime;
                } else if (elapsedMinutes >= extraPartEnd || (extraTime === 0 && elapsedMinutes >= secondPartEnd)) {
                    // Jogo Terminado
                    newPhase = 'finished';
                    newStatus = 'finished';
                    gameMinute = 90 + extraTime;
                }

                // Atualizar se houve mudança de fase ou status
                if (newPhase !== game.phase || newStatus !== game.status) {
                    game.phase = newPhase;
                    game.status = newStatus;
                    needsSave = true;
                    
                    if (firebaseManager) {
                        firebaseManager.updateGameInFirebase(game.id, { 
                            status: newStatus, 
                            phase: newPhase 
                        });
                    }
                    
                    console.log(`Jogo ${game.id} - Nova fase: ${newPhase}, Status: ${newStatus}`);
                }

                // Atualizar minuto
                if (game.minute !== gameMinute) {
                    game.minute = gameMinute;
                    needsSave = true;
                    // Sincronizar minuto a cada minuto (para não sobrecarregar o Firebase)
                    if (elapsedMs % 60000 < 1000 && firebaseManager) {
                        firebaseManager.updateGameInFirebase(game.id, { minute: gameMinute });
                    }
                }
            }
        });

        if (needsSave) {
            this.saveGamesLocal();
        }
    }

    renderGames() {
        const container = document.getElementById('gamesList');
        if (!container) return;

        let filteredGames = window.showLiveOnly ? this.getLiveGames() : this.getVisibleGames();
        if (filteredGames.length === 0) {
            document.getElementById('emptyState').style.display = 'block';
            container.innerHTML = '';
            return;
        }

        document.getElementById('emptyState').style.display = 'none';

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

    getStatusHtml(game) {
        if (game.status === 'live') {
            const phaseText = this.getPhaseText(game.phase);
            return `<span class="status-live-text"><span class="status-live-dot"></span>AO VIVO ${game.minute}' (${phaseText})</span>`;
        }
        if (game.status === 'halftime') {
            const intervalTime = game.intervalTime || 5;
            return `<span class="status-halftime-text">INTERVALO (${intervalTime} min)</span>`;
        }
        if (game.status === 'extra') {
            return `<span class="status-extra-text"><span class="status-live-dot"></span>PROLONGAMENTO ${game.minute}'</span>`;
        }
        if (game.status === 'finished') return 'FIM';
        if (game.status === 'postponed') return '⏸️ ADIADO';
        
        if (game.status === 'scheduled') {
            const gameDate = game.date ? new Date(game.date) : null;
            if (!gameDate) return 'AGENDADO';
            const now = new Date();
            const diffMs = gameDate - now;
            if (diffMs < 0) return 'A INICIAR...';
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
            'extra': 'Prolongamento',
            'finished': 'Terminado'
        };
        return phaseMap[phase] || phase;
    }

    async addGame(gameData) {
        const id = Date.now().toString();
        const game = {
            id,
            homeTeam: gameData.homeTeam,
            awayTeam: gameData.awayTeam,
            competition: gameData.competition,
            date: gameData.date,
            phase: 'first',
            status: 'scheduled',
            homeGoals: 0,
            awayGoals: 0,
            minute: 0,
            startTime: null,
            intervalTime: gameData.intervalTime || 5,
            extraTime: gameData.extraTime || 0
        };

        this.games.push(game);
        this.saveGamesLocal();
        if (firebaseManager) await firebaseManager.addGameToFirebase(game);
        return game;
    }

    async updateGame(gameId, updates) {
        const game = this.getGameById(gameId);
        if (!game) return;
        Object.assign(game, updates);
        this.saveGamesLocal();
        if (firebaseManager) await firebaseManager.updateGameInFirebase(gameId, updates);
        this.renderGames();
    }

    async deleteGame(gameId) {
        this.games = this.games.filter(g => g.id !== gameId);
        this.saveGamesLocal();
        if (firebaseManager) await firebaseManager.deleteGameFromFirebase(gameId);
        this.renderGames();
    }

    renderGamesBySmartPeriod() {
        // Alias para renderGames quando em modo "Todos os jogos"
        this.renderGames();
    }
}

const gameManager = new GameManager();
window.gameManager = gameManager;
