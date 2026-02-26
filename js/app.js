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
     */
    renderGamesBySmartPeriod() {
        const container = document.getElementById('gamesList');
        if (!container) return;

        // Agrupar jogos por período inteligente
        const grouped = DateUtils.groupGamesBySmartPeriod(this.games);
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
        if (game.status === 'postponed') {
            const reason = game.postponedReason ? ` - ${game.postponedReason}` : '';
            return `<span class="status-postponed-text">⏸️ ADIADO${reason}</span>`;
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
        
        this.renderGames();
        return newGame;
    }

    async deleteGame(gameId) {
        this.games = this.games.filter(g => g.id != gameId);
        this.saveGamesLocal();
        
        if (typeof firebaseManager !== 'undefined' && firebaseManager.db) {
            await firebaseManager.deleteGameFromFirebase(gameId);
        }
        
        this.renderGames();
        window.dispatchEvent(new Event('gamesUpdated'));
    }
}

// Inicializar a aplicação
const gameManager = new GameManager();
window.gameManager = gameManager;

// Event listeners para alternar entre vistas
document.addEventListener('DOMContentLoaded', () => {
    const btnLiveView = document.getElementById('btnLiveView');
    const btnPeriodView = document.getElementById('btnPeriodView');
    const periodViewInfo = document.getElementById('periodViewInfo');

    if (btnLiveView) {
        btnLiveView.onclick = () => {
            window.showLiveOnly = true;
            window.selectedDate = null;
            
            btnLiveView.style.background = '#28A745';
            btnLiveView.style.color = 'white';
            btnPeriodView.style.background = '#333';
            btnPeriodView.style.color = '#888';
            
            if (periodViewInfo) periodViewInfo.style.display = 'none';
            gameManager.renderGames();
        };
    }

    if (btnPeriodView) {
        btnPeriodView.onclick = () => {
            window.showLiveOnly = false;
            window.selectedDate = new Date().toISOString().split('T')[0];
            
            btnLiveView.style.background = '#333';
            btnLiveView.style.color = '#888';
            btnPeriodView.style.background = '#28A745';
            btnPeriodView.style.color = 'white';
            
            if (periodViewInfo) periodViewInfo.style.display = 'block';
            gameManager.renderGamesBySmartPeriod();
        };
    }
});

// Funções globais para suporte
function openSupportModal() {
    document.getElementById('supportModal').style.display = 'flex';
}

function closeSupportModal() {
    document.getElementById('supportModal').style.display = 'none';
}

function copyNumber() {
    const number = '852092063';
    navigator.clipboard.writeText(number).then(() => {
        alert('Número copiado para a área de transferência!');
    }).catch(err => {
        console.error('Erro ao copiar:', err);
    });
}
