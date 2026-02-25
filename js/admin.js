/**
 * VukaSport - Painel de Administração "Só Edição" (Atualizado)
 * Focado em botões rápidos de entrada de dados
 */

class AdminPanel {
    constructor() {
        this.currentGameId = null;
        this.isPlaying = false;
        this.timerInterval = null;
        this.gamesListener = null; // Listener para atualizações em tempo real
        this.initialize();
    }

    initialize() {
        this.checkAuth();
        this.setupListeners();
        this.loadGamesToSelect();
        this.setupGamesListener(); // Listener contínuo para atualizações
        
        // Atribuir ao objeto global para botões HTML
        window.adminPanel = this;

        // Retomar cronómetro quando o admin é reaberto
        window.addEventListener('focus', () => {
            if (this.currentGameId) {
                this.resumeTimerIfNeeded();
            }
        });
    }

    /**
     * Configura um listener contínuo para atualizações de jogos
     */
    setupGamesListener() {
        // Polling a cada 2 segundos para verificar atualizações
        this.gamesListener = setInterval(() => {
            if (authManager.isAuthenticated()) {
                this.loadGamesToSelect();
            }
        }, 2000);
    }

    /**
     * Remove o listener de atualizações
     */
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
            this.setupGamesListener(); // Iniciar listener quando autenticado
        } else {
            document.getElementById('loginSection').style.display = 'block';
            document.getElementById('adminSection').style.display = 'none';
            this.removeGamesListener(); // Parar listener quando desautenticado
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

        // Abrir Modal de Evento
        document.getElementById('btnRegisterEvent').onclick = () => {
            document.getElementById('eventModal').style.display = 'flex';
        };

        // Adicionar Novo Jogo (Simples)
        document.getElementById('btnNewGame').onclick = async () => {
            const home = prompt('Equipa Casa:');
            const away = prompt('Equipa Visitante:');
            const comp = prompt('Competição:');
            if (home && away && comp) {
                const game = await gameManager.addGame({
                    homeTeam: home,
                    awayTeam: away,
                    competition: comp,
                    date: new Date().toISOString()
                });
                this.loadGamesToSelect();
                this.loadGameToEdit(game.id);
            }
        };
    }

    loadGamesToSelect() {
        const select = document.getElementById('gameSelect');
        const games = gameManager.getGames();
        
        // Guardar valor atual
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

        // Estado do cronómetro
        this.isPlaying = game.status === 'live';
        this.updatePlayPauseBtn();
        if (this.isPlaying) this.startTimer();
        else this.stopTimer();

        this.renderEvents();
        this.updateDeleteButtonVisibility();
    }

    /**
     * Atualiza a visibilidade do botão de eliminar
     */
    updateDeleteButtonVisibility() {
        const btn = document.getElementById('btnDeleteGame');
        if (btn) {
            btn.style.display = this.currentGameId ? 'block' : 'none';
        }
    }

    /**
     * Elimina o jogo atual com confirmação
     */
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
        
        // Se está a iniciar, guardar o startTime se não existir
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

        // Se não houver startTime, guardar agora (timestamp do servidor)
        if (!game.startTime) {
            const now = Date.now();
            gameManager.updateGame(this.currentGameId, { startTime: now, status: 'live' });
            console.log('Cronómetro iniciado');
        }

        // Atualizar minuto a cada segundo baseado no startTime
        this.timerInterval = setInterval(() => {
            const currentGame = gameManager.getGameById(this.currentGameId);
            if (!currentGame || !currentGame.startTime) {
                this.stopTimer();
                return;
            }

            // Calcular minutos decorridos desde startTime
            const elapsedMs = Date.now() - currentGame.startTime;
            const elapsedMinutes = Math.floor(elapsedMs / 60000);
            
            const input = document.getElementById('gameMinute');
            if (input) {
                input.value = elapsedMinutes;
            }
            
            // Atualizar no Firebase a cada 10 segundos
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

    /**
     * Retoma o cronómetro quando o app é reaberto
     */
    resumeTimerIfNeeded() {
        const game = gameManager.getGameById(this.currentGameId);
        if (!game) return;

        if (game.status === 'live' && game.startTime) {
            // Parar cronómetro anterior se existir
            this.stopTimer();
            
            // Recalcular minuto baseado no startTime
            const elapsedMs = Date.now() - game.startTime;
            const elapsedMinutes = Math.floor(elapsedMs / 60000);
            
            const input = document.getElementById('gameMinute');
            if (input) {
                input.value = elapsedMinutes;
            }
            
            // Reiniciar cronómetro
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

        // Usar o eventManager global do projeto
        if (type === 'goal') {
            eventManager.addGoal(this.currentGameId, team, minute, player);
            // Se for golo, incrementar placar automaticamente
            this.adjustScore(team, 1);
        } else if (type === 'yellow') {
            eventManager.addYellowCard(this.currentGameId, team, minute, player);
        } else if (type === 'red') {
            eventManager.addRedCard(this.currentGameId, team, minute, player);
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

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.adminPanel = new AdminPanel();
});
