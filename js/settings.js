/**
 * VukaSport - Página de Definições
 * Gerencia as configurações do utilizador
 */

class SettingsPage {
    constructor() {
        this.initializeEventListeners();
        this.loadSettings();
        this.setupDarkMode();
    }

    /**
     * Inicializa os event listeners
     */
    initializeEventListeners() {
        // Notificações
        const notificationToggles = document.querySelectorAll('.notification-toggle');
        notificationToggles.forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const setting = e.target.getAttribute('data-setting');
                const value = e.target.checked;
                notificationsSettings.updateSetting(setting, value);
            });
        });

        // Tema escuro
        const themeToggle = document.getElementById('darkMode');
        if (themeToggle) {
            themeToggle.addEventListener('change', (e) => {
                this.toggleDarkMode(e.target.checked);
            });
        }

        // Atualização automática
        const autoRefreshToggle = document.getElementById('autoRefresh');
        if (autoRefreshToggle) {
            autoRefreshToggle.addEventListener('change', (e) => {
                localStorage.setItem('vukasport_auto_refresh', e.target.checked);
            });
        }

        // Botões de ação
        const clearCacheBtn = document.getElementById('clearCacheBtn');
        if (clearCacheBtn) {
            clearCacheBtn.addEventListener('click', () => this.clearCache());
        }

        const resetSettingsBtn = document.getElementById('resetSettingsBtn');
        if (resetSettingsBtn) {
            resetSettingsBtn.addEventListener('click', () => this.resetSettings());
        }

        // Botão de teste de som de notificação
        const testNotificationSoundBtn = document.getElementById('testNotificationSoundBtn');
        if (testNotificationSoundBtn) {
            testNotificationSoundBtn.addEventListener('click', () => this.testNotificationSound());
        }
    }

    /**
     * Testa o som de notificação
     */
    testNotificationSound() {
        if (typeof notificationManager !== 'undefined') {
            notificationManager.testNotificationSound();
            alert('Som de notificação reproduzido!');
        } else {
            alert('Gestor de notificações não disponível.');
        }
    }

    /**
     * Carrega as configurações
     */
    loadSettings() {
        // Carregar notificações
        const notificationToggles = document.querySelectorAll('.notification-toggle');
        notificationToggles.forEach(toggle => {
            const setting = toggle.getAttribute('data-setting');
            toggle.checked = notificationsSettings.getSetting(setting);
        });

        // Carregar tema
        const isDarkMode = localStorage.getItem('vukasport_dark_mode') === 'true';
        const themeToggle = document.getElementById('darkMode');
        if (themeToggle) {
            themeToggle.checked = isDarkMode;
        }

        // Carregar atualização automática
        const autoRefreshToggle = document.getElementById('autoRefresh');
        if (autoRefreshToggle) {
            const autoRefresh = localStorage.getItem('vukasport_auto_refresh') !== 'false';
            autoRefreshToggle.checked = autoRefresh;
        }
    }

    /**
     * Toggle do modo escuro
     */
    toggleDarkMode(enabled) {
        const htmlElement = document.documentElement;
        
        if (enabled) {
            htmlElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('vukasport_dark_mode', 'true');
        } else {
            htmlElement.removeAttribute('data-theme');
            localStorage.setItem('vukasport_dark_mode', 'false');
        }
    }

    /**
     * Configura o modo escuro inicial
     */
    setupDarkMode() {
        const isDarkMode = localStorage.getItem('vukasport_dark_mode') === 'true';
        if (isDarkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    }

    /**
     * Limpa o cache
     */
    clearCache() {
        if (confirm('Tem a certeza que deseja limpar o cache? Isto removerá todos os dados armazenados localmente.')) {
            try {
                // Limpar localStorage (exceto configurações)
                const keysToKeep = [
                    'vukasport_dark_mode',
                    'vukasport_notification_settings',
                    'vukasport_auto_refresh'
                ];

                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (!keysToKeep.includes(key)) {
                        keysToRemove.push(key);
                    }
                }

                keysToRemove.forEach(key => localStorage.removeItem(key));

                // Limpar cache do service worker
                if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then(registrations => {
                        registrations.forEach(registration => {
                            caches.keys().then(cacheNames => {
                                cacheNames.forEach(cacheName => {
                                    caches.delete(cacheName);
                                });
                            });
                        });
                    });
                }

                alert('Cache limpo com sucesso!');
            } catch (error) {
                console.error('Erro ao limpar cache:', error);
                alert('Erro ao limpar cache.');
            }
        }
    }

    /**
     * Restaura as configurações padrão
     */
    resetSettings() {
        if (confirm('Tem a certeza que deseja restaurar as configurações padrão? Esta ação não pode ser desfeita.')) {
            try {
                // Restaurar notificações
                notificationsSettings.settings = {
                    matchStart: true,
                    goals: true,
                    goalPlayerName: true,
                    halftimeResult: true,
                    finalResult: true,
                    redCards: true,
                    yellowCards: false,
                    substitutions: false
                };
                notificationsSettings.saveSettings();

                // Restaurar tema
                localStorage.setItem('vukasport_dark_mode', 'false');
                document.documentElement.removeAttribute('data-theme');

                // Restaurar atualização automática
                localStorage.setItem('vukasport_auto_refresh', 'true');

                // Recarregar página
                this.loadSettings();
                alert('Configurações restauradas com sucesso!');
            } catch (error) {
                console.error('Erro ao restaurar configurações:', error);
                alert('Erro ao restaurar configurações.');
            }
        }
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    // Garantir que o gestor de notificações está carregado
    if (typeof notificationManager === 'undefined') {
        console.warn('Gestor de notificações não carregado ainda.');
    }
    new SettingsPage();
});
