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
            
            // Garantir que os jogos de exemplo existem se a lista estiver vazia
            if (typeof gameManager !== 'undefined' && gameManager.getGames().length === 0) {
                gameManager.createSampleGames();
            }
            
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
    handleAddGame(e) {
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
        gameManager.addGame({
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
    handleEditGame(e) {
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

        if (gameManager.updateGame(gameId, {
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
     * Trata a eliminação de jogo
     */
    handleDeleteGame() {
        if (!authManager.canEdit()) {
            alert('Não tem permissão para eliminar jogos.');
            return;
        }

        const gameId = document.getElementById('editGameId').value;

        if (confirm('Tem a certeza que deseja eliminar este jogo?')) {
            if (gameManager.deleteGame(gameId)) {
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

        // Preencher o formulário com os dados do jogo
        document.getElementById('editGameId').value = game.id;
        document.getElementById('editStatus').value = game.status;
        document.getElementById('editHomeGoals').value = game.homeGoals;
        document.getElementById('editAwayGoals').value = game.awayGoals;
        document.getElementById('editMinute').value = game.minute;

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
