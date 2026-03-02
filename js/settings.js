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
        // Notificacoes
        const notificationToggles = document.querySelectorAll('.notification-toggle');
        notificationToggles.forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const setting = e.target.getAttribute('data-setting');
                const value = e.target.checked;
                notificationsSettings.updateSetting(setting, value);
            });
        });

        // Som de notificacoes
        const soundSelect = document.getElementById('notificationSoundSelect');
        if (soundSelect && typeof notificationSoundManager !== 'undefined') {
            this.populateSoundOptions(soundSelect);
            soundSelect.addEventListener('change', (e) => {
                notificationSoundManager.setSoundType(e.target.value);
            });
        }

        // Botao de preview de som
        const previewSoundBtn = document.getElementById('previewSoundBtn');
        if (previewSoundBtn && typeof notificationSoundManager !== 'undefined') {
            previewSoundBtn.addEventListener('click', () => {
                notificationSoundManager.testSound();
            });
        }

        // Tema escuro
        const themeToggle = document.getElementById('darkMode');
        if (themeToggle) {
            themeToggle.addEventListener('change', (e) => {
                this.toggleDarkMode(e.target.checked);
            });
        }

        // Atualizacao automatica
        const autoRefreshToggle = document.getElementById('autoRefresh');
        if (autoRefreshToggle) {
            autoRefreshToggle.addEventListener('change', (e) => {
                localStorage.setItem('vukasport_auto_refresh', e.target.checked);
            });
        }

        // Botoes de acao
        const clearCacheBtn = document.getElementById('clearCacheBtn');
        if (clearCacheBtn) {
            clearCacheBtn.addEventListener('click', () => this.clearCache());
        }

        const resetSettingsBtn = document.getElementById('resetSettingsBtn');
        if (resetSettingsBtn) {
            resetSettingsBtn.addEventListener('click', () => this.resetSettings());
        }

        // Botao de teste de som de notificacao
        const testNotificationSoundBtn = document.getElementById('testNotificationSoundBtn');
        if (testNotificationSoundBtn) {
            testNotificationSoundBtn.addEventListener('click', () => this.testNotificationSound());
        }
    }

    /**
     * Popula as opcoes de som no select
     */
    populateSoundOptions(selectElement) {
        if (typeof notificationSoundManager === 'undefined') return;

        const sounds = notificationSoundManager.getAvailableSounds();
        const currentSound = notificationSoundManager.getSoundType();

        sounds.forEach(sound => {
            const option = document.createElement('option');
            option.value = sound.id;
            option.textContent = sound.name;
            if (sound.id === currentSound) {
                option.selected = true;
            }
            selectElement.appendChild(option);
        });
    }

    /**
     * Testa o som de notificacao
     */
    testNotificationSound() {
        if (typeof notificationManager !== 'undefined') {
            notificationManager.testNotificationSound();
            alert('Som de notificacao reproduzido!');
        } else {
            alert('Gestor de notificacoes nao disponivel.');
        }
    }

    /**
     * Carrega as configuracoes
     */
    loadSettings() {
        // Carregar notificacoes
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

        // Carregar atualizacao automatica
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
        if (confirm('Tem a certeza que deseja limpar o cache? Isto removera todos os dados armazenados localmente.')) {
            try {
                // Limpar localStorage (exceto configuracoes)
                const keysToKeep = [
                    'vukasport_dark_mode',
                    'vukasport_notification_settings',
                    'vukasport_auto_refresh',
                    'vukasport_notification_sound'
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
     * Restaura as configuracoes padrao
     */
    resetSettings() {
        if (confirm('Tem a certeza que deseja restaurar as configuracoes padrao? Esta acao nao pode ser desfeita.')) {
            try {
                // Restaurar notificacoes
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

                // Restaurar som
                if (typeof notificationSoundManager !== 'undefined') {
                    notificationSoundManager.setSoundType('default');
                }

                // Restaurar tema
                localStorage.setItem('vukasport_dark_mode', 'false');
                document.documentElement.removeAttribute('data-theme');

                // Restaurar atualizacao automatica
                localStorage.setItem('vukasport_auto_refresh', 'true');

                // Recarregar pagina
                this.loadSettings();
                alert('Configuracoes restauradas com sucesso!');
            } catch (error) {
                console.error('Erro ao restaurar configuracoes:', error);
                alert('Erro ao restaurar configuracoes.');
            }
        }
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    // Garantir que o gestor de notificacoes esta carregado
    if (typeof notificationManager === 'undefined') {
        console.warn('Gestor de notificacoes nao carregado ainda.');
    }
    new SettingsPage();
});
