/**
 * VukaSport - Gerenciador de Eventos (Goleadas e Cartões) com Firestore
 * Controla o registo e notificação de eventos do jogo
 */

class EventManager {
    constructor() {
        this.events = {};
        this.notificationQueue = [];
    }

    /**
     * Inicializa os eventos de um jogo
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
     * Adiciona um golo e sincroniza com Firestore
     */
    async addGoal(gameId, team, minute, playerName) {
        this.initializeGameEvents(gameId);
        
        const goal = {
            id: Date.now().toString(),
            type: 'goal',
            team: team,
            minute: parseInt(minute),
            playerName: playerName || 'Desconhecido',
            timestamp: new Date().toISOString()
        };

        this.events[gameId].goals.push(goal);
        this.saveEventsLocal(gameId);
        
        // Sincronizar com Firestore
        if (typeof firebaseManager !== 'undefined' && firebaseManager.db) {
            await firebaseManager.addEventToFirebase(gameId, goal);
        }

        this.notifyGoal(gameId, team, playerName, minute);
        console.log('Golo adicionado:', goal);
        return goal;
    }

    /**
     * Adiciona um cartão amarelo e sincroniza com Firestore
     */
    async addYellowCard(gameId, team, minute, playerName) {
        this.initializeGameEvents(gameId);
        
        const card = {
            id: Date.now().toString(),
            type: 'yellow_card',
            team: team,
            minute: parseInt(minute),
            playerName: playerName || 'Desconhecido',
            timestamp: new Date().toISOString()
        };

        this.events[gameId].yellowCards.push(card);
        this.saveEventsLocal(gameId);
        
        if (typeof firebaseManager !== 'undefined' && firebaseManager.db) {
            await firebaseManager.addEventToFirebase(gameId, card);
        }

        this.notifyCard(gameId, team, playerName, minute, 'yellow');
        console.log('Cartão amarelo adicionado:', card);
        return card;
    }

    /**
     * Adiciona um cartão vermelho e sincroniza com Firestore
     */
    async addRedCard(gameId, team, minute, playerName) {
        this.initializeGameEvents(gameId);
        
        const card = {
            id: Date.now().toString(),
            type: 'red_card',
            team: team,
            minute: parseInt(minute),
            playerName: playerName || 'Desconhecido',
            timestamp: new Date().toISOString()
        };

        this.events[gameId].redCards.push(card);
        this.saveEventsLocal(gameId);
        
        if (typeof firebaseManager !== 'undefined' && firebaseManager.db) {
            await firebaseManager.addEventToFirebase(gameId, card);
        }

        this.notifyCard(gameId, team, playerName, minute, 'red');
        console.log('Cartão vermelho adicionado:', card);
        return card;
    }

    /**
     * Adiciona evento ao Firestore
     */
    async addEventToFirestore(gameId, eventData) {
        try {
            const db = firebaseManager.db;
            await db.collection("jogos").doc(gameId.toString()).collection("eventos").doc(eventData.id).set(eventData);
        } catch (error) {
            console.error('Erro ao adicionar evento ao Firestore:', error);
        }
    }

    /**
     * Remove um evento
     */
    async removeEvent(gameId, eventId, type) {
        this.initializeGameEvents(gameId);
        
        let array = [];
        if (type === 'goal') {
            array = this.events[gameId].goals;
        } else if (type === 'yellow_card') {
            array = this.events[gameId].yellowCards;
        } else if (type === 'red_card') {
            array = this.events[gameId].redCards;
        }

        const index = array.findIndex(e => e.id === eventId.toString());
        if (index !== -1) {
            array.splice(index, 1);
            this.saveEventsLocal(gameId);
            
            // Remover do Firestore
            if (typeof firebaseManager !== 'undefined' && firebaseManager.db) {
                await firebaseManager.deleteEventFromFirebase(gameId, eventId);
            }
            
            console.log('Evento removido:', eventId);
        }
    }

    /**
     * Obtém todos os eventos de um jogo
     */
    getGameEvents(gameId) {
        this.initializeGameEvents(gameId);
        return this.events[gameId];
    }

    /**
     * Obtém todos os eventos em ordem cronológica
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
     */
    saveEventsLocal(gameId) {
        const key = `vukasport_events_${gameId}`;
        localStorage.setItem(key, JSON.stringify(this.events[gameId]));
    }

    /**
     * Carrega os eventos do jogo do localStorage
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
     */
    notifyGoal(gameId, team, playerName, minute) {
        const game = gameManager.getGameById(gameId);
        if (!game) return;

        const teamName = team === 'home' ? game.homeTeam : game.awayTeam;
        const message = `⚽ GOLO! ${playerName} (${teamName}) - ${minute}'`;
        
        this.showNotification(message, 'goal');
        
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('VukaSport - GOLO!', {
                body: `${playerName} marcou para ${teamName} aos ${minute} minutos!`,
                icon: 'icons/icon-192.png',
                badge: 'icons/icon-192.png',
                tag: `goal-${gameId}-${Date.now()}`,
                requireInteraction: false
            });
        }

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
     */
    notifyCard(gameId, team, playerName, minute, cardColor) {
        const game = gameManager.getGameById(gameId);
        if (!game) return;

        const teamName = team === 'home' ? game.homeTeam : game.awayTeam;
        const cardEmoji = cardColor === 'yellow' ? '🟨' : '🟥';
        const cardText = cardColor === 'yellow' ? 'Cartão Amarelo' : 'Cartão Vermelho';
        const message = `${cardEmoji} ${cardText}! ${playerName} (${teamName}) - ${minute}'`;
        
        this.showNotification(message, cardColor === 'yellow' ? 'yellow-card' : 'red-card');
        
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`VukaSport - ${cardText}`, {
                body: `${playerName} (${teamName}) recebeu ${cardText.toLowerCase()} aos ${minute} minutos!`,
                icon: 'icons/icon-192.png',
                badge: 'icons/icon-192.png',
                tag: `card-${gameId}-${Date.now()}`,
                requireInteraction: false
            });
        }

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
        
        setTimeout(() => notification.classList.add('show'), 10);
        
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

const eventManager = new EventManager();

document.addEventListener('DOMContentLoaded', () => {
    eventManager.requestNotificationPermission();
});
