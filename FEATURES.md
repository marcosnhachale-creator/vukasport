# VukaSport - Novas Funcionalidades

## Visão Geral

Este documento descreve as novas funcionalidades adicionadas ao VukaSport para permitir que administradores registem eventos de jogos (goleadas e cartões) e enviem notificações aos utilizadores.

## 1. Painel de Administrador - Edição de Eventos

### Acesso ao Painel
1. Abrir `admin.html`
2. Fazer login com credenciais:
   - **Utilizador**: `admin`
   - **Palavra-passe**: `123456`

### Editar um Jogo
1. Na seção "Jogos Registados", clicar no botão "Editar" de um jogo
2. O modal de edição abre com as informações do jogo

### Registar Goleadas

**Localização**: Seção "⚽ Goleadas" no modal de edição

**Campos**:
- **Equipa**: Selecionar "Casa" ou "Visitante"
- **Minuto**: Inserir o minuto em que o golo foi marcado
- **Nome do Jogador**: Inserir o nome completo do jogador que marcou

**Ações**:
1. Preencher todos os campos
2. Clicar "Adicionar Golo"
3. O golo aparece no histórico de eventos
4. O contador de golos é atualizado automaticamente
5. Uma notificação é enviada aos utilizadores

### Registar Cartões Amarelos

**Localização**: Seção "🟨 Cartão Amarelo" no modal de edição

**Campos**:
- **Equipa**: Selecionar "Casa" ou "Visitante"
- **Minuto**: Inserir o minuto do cartão
- **Nome do Jogador**: Inserir o nome do jogador

**Ações**:
1. Preencher todos os campos
2. Clicar "Adicionar Cartão Amarelo"
3. O cartão aparece no histórico com ícone 🟨
4. Uma notificação é enviada aos utilizadores

### Registar Cartões Vermelhos

**Localização**: Seção "🟥 Cartão Vermelho" no modal de edição

**Campos**:
- **Equipa**: Selecionar "Casa" ou "Visitante"
- **Minuto**: Inserir o minuto do cartão
- **Nome do Jogador**: Inserir o nome do jogador

**Ações**:
1. Preencher todos os campos
2. Clicar "Adicionar Cartão Vermelho"
3. O cartão aparece no histórico com ícone 🟥
4. Uma notificação é enviada aos utilizadores

### Histórico de Eventos

**Localização**: Seção "Histórico de Eventos" no modal de edição

**Funcionalidades**:
- Lista todos os eventos do jogo (golos e cartões)
- Eventos são ordenados cronologicamente por minuto
- Cada evento mostra: tipo, nome do jogador, equipa e minuto
- Botão "Eliminar" para remover eventos

## 2. Sistema de Notificações

### Notificações Visuais (In-App)

As notificações aparecem no canto superior direito da página principal.

**Características**:
- Aparecem automaticamente quando um evento é registado
- Mostram ícone, nome do jogador, equipa e minuto
- Desaparecem automaticamente após 5 segundos
- Cores diferentes para cada tipo de evento

### Notificações Push

As notificações push aparecem mesmo quando a página não está ativa.

**Como Ativar**:
1. O navegador solicita permissão para notificações
2. Clicar "Permitir"
3. As notificações push funcionarão automaticamente

**Características**:
- Título descritivo com ícone
- Corpo com detalhes do evento
- Som de notificação
- Vibração (em dispositivos móveis)
- Ação "Ver Jogo" para abrir a aplicação

## 3. Sincronização com Firebase

### Funcionamento

- **Online**: Todos os eventos são sincronizados automaticamente com Firebase
- **Offline**: Eventos são armazenados localmente e sincronizados quando voltar online

### Dados Sincronizados

- Golos (equipa, minuto, nome do jogador)
- Cartões amarelos (equipa, minuto, nome do jogador)
- Cartões vermelhos (equipa, minuto, nome do jogador)

## 4. Armazenamento Local

### localStorage

Os eventos são armazenados em `localStorage` para persistência:

```
vukasport_events_{gameId}
```

### Benefícios

- Funciona offline
- Dados persistem após fechar o navegador
- Sincroniza com Firebase quando online

## 5. Arquivos Modificados/Criados

### Novos Arquivos
- `js/events.js` - Gerenciador de eventos (golos e cartões)

### Arquivos Modificados
- `admin.html` - Adicionada seção de eventos no modal
- `admin.js` - Adicionados handlers para eventos
- `firebase.js` - Adicionados métodos de sincronização de eventos
- `service-worker.js` - Adicionado suporte para notificações de cartões
- `css/style.css` - Adicionados estilos para eventos e notificações
- `index.html` - Adicionado script events.js

## 6. Compatibilidade

### Navegadores Suportados
- Chrome/Chromium 90+
- Firefox 88+
- Edge 90+
- Safari 14+

## 7. Dicas de Uso

### Melhor Prática
- Registar eventos em tempo real conforme ocorrem no jogo
- Usar nomes completos dos jogadores para melhor identificação
- Verificar o histórico de eventos para garantir precisão

### Troubleshooting

**Notificações não aparecem**:
- Verificar se as permissões foram concedidas
- Limpar cache do navegador
- Recarregar a página

**Eventos não sincronizam**:
- Verificar conexão à internet
- Verificar se Firebase está acessível
- Verificar console para mensagens de erro

**Som não funciona**:
- Verificar se o som do dispositivo está ativo
- Alguns navegadores podem bloquear áudio automático
- Tentar em outro navegador
