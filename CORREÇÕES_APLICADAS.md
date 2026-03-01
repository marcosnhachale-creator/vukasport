# Correções Aplicadas - VukaSport v14.2

## Problemas Identificados e Resolvidos

### 1. **Permutas, Cantos e Faltas não apareciam em eventos registrados**

**Arquivo afetado:** `js/firebase.js`

**Problema:** O método `setupGameEventsListener()` (linhas 111-147) estava inicializando o objeto `events` apenas com `goals`, `yellowCards` e `redCards`. Os campos `substitutions`, `fouls` e `corners` não estavam sendo criados nem sincronizados do Firestore.

**Solução:** Atualizado o objeto `events` para incluir todos os tipos de eventos:
```javascript
const events = { 
    goals: [], 
    yellowCards: [], 
    redCards: [], 
    substitutions: [],  // ADICIONADO
    fouls: [],          // ADICIONADO
    corners: []         // ADICIONADO
};
```

E adicionados os handlers para processar estes tipos de eventos:
```javascript
} else if (eventData.type === 'substitution') {
    events.substitutions.push(eventData);
} else if (eventData.type === 'foul') {
    events.fouls.push(eventData);
} else if (eventData.type === 'corner') {
    events.corners.push(eventData);
}
```

---

### 2. **Modal de eventos não exibia/ocultava campos corretamente para permutas**

**Arquivo afetado:** `js/admin.js`

**Problema:** O modal de eventos não tinha um listener para mudanças no tipo de evento. Os campos de "Jogador que Sai" e "Jogador que Entra" não eram mostrados/ocultados quando o utilizador selecionava "Permuta".

**Solução:** 
1. Adicionado listener para o elemento `eventType`:
```javascript
document.getElementById('eventType').onchange = () => {
    this.updateEventFieldsVisibility();
};
```

2. Criado novo método `updateEventFieldsVisibility()` que mostra/oculta os campos apropriados baseado no tipo de evento selecionado.

3. Chamado este método quando o modal de evento é aberto para garantir que os campos estão no estado correto.

---

### 3. **Cantos e Faltas não eram contabilizados nas estatísticas**

**Arquivo afetado:** `js/game-details.js`

**Problema:** O arquivo já tinha o código para contar cantos e faltas (linhas 288-324), mas como o Firebase não sincronizava estes eventos, os contadores sempre mostravam 0.

**Solução:** Com a correção do `firebase.js`, os eventos agora são sincronizados corretamente e as estatísticas são calculadas automaticamente.

---

## Resumo das Mudanças

| Arquivo | Linhas | Tipo de Mudança | Descrição |
|---------|--------|-----------------|-----------|
| `js/firebase.js` | 116-132 | Adição | Adicionados campos `substitutions`, `fouls`, `corners` ao objeto `events` e handlers para sincronizar |
| `js/admin.js` | 64-74 | Adição | Adicionado listener para mudança de tipo de evento |
| `js/admin.js` | 129-148 | Adição | Novo método `updateEventFieldsVisibility()` para controlar visibilidade dos campos |

---

## Testes Recomendados

1. **Registar uma Permuta:**
   - Abrir admin
   - Selecionar um jogo
   - Clicar em "REGISTAR EVENTO"
   - Selecionar "PERMUTA"
   - Verificar que os campos "Jogador que Sai" e "Jogador que Entra" aparecem
   - Preencher e guardar
   - Verificar que a permuta aparece na lista de eventos

2. **Registar uma Falta:**
   - Abrir admin
   - Selecionar um jogo
   - Clicar em "REGISTAR EVENTO"
   - Selecionar "FALTA"
   - Preencher e guardar
   - Verificar que a falta aparece na lista de eventos
   - Abrir detalhes do jogo e verificar que o contador de faltas aumentou

3. **Registar um Canto:**
   - Abrir admin
   - Selecionar um jogo
   - Clicar em "REGISTAR EVENTO"
   - Selecionar "CANTO"
   - Preencher e guardar
   - Verificar que o canto aparece na lista de eventos
   - Abrir detalhes do jogo e verificar que o contador de cantos aumentou

4. **Sincronização em Tempo Real:**
   - Abrir o admin em uma aba
   - Abrir os detalhes do jogo em outra aba
   - Registar eventos no admin
   - Verificar que os eventos aparecem em tempo real na aba de detalhes

---

## Notas Técnicas

- O Firebase agora sincroniza todos os 6 tipos de eventos: golos, cartões amarelos, cartões vermelhos, permutas, faltas e cantos
- O localStorage continua a ser usado como cache local para offline
- As notificações push já estavam implementadas para todos os tipos de eventos
- A timeline de eventos no `game-details.js` já tinha suporte para todos os tipos de eventos
