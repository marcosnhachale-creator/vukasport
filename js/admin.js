/**
 * VukaSport - Painel de Administração
 * Controla login, adição e edição de jogos
 */

class AdminPanel {
    constructor() {
        this.currentEditingGameId = null;
        this.initializeEventListeners();
        this.checkAuthStatus();
    }

    /**
     * Inicializa os event listeners
     */
    initializeEventListeners() {
        // Login
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Alterar Palavra-passe
        const changePasswordForm = document.getElementById('changePasswordForm');
        if (changePasswordForm) {
            changePasswordForm.addEventListener('submit', (e) => this.handleChangePassword(e));
        }

        // Adicionar novo jogo
        const addGameForm = document.getElementById('addGameForm');
        if (addGameForm) {
            addGameForm.addEventListener('submit', (e) => this.handleAddGame(e));
        }

        // Editar jogo
        const editGameForm = document.getElementById('editGameForm');
        if (editGameForm) {
            editGameForm.addEventListener('submit', (e) => this.handleEditGame(e));
        }

        // Ajuste automático de minutos ao mudar estado para prolongamento
        const editStatus = document.getElementById('editStatus');
        if (editStatus) {
            editStatus.addEventListener('change', (e) => {
                const minuteInput = document.getElementById('editMinute');
                if (e.target.value === 'extra' && parseInt(minuteInput.value) < 90) {
                    minuteInput.value = 90;
                } else if (e.target.value === 'finished' && parseInt(minuteInput.value) < 90) {
                    minuteInput.value = 90;
                }
            });
        }

        // Botões de eventos (goleadas e cartões)
        const addGoalBtn = document.getElementById('addGoalBtn');
        if (addGoalBtn) {
            addGoalBtn.addEventListener('click', (e) => this.handleAddGoal(e));
        }

        const addYellowCardBtn = document.getElementById('addYellowCardBtn');
        if (addYellowCardBtn) {
            addYellowCardBtn.addEventListener('click', (e) => this.handleAddYellowCard(e));
        }

        const addRedCardBtn = document.getElementById('addRedCardBtn');
        if (addRedCardBtn) {
            addRedCardBtn.addEventListener('click', (e) => this.handleAddRedCard(e));
        }

        // Modal
        const closeModal = document.getElementById('closeModal');
        if (closeModal) {
            closeModal.addEventListener('click', () => this.closeModal());
        }

        const cancelEdit = document.getElementById('cancelEdit');
        if (cancelEdit) {
            cancelEdit.addEventListener('click', () => this.closeModal());
        }

        const deleteGame = document.getElementById('deleteGame');
        if (deleteGame) {
            deleteGame.addEventListener('click', () => this.handleDeleteGame());
        }

        // Fechar modal ao clicar fora
        const modal = document.getElementById('editModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            });
        }
    }

    /**
     * Verifica o estado de autenticação e mostra a secção apropriada
     */
    checkAuthStatus() {
        const loginSection = document.getElementById('loginSection');
        const adminSection = document.getElementById('adminSection');

        if (!loginSection || !adminSection) return;

        if (authManager.isAuthenticated()) {
            loginSection.style.display = 'none';
            adminSection.style.display = 'block';
            
            this.renderGamesList();
        } else {
            loginSection.style.display = 'block';
            adminSection.style.display = 'none';
        }
    }

    /**
     * Trata o login
     * @param {Event} e - Evento do formulário
     */
    handleLogin(e) {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const loginError = document.getElementById('loginError');

        if (authManager.login(username, password)) {
            // Login bem-sucedido
            if (loginError) loginError.style.display = 'none';
            document.getElementById('loginForm').reset();
            this.checkAuthStatus();
        } else {
            // Login falhou
            if (loginError) {
                loginError.textContent = 'Utilizador ou palavra-passe incorretos.';
                loginError.style.display = 'block';
            }
        }
    }

    /**
     * Trata o logout
     */
    handleLogout() {
        if (confirm('Tem a certeza que deseja sair?')) {
            authManager.logout();
            this.checkAuthStatus();
        }
    }
    /**
     * Trata a alteracao de palavra-passe
     * @param {Event} e - Evento do formulario
     */
    handleChangePassword(e) {
        e.preventDefault();

        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const passwordMessage = document.getElementById('passwordMessage');

        // Validar se as senhas novas coincidem
        if (newPassword !== confirmPassword) {
            if (passwordMessage) {
                passwordMessage.textContent = 'As palavras-passe nao coincidem.';
                passwordMessage.className = 'form-message error';
                passwordMessage.style.display = 'block';
            }
            return;
        }

        // Chamar o metodo de alteracao de senha
        const result = authManager.changePassword(currentPassword, newPassword);

        if (passwordMessage) {
            passwordMessage.textContent = result.message;
            passwordMessage.className = 'form-message ' + (result.success ? 'success' : 'error');
            passwordMessage.style.display = 'block';
        }

        if (result.success) {
            // Limpar formulario
            document.getElementById('changePasswordForm').reset();
            
            // Sincronizar com Firebase se disponivel
            if (typeof firebaseManager !== 'undefined') {
                firebaseManager.updateAdminPassword(newPassword).then(success => {
                    if (success) {
                        console.log('Senha sincronizada com Firebase');
                    }
                }).catch(error => {
                    console.warn('Nao foi possivel sincronizar com Firebase:', error);
                });
            }
        }
    }

    /**
     * Trata a adição de novo jogo
     * @param {Event} e - Evento do formulário
     */
    async handleAddGame(e) {
        e.preventDefault();

        if (!authManager.canEdit()) {
            alert('Não tem permissão para adicionar jogos.');
            return;
        }

        const homeTeam = document.getElementById('homeTeam').value;
        const awayTeam = document.getElementById('awayTeam').value;
        const gameDate = document.getElementById('gameDate').value;
        const competition = document.getElementById('competition').value;

        if (!homeTeam || !awayTeam || !gameDate || !competition) {
            alert('Por favor, preencha todos os campos.');
            return;
        }

        // Adicionar jogo
        await gameManager.addGame({
            homeTeam,
            awayTeam,
            gameDate,
            competition
        });

        // Limpar formulário
        document.getElementById('addGameForm').reset();

        // Atualizar lista
        this.renderGamesList();

        // Mostrar mensagem de sucesso
        alert('Jogo adicionado com sucesso!');
    }

    /**
     * Trata a edição de jogo
     * @param {Event} e - Evento do formulário
     */
    async handleEditGame(e) {
        e.preventDefault();

        if (!authManager.canEdit()) {
            alert('Não tem permissão para editar jogos.');
            return;
        }

        const gameId = document.getElementById('editGameId').value;
        const status = document.getElementById('editStatus').value;
        const homeGoals = parseInt(document.getElementById('editHomeGoals').value);
        const awayGoals = parseInt(document.getElementById('editAwayGoals').value);
        const minute = parseInt(document.getElementById('editMinute').value);

        if (await gameManager.updateGame(gameId, {
            status,
            homeGoals,
            awayGoals,
            minute
        })) {
            this.closeModal();
            this.renderGamesList();
            alert('Jogo atualizado com sucesso!');
        } else {
            alert('Erro ao atualizar o jogo.');
        }
    }

    /**
     * Trata a adição de um golo
     * @param {Event} e - Evento do botão
     */
    handleAddGoal(e) {
        e.preventDefault();

        const gameId = parseInt(document.getElementById('editGameId').value);
        const team = document.getElementById('goalTeam').value;
        const minute = parseInt(document.getElementById('goalMinute').value);
        const playerName = document.getElementById('goalPlayerName').value;

        if (!playerName.trim()) {
            alert('Por favor, insira o nome do jogador.');
            return;
        }

        // Adicionar golo
        eventManager.addGoal(gameId, team, minute, playerName);

        // Atualizar a contagem de golos no formulário
        if (team === 'home') {
            const homeGoalsInput = document.getElementById('editHomeGoals');
            homeGoalsInput.value = parseInt(homeGoalsInput.value) + 1;
        } else {
            const awayGoalsInput = document.getElementById('editAwayGoals');
            awayGoalsInput.value = parseInt(awayGoalsInput.value) + 1;
        }

        // Limpar campos
        document.getElementById('goalPlayerName').value = '';
        document.getElementById('goalMinute').value = '0';

        // Atualizar lista de eventos
        this.renderEventsList(gameId);

        alert('Golo adicionado com sucesso!');
    }

    /**
     * Trata a adição de um cartão amarelo
     * @param {Event} e - Evento do botão
     */
    handleAddYellowCard(e) {
        e.preventDefault();

        const gameId = parseInt(document.getElementById('editGameId').value);
        const team = document.getElementById('yellowCardTeam').value;
        const minute = parseInt(document.getElementById('yellowCardMinute').value);
        const playerName = document.getElementById('yellowCardPlayerName').value;

        if (!playerName.trim()) {
            alert('Por favor, insira o nome do jogador.');
            return;
        }

        // Adicionar cartão amarelo
        eventManager.addYellowCard(gameId, team, minute, playerName);

        // Limpar campos
        document.getElementById('yellowCardPlayerName').value = '';
        document.getElementById('yellowCardMinute').value = '0';

        // Atualizar lista de eventos
        this.renderEventsList(gameId);

        alert('Cartão amarelo adicionado com sucesso!');
    }

    /**
     * Trata a adição de um cartão vermelho
     * @param {Event} e - Evento do botão
     */
    handleAddRedCard(e) {
        e.preventDefault();

        const gameId = parseInt(document.getElementById('editGameId').value);
        const team = document.getElementById('redCardTeam').value;
        const minute = parseInt(document.getElementById('redCardMinute').value);
        const playerName = document.getElementById('redCardPlayerName').value;

        if (!playerName.trim()) {
            alert('Por favor, insira o nome do jogador.');
            return;
        }

        // Adicionar cartão vermelho
        eventManager.addRedCard(gameId, team, minute, playerName);

        // Limpar campos
        document.getElementById('redCardPlayerName').value = '';
        document.getElementById('redCardMinute').value = '0';

        // Atualizar lista de eventos
        this.renderEventsList(gameId);

        alert('Cartão vermelho adicionado com sucesso!');
    }

    /**
     * Renderiza a lista de eventos do jogo
     * @param {number} gameId - ID do jogo
     */
    renderEventsList(gameId) {
        const eventsList = document.getElementById('eventsList');
        if (!eventsList) return;

        const events = eventManager.getAllEventsOrdered(gameId);

        if (events.length === 0) {
            eventsList.innerHTML = '<p class="empty-events">Nenhum evento registado</p>';
            return;
        }

        eventsList.innerHTML = events.map(event => this.createEventItem(event, gameId)).join('');

        // Adicionar event listeners aos botões de eliminar
        document.querySelectorAll('.event-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const eventId = e.target.dataset.eventId;
                const eventType = e.target.dataset.eventType;
                this.handleDeleteEvent(gameId, eventId, eventType);
            });
        });
    }

    /**
     * Cria o HTML de um item de evento
     * @param {object} event - Dados do evento
     * @param {number} gameId - ID do jogo
     * @returns {string} - HTML do item
     */
    createEventItem(event, gameId) {
        const game = gameManager.getGameById(gameId);
        const teamName = event.team === 'home' ? game.homeTeam : game.awayTeam;
        
        let eventIcon = '';
        let eventTypeText = '';
        let eventClass = '';

        if (event.type === 'goal') {
            eventIcon = '⚽';
            eventTypeText = 'Golo';
            eventClass = 'goal';
        } else if (event.type === 'yellow_card') {
            eventIcon = '🟨';
            eventTypeText = 'Cartão Amarelo';
            eventClass = 'yellow-card';
        } else if (event.type === 'red_card') {
            eventIcon = '🟥';
            eventTypeText = 'Cartão Vermelho';
            eventClass = 'red-card';
        }

        return `
            <div class="event-item ${eventClass}">
                <div class="event-info">
                    <div class="event-type">${eventIcon} ${eventTypeText}</div>
                    <div class="event-details">${event.playerName} (${teamName}) - ${event.minute}'</div>
                </div>
                <button class="event-delete-btn" data-event-id="${event.id}" data-event-type="${event.type}">
                    Eliminar
                </button>
            </div>
        `;
    }

    /**
     * Trata a eliminação de um evento
     * @param {number} gameId - ID do jogo
     * @param {number} eventId - ID do evento
     * @param {string} eventType - Tipo de evento
     */
    handleDeleteEvent(gameId, eventId, eventType) {
        if (confirm('Tem a certeza que deseja eliminar este evento?')) {
            eventManager.removeEvent(gameId, eventId, eventType);
            this.renderEventsList(gameId);
            alert('Evento eliminado com sucesso!');
        }
    }

    /**
     * Trata a eliminação de jogo
     */
    async handleDeleteGame() {
        if (!authManager.canEdit()) {
            alert('Não tem permissão para eliminar jogos.');
            return;
        }

        const gameId = document.getElementById('editGameId').value;

        if (confirm('Tem a certeza que deseja eliminar este jogo?')) {
            if (await gameManager.deleteGame(gameId)) {
                this.closeModal();
                this.renderGamesList();
                alert('Jogo eliminado com sucesso!');
            } else {
                alert('Erro ao eliminar o jogo.');
            }
        }
    }

    /**
     * Renderiza a lista de jogos para edição
     */
    renderGamesList() {
        const gamesList = document.getElementById('gamesList');
        const emptyGames = document.getElementById('emptyGames');

        if (!gamesList) return;

        const games = gameManager.getGames();

        if (games.length === 0) {
            gamesList.innerHTML = '';
            if (emptyGames) emptyGames.style.display = 'block';
            return;
        }

        if (emptyGames) emptyGames.style.display = 'none';

        // Ordenar jogos por data
        const sortedGames = [...games].sort((a, b) => 
            new Date(a.date) - new Date(b.date)
        );

        gamesList.innerHTML = sortedGames.map(game => this.createGameManagementCard(game)).join('');

        // Adicionar event listeners aos botões de edição
        document.querySelectorAll('.edit-game-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const gameId = e.target.dataset.gameId;
                this.openEditModal(gameId);
            });
        });
    }

    /**
     * Cria o HTML de um cartão de jogo para gerenciamento
     * @param {object} game - Dados do jogo
     * @returns {string} - HTML do cartão
     */
    createGameManagementCard(game) {
        const statusText = gameManager.getStatusText(game.status);
        const gameDate = new Date(game.date);
        const dateStr = gameDate.toLocaleDateString('pt-PT', {
            weekday: 'short',
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
            <div class="game-management-card">
                <h5>${game.homeTeam} vs ${game.awayTeam}</h5>
                <p><strong>Placar:</strong> ${game.homeGoals} - ${game.awayGoals}</p>
                <p><strong>Status:</strong> ${statusText}</p>
                <p><strong>Competição:</strong> ${game.competition}</p>
                <p><strong>Data:</strong> ${dateStr}</p>
                <button class="btn btn-primary edit-game-btn" data-game-id="${game.id}">
                    Editar
                </button>
            </div>
        `;
    }

    /**
     * Abre o modal de edição de jogo
     * @param {number} gameId - ID do jogo
     */
    openEditModal(gameId) {
        const game = gameManager.getGameById(gameId);

        if (!game) {
            alert('Jogo não encontrado.');
            return;
        }

        // Carregar eventos do jogo
        eventManager.loadEventsLocal(gameId);

        // Preencher o formulário com os dados do jogo
        document.getElementById('editGameId').value = game.id;
        document.getElementById('editStatus').value = game.status;
        document.getElementById('editHomeGoals').value = game.homeGoals;
        document.getElementById('editAwayGoals').value = game.awayGoals;
        document.getElementById('editMinute').value = game.minute;

        // Renderizar lista de eventos
        this.renderEventsList(gameId);

        // Mostrar modal
        const modal = document.getElementById('editModal');
        if (modal) {
            modal.style.display = 'flex';
        }

        this.currentEditingGameId = gameId;
    }

    /**
     * Fecha o modal de edição
     */
    closeModal() {
        const modal = document.getElementById('editModal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.currentEditingGameId = null;
    }
}

// Instância global do painel de administração
const adminPanel = new AdminPanel();
