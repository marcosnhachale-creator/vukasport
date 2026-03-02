/**
 * VukaSport - Gerenciador de Notificações Personalizadas
 * Permite configurar quais eventos geram notificações
 */

class NotificationsSettings {
    constructor() {
        this.settings = {
            matchStart: true,
            goals: true,
            goalPlayerName: true,
            halftimeResult: true,
            finalResult: true,
            redCards: true,
            yellowCards: false,
            substitutions: false
        };
        
        this.loadSettings();
    }

    /**
     * Carrega as configurações do localStorage
     */
    loadSettings() {
        const saved = localStorage.getItem('vukasport_notification_settings');
        if (saved) {
            try {
                this.settings = JSON.parse(saved);
            } catch (error) {
                console.error('Erro ao carregar configurações de notificações:', error);
            }
        }
    }

    /**
     * Guarda as configurações no localStorage
     */
    saveSettings() {
        localStorage.setItem('vukasport_notification_settings', JSON.stringify(this.settings));
    }

    /**
     * Atualiza uma configuração
     */
    updateSetting(key, value) {
        if (key in this.settings) {
            this.settings[key] = value;
            this.saveSettings();
        }
    }

    /**
     * Obtém uma configuração
     */
    getSetting(key) {
        return this.settings[key] || false;
    }

    /**
     * Notifica o início de um jogo
     */
    notifyMatchStart(game) {
        if (!this.getSetting('matchStart')) return;

        const message = `⚽ ${game.homeTeam} vs ${game.awayTeam} começou!`;
        this.showNotification(message, 'match-start');
        this.sendPushNotification('VukaSport - Jogo Iniciado', {
            body: `${game.homeTeam} vs ${game.awayTeam} - ${game.competition}`,
            icon: 'icons/icon-192.png'
        });
    }

    /**
     * Notifica um golo
     */
    notifyGoal(game, team, playerName, minute) {
        if (!this.getSetting('goals')) return;

        const teamName = team === 'home' ? game.homeTeam : game.awayTeam;
        const playerInfo = this.getSetting('goalPlayerName') ? playerName : 'Golo';
        const message = `⚽ GOLO! ${playerInfo} (${teamName}) - ${minute}'`;
        
        // Tocar som de notificação
        if (typeof notificationSoundManager !== 'undefined') {
            notificationSoundManager.playGoalSound();
        }
        
        this.showNotification(message, 'goal');
        this.sendPushNotification('VukaSport - GOLO!', {
            body: `${playerInfo} marcou para ${teamName} aos ${minute} minutos!`,
            icon: 'icons/icon-192.png',
            tag: 'goal-notification'
        });
    }

    /**
     * Notifica resultado do intervalo
     */
    notifyHalftimeResult(game) {
        if (!this.getSetting('halftimeResult')) return;

        const message = `🔔 Intervalo: ${game.homeTeam} ${game.homeGoals} - ${game.awayGoals} ${game.awayTeam}`;
        
        // Tocar som de notificação
        if (typeof notificationSoundManager !== 'undefined') {
            notificationSoundManager.playHalftimeSound();
        }
        
        this.showNotification(message, 'halftime');
        this.sendPushNotification('VukaSport - Intervalo', {
            body: `${game.homeTeam} ${game.homeGoals} - ${game.awayGoals} ${game.awayTeam}`,
            icon: 'icons/icon-192.png'
        });
    }

    /**
     * Notifica resultado final
     */
    notifyFinalResult(game) {
        if (!this.getSetting('finalResult')) return;

        const message = `🏁 Resultado Final: ${game.homeTeam} ${game.homeGoals} - ${game.awayGoals} ${game.awayTeam}`;
        
        // Tocar som de notificação
        if (typeof notificationSoundManager !== 'undefined') {
            notificationSoundManager.playFinalResultSound();
        }
        
        this.showNotification(message, 'final');
        this.sendPushNotification('VukaSport - Resultado Final', {
            body: `${game.homeTeam} ${game.homeGoals} - ${game.awayGoals} ${game.awayTeam}`,
            icon: 'icons/icon-192.png',
            tag: 'final-notification'
        });
    }

    /**
     * Notifica cartão vermelho
     */
    notifyRedCard(game, team, playerName, minute) {
        if (!this.getSetting('redCards')) return;

        const teamName = team === 'home' ? game.homeTeam : game.awayTeam;
        const message = `🟥 Cartão Vermelho! ${playerName} (${teamName}) - ${minute}'`;
        
        // Tocar som de notificação
        if (typeof notificationSoundManager !== 'undefined') {
            notificationSoundManager.playRedCardSound();
        }
        
        this.showNotification(message, 'red-card');
        this.sendPushNotification('VukaSport - Cartão Vermelho', {
            body: `${playerName} (${teamName}) foi expulso aos ${minute} minutos!`,
            icon: 'icons/icon-192.png'
        });
    }

    /**
     * Notifica cartão amarelo
     */
    notifyYellowCard(game, team, playerName, minute) {
        if (!this.getSetting('yellowCards')) return;

        const teamName = team === 'home' ? game.homeTeam : game.awayTeam;
        const message = `🟨 Cartão Amarelo: ${playerName} (${teamName}) - ${minute}'`;
        
        // Tocar som de notificação
        if (typeof notificationSoundManager !== 'undefined') {
            notificationSoundManager.playYellowCardSound();
        }
        
        this.showNotification(message, 'yellow-card');
        this.sendPushNotification('VukaSport - Cartão Amarelo', {
            body: `${playerName} (${teamName}) recebeu cartão amarelo aos ${minute} minutos!`,
            icon: 'icons/icon-192.png'
        });
    }

    /**
     * Notifica substituição
     */
    notifySubstitution(game, team, playerOut, playerIn, minute) {
        if (!this.getSetting('substitutions')) return;

        const teamName = team === 'home' ? game.homeTeam : game.awayTeam;
        const message = `🔄 Substituição (${teamName}): ${playerOut} sai, ${playerIn} entra - ${minute}'`;
        
        // Tocar som de notificação
        if (typeof notificationSoundManager !== 'undefined') {
            notificationSoundManager.playSubstitutionSound();
        }
        
        this.showNotification(message, 'substitution');
    }

    /**
     * Mostra notificação visual no app
     */
    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification-popup ${type}`;
        notification.innerHTML = `
            <div class="notification-popup-content">
                <p>${message}</p>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animar entrada
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Remover após 6 segundos
        setTimeout(() => {
            notification.classList.add('hide');
            setTimeout(() => notification.remove(), 300);
        }, 6000);
    }

    /**
     * Envia notificação push
     */
    sendPushNotification(title, options) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, options);
        }
    }

    /**
     * Solicita permissão para notificações push
     */
    requestPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    console.log('Permissão de notificações concedida');
                }
            });
        }
    }
}

// Instância global
const notificationsSettings = new NotificationsSettings();

// Solicitar permissão ao carregar
document.addEventListener('DOMContentLoaded', () => {
    notificationsSettings.requestPermission();
});
