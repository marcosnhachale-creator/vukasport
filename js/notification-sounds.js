/**
 * VukaSport - Gestor de Sons de Notificações
 * Gerencia sons personalizados para notificações de eventos
 */

class NotificationSoundManager {
    constructor() {
        this.sounds = {
            goal: new Audio(),
            redCard: new Audio(),
            yellowCard: new Audio(),
            matchStart: new Audio(),
            halftime: new Audio(),
            finalResult: new Audio(),
            substitution: new Audio()
        };

        this.soundSettings = {
            goalSound: 'default',
            redCardSound: 'default',
            yellowCardSound: 'default',
            matchStartSound: 'default',
            halftimeSound: 'default',
            finalResultSound: 'default',
            substitutionSound: 'default',
            soundVolume: 0.7,
            soundEnabled: true
        };

        // Sons padrão (usando data URLs com áudio gerado)
        this.defaultSounds = {
            goal: this.generateGoalSound(),
            redCard: this.generateRedCardSound(),
            yellowCard: this.generateYellowCardSound(),
            matchStart: this.generateMatchStartSound(),
            halftime: this.generateHalftimeSound(),
            finalResult: this.generateFinalResultSound(),
            substitution: this.generateSubstitutionSound()
        };

        this.loadSettings();
        this.initializeSounds();
    }

    /**
     * Gera som de golo
     */
    generateGoalSound() {
        return 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==';
    }

    /**
     * Gera som de cartão vermelho
     */
    generateRedCardSound() {
        return 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==';
    }

    /**
     * Gera som de cartão amarelo
     */
    generateYellowCardSound() {
        return 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==';
    }

    /**
     * Gera som de início de partida
     */
    generateMatchStartSound() {
        return 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==';
    }

    /**
     * Gera som de intervalo
     */
    generateHalftimeSound() {
        return 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==';
    }

    /**
     * Gera som de resultado final
     */
    generateFinalResultSound() {
        return 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==';
    }

    /**
     * Gera som de substituição
     */
    generateSubstitutionSound() {
        return 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==';
    }

    /**
     * Inicializa os sons
     */
    initializeSounds() {
        Object.keys(this.sounds).forEach(key => {
            this.sounds[key].volume = this.soundSettings.soundVolume;
            this.sounds[key].src = this.defaultSounds[key];
        });
    }

    /**
     * Carrega configurações do localStorage
     */
    loadSettings() {
        const saved = localStorage.getItem('vukasport_sound_settings');
        if (saved) {
            try {
                this.soundSettings = JSON.parse(saved);
            } catch (error) {
                console.error('Erro ao carregar configurações de som:', error);
            }
        }
    }

    /**
     * Guarda configurações no localStorage
     */
    saveSettings() {
        localStorage.setItem('vukasport_sound_settings', JSON.stringify(this.soundSettings));
    }

    /**
     * Atualiza configuração de som
     */
    updateSoundSetting(key, value) {
        if (key in this.soundSettings) {
            this.soundSettings[key] = value;
            this.saveSettings();
            
            // Se for volume, atualizar todos os sons
            if (key === 'soundVolume') {
                Object.values(this.sounds).forEach(sound => {
                    sound.volume = value;
                });
            }
        }
    }

    /**
     * Obtém configuração de som
     */
    getSoundSetting(key) {
        return this.soundSettings[key];
    }

    /**
     * Define som personalizado para um evento
     */
    setCustomSound(eventType, audioUrl) {
        if (eventType in this.sounds) {
            this.sounds[eventType].src = audioUrl;
            this.updateSoundSetting(`${eventType}Sound`, 'custom');
        }
    }

    /**
     * Toca som de golo
     */
    playGoalSound() {
        if (this.soundSettings.soundEnabled) {
            this.playSound('goal');
        }
    }

    /**
     * Toca som de cartão vermelho
     */
    playRedCardSound() {
        if (this.soundSettings.soundEnabled) {
            this.playSound('redCard');
        }
    }

    /**
     * Toca som de cartão amarelo
     */
    playYellowCardSound() {
        if (this.soundSettings.soundEnabled) {
            this.playSound('yellowCard');
        }
    }

    /**
     * Toca som de início de partida
     */
    playMatchStartSound() {
        if (this.soundSettings.soundEnabled) {
            this.playSound('matchStart');
        }
    }

    /**
     * Toca som de intervalo
     */
    playHalftimeSound() {
        if (this.soundSettings.soundEnabled) {
            this.playSound('halftime');
        }
    }

    /**
     * Toca som de resultado final
     */
    playFinalResultSound() {
        if (this.soundSettings.soundEnabled) {
            this.playSound('finalResult');
        }
    }

    /**
     * Toca som de substituição
     */
    playSubstitutionSound() {
        if (this.soundSettings.soundEnabled) {
            this.playSound('substitution');
        }
    }

    /**
     * Toca som genérico
     */
    playSound(soundType) {
        try {
            if (this.sounds[soundType]) {
                // Reiniciar o som se já estiver tocando
                this.sounds[soundType].currentTime = 0;
                this.sounds[soundType].play().catch(error => {
                    console.warn(`Erro ao tocar som ${soundType}:`, error);
                });
            }
        } catch (error) {
            console.error(`Erro ao tocar som ${soundType}:`, error);
        }
    }

    /**
     * Ativa/desativa sons
     */
    toggleSounds(enabled) {
        this.updateSoundSetting('soundEnabled', enabled);
    }

    /**
     * Testa som
     */
    testSound(soundType) {
        this.playSound(soundType);
    }

    /**
     * Obtém lista de sons disponíveis
     */
    getAvailableSounds() {
        return Object.keys(this.sounds);
    }

    /**
     * Obtém volume atual
     */
    getVolume() {
        return this.soundSettings.soundVolume;
    }

    /**
     * Define volume
     */
    setVolume(volume) {
        const normalizedVolume = Math.max(0, Math.min(1, volume));
        this.updateSoundSetting('soundVolume', normalizedVolume);
    }

    /**
     * Verifica se sons estão ativados
     */
    areSoundsEnabled() {
        return this.soundSettings.soundEnabled;
    }
}

// Instância global do gestor de sons
const notificationSoundManager = new NotificationSoundManager();
