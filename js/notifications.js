/**
 * VukaSport - Gestor de Notificações
 * Gerencia notificações push para golos e eventos importantes
 */

class NotificationManager {
    constructor() {
        this.notificationsEnabled = false;
        this.lastGoalNotifications = new Map();
        this.goalThreshold = 3; // Número de golos para considerar "goleada"
        this.initializeNotifications();
    }

    /**
     * Inicializa o sistema de notificações
     */
    async initializeNotifications() {
        // Verificar suporte a notificações
        if (!('Notification' in window)) {
            console.log('Este navegador não suporta notificações');
            return;
        }

        // Verificar permissão atual
        if (Notification.permission === 'granted') {
            this.notificationsEnabled = true;
            this.setupNotificationListeners();
        } else if (Notification.permission !== 'denied') {
            // Pedir permissão
            await this.requestPermission();
        }

        // Carregar últimas notificações
        this.loadLastNotifications();

        // Registrar service worker para push notifications
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            this.registerPushManager();
        }
    }

    /**
     * Pede permissão para notificações
     */
    async requestPermission() {
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                this.notificationsEnabled = true;
                this.setupNotificationListeners();
                console.log('Permissão para notificações concedida');
            }
        } catch (error) {
            console.error('Erro ao pedir permissão:', error);
        }
    }

    /**
     * Configura listeners para notificações
     */
    setupNotificationListeners() {
        // Monitorar mudanças nos jogos
        window.addEventListener('gamesUpdated', (event) => {
            this.checkForGoalEvents(event.detail);
        });

        // Verificar a cada minuto por eventos importantes
        setInterval(() => {
            if (typeof gameManager !== 'undefined') {
                this.checkForGoalEvents(gameManager.getGames());
            }
        }, 60000);
    }

    /**
     * Regista gestor de push
     */
    async registerPushManager() {
        try {
            const registration = await navigator.serviceWorker.ready;
            
            // Verificar se já está subscrito
            const subscription = await registration.pushManager.getSubscription();
            
            if (!subscription) {
                // Subscrever para notificações push
                const newSubscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: this.urlBase64ToUint8Array('BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U')
                });
                
                console.log('Subscrito para notificações push');
            }
        } catch (error) {
            console.warn('Erro ao registar push manager:', error);
        }
    }

    /**
     * Verifica eventos de golos
     */
    checkForGoalEvents(games) {
        if (!this.notificationsEnabled) return;

        games.forEach(game => {
            if (game.status === 'live' || game.status === 'finished') {
                const totalGoals = game.homeGoals + game.awayGoals;
                const key = `${game.id}_goals`;
                const lastNotified = this.lastGoalNotifications.get(key) || 0;

                // Verificar se é goleada (diferença de 3 ou mais golos)
                const goalDifference = Math.abs(game.homeGoals - game.awayGoals);
                
                if (goalDifference >= this.goalThreshold && Date.now() - lastNotified > 3600000) {
                    this.sendGoalNotification(game);
                    this.lastGoalNotifications.set(key, Date.now());
                }

                // Verificar golos marcados (a cada 2 golos)
                if (totalGoals > 0 && totalGoals % 2 === 0) {
                    const goalKey = `${game.id}_goal_${totalGoals}`;
                    if (!this.lastGoalNotifications.has(goalKey)) {
                        this.sendGoalScoredNotification(game, totalGoals);
                        this.lastGoalNotifications.set(goalKey, Date.now());
                    }
                }
            }
        });

        // Guardar estado das notificações
        this.saveLastNotifications();
    }

    /**
     * Envia notificação de goleada
     */
    sendGoalNotification(game) {
        const title = '⚽ GOLEADA!';
        const options = {
            body: `${game.homeTeam} ${game.homeGoals} - ${game.awayGoals} ${game.awayTeam}\nDiferença de ${Math.abs(game.homeGoals - game.awayGoals)} golos!`,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            vibrate: [200, 100, 200],
            data: {
                gameId: game.id,
                url: window.location.href
            },
            actions: [
                {
                    action: 'open',
                    title: 'Ver Jogo'
                }
            ]
        };

        this.showNotification(title, options);
    }

    /**
     * Envia notificação de golo marcado
     */
    sendGoalScoredNotification(game, totalGoals) {
        const title = `⚽ Golo! ${totalGoals}º golo da partida`;
        const options = {
            body: `${game.homeTeam} ${game.homeGoals} - ${game.awayGoals} ${game.awayTeam}`,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            vibrate: [100, 50, 100],
            data: {
                gameId: game.id,
                url: window.location.href
            }
        };

        this.showNotification(title, options);
    }

    /**
     * Mostra notificação
     */
    showNotification(title, options) {
        if (!this.notificationsEnabled) return;

        // Usar service worker se disponível
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(title, options);
            });
        } else {
            // Fallback para notificações normais
            new Notification(title, options);
        }
    }

    /**
     * Carrega últimas notificações
     */
    loadLastNotifications() {
        try {
            const saved = localStorage.getItem('vukasport_notifications');
            if (saved) {
                const data = JSON.parse(saved);
                this.lastGoalNotifications = new Map(Object.entries(data));
            }
        } catch (error) {
            console.error('Erro ao carregar notificações:', error);
        }
    }

    /**
     * Guarda últimas notificações
     */
    saveLastNotifications() {
        try {
            const data = Object.fromEntries(this.lastGoalNotifications);
            localStorage.setItem('vukasport_notifications', JSON.stringify(data));
        } catch (error) {
            console.error('Erro ao guardar notificações:', error);
        }
    }

    /**
     * Converte base64 para Uint8Array
     */
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    /**
     * Ativa/desativa notificações
     */
    toggleNotifications() {
        if (this.notificationsEnabled) {
            this.notificationsEnabled = false;
        } else {
            this.requestPermission();
        }
    }

    /**
     * Verifica se notificações estão ativas
     */
    isEnabled() {
        return this.notificationsEnabled;
    }
}

// Instância global do gestor de notificações
const notificationManager = new NotificationManager();
