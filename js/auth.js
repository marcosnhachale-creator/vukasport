/**
 * VukaSport - Módulo de Autenticação
 * Controla o login e autenticação do administrador
 */

class AuthManager {
    constructor() {
        this.validCredentials = {
            username: 'admin',
            password: '123456'
        };

        this.currentUser = null;
        this.loadUser();
        this.loadCredentials();
    }

    /**
     * Faz login com as credenciais fornecidas
     */
    login(username, password) {
        if (username === this.validCredentials.username && 
            password === this.validCredentials.password) {
            
            this.currentUser = {
                username: username,
                loginTime: new Date().toISOString()
            };
            
            localStorage.setItem('vukasport_user', JSON.stringify(this.currentUser));
            localStorage.setItem('vukasport_token', this.generateToken());
            
            // Guardar acesso secreto
            sessionStorage.setItem('secretAdminAccess', 'true');
            
            console.log('Login bem-sucedido');
            return true;
        }
        
        return false;
    }

    /**
     * Faz logout do utilizador
     */
    logout() {
        this.currentUser = null;
        localStorage.removeItem('vukasport_user');
        localStorage.removeItem('vukasport_token');
        sessionStorage.removeItem('secretAdminAccess');
    }

    /**
     * Verifica se o utilizador está autenticado
     */
    isAuthenticated() {
        return this.currentUser !== null && this.getToken() !== null;
    }

    /**
     * Obtém o utilizador atual
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
            } catch (error) {
                console.error('Erro ao carregar utilizador:', error);
                this.logout();
            }
        }
    }

    /**
     * Gera um token simples para autenticação
     */
    generateToken() {
        return 'token_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    /**
     * Obtém o token de autenticação
     */
    getToken() {
        return localStorage.getItem('vukasport_token');
    }

    /**
     * Valida se o utilizador tem permissão para editar
     */
    canEdit() {
        return this.isAuthenticated();
    }

    /**
     * Altera a senha do admin
     */
    changePassword(currentPassword, newPassword) {
        if (currentPassword !== this.validCredentials.password) {
            return {
                success: false,
                message: 'Palavra-passe atual incorreta.'
            };
        }

        if (!newPassword || newPassword.length < 6) {
            return {
                success: false,
                message: 'A nova palavra-passe deve ter pelo menos 6 caracteres.'
            };
        }

        this.validCredentials.password = newPassword;
        localStorage.setItem('vukasport_credentials', JSON.stringify(this.validCredentials));
        
        return {
            success: true,
            message: 'Palavra-passe alterada com sucesso!'
        };
    }

    /**
     * Carrega as credenciais do localStorage
     */
    loadCredentials() {
        const storedCredentials = localStorage.getItem('vukasport_credentials');
        if (storedCredentials) {
            try {
                this.validCredentials = JSON.parse(storedCredentials);
            } catch (error) {
                console.error('Erro ao carregar credenciais:', error);
            }
        }
    }
}

const authManager = new AuthManager();
authManager.loadCredentials();
