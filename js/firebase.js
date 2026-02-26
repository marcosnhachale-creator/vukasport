/**
 * VukaSport - Integração Cloud Firestore
 * Gerencia a sincronização em tempo real com a base de dados Firestore
 */

class FirebaseManager {
    constructor() {
        // Configuração do Firebase - Credenciais Reais
        this.firebaseConfig = {
            apiKey: "AIzaSyAcRCKUkY0UQJYoTfRTLiaOT3-95OMXSiE",
            authDomain: "vukasport-b375e.firebaseapp.com",
            databaseURL: "https://vukasport-b375e-default-rtdb.firebaseio.com",
            projectId: "vukasport-b375e",
            storageBucket: "vukasport-b375e.firebasestorage.app",
            messagingSenderId: "429504608014",
            appId: "1:429504608014:web:abc9c108fdda7b7043495f",
            measurementId: "G-YGYJXFP9P4"
        };

        this.db = null;
        this.isOnline = navigator.onLine;
        this.syncEnabled = true;
        this.listeners = [];
        
        this.initFirestore();
        this.initializeEventListeners();
    }

    /**
     * Inicializa o SDK do Firestore
     */
    async initFirestore() {
        try {
            // Nota: Em um ambiente real, os scripts do Firebase devem ser carregados no HTML
            // Aqui assumimos que o SDK está disponível globalmente via CDN no index.html
            if (typeof firebase !== 'undefined') {
                if (!firebase.apps.length) {
                    firebase.initializeApp(this.firebaseConfig);
                }
                this.db = firebase.firestore();
                
                // Habilitar persistência offline
                this.db.enablePersistence().catch((err) => {
                    if (err.code == 'failed-precondition') {
                        console.warn('Persistência falhou: múltiplas abas abertas');
                    } else if (err.code == 'unimplemented') {
                        console.warn('O navegador não suporta persistência');
                    }
                });

                this.setupRealtimeSync();
            } else {
                console.error('Firebase SDK não encontrado. Certifique-se de incluir os scripts no HTML.');
            }
        } catch (error) {
            console.error('Erro ao inicializar Firestore:', error);
        }
    }

    initializeEventListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('Conectado à internet');
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('Modo offline - Firestore usará cache local');
        });
    }

    /**
     * Configura a sincronizacao em tempo real usando onSnapshot do Firestore
     */
    setupRealtimeSync() {
        if (!this.db) return;

        // Listener para a colecao de jogos
        const unsubscribe = this.db.collection("jogos").onSnapshot((querySnapshot) => {
            const gamesArray = [];
            querySnapshot.forEach((doc) => {
                const gameData = { id: doc.id, ...doc.data() };
                gamesArray.push(gameData);
                
                // Configurar listener para eventos deste jogo
                this.setupGameEventsListener(doc.id);
            });

            console.log('Atualizacao Firestore recebida:', gamesArray.length, 'jogos');
            
            if (typeof gameManager !== 'undefined') {
                gameManager.games = gamesArray;
                gameManager.saveGamesLocal();
                gameManager.renderGames();
                
                // Atualizar admin se estiver aberto
                if (typeof adminPanel !== 'undefined') {
                    adminPanel.loadGamesToSelect();
                }
            }
        }, (error) => {
            console.error('Erro no listener do Firestore:', error);
        });

        this.listeners.push(unsubscribe);
    }

    /**
     * Configura listener para eventos de um jogo especifico
     */
    setupGameEventsListener(gameId) {
        if (!this.db) return;

        const unsubscribe = this.db.collection("jogos").doc(gameId.toString())
            .collection("eventos").onSnapshot((querySnapshot) => {
                const events = { goals: [], yellowCards: [], redCards: [] };
                
                querySnapshot.forEach((doc) => {
                    const eventData = doc.data();
                    if (eventData.type === 'goal') {
                        events.goals.push(eventData);
                    } else if (eventData.type === 'yellow_card') {
                        events.yellowCards.push(eventData);
                    } else if (eventData.type === 'red_card') {
                        events.redCards.push(eventData);
                    }
                });

                console.log('Eventos atualizados para jogo', gameId, ':', events);
                
                // Atualizar o eventManager
                if (typeof eventManager !== 'undefined') {
                    eventManager.events[gameId] = events;
                    eventManager.saveEventsLocal(gameId);
                    
                    // Renderizar timeline se a pagina de detalhes esta aberta
                    if (typeof gameDetailsManager !== 'undefined' && gameDetailsManager.gameId == gameId) {
                        gameDetailsManager.renderTimeline();
                        gameDetailsManager.renderStatistics();
                    }
                }
            }, (error) => {
                console.error('Erro ao ouvir eventos do jogo', gameId, ':', error);
            });

        this.listeners.push(unsubscribe);
    }

    /**
     * Adiciona um novo jogo ao Firestore
     */
    async addGameToFirebase(gameData) {
        if (!this.db) return false;
        try {
            const id = gameData.id.toString();
            delete gameData.id; // O ID será o nome do documento
            await this.db.collection("jogos").doc(id).set(gameData);
            return true;
        } catch (error) {
            console.error('Erro ao adicionar jogo ao Firestore:', error);
            return false;
        }
    }

    /**
     * Atualiza um jogo no Firestore
     */
    async updateGameInFirebase(gameId, updates) {
        if (!this.db) return false;
        try {
            await this.db.collection("jogos").doc(gameId.toString()).update(updates);
            return true;
        } catch (error) {
            console.error('Erro ao atualizar jogo no Firestore:', error);
            return false;
        }
    }

    /**
     * Elimina um jogo do Firestore
     */
    async deleteGameFromFirebase(gameId) {
        if (!this.db) return false;
        try {
            await this.db.collection("jogos").doc(gameId.toString()).delete();
            return true;
        } catch (error) {
            console.error('Erro ao eliminar jogo do Firestore:', error);
            return false;
        }
    }

    /**
     * Sincroniza credenciais de admin (Opcional para Firestore)
     */
    async syncAdminCredentials(credentials) {
        if (!this.db) return;
        try {
            await this.db.collection("config").doc("admin").set(credentials);
        } catch (error) {
            console.error('Erro ao sincronizar credenciais:', error);
        }
    }

    /**
     * Adiciona um evento ao Firestore
     */
    async addEventToFirebase(gameId, eventData) {
        if (!this.db) return false;
        try {
            await this.db.collection("jogos").doc(gameId.toString())
                .collection("eventos").doc(eventData.id.toString()).set(eventData);
            return true;
        } catch (error) {
            console.error('Erro ao adicionar evento ao Firestore:', error);
            return false;
        }
    }

    /**
     * Elimina um evento do Firestore
     */
    async deleteEventFromFirebase(gameId, eventId) {
        if (!this.db) return false;
        try {
            await this.db.collection("jogos").doc(gameId.toString())
                .collection("eventos").doc(eventId.toString()).delete();
            return true;
        } catch (error) {
            console.error('Erro ao eliminar evento do Firestore:', error);
            return false;
        }
    }
}

// Inicializar o gestor
const firebaseManager = new FirebaseManager();
window.firebaseManager = firebaseManager;
