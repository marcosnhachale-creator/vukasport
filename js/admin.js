/**
 * VukaSport - Painel de Administração "Só Edição" (Atualizado v4)
 * Focado em botões rápidos de entrada de dados com agendamento e fases de jogo
 */

class AdminPanel {
    constructor() {
        this.currentGameId = null;
        this.isPlaying = false;
        this.timerInterval = null;
        this.gamesListener = null;
        this.initialize();
    }

    initialize() {
        this.checkAuth();
        this.setupListeners();
        this.loadGamesToSelect();
        this.setupGamesListener();
        
        window.adminPanel = this;

        // Retomar cronómetro quando o admin é reaberto
        window.addEventListener('focus', () => {
            if (this.currentGameId) {
                this.resumeTimerIfNeeded();
            }
        });

        // Sincronizar jogos eliminados
        window.addEventListener('gamesUpdated', () => {
            this.loadGamesToSelect();
        });
    }

    setupGamesListener() {
        // O Firestore já trata da sincronização em tempo real via onSnapshot em firebase.js
        // que chama adminPanel.loadGamesToSelect() automaticamente
    }

    removeGamesListener() {
        if (this.gamesListener) {
            clearInterval(this.gamesListener);
            this.gamesListener = null;
        }
    }

    checkAuth() {
        if (authManager.isAuthenticated()) {
            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('adminSection').style.display = 'block';
            this.setupGamesListener();
        } else {
            document.getElementById('loginSection').style.display = 'block';
            document.getElementById('adminSection').style.display = 'none';
            this.removeGamesListener();
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
            this.removeGamesListener();
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

        // Play/Pause Cronómetro
        document.getElementById('btnPlayPause').onclick = () => {
            this.toggleTimer();
        };

        // Ajuste manual de minuto
        document.getElementById('gameMinute').onchange = (e) => {
            if (this.currentGameId) {
                gameManager.updateGame(this.currentGameId, { minute: parseInt(e.target.value) });
            }
        };

        // Seleção de fase do jogo
        const phaseSelect = document.getElementById('gamePhase');
        if (phaseSelect) {
            phaseSelect.onchange = (e) => {
                if (this.currentGameId) {
                    gameManager.updateGame(this.currentGameId, { phase: e.target.value });
                }
            };
        }

        // Abrir Modal de Evento
        document.getElementById('btnRegisterEvent').onclick = () => {
            document.getElementById('eventModal').style.display = 'flex';
        };

        // Adicionar Novo Jogo (Com agendamento)
        document.getElementById('btnNewGame').onclick = async () => {
            document.getElementById('newGameModal').style.display = 'flex';
        };

        // Confirmar novo jogo
        document.getElementById('btnConfirmNewGame').onclick = async () => {
            const home = document.getElementById('inputHomeTeam').value.trim();
            const away = document.getElementById('inputAwayTeam').value.trim();
            const comp = document.getElementById('inputCompetition').value.trim();
            const gameDate = document.getElementById('inputGameDate').value;
            const gameTime = document.getElementById('inputGameTime').value;

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
                phase: 'first'
            });

            // Limpar modal
            document.getElementById('inputHomeTeam').value = '';
            document.getElementById('inputAwayTeam').value = '';
            document.getElementById('inputCompetition').value = '';
            document.getElementById('inputGameDate').value = '';
            document.getElementById('inputGameTime').value = '';
            document.getElementById('newGameModal').style.display = 'none';

            this.loadGamesToSelect();
            this.loadGameToEdit(game.id);
        };

        // Cancelar novo jogo
        document.getElementById('btnCancelNewGame').onclick = () => {
            document.getElementById('newGameModal').style.display = 'none';
        };
    }

    loadGamesToSelect() {
        const select = document.getElementById('gameSelect');
        const games = gameManager.getGames();
        
        const currentVal = select.value;
        
        select.innerHTML = '<option value="">SELECIONAR JOGO PARA EDITAR</option>';
        games.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g.id;
            opt.textContent = `${g.homeTeam} vs ${g.awayTeam} (${g.competition})`;
            select.appendChild(opt);
        });
        
        if (currentVal) select.value = currentVal;
    }

    loadGameToEdit(gameId) {
        if (!gameId) {
            document.getElementById('editorContainer').style.display = 'none';
            this.stopTimer();
            return;
        }

        this.currentGameId = gameId;
        const game = gameManager.getGameById(gameId);
        if (!game) return;

        document.getElementById('editorContainer').style.display = 'block';
        document.getElementById('homeName').textContent = game.homeTeam.toUpperCase();
        document.getElementById('awayName').textContent = game.awayTeam.toUpperCase();
        document.getElementById('homeScore').textContent = game.homeGoals;
        document.getElementById('awayScore').textContent = game.awayGoals;
        document.getElementById('gameMinute').value = game.minute || 0;

        // Atualizar fase do jogo
        const phaseSelect = document.getElementById('gamePhase');
        if (phaseSelect) {
            phaseSelect.value = game.phase || 'first';
        }

        // Estado do cronómetro
        this.isPlaying = game.status === 'live';
        this.updatePlayPauseBtn();
        if (this.isPlaying) this.startTimer();
        else this.stopTimer();

        this.renderEvents();
        this.updateDeleteButtonVisibility();
    }

    updateDeleteButtonVisibility() {
        const btn = document.getElementById('btnDeleteGame');
        if (btn) {
            btn.style.display = this.currentGameId ? 'block' : 'none';
        }
    }

    async deleteCurrentGame() {
        if (!this.currentGameId) return;
        
        const game = gameManager.getGameById(this.currentGameId);
        if (!game) return;

        const confirmDelete = confirm(
            `Tem a certeza que deseja eliminar o jogo:\n\n${game.homeTeam} vs ${game.awayTeam}?\n\nEsta ação não pode ser desfeita.`
        );

        if (confirmDelete) {
            this.stopTimer();
            await gameManager.deleteGame(this.currentGameId);
            this.currentGameId = null;
            document.getElementById('editorContainer').style.display = 'none';
            document.getElementById('gameSelect').value = '';
            this.loadGamesToSelect();
            alert('Jogo eliminado com sucesso!');
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

    toggleTimer() {
        if (!this.currentGameId) return;
        this.isPlaying = !this.isPlaying;
        this.updatePlayPauseBtn();
        
        const status = this.isPlaying ? 'live' : 'halftime';
        const updates = { status: status };
        
        if (this.isPlaying) {
            const game = gameManager.getGameById(this.currentGameId);
            if (!game.startTime) {
                updates.startTime = Date.now();
            }
        }
        
        gameManager.updateGame(this.currentGameId, updates);

        if (this.isPlaying) this.startTimer();
        else this.stopTimer();
    }

    updatePlayPauseBtn() {
        const btn = document.getElementById('btnPlayPause');
        if (this.isPlaying) {
            btn.textContent = '⏸️';
            btn.classList.add('paused');
        } else {
            btn.textContent = '▶️';
            btn.classList.remove('paused');
        }
    }

    startTimer() {
        this.stopTimer();
        
        const game = gameManager.getGameById(this.currentGameId);
        if (!game) return;

        if (!game.startTime) {
            const now = Date.now();
            gameManager.updateGame(this.currentGameId, { startTime: now, status: 'live' });
        }

        this.timerInterval = setInterval(() => {
            const currentGame = gameManager.getGameById(this.currentGameId);
            if (!currentGame || !currentGame.startTime) {
                this.stopTimer();
                return;
            }

            const elapsedMs = Date.now() - currentGame.startTime;
            const elapsedMinutes = Math.floor(elapsedMs / 60000);
            
            const input = document.getElementById('gameMinute');
            if (input) {
                input.value = elapsedMinutes;
            }
            
            if (Math.floor(elapsedMs / 10000) % 1 === 0) {
                gameManager.updateGame(this.currentGameId, { minute: elapsedMinutes });
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    resumeTimerIfNeeded() {
        const game = gameManager.getGameById(this.currentGameId);
        if (!game) return;

        if (game.status === 'live' && game.startTime) {
            this.stopTimer();
            
            const elapsedMs = Date.now() - game.startTime;
            const elapsedMinutes = Math.floor(elapsedMs / 60000);
            
            const input = document.getElementById('gameMinute');
            if (input) {
                input.value = elapsedMinutes;
            }
            
            this.isPlaying = true;
            this.updatePlayPauseBtn();
            this.startTimer();
            
            console.log('Cronómetro retomado: ' + elapsedMinutes + ' minutos decorridos');
        }
    }

    async saveEvent() {
        if (!this.currentGameId) return;
        
        const type = document.getElementById('eventType').value;
        const team = document.getElementById('eventTeam').value;
        const player = document.getElementById('eventPlayer').value;
        const minute = document.getElementById('gameMinute').value;

        if (type === 'goal') {
            await eventManager.addGoal(this.currentGameId, team, minute, player);
            await this.adjustScore(team, 1);
        } else if (type === 'yellow') {
            await eventManager.addYellowCard(this.currentGameId, team, minute, player);
        } else if (type === 'red') {
            await eventManager.addRedCard(this.currentGameId, team, minute, player);
        }

        document.getElementById('eventModal').style.display = 'none';
        document.getElementById('eventPlayer').value = '';
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
            if (e.type === 'yellow_card') icon = '🟨';
            if (e.type === 'red_card') icon = '🟥';

            div.innerHTML = `
                <div class="event-info">
                    <span class="event-time">${e.minute}'</span>
                    <span>${icon} ${e.playerName} (${e.team === 'home' ? 'Casa' : 'Visitante'})</span>
                </div>
                <div class="event-actions">
                    <button onclick="adminPanel.deleteEvent('${e.id}', '${e.type}')" class="btn-delete-event">🗑️</button>
                </div>
            `;
            list.appendChild(div);
        });
    }

    deleteEvent(eventId, type) {
        if (confirm('Eliminar este evento?')) {
            eventManager.removeEvent(this.currentGameId, eventId, type);
            this.renderEvents();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.adminPanel = new AdminPanel();
});
