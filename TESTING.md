# VukaSport - Guia de Testes

## Funcionalidades Implementadas

### 1. Painel de Administrador - Edição de Goleadas e Cartões

#### Teste 1.1: Adicionar Goleada
1. Aceder ao painel de administração (admin.html)
2. Fazer login com credenciais: `admin` / `123456`
3. Clicar no botão "Editar" de um jogo
4. Na seção "Registar Eventos do Jogo", preencher:
   - **Equipa**: Selecionar "Casa" ou "Visitante"
   - **Minuto**: Inserir o minuto do golo (ex: 45)
   - **Nome do Jogador**: Inserir nome (ex: "Cristiano Ronaldo")
5. Clicar "Adicionar Golo"
6. **Resultado esperado**: 
   - Golo aparece no histórico de eventos
   - Contador de golos é atualizado automaticamente
   - Notificação é enviada aos utilizadores

#### Teste 1.2: Adicionar Cartão Amarelo
1. Seguir os mesmos passos que 1.1
2. Na seção "Cartão Amarelo", preencher:
   - **Equipa**: Selecionar "Casa" ou "Visitante"
   - **Minuto**: Inserir o minuto do cartão
   - **Nome do Jogador**: Inserir nome (ex: "João Félix")
3. Clicar "Adicionar Cartão Amarelo"
4. **Resultado esperado**:
   - Cartão aparece no histórico com ícone 🟨
   - Notificação é enviada aos utilizadores

#### Teste 1.3: Adicionar Cartão Vermelho
1. Seguir os mesmos passos que 1.2
2. Na seção "Cartão Vermelho", preencher os dados
3. Clicar "Adicionar Cartão Vermelho"
4. **Resultado esperado**:
   - Cartão aparece no histórico com ícone 🟥
   - Notificação é enviada aos utilizadores

#### Teste 1.4: Eliminar Evento
1. No histórico de eventos, clicar "Eliminar" em qualquer evento
2. Confirmar a eliminação
3. **Resultado esperado**: Evento é removido do histórico

### 2. Sistema de Notificações

#### Teste 2.1: Notificação Visual (In-App)
1. Abrir a página principal (index.html) em uma aba do navegador
2. Abrir o painel de administração em outra aba
3. Adicionar um golo
4. **Resultado esperado**:
   - Notificação deslizante aparece no canto superior direito
   - Mostra ícone ⚽, nome do jogador, equipa e minuto
   - Desaparece automaticamente após 5 segundos

#### Teste 2.2: Notificação Push (Service Worker)
1. Permitir notificações push quando solicitado
2. Adicionar um golo no painel de administração
3. **Resultado esperado**:
   - Notificação push aparece (mesmo se a aba não estiver ativa)
   - Título: "⚽ GOLO!"
   - Corpo: Nome do jogador, equipa e minuto

#### Teste 2.3: Notificação de Cartão Amarelo
1. Adicionar um cartão amarelo
2. **Resultado esperado**:
   - Notificação visual com ícone 🟨
   - Notificação push com título "🟨 Cartão Amarelo"
   - Som diferente (agudo)
   - Vibração: [100, 50, 100, 50, 100]

#### Teste 2.4: Notificação de Cartão Vermelho
1. Adicionar um cartão vermelho
2. **Resultado esperado**:
   - Notificação visual com ícone 🟥
   - Notificação push com título "🟥 Cartão Vermelho"
   - Som diferente (grave)
   - Vibração: [100, 50, 100, 50, 100]

### 3. Sincronização com Firebase

#### Teste 3.1: Sincronização Online
1. Estar conectado à internet
2. Adicionar um evento (golo ou cartão)
3. **Resultado esperado**:
   - Evento é sincronizado com Firebase
   - Mensagem no console: "Evento adicionado ao Firebase"

#### Teste 3.2: Sincronização Offline
1. Desconectar da internet (ou simular offline)
2. Adicionar um evento
3. **Resultado esperado**:
   - Evento é armazenado localmente
   - Mensagem no console: "Offline - evento será sincronizado quando online"
4. Reconectar à internet
5. **Resultado esperado**:
   - Evento é sincronizado com Firebase

### 4. Armazenamento Local

#### Teste 4.1: Persistência de Dados
1. Adicionar um golo
2. Fechar o navegador completamente
3. Reabrir o navegador e aceder ao painel de administração
4. Editar o mesmo jogo
5. **Resultado esperado**: O evento adicionado ainda está no histórico

#### Teste 4.2: Limpeza de Dados
1. Eliminar um evento
2. Fechar o navegador
3. Reabrir e editar o jogo
4. **Resultado esperado**: O evento eliminado não aparece

### 5. Interface do Utilizador

#### Teste 5.1: Responsividade
1. Abrir o painel de administração em diferentes tamanhos de tela
2. **Resultado esperado**: Interface se adapta corretamente em mobile, tablet e desktop

#### Teste 5.2: Validação de Formulários
1. Tentar adicionar um evento sem preencher o nome do jogador
2. **Resultado esperado**: Mensagem de erro: "Por favor, insira o nome do jogador."

#### Teste 5.3: Histórico de Eventos Ordenado
1. Adicionar eventos em minutos diferentes (ex: 10', 45', 90')
2. **Resultado esperado**: Eventos aparecem ordenados por minuto

## Checklist de Testes

- [ ] Goleadas podem ser adicionadas
- [ ] Cartões amarelos podem ser adicionados
- [ ] Cartões vermelhos podem ser adicionados
- [ ] Eventos podem ser eliminados
- [ ] Notificações visuais aparecem
- [ ] Notificações push funcionam
- [ ] Sons de notificação funcionam
- [ ] Vibrações funcionam em dispositivos compatíveis
- [ ] Dados sincronizam com Firebase
- [ ] Dados persistem localmente
- [ ] Interface é responsiva
- [ ] Formulários validam corretamente
- [ ] Histórico está ordenado cronologicamente

## Notas Importantes

1. **Permissões**: O navegador pode solicitar permissão para notificações push. Aceitar para testar completamente.

2. **Service Worker**: Pode ser necessário limpar o cache do navegador para ver as atualizações do Service Worker.

3. **Firebase**: A sincronização com Firebase requer conexão à internet e acesso à URL do Firebase.

4. **Sons**: Os sons funcionam melhor em navegadores que suportam Web Audio API (Chrome, Firefox, Edge).

5. **Vibrações**: As vibrações funcionam apenas em dispositivos móveis que suportam a Vibration API.

## Relatório de Testes

Após completar todos os testes, registar:
- Data do teste
- Navegador e versão
- Dispositivo (desktop/mobile)
- Testes que passaram
- Testes que falharam
- Observações adicionais
