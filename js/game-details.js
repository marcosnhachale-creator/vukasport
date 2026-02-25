/**
 * VukaSport - Detalhes do Jogo
 * Gerencia a visualização de detalhes do jogo com abas (Resumo e Estatísticas)
 */

class GameDetailsManager {
    constructor() {
        this.gameId = this.getGameIdFromURL();
        this.game = null;
        this.initializeApp();
    }

    /**
     * Obtém o ID do jogo da URL
     */
    getGameIdFromURL() {
        const params = new URLSearchParams(window.location.search);
        return parseInt(params.get('id'));
    }

    /**
     * Inicializa a aplicação
     */
    async initializeApp() {
        if (!this.gameId) {
            window.location.href = 'index.html';
            return;
        }

        // Carregar jogo
        this.loadGame();

        // Configurar tabs
        this.setupTabs();

        // Atualizar a cada segundo
        setInterval(() => this.updateGameDisplay(), 1000);

        // Modo escuro
        this.setupDarkMode();
    }

    /**
     * Carrega o jogo
     */
    loadGame() {
        if (typeof gameManager !== 'undefined') {
            this.game = gameManager.getGameById(this.gameId);
            
            if (this.game) {
                this.updateGameDisplay();
                this.renderTimeline();
                this.renderStatistics();
            } else {
                console.error('Jogo não encontrado:', this.gameId);
                window.location.href = 'index.html';
            }
        }
    }

    /**
     * Atualiza a visualização do jogo
     */
    updateGameDisplay() {
        if (!this.game) return;

        // Atualizar nomes das equipas
        document.getElementById('homeTeamName').textContent = this.game.homeTeam;
        document.getElementById('awayTeamName').textContent = this.game.awayTeam;

        // Atualizar placar com animação
        this.updateScore();

        // Atualizar estado
        document.getElementById('gameStatus').textContent = this.getStatusText(this.game.status);
        document.getElementById('gameStatus').className = `status-badge status-${this.game.status}`;

        // Atualizar minuto
        const minute = gameManager.calculateGameMinute(this.game);
        document.getElementById('gameMinute').textContent = `${minute}'`;

        // Atualizar data
        const date = new Date(this.game.date);
        document.getElementById('gameDate').textContent = date.toLocaleDateString('pt-PT', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        // Atualizar competição
        document.getElementById('gameCompetition').textContent = this.game.competition;
    }

    /**
     * Atualiza o placar com animação
     */
    updateScore() {
        const homeScoreEl = document.getElementById('homeScore');
        const awayScoreEl = document.getElementById('awayScore');

        if (homeScoreEl.textContent !== String(this.game.homeGoals)) {
            homeScoreEl.textContent = this.game.homeGoals;
            homeScoreEl.style.animation = 'none';
            setTimeout(() => {
                homeScoreEl.style.animation = 'scoreUpdate 0.6s ease';
            }, 10);
        }

        if (awayScoreEl.textContent !== String(this.game.awayGoals)) {
            awayScoreEl.textContent = this.game.awayGoals;
            awayScoreEl.style.animation = 'none';
            setTimeout(() => {
                awayScoreEl.style.animation = 'scoreUpdate 0.6s ease';
            }, 10);
        }
    }

    /**
     * Obtém o texto do estado
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
     * Renderiza a linha do tempo
     */
    renderTimeline() {
        const timelineContainer = document.getElementById('timelineContainer');
        
        if (typeof eventManager === 'undefined') {
            timelineContainer.innerHTML = '<div class="timeline-empty"><p>Nenhum evento registado ainda</p></div>';
            return;
        }

        eventManager.loadEventsLocal(this.gameId);
        const events = eventManager.getAllEventsOrdered(this.gameId);

        if (events.length === 0) {
            timelineContainer.innerHTML = '<div class="timeline-empty"><p>Nenhum evento registado ainda</p></div>';
            return;
        }

        timelineContainer.innerHTML = '';

        events.forEach(event => {
            const eventEl = document.createElement('div');
            eventEl.className = `timeline-event ${this.getEventType(event.type)}`;

            const eventIcon = this.getEventIcon(event.type);
            const eventLabel = this.getEventLabel(event.type);

            eventEl.innerHTML = `
                <div class="timeline-content">
                    <div class="event-minute">${eventIcon} ${event.minute}'</div>
                    <div class="event-description">${eventLabel}</div>
                    <div class="event-player">${event.playerName}</div>
                </div>
            `;

            timelineContainer.appendChild(eventEl);
        });
    }

    /**
     * Obtém o tipo de evento para CSS
     */
    getEventType(type) {
        const typeMap = {
            'goal': 'goal',
            'yellow_card': 'yellow-card',
            'red_card': 'red-card',
            'substitution': 'substitution'
        };
        return typeMap[type] || 'event';
    }

    /**
     * Obtém o ícone do evento
     */
    getEventIcon(type) {
        const iconMap = {
            'goal': '⚽',
            'yellow_card': '🟨',
            'red_card': '🟥',
            'substitution': '🔄'
        };
        return iconMap[type] || '•';
    }

    /**
     * Obtém o rótulo do evento
     */
    getEventLabel(type) {
        const labelMap = {
            'goal': 'Golo',
            'yellow_card': 'Cartão Amarelo',
            'red_card': 'Cartão Vermelho',
            'substitution': 'Substituição'
        };
        return labelMap[type] || 'Evento';
    }

    /**
     * Renderiza as estatísticas
     */
    renderStatistics() {
        if (typeof eventManager === 'undefined') return;

        eventManager.loadEventsLocal(this.gameId);
        const events = eventManager.getGameEvents(this.gameId);

        // Calcular estatísticas
        const homeYellowCards = events.yellowCards.filter(c => c.team === 'home').length;
        const awayYellowCards = events.yellowCards.filter(c => c.team === 'away').length;
        const homeRedCards = events.redCards.filter(c => c.team === 'home').length;
        const awayRedCards = events.redCards.filter(c => c.team === 'away').length;

        // Atualizar UI
        document.getElementById('yellowCardsHome').textContent = homeYellowCards;
        document.getElementById('yellowCardsAway').textContent = awayYellowCards;
        document.getElementById('redCardsHome').textContent = homeRedCards;
        document.getElementById('redCardsAway').textContent = awayRedCards;

        // Calcular posse de bola (simulada)
        const totalEvents = events.goals.length + events.yellowCards.length + events.redCards.length;
        const homePossession = totalEvents > 0 ? Math.floor((events.goals.filter(g => g.team === 'home').length / totalEvents) * 100) : 50;
        const awayPossession = 100 - homePossession;

        document.getElementById('possessionHome').style.width = homePossession + '%';
        document.getElementById('possessionAway').style.width = awayPossession + '%';
        document.getElementById('possessionHomeValue').textContent = homePossession + '%';
        document.getElementById('possessionAwayValue').textContent = awayPossession + '%';

        // Remates à baliza (simulado como 2x golos)
        const shotsHome = events.goals.filter(g => g.team === 'home').length * 2;
        const shotsAway = events.goals.filter(g => g.team === 'away').length * 2;
        document.getElementById('shotsHome').textContent = shotsHome;
        document.getElementById('shotsAway').textContent = shotsAway;

        // Faltas (simulado)
        const foulsHome = homeYellowCards + homeRedCards;
        const foulsAway = awayYellowCards + awayRedCards;
        document.getElementById('foulsHome').textContent = foulsHome;
        document.getElementById('foulsAway').textContent = foulsAway;

        // Passes (simulado)
        const passesHome = Math.floor(Math.random() * 300) + 200;
        const passesAway = Math.floor(Math.random() * 300) + 200;
        document.getElementById('passesHome').textContent = passesHome;
        document.getElementById('passesAway').textContent = passesAway;
    }

    /**
     * Configura as abas
     */
    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.getAttribute('data-tab');

                // Remover classe active de todos
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));

                // Adicionar classe active ao selecionado
                button.classList.add('active');
                document.getElementById(`${tabName}-tab`).classList.add('active');

                // Atualizar estatísticas se for a aba de estatísticas
                if (tabName === 'statistics') {
                    this.renderStatistics();
                }
            });
        });
    }

    /**
     * Configura o modo escuro
     */
    setupDarkMode() {
        const darkModeToggle = document.getElementById('darkModeToggle');
        const htmlElement = document.documentElement;

        // Verificar preferência salva
        const savedDarkMode = localStorage.getItem('vukasport_dark_mode') === 'true';
        if (savedDarkMode) {
            htmlElement.setAttribute('data-theme', 'dark');
            darkModeToggle.textContent = '☀️';
        }

        // Toggle modo escuro
        darkModeToggle.addEventListener('click', () => {
            const isDark = htmlElement.getAttribute('data-theme') === 'dark';
            
            if (isDark) {
                htmlElement.removeAttribute('data-theme');
                localStorage.setItem('vukasport_dark_mode', 'false');
                darkModeToggle.textContent = '🌙';
            } else {
                htmlElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('vukasport_dark_mode', 'true');
                darkModeToggle.textContent = '☀️';
            }
        });
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    new GameDetailsManager();
});
