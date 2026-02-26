/**
 * VukaSport - Painel de Administração "Só Edição" (Atualizado v6)
 * Focado em botões rápidos de entrada de dados com agendamento, adiamento e fases de jogo
 */

class AdminPanel {
    constructor() {
        this.currentGameId = null;
        this.isPlaying = false;
        this.timerInterval = null;
        this.gamesListener = null;
        this.activeUsers = new Set();
        this.userTrackingInterval = null;
        this.initialize();
    }

    initialize() {
        this.checkAuth();
        this.setupListeners();
        this.loadGamesToSelect();
        this.setupGamesListener();
        this.startUserTracking();
        
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

    /**
     * Inicia o rastreamento de utilizadores ativos
     */
    startUserTracking() {
        // Registar este admin como utilizador ativo
        this.registerAdminAsActive();
        
        // Atualizar a cada 10 segundos
        this.userTrackingInterval = setInterval(() => {
            this.registerAdminAsActive();
            this.updateActiveUserCount();
        }, 10000);
    }

    /**
     * Registar admin como utilizador ativo no Firestore
     */
    async registerAdminAsActive() {
        if (!firebaseManager || !firebaseManager.db) return;
        
        try {
            const adminId = 'admin_' + (authManager.currentUser || 'unknown');
            const now = new Date().toISOString();
            
            await firebaseManager.db.collection('admin_activity').doc(adminId).set({
                timestamp: now,
                lastSeen: Date.now()
            }, { merge: true });
        } catch (error) {
            console.error('Erro ao registar atividade do admin:', error);
        }
    }

    /**
     * Atualizar contagem de utilizadores ativos
     */
    async updateActiveUserCount() {
        if (!firebaseManager || !firebaseManager.db) return;
        
        try {
            const now = Date.now();
            const fiveMinutesAgo = now - (5 * 60 * 1000); // 5 minutos
            
            const snapshot = await firebaseManager.db.collection('admin_activity')
                .where('lastSeen', '>', fiveMinutesAgo)
                .get();
            
            const count = snapshot.size;
            this.displayActiveUserCount(count);
        } catch (error) {
            console.error('Erro ao contar utilizadores ativos:', error);
        }
    }

    /**
     * Exibir contagem de utilizadores ativos
     */
    displayActiveUserCount(count) {
        const userCountEl = document.getElementById('activeUserCount');
        if (userCountEl) {
            userCountEl.textContent = count;
            userCountEl.style.display = 'block';
        }
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
            if (authManager.login(u, p)) {
                this.checkAuth();
                this.startUserTracking();
            }
            else document.getElementById('loginError').style.display = 'block';
        };

        // Logout
        document.getElementById('logoutBtn').onclick = () => {
            this.removeGamesListener();
            if (this.userTrackingInterval) clearInterval(this.userTrackingInterval);
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

        // Terminar Jogo
        document.getElementById('btnFinishGame').onclick = () => {
            this.openFinishGameModal();
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
                    const selectedPhase = e.target.value;
                    
                    // Verificar se a opção selecionada é para terminar o jogo
                    if (selectedPhase === 'finished') {
                        // Terminar jogo normalmente
                        this.stopTimer();
                        gameManager.updateGame(this.currentGameId, { 
                            status: 'finished', 
                            phase: 'finished'
                        });
                        this.isPlaying = false;
                        this.updatePlayPauseBtn();
                        alert('Jogo terminado com sucesso!');
                    } else if (selectedPhase === 'finished_extra') {
                        // Terminar jogo com prolongamento
                        this.stopTimer();
                        gameManager.updateGame(this.currentGameId, { 
                            status: 'finished', 
                            phase: 'extra'
                        });
                        this.isPlaying = false;
                        this.updatePlayPauseBtn();
                        alert('Jogo terminado com prolongamento!');
                    } else {
                        // Atualizar fase normalmente
                        gameManager.updateGame(this.currentGameId, { phase: selectedPhase });
                    }
                }
            };
        }

        // Data de Início do Jogo
        const startDateInput = document.getElementById('gameStartDate');
        if (startDateInput) {
            startDateInput.onchange = (e) => {
                if (this.currentGameId) {
                    const startTime = document.getElementById('gameStartTime').value;
                    if (e.target.value && startTime) {
                        const dateTimeStr = e.target.value + 'T' + startTime + ':00';
                        gameManager.updateGame(this.currentGameId, { date: new Date(dateTimeStr).toISOString() });
                    }
                }
            };
        }

        // Hora de Início do Jogo
        const startTimeInput = document.getElementById('gameStartTime');
        if (startTimeInput) {
            startTimeInput.onchange = (e) => {
                if (this.currentGameId) {
                    const startDate = document.getElementById('gameStartDate').value;
                    if (startDate && e.target.value) {
                        const dateTimeStr = startDate + 'T' + e.target.value + ':00';
                        gameManager.updateGame(this.currentGameId, { date: new Date(dateTimeStr).toISOString() });
                    }
                }
            };
        }

        // Data de Fim do Jogo
        const endDateInput = document.getElementById('gameEndDate');
        if (endDateInput) {
            endDateInput.onchange = (e) => {
                if (this.currentGameId) {
                    const endTime = document.getElementById('gameEndTime').value;
                    if (e.target.value && endTime) {
                        const dateTimeStr = e.target.value + 'T' + endTime + ':00';
                        gameManager.updateGame(this.currentGameId, { endTime: new Date(dateTimeStr).toISOString() });
                    }
                }
            };
        }

        // Hora de Fim do Jogo
        const endTimeInput = document.getElementById('gameEndTime');
        if (endTimeInput) {
            endTimeInput.onchange = (e) => {
                if (this.currentGameId) {
                    const endDate = document.getElementById('gameEndDate').value;
                    if (endDate && e.target.value) {
                        const dateTimeStr = endDate + 'T' + e.target.value + ':00';
                        gameManager.updateGame(this.currentGameId, { endTime: new Date(dateTimeStr).toISOString() });
                    }
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

        // Agendar Jogo
        document.getElementById('btnScheduleGame').onclick = () => {
            this.openScheduleModal();
        };

        // Confirmar agendamento
        document.getElementById('btnConfirmSchedule').onclick = async () => {
            await this.confirmScheduleGame();
        };

        // Cancelar agendamento
        document.getElementById('btnCancelSchedule').onclick = () => {
            document.getElementById('scheduleModal').style.display = 'none';
        };

        // Adiar Jogo
        document.getElementById('btnPostponeGame').onclick = () => {
            this.openPostponeModal();
        };

        // Confirmar adiamento
        document.getElementById('btnConfirmPostpone').onclick = async () => {
            await this.confirmPostponeGame();
        };

        // Cancelar adiamento
        document.getElementById('btnCancelPostpone').onclick = () => {
            document.getElementById('postponeModal').style.display = 'none';
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
            const statusLabel = this.getGameStatusLabel(g);
            opt.textContent = `${g.homeTeam} vs ${g.awayTeam} (${g.competition}) - ${statusLabel}`;
            select.appendChild(opt);
        });
        
        if (currentVal) select.value = currentVal;
    }

    getGameStatusLabel(game) {
        const statusMap = {
            'scheduled': 'Agendado',
            'live': 'Ao Vivo',
            'halftime': 'Intervalo',
            'extra': 'Prolongamento',
            'finished': 'Terminado',
            'postponed': 'Adiado'
        };
        return statusMap[game.status] || game.status;
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

        // Carregar data e hora de início
        const startDateInput = document.getElementById('gameStartDate');
        const startTimeInput = document.getElementById('gameStartTime');
        if (game.date) {
            const gameDate = new Date(game.date);
            const dateStr = gameDate.toISOString().split('T')[0];
            const timeStr = gameDate.toTimeString().slice(0, 5);
            if (startDateInput) startDateInput.value = dateStr;
            if (startTimeInput) startTimeInput.value = timeStr;
        }

        // Carregar data e hora de fim
        const endDateInput = document.getElementById('gameEndDate');
        const endTimeInput = document.getElementById('gameEndTime');
        if (game.endTime) {
            const endDate = new Date(game.endTime);
            const dateStr = endDate.toISOString().split('T')[0];
            const timeStr = endDate.toTimeString().slice(0, 5);
            if (endDateInput) endDateInput.value = dateStr;
            if (endTimeInput) endTimeInput.value = timeStr;
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
        const finishBtn = document.getElementById('btnFinishGame');
        const scheduleBtn = document.getElementById('btnScheduleGame');
        const postponeBtn = document.getElementById('btnPostponeGame');
        
        if (btn) {
            btn.style.display = this.currentGameId ? 'block' : 'none';
        }
        if (finishBtn) {
            const game = this.currentGameId ? gameManager.getGameById(this.currentGameId) : null;
            finishBtn.style.display = (game && game.status !== 'finished' && game.status !== 'scheduled' && game.status !== 'postponed') ? 'block' : 'none';
        }
        
        // Mostrar botões de agendamento e adiamento
        if (scheduleBtn && postponeBtn) {
            const game = this.currentGameId ? gameManager.getGameById(this.currentGameId) : null;
            if (game) {
                scheduleBtn.style.display = (game.status === 'scheduled' || game.status === 'postponed') ? 'block' : 'none';
                postponeBtn.style.display = (game.status === 'live' || game.status === 'halftime' || game.status === 'extra') ? 'block' : 'none';
            } else {
                scheduleBtn.style.display = 'none';
                postponeBtn.style.display = 'none';
            }
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

    /**
     * Abre o modal para terminar o jogo
     */
    openFinishGameModal() {
        const game = gameManager.getGameById(this.currentGameId);
        if (!game) return;

        if (game.status === 'finished') {
            alert('Este jogo ja esta terminado.');
            return;
        }

        document.getElementById('finishGameModal').style.display = 'flex';
    }

    /**
     * Termina o jogo (com ou sem prolongamento)
     * @param {boolean} withExtra - Se true, ativa o prolongamento; se false, termina normalmente
     */
    async finishCurrentGame(withExtra = false) {
        if (!this.currentGameId) return;
        
        const game = gameManager.getGameById(this.currentGameId);
        if (!game) return;

        if (game.status === 'finished') {
            alert('Este jogo ja esta terminado.');
            return;
        }

        this.stopTimer();
        this.isPlaying = false;
        this.updatePlayPauseBtn();

        // Determinar a fase final
        const finalPhase = withExtra ? 'extra' : 'finished';
        const finalStatus = 'finished';

        // Atualizar o jogo
        await gameManager.updateGame(this.currentGameId, { 
            status: finalStatus, 
            phase: finalPhase
        });

        this.updateDeleteButtonVisibility();
        
        const message = withExtra 
            ? 'Jogo terminado com prolongamento!' 
            : 'Jogo terminado com sucesso!';
        alert(message);
        
        // Fechar modal
        document.getElementById('finishGameModal').style.display = 'none';
        
        // Recarregar o jogo para atualizar a interface
        this.loadGameToEdit(this.currentGameId);
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

    /**
     * Abre o modal de agendamento
     */
    openScheduleModal() {
        const game = gameManager.getGameById(this.currentGameId);
        if (!game) return;

        // Pré-preencher com data/hora atual do jogo
        if (game.date) {
            const date = new Date(game.date);
            const dateStr = date.toISOString().split('T')[0];
            const timeStr = date.toTimeString().slice(0, 5);
            
            document.getElementById('scheduleGameDate').value = dateStr;
            document.getElementById('scheduleGameTime').value = timeStr;
        }

        document.getElementById('scheduleModal').style.display = 'flex';
    }

    /**
     * Confirma o agendamento do jogo
     */
    async confirmScheduleGame() {
        if (!this.currentGameId) return;

        const newDate = document.getElementById('scheduleGameDate').value;
        const newTime = document.getElementById('scheduleGameTime').value;

        if (!newDate || !newTime) {
            alert('Por favor, preencha a data e a hora!');
            return;
        }

        const dateTimeStr = newDate + 'T' + newTime + ':00';
        const newDateTime = new Date(dateTimeStr).toISOString();

        await gameManager.updateGame(this.currentGameId, { 
            date: newDateTime,
            status: 'scheduled'
        });

        document.getElementById('scheduleModal').style.display = 'none';
        this.loadGameToEdit(this.currentGameId);
        alert('Jogo agendado com sucesso para ' + newDate + ' às ' + newTime);
    }

    /**
     * Abre o modal de adiamento
     */
    openPostponeModal() {
        const game = gameManager.getGameById(this.currentGameId);
        if (!game) return;

        // Limpar campos
        document.getElementById('postponeGameDate').value = '';
        document.getElementById('postponeGameTime').value = '';
        document.getElementById('postponeReason').value = '';

        document.getElementById('postponeModal').style.display = 'flex';
    }

    /**
     * Confirma o adiamento do jogo
     */
    async confirmPostponeGame() {
        if (!this.currentGameId) return;

        const game = gameManager.getGameById(this.currentGameId);
        if (!game) return;

        const newDate = document.getElementById('postponeGameDate').value;
        const newTime = document.getElementById('postponeGameTime').value;
        const reason = document.getElementById('postponeReason').value;

        if (!newDate || !newTime) {
            alert('Por favor, preencha a data e a hora!');
            return;
        }

        const dateTimeStr = newDate + 'T' + newTime + ':00';
        const newDateTime = new Date(dateTimeStr).toISOString();

        // Parar o cronómetro se estiver em andamento
        this.stopTimer();
        this.isPlaying = false;

        await gameManager.updateGame(this.currentGameId, { 
            date: newDateTime,
            status: 'postponed',
            postponedReason: reason || 'Adiado pelo administrador',
            postponedDate: new Date().toISOString(),
            homeGoals: 0,
            awayGoals: 0,
            minute: 0,
            phase: 'first',
            startTime: null
        });

        document.getElementById('postponeModal').style.display = 'none';
        this.loadGameToEdit(this.currentGameId);
        alert('Jogo adiado com sucesso para ' + newDate + ' às ' + newTime);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.adminPanel = new AdminPanel();
});
