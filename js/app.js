class VukaApp {
    constructor() {
        this.games = [];
        this.clickCount = 0;
        this.init();
    }

    async init() {
        this.setupSecretClick();
        this.loadFirebaseData();
        
        // Atualiza o tempo dos jogos a cada 30 segundos automaticamente
        setInterval(() => this.calculateGameMinutes(), 30000);
    }

    setupSecretClick() {
        const devBtn = document.getElementById('devName');
        devBtn.addEventListener('click', () => {
            this.clickCount++;
            if (this.clickCount === 6) {
                window.location.href = 'admin.html';
            }
            setTimeout(() => { this.clickCount = 0; }, 2000);
        });
    }

    loadFirebaseData() {
        // O firebase.js já faz a sincronização para a variável global 'games'
        // Sempre que o Firebase atualizar, chamamos renderGames()
        firebaseManager.onUpdate((data) => {
            this.checkNotifications(this.games, data); // Notifica golos
            this.games = data;
            this.calculateGameMinutes();
        });
    }

    calculateGameMinutes() {
        this.games.forEach(game => {
            if (game.status === 'live' && game.startTime) {
                const start = new Date(game.startTime);
                const now = new Date();
                const diff = Math.floor((now - start) / 60000);
                game.displayMinute = diff > 90 ? "90+" : diff + "'";
            }
        });
        this.render();
    }

    checkNotifications(oldGames, newGames) {
        newGames.forEach(game => {
            const old = oldGames.find(g => g.id === game.id);
            if (old && (game.homeScore > old.homeScore || game.awayScore > old.awayScore)) {
                this.sendNotification(`GOLO! ${game.homeTeam} ${game.homeScore} - ${game.awayScore} ${game.awayTeam}`);
            }
        });
    }

    sendNotification(text) {
        if (Notification.permission === "granted") {
            new Notification("VukaSport Update", { body: text, icon: 'icons/icon-192.png' });
        }
    }

    render() {
        const container = document.getElementById('gamesContainer');
        container.innerHTML = this.games.map(game => `
            <div class="game-card">
                <div class="game-header">
                    <span>${game.competition}</span>
                    <span class="${game.status === 'live' ? 'live-indicator' : ''}">
                        ${game.status === 'live' ? game.displayMinute : 'Terminado'}
                    </span>
                </div>
                <div class="teams-container">
                    <div class="team-name">${game.homeTeam}</div>
                    <div class="score">${game.homeScore} - ${game.awayScore}</div>
                    <div class="team-name">${game.awayTeam}</div>
                </div>
            </div>
        `).join('');
    }
}

const app = new VukaApp();

