/**
 * VukaSport - Módulo de Autenticação
 * Controla o login e autenticação do administrador
 */

class AuthManager {
    constructor() {
        // Credenciais de teste (em produção, usar servidor)
        this.validCredentials = {
            username: 'admin',
            password: '123456'
        };

        this.currentUser = null;
        this.loadUser();
    }

    /**
     * Faz login com as credenciais fornecidas
     * @param {string} username - Nome de utilizador
     * @param {string} password - Palavra-passe
     * @returns {boolean} - True se login bem-sucedido
     */
    login(username, password) {
        if (username === this.validCredentials.username && 
            password === this.validCredentials.password) {
            
            this.currentUser = {
                username: username,
                loginTime: new Date().toISOString()
            };
            
            // Guardar no localStorage
            localStorage.setItem('vukasport_user', JSON.stringify(this.currentUser));
            localStorage.setItem('vukasport_token', this.generateToken());
            
            console.log('Login bem-sucedido para:', username);
            return true;
        }
        
        console.log('Falha no login - credenciais inválidas');
        return false;
    }

    /**
     * Faz logout do utilizador
     */
    logout() {
        this.currentUser = null;
        localStorage.removeItem('vukasport_user');
        localStorage.removeItem('vukasport_token');
        console.log('Logout realizado');
    }

    /**
     * Verifica se o utilizador está autenticado
     * @returns {boolean} - True se autenticado
     */
    isAuthenticated() {
        return this.currentUser !== null && this.getToken() !== null;
    }

    /**
     * Obtém o utilizador atual
     * @returns {object|null} - Utilizador ou null
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Carrega o utilizador do localStorage
     */
    loadUser() {
        const userStr = localStorage.getItem('vukasport_user');
        const token = localStorage.getItem('vukasport_token');
        
        if (userStr && token) {
            try {
                this.currentUser = JSON.parse(userStr);
                console.log('Utilizador carregado do localStorage:', this.currentUser.username);
            } catch (error) {
                console.error('Erro ao carregar utilizador:', error);
                this.logout();
            }
        }
    }

    /**
     * Gera um token simples para autenticação
     * @returns {string} - Token gerado
     */
    generateToken() {
        return 'token_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    /**
     * Obtém o token de autenticação
     * @returns {string|null} - Token ou null
     */
    getToken() {
        return localStorage.getItem('vukasport_token');
    }

    /**
     * Valida se o utilizador tem permissão para editar
     * @returns {boolean} - True se tem permissão
     */
    canEdit() {
        return this.isAuthenticated();
    }
}

// Instância global do gestor de autenticação
const authManager = new AuthManager();
