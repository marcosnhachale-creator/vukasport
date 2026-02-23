# ⚽ VukaSport - Progressive Web App (PWA)

O **VukaSport** é uma aplicação web moderna para acompanhamento de resultados desportivos em tempo real, desenvolvida como um PWA para oferecer uma experiência fluida tanto em desktop como em dispositivos móveis.

## 🚀 Funcionalidades

### 📱 Página Principal (index.html)
- **Lista de Jogos:** Visualização clara de todos os jogos agendados, em direto e terminados.
- **Estados de Jogo:** Suporte para Início, Intervalo, Fim da Partida e Prolongamento.
- **Placar Dinâmico:** Atualização em tempo real dos golos das equipas.
- **Design Responsivo:** Otimizado para telemóveis e tablets.

### 🔐 Painel Administrativo (admin.html)
- **Autenticação:** Sistema de login simples para gestores.
- **Gestão de Jogos:** Adicionar novos jogos, atualizar resultados e estados, ou eliminar partidas.
- **Persistência:** Utilização de `localStorage` para armazenamento local dos dados.

### 📶 Capacidades PWA
- **Manifesto:** Configurado para instalação como aplicação nativa.
- **Service Worker:** Cache de ficheiros estáticos para funcionamento offline.
- **Ícones:** Ícones personalizados de 192x192 e 512x512.

## 🛠️ Estrutura do Projeto

```text
VukaSport/
│
├── index.html          # Página principal de resultados
├── admin.html          # Painel de administração
├── manifest.json       # Configuração PWA
├── service-worker.js   # Lógica de cache offline
├── css/
│   └── style.css       # Estilos modernos (Verde e Branco)
├── js/
│   ├── app.js          # Lógica da página principal
│   ├── admin.js        # Lógica do painel administrativo
│   └── auth.js         # Sistema de autenticação
└── icons/
    ├── icon-192.png    # Ícone PWA 192x192
    └── icon-512.png    # Ícone PWA 512x512
```

## 🔑 Credenciais de Acesso (Admin)

Para aceder ao painel de administração:
- **Utilizador:** `admin`
- **Palavra-passe:** `123456`

## 💻 Como Executar

1. Abra a pasta `VukaSport` no **Visual Studio Code**.
2. Utilize a extensão **Live Server** para abrir o ficheiro `index.html`.
3. Para testar as funcionalidades PWA, aceda através de um servidor local (localhost) e utilize as ferramentas de programador do browser (F12) para verificar o Service Worker e o Manifesto.

---
Desenvolvido com foco em performance e usabilidade.
