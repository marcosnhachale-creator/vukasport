/**
 * Dados de exemplo para o VukaSport
 */
const sampleGames = [
    {
        id: 1,
        homeTeam: "Bairro Central",
        awayTeam: "União do Sul",
        homeGoals: 2,
        awayGoals: 1,
        status: "live",
        minute: 65,
        competition: "COPA DO BAIRRO",
        date: new Date().toISOString()
    },
    {
        id: 2,
        homeTeam: "Os Incríveis",
        awayTeam: "Estrela Guia",
        homeGoals: 0,
        awayGoals: 0,
        status: "scheduled",
        minute: 0,
        competition: "COPA DO BAIRRO",
        date: new Date().toISOString()
    },
    {
        id: 3,
        homeTeam: "Academia FC",
        awayTeam: "Veteranos SC",
        homeGoals: 1,
        awayGoals: 3,
        status: "finished",
        minute: 90,
        competition: "LIGA COMUNITÁRIA",
        date: new Date().toISOString()
    }
];

// Carregar se não houver jogos
if (!localStorage.getItem('vukasport_games')) {
    localStorage.setItem('vukasport_games', JSON.stringify(sampleGames));
}
