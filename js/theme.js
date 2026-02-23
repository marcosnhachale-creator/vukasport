/**
 * VukaSport - Gestor de Tema
 * Controla o modo escuro/claro
 */

class ThemeManager {
    constructor() {
        this.themeKey = 'vukasport_theme';
        this.isDarkMode = false;
        this.initializeTheme();
        this.setupToggleButton();
    }

    /**
     * Inicializa o tema
     */
    initializeTheme() {
        // Verificar preferência guardada
        const savedTheme = localStorage.getItem(this.themeKey);
        
        if (savedTheme) {
            this.isDarkMode = savedTheme === 'dark';
        } else {
            // Verificar preferência do sistema
            this.isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        }

        this.applyTheme();

        // Ouvir mudanças na preferência do sistema
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem(this.themeKey)) {
                this.isDarkMode = e.matches;
                this.applyTheme();
            }
        });
    }

    /**
     * Configura o botão de toggle
     */
    setupToggleButton() {
        const toggleButton = document.getElementById('themeToggle');
        
        if (toggleButton) {
            toggleButton.addEventListener('click', () => {
                this.toggleTheme();
            });

            this.updateToggleButton(toggleButton);
        }
    }

    /**
     * Alterna entre modos claro/escuro
     */
    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        this.applyTheme();
        
        // Guardar preferência
        localStorage.setItem(this.themeKey, this.isDarkMode ? 'dark' : 'light');

        // Atualizar botão
        this.updateToggleButton();
    }

    /**
     * Aplica o tema atual
     */
    applyTheme() {
        if (this.isDarkMode) {
            document.body.classList.add('dark-mode');
            this.updateMetaThemeColor('#1a1a1a');
        } else {
            document.body.classList.remove('dark-mode');
            this.updateMetaThemeColor('#1e7e34');
        }
    }

    /**
     * Atualiza o botão de toggle
     */
    updateToggleButton() {
        const toggleButton = document.getElementById('themeToggle');
        
        if (toggleButton) {
            const icon = toggleButton.querySelector('.theme-icon');
            if (icon) {
                icon.textContent = this.isDarkMode ? '☀️' : '🌙';
            }
            toggleButton.setAttribute('aria-label', 
                this.isDarkMode ? 'Alternar para modo claro' : 'Alternar para modo escuro'
            );
        }
    }

    /**
     * Atualiza a cor do tema no meta tag
     */
    updateMetaThemeColor(color) {
        let metaTheme = document.querySelector('meta[name="theme-color"]');
        if (!metaTheme) {
            metaTheme = document.createElement('meta');
            metaTheme.name = 'theme-color';
            document.head.appendChild(metaTheme);
        }
        metaTheme.content = color;
    }

    /**
     * Obtém o estado atual do tema
     */
    getCurrentTheme() {
        return this.isDarkMode ? 'dark' : 'light';
    }
}

// Instância global do gestor de tema
const themeManager = new ThemeManager();
