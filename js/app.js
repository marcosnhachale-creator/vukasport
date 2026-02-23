// 1. Registro do Service Worker (Essencial para o PWA)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(reg => console.log('VukaSport: Service Worker Ativo!', reg))
            .catch(err => console.log('Erro ao registrar Service Worker:', err));
    });
}

// 2. Lógica de Interatividade do App
document.addEventListener('DOMContentLoaded', () => {
    console.log("VukaSport carregado com sucesso!");

    // Exemplo: Função para o botão de boas-vindas
    const mainBtn = document.querySelector('#main-button');
    if (mainBtn) {
        mainBtn.addEventListener('click', () => {
            alert('Bem-vindo ao VukaSport! O seu app de desporto.');
        });
    }
});

// 3. Captura de Instalação (Prompt para o usuário instalar o app)
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log("O VukaSport já pode ser instalado na tela inicial!");
});

