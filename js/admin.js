/**
 * VukaSport - Painel de Administração (Atualizado v7)
 * Focado em botões rápidos com automação de cronómetro inteligente
 */

class AdminPanel {
    constructor() {
        this.currentGameId = null;
        this.initialize();
    }

    initialize() {
        this.checkAuth();
        this.setupListeners();
        this.loadGamesToSelect();
        
        window.adminPanel = this;

        // Atualizar UI do admin a cada segundo para refletir automações do GameManager
        setInterval(() => {
            if (this.currentGameId) {
                this.updateCurrentGameDisplay();
            }
        }, 1000);
    }

    checkAuth() {
        if (authManager.isAuthenticated()) {
            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('adminSection').style.display = 'block';
        } else {
            document.getElementById('loginSection').style.display = 'block';
            document.getElementById('adminSection').style.display = 'none';
        }
    }

    setupListeners() {
        // Login
        document.getElementById('loginForm').onsubmit = (e) => {
            e.preventDefault();
            const u = document.getElementById('username').value;
            const p = document.getElementById('password').value;
            if (authManager.login(u, p)) this.checkAuth();
            else document.getElementById('loginError').style.display = 'block';
        };

        // Logout
        document.getElementById('logoutBtn').onclick = () => {
            authManager.logout();
            this.checkAuth();
        };

        // Seleção de Jogo
        document.getElementById('gameSelect').onchange = (e) => {
            this.loadGameToEdit(e.target.value);
        };

        // Eliminar Jogo
        document.getElementById('btnDeleteGame').onclick = () => {
            this.deleteCurrentGame();
        };

        // Abrir Modal de Evento
        document.getElementById('btnRegisterEvent').onclick = () => {
            // Resetar o tipo de evento para 'goal' por padrão
            document.getElementById('eventType').value = 'goal';
            this.updateEventFieldsVisibility();
            document.getElementById('eventModal').style.display = 'flex';
        };

        // Listener para mudança de tipo de evento
        document.getElementById('eventType').onchange = () => {
            this.updateEventFieldsVisibility();
        };

        // Adicionar Novo Jogo
        document.getElementById('btnNewGame').onclick = () => {
            document.getElementById('newGameModal').style.display = 'flex';
        };

        // Confirmar novo jogo
        document.getElementById('btnConfirmNewGame').onclick = async () => {
            const home = document.getElementById('inputHomeTeam').value.trim();
            const away = document.getElementById('inputAwayTeam').value.trim();
            const comp = document.getElementById('inputCompetition').value.trim();
            const gameDate = document.getElementById('inputGameDate').value;
            const gameTime = document.getElementById('inputGameTime').value;
            const intervalTime = parseInt(document.getElementById('inputIntervalTime').value);
            const extraTime = parseInt(document.getElementById('inputExtraTime').value);

            if (!home || !away || !comp || !gameDate || !gameTime) {
                alert('Preencha todos os campos!');
                return;
            }

            const dateTimeStr = gameDate + 'T' + gameTime + ':00';
            const game = await gameManager.addGame({
                homeTeam: home,
                awayTeam: away,
                competition: comp,
                date: new Date(dateTimeStr).toISOString(),
                intervalTime: intervalTime,
                extraTime: extraTime
            });

            document.getElementById('newGameModal').style.display = 'none';
            this.loadGamesToSelect();
            this.loadGameToEdit(game.id);
        };

        // Cancelar novo jogo
        document.getElementById('btnCancelNewGame').onclick = () => {
            document.getElementById('newGameModal').style.display = 'none';
        };

        // Botão para Ativar Prolongamento Manual
        const btnExtra = document.getElementById('btnFinishWithExtra');
        if (btnExtra) {
            btnExtra.onclick = () => {
                if (this.currentGameId) {
                    gameManager.updateGame(this.currentGameId, { phase: 'extra', status: 'live' });
                    alert('Prolongamento ativado! O jogo continuará até que o administrador o termine manualmente.');
                    document.getElementById('finishGameModal').style.display = 'none';
                }
            };
        }
    }

    updateEventFieldsVisibility() {
        const eventType = document.getElementById('eventType').value;
        const eventPlayerOutDiv = document.getElementById('eventPlayerOutDiv');
        const eventPlayerInDiv = document.getElementById('eventPlayerInDiv');
        const eventPlayerSingleDiv = document.getElementById('eventPlayerSingleDiv');
        
        if (eventType === 'substitution') {
            eventPlayerOutDiv.style.display = 'block';
            eventPlayerInDiv.style.display = 'block';
            eventPlayerSingleDiv.style.display = 'none';
        } else if (eventType === 'corner') {
            eventPlayerOutDiv.style.display = 'none';
            eventPlayerInDiv.style.display = 'none';
            eventPlayerSingleDiv.style.display = 'none';
        } else {
            eventPlayerOutDiv.style.display = 'none';
            eventPlayerInDiv.style.display = 'none';
            eventPlayerSingleDiv.style.display = 'block';
        }
    }

    loadGamesToSelect() {
        const select = document.getElementById('gameSelect');
        if (!select) return;

        const currentVal = select.value;
        select.innerHTML = '<option value="">SELECIONAR JOGO PARA EDITAR</option>';
        
        gameManager.getGames().forEach(g => {
            const opt = document.createElement('option');
            opt.value = g.id;
            opt.textContent = `${g.homeTeam} vs ${g.awayTeam} (${g.competition})`;
            select.appendChild(opt);
        });

        select.value = currentVal;
    }

    loadGameToEdit(gameId) {
        this.currentGameId = gameId;
        const container = document.getElementById('editorContainer');
        
        if (!gameId) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';
        const game = gameManager.getGameById(gameId);
        if (!game) return;

        document.getElementById('homeName').textContent = game.homeTeam;
        document.getElementById('awayName').textContent = game.awayTeam;
        document.getElementById('homeScore').textContent = game.homeGoals;
        document.getElementById('awayScore').textContent = game.awayGoals;
        
        // Esconder controles de tempo manuais pois agora são automáticos
        const timeControl = document.querySelector('.time-control');
        if (timeControl) timeControl.style.display = 'none';

        this.renderEvents();
    }

    updateCurrentGameDisplay() {
        const game = gameManager.getGameById(this.currentGameId);
        if (!game) return;

        const minuteInput = document.getElementById('gameMinute');
        if (minuteInput) minuteInput.value = game.minute;

        // Mostrar botão de prolongamento se o jogo estiver perto do fim ou terminado
        const btnFinish = document.getElementById('btnFinishGame');
        if (btnFinish) {
            btnFinish.style.display = (game.status === 'live' || game.status === 'halftime') ? 'block' : 'none';
        }
    }

    async adjustScore(team, delta) {
        if (!this.currentGameId) return;
        const game = gameManager.getGameById(this.currentGameId);
        if (!game) return;

        let home = game.homeGoals;
        let away = game.awayGoals;

        if (team === 'home') home = Math.max(0, home + delta);
        else away = Math.max(0, away + delta);

        document.getElementById('homeScore').textContent = home;
        document.getElementById('awayScore').textContent = away;

        await gameManager.updateGame(this.currentGameId, { homeGoals: home, awayGoals: away });
    }

    async saveEvent() {
        if (!this.currentGameId) return;
        
        const type = document.getElementById('eventType').value;
        const team = document.getElementById('eventTeam').value;
        const minute = document.getElementById('gameMinute').value;

        if (type === 'goal') {
            const player = document.getElementById('eventPlayer').value;
            await eventManager.addGoal(this.currentGameId, team, minute, player);
            await this.adjustScore(team, 1);
        } else if (type === 'yellow') {
            const player = document.getElementById('eventPlayer').value;
            await eventManager.addYellowCard(this.currentGameId, team, minute, player);
        } else if (type === 'red') {
            const player = document.getElementById('eventPlayer').value;
            await eventManager.addRedCard(this.currentGameId, team, minute, player);
        } else if (type === 'substitution') {
            const playerOut = document.getElementById('eventPlayerOut').value;
            const playerIn = document.getElementById('eventPlayerIn').value;
            
            if (!playerOut || !playerIn) {
                alert('Por favor, preencha os nomes dos jogadores!');
                return;
            }
            await eventManager.addSubstitution(this.currentGameId, team, minute, playerOut, playerIn);
        } else if (type === 'foul') {
            const player = document.getElementById('eventPlayer').value;
            await eventManager.addFoul(this.currentGameId, team, minute, player);
        } else if (type === 'corner') {
            await eventManager.addCorner(this.currentGameId, team, minute);
        }

        document.getElementById('eventModal').style.display = 'none';
        document.getElementById('eventPlayer').value = '';
        document.getElementById('eventPlayerOut').value = '';
        document.getElementById('eventPlayerIn').value = '';
        this.renderEvents();
    }

    renderEvents() {
        const list = document.getElementById('eventList');
        if (!list || !this.currentGameId) return;

        const events = eventManager.getAllEventsOrdered(this.currentGameId);
        list.innerHTML = '';

        if (events.length === 0) {
            list.innerHTML = '<p style="color:#444; font-size:12px;">Nenhum evento registado.</p>';
            return;
        }

        events.forEach(e => {
            const div = document.createElement('div');
            div.className = 'event-item';
            
            let icon = '⚽';
            let description = '';
            
            if (e.type === 'yellow_card') {
                icon = '🟨';
                description = e.playerName + ' (' + (e.team === 'home' ? 'Casa' : 'Visitante') + ')';
            } else if (e.type === 'red_card') {
                icon = '🟥';
                description = e.playerName + ' (' + (e.team === 'home' ? 'Casa' : 'Visitante') + ')';
            } else if (e.type === 'substitution') {
                icon = '🔄';
                description = e.playerOut + ' sai, ' + e.playerIn + ' entra (' + (e.team === 'home' ? 'Casa' : 'Visitante') + ')';
            } else if (e.type === 'foul') {
                icon = '⚠️';
                description = e.playerName + ' (' + (e.team === 'home' ? 'Casa' : 'Visitante') + ')';
            } else if (e.type === 'corner') {
                icon = '🚩';
                description = (e.team === 'home' ? 'Casa' : 'Visitante');
            } else {
                description = e.playerName + ' (' + (e.team === 'home' ? 'Casa' : 'Visitante') + ')';
            }

            div.innerHTML = `
                <div class="event-info">
                    <span class="event-time">${e.minute}'</span>
                    <span>${icon} ${description}</span>
                </div>
                <div class="event-actions">
                    <button onclick="adminPanel.deleteEvent('${e.id}', '${e.type}')" class="btn-delete-event">🗑️</button>
                </div>
            `;
            list.appendChild(div);
        });
    }

    async deleteEvent(eventId, type) {
        if (confirm('Eliminar este evento?')) {
            await eventManager.removeEvent(this.currentGameId, eventId, type);
            this.renderEvents();
        }
    }

    async deleteCurrentGame() {
        if (!this.currentGameId) return;
        if (confirm('Tem a certeza que deseja eliminar este jogo permanentemente?')) {
            await gameManager.deleteGame(this.currentGameId);
            this.currentGameId = null;
            document.getElementById('editorContainer').style.display = 'none';
            this.loadGamesToSelect();
        }
    }

    openFinishGameModal() {
        document.getElementById('finishGameModal').style.display = 'flex';
    }

    async finishCurrentGame(withExtra) {
        if (!this.currentGameId) return;
        if (withExtra) {
            await gameManager.updateGame(this.currentGameId, { phase: 'extra', status: 'live' });
            alert('Prolongamento ativado!');
        } else {
            await gameManager.updateGame(this.currentGameId, { status: 'finished', phase: 'finished' });
            alert('Jogo terminado!');
        }
        document.getElementById('finishGameModal').style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.adminPanel = new AdminPanel();
});
