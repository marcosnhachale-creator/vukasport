/**
 * VukaSport - Gerenciador de Eventos (Goleadas e Cartões)
 * Controla o registo e notificação de eventos do jogo
 */

class EventManager {
    constructor() {
        this.events = {};
        this.notificationQueue = [];
    }

    /**
     * Inicializa os eventos de um jogo
     * @param {number} gameId - ID do jogo
     */
    initializeGameEvents(gameId) {
        if (!this.events[gameId]) {
            this.events[gameId] = {
                goals: [],
                yellowCards: [],
                redCards: []
            };
        }
    }

    /**
     * Adiciona um golo
     * @param {number} gameId - ID do jogo
     * @param {string} team - 'home' ou 'away'
     * @param {number} minute - Minuto do golo
     * @param {string} playerName - Nome do jogador
     * @returns {object} - Evento adicionado
     */
    addGoal(gameId, team, minute, playerName) {
        this.initializeGameEvents(gameId);
        
        const goal = {
            id: Date.now(),
            type: 'goal',
            team: team,
            minute: parseInt(minute),
            playerName: playerName || 'Desconhecido',
            timestamp: new Date().toISOString()
        };

        this.events[gameId].goals.push(goal);
        this.saveEventsLocal(gameId);
        
        // Sincronizar com Firebase
        if (typeof firebaseManager !== 'undefined' && firebaseManager.isOnline) {
            firebaseManager.addEventToFirebase(gameId, goal);
        }

        // Notificar utilizadores
        this.notifyGoal(gameId, team, playerName, minute);
        
        console.log('Golo adicionado:', goal);
        return goal;
    }

    /**
     * Adiciona um cartão amarelo
     * @param {number} gameId - ID do jogo
     * @param {string} team - 'home' ou 'away'
     * @param {number} minute - Minuto do cartão
     * @param {string} playerName - Nome do jogador
     * @returns {object} - Evento adicionado
     */
    addYellowCard(gameId, team, minute, playerName) {
        this.initializeGameEvents(gameId);
        
        const card = {
            id: Date.now(),
            type: 'yellow_card',
            team: team,
            minute: parseInt(minute),
            playerName: playerName || 'Desconhecido',
            timestamp: new Date().toISOString()
        };

        this.events[gameId].yellowCards.push(card);
        this.saveEventsLocal(gameId);
        
        // Sincronizar com Firebase
        if (typeof firebaseManager !== 'undefined' && firebaseManager.isOnline) {
            firebaseManager.addEventToFirebase(gameId, card);
        }

        // Notificar utilizadores
        this.notifyCard(gameId, team, playerName, minute, 'yellow');
        
        console.log('Cartão amarelo adicionado:', card);
        return card;
    }

    /**
     * Adiciona um cartão vermelho
     * @param {number} gameId - ID do jogo
     * @param {string} team - 'home' ou 'away'
     * @param {number} minute - Minuto do cartão
     * @param {string} playerName - Nome do jogador
     * @returns {object} - Evento adicionado
     */
    addRedCard(gameId, team, minute, playerName) {
        this.initializeGameEvents(gameId);
        
        const card = {
            id: Date.now(),
            type: 'red_card',
            team: team,
            minute: parseInt(minute),
            playerName: playerName || 'Desconhecido',
            timestamp: new Date().toISOString()
        };

        this.events[gameId].redCards.push(card);
        this.saveEventsLocal(gameId);
        
        // Sincronizar com Firebase
        if (typeof firebaseManager !== 'undefined' && firebaseManager.isOnline) {
            firebaseManager.addEventToFirebase(gameId, card);
        }

        // Notificar utilizadores
        this.notifyCard(gameId, team, playerName, minute, 'red');
        
        console.log('Cartão vermelho adicionado:', card);
        return card;
    }

    /**
     * Remove um evento
     * @param {number} gameId - ID do jogo
     * @param {string} eventId - ID do evento
     * @param {string} type - Tipo de evento ('goal', 'yellow_card', 'red_card')
     */
    removeEvent(gameId, eventId, type) {
        this.initializeGameEvents(gameId);
        
        let array = [];
        if (type === 'goal') {
            array = this.events[gameId].goals;
        } else if (type === 'yellow_card') {
            array = this.events[gameId].yellowCards;
        } else if (type === 'red_card') {
            array = this.events[gameId].redCards;
        }

        const index = array.findIndex(e => e.id === parseInt(eventId));
        if (index !== -1) {
            array.splice(index, 1);
            this.saveEventsLocal(gameId);
            
            // Sincronizar com Firebase
            if (typeof firebaseManager !== 'undefined' && firebaseManager.isOnline) {
                firebaseManager.removeEventFromFirebase(gameId, eventId);
            }
            
            console.log('Evento removido:', eventId);
        }
    }

    /**
     * Obtém todos os eventos de um jogo
     * @param {number} gameId - ID do jogo
     * @returns {object} - Eventos do jogo
     */
    getGameEvents(gameId) {
        this.initializeGameEvents(gameId);
        return this.events[gameId];
    }

    /**
     * Obtém todos os eventos em ordem cronológica
     * @param {number} gameId - ID do jogo
     * @returns {array} - Array de eventos ordenados
     */
    getAllEventsOrdered(gameId) {
        const gameEvents = this.getGameEvents(gameId);
        const allEvents = [
            ...gameEvents.goals,
            ...gameEvents.yellowCards,
            ...gameEvents.redCards
        ];

        return allEvents.sort((a, b) => a.minute - b.minute);
    }

    /**
     * Guarda os eventos do jogo no localStorage
     * @param {number} gameId - ID do jogo
     */
    saveEventsLocal(gameId) {
        const key = `vukasport_events_${gameId}`;
        localStorage.setItem(key, JSON.stringify(this.events[gameId]));
    }

    /**
     * Carrega os eventos do jogo do localStorage
     * @param {number} gameId - ID do jogo
     */
    loadEventsLocal(gameId) {
        const key = `vukasport_events_${gameId}`;
        const eventsStr = localStorage.getItem(key);
        
        if (eventsStr) {
            try {
                this.events[gameId] = JSON.parse(eventsStr);
                console.log('Eventos carregados do localStorage:', gameId);
            } catch (error) {
                console.error('Erro ao carregar eventos:', error);
                this.initializeGameEvents(gameId);
            }
        } else {
            this.initializeGameEvents(gameId);
        }
    }

    /**
     * Notifica sobre um golo
     * @param {number} gameId - ID do jogo
     * @param {string} team - 'home' ou 'away'
     * @param {string} playerName - Nome do jogador
     * @param {number} minute - Minuto do golo
     */
    notifyGoal(gameId, team, playerName, minute) {
        const game = gameManager.getGameById(gameId);
        if (!game) return;

        const teamName = team === 'home' ? game.homeTeam : game.awayTeam;
        const message = `⚽ GOLO! ${playerName} (${teamName}) - ${minute}'`;
        
        // Notificação visual
        this.showNotification(message, 'goal');
        
        // Notificação push
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('VukaSport - GOLO!', {
                body: `${playerName} marcou para ${teamName} aos ${minute} minutos!`,
                icon: 'icons/icon-192.png',
                badge: 'icons/icon-192.png',
                tag: `goal-${gameId}-${Date.now()}`,
                requireInteraction: false
            });
        }

        // Enviar para Service Worker
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'SHOW_GOAL_NOTIFICATION',
                teamName: teamName,
                playerName: playerName,
                minute: minute
            });
        }
    }

    /**
     * Notifica sobre um cartão
     * @param {number} gameId - ID do jogo
     * @param {string} team - 'home' ou 'away'
     * @param {string} playerName - Nome do jogador
     * @param {number} minute - Minuto do cartão
     * @param {string} cardColor - 'yellow' ou 'red'
     */
    notifyCard(gameId, team, playerName, minute, cardColor) {
        const game = gameManager.getGameById(gameId);
        if (!game) return;

        const teamName = team === 'home' ? game.homeTeam : game.awayTeam;
        const cardEmoji = cardColor === 'yellow' ? '🟨' : '🟥';
        const cardText = cardColor === 'yellow' ? 'Cartão Amarelo' : 'Cartão Vermelho';
        const message = `${cardEmoji} ${cardText}! ${playerName} (${teamName}) - ${minute}'`;
        
        // Notificação visual
        this.showNotification(message, cardColor === 'yellow' ? 'yellow-card' : 'red-card');
        
        // Notificação push
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`VukaSport - ${cardText}`, {
                body: `${playerName} (${teamName}) recebeu ${cardText.toLowerCase()} aos ${minute} minutos!`,
                icon: 'icons/icon-192.png',
                badge: 'icons/icon-192.png',
                tag: `card-${gameId}-${Date.now()}`,
                requireInteraction: false
            });
        }

        // Enviar para Service Worker
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'SHOW_CARD_NOTIFICATION',
                cardColor: cardColor,
                teamName: teamName,
                playerName: playerName,
                minute: minute
            });
        }
    }

    /**
     * Mostra notificação visual no app
     * @param {string} message - Mensagem da notificação
     * @param {string} type - Tipo de notificação ('goal', 'yellow-card', 'red-card')
     */
    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `card-notification ${type}`;
        
        let title = '';
        if (type === 'goal') {
            title = '⚽ GOLO!';
        } else if (type === 'yellow-card') {
            title = '🟨 Cartão Amarelo';
        } else if (type === 'red-card') {
            title = '🟥 Cartão Vermelho';
        }

        notification.innerHTML = `
            <div class="notification-title">${title}</div>
            <div class="notification-message">${message}</div>
        `;
        
        document.body.appendChild(notification);
        
        // Animar entrada
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Remover após 5 segundos
        setTimeout(() => {
            notification.classList.add('hide');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    /**
     * Solicita permissão para notificações push
     */
    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    console.log('Permissão de notificações concedida');
                }
            });
        }
    }
}

// Instância global do gerenciador de eventos
const eventManager = new EventManager();

// Solicitar permissão de notificações ao carregar
document.addEventListener('DOMContentLoaded', () => {
    eventManager.requestNotificationPermission();
});
