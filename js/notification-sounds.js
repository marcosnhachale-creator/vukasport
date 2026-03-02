/**
 * VukaSport - Gestor de Sons de Notificações
 * Permite selecionar e reproduzir diferentes sons de notificação
 */

class NotificationSoundManager {
    constructor() {
        this.soundType = 'default'; // Tipo de som padrão
        this.audioContext = null;
        this.sounds = {
            default: {
                name: 'Som Padrão',
                frequency: 800,
                duration: 0.5,
                type: 'sine'
            },
            bell: {
                name: 'Sino',
                frequency: 1046.5,
                duration: 0.6,
                type: 'sine'
            },
            alert: {
                name: 'Alerta',
                frequency: 1200,
                duration: 0.4,
                type: 'square'
            },
            chime: {
                name: 'Sino Duplo',
                frequency: 880,
                duration: 0.3,
                type: 'sine',
                double: true
            },
            beep: {
                name: 'Beep',
                frequency: 1000,
                duration: 0.2,
                type: 'sine'
            },
            notification: {
                name: 'Notificação',
                frequency: 750,
                duration: 0.5,
                type: 'sine'
            }
        };
        
        this.loadSoundSettings();
    }

    /**
     * Carrega as configurações de som do localStorage
     */
    loadSoundSettings() {
        const saved = localStorage.getItem('vukasport_notification_sound');
        if (saved && this.sounds[saved]) {
            this.soundType = saved;
        }
    }

    /**
     * Guarda as configurações de som
     */
    saveSoundSettings() {
        localStorage.setItem('vukasport_notification_sound', this.soundType);
    }

    /**
     * Define o tipo de som
     */
    setSoundType(soundType) {
        if (soundType in this.sounds) {
            this.soundType = soundType;
            this.saveSoundSettings();
            return true;
        }
        return false;
    }

    /**
     * Obtém o tipo de som atual
     */
    getSoundType() {
        return this.soundType;
    }

    /**
     * Obtém a lista de sons disponíveis
     */
    getAvailableSounds() {
        return Object.entries(this.sounds).map(([key, value]) => ({
            id: key,
            name: value.name
        }));
    }

    /**
     * Reproduz som de notificação
     */
    playNotificationSound() {
        try {
            const soundConfig = this.sounds[this.soundType];
            if (!soundConfig) {
                console.warn('Som não encontrado:', this.soundType);
                return;
            }

            // Criar contexto de áudio se não existir
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            const ctx = this.audioContext;
            const now = ctx.currentTime;

            if (soundConfig.double) {
                // Som duplo (dois beeps)
                this.playBeep(ctx, now, soundConfig.frequency, soundConfig.duration);
                this.playBeep(ctx, now + soundConfig.duration + 0.1, soundConfig.frequency * 1.2, soundConfig.duration);
            } else {
                this.playBeep(ctx, now, soundConfig.frequency, soundConfig.duration, soundConfig.type);
            }
        } catch (error) {
            console.warn('Erro ao reproduzir som de notificação:', error);
        }
    }

    /**
     * Reproduz um beep individual
     */
    playBeep(audioContext, startTime, frequency, duration, type = 'sine') {
        try {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = frequency;
            oscillator.type = type;

            // Envelope ADSR simplificado
            gainNode.gain.setValueAtTime(0.3, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        } catch (error) {
            console.warn('Erro ao reproduzir beep:', error);
        }
    }

    /**
     * Testa o som atual
     */
    testSound() {
        this.playNotificationSound();
    }

    /**
     * Testa um som específico
     */
    testSoundById(soundId) {
        if (soundId in this.sounds) {
            const previousSound = this.soundType;
            this.soundType = soundId;
            this.playNotificationSound();
            this.soundType = previousSound;
        }
    }
}

// Instância global do gestor de sons
const notificationSoundManager = new NotificationSoundManager();
