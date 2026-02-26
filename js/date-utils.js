/**
 * VukaSport - Utilitários de Data
 * Fornece funções para organizar jogos de forma inteligente por data
 */

class DateUtils {
    /**
     * Obtém o rótulo inteligente para uma data
     * Retorna: "HOJE", "AMANHÃ", "ONTEM", "ESTA SEMANA", "PROXIMA SEMANA", ou a data formatada
     */
    static getSmartDateLabel(dateStr) {
        if (!dateStr) return 'SEM DATA';
        
        const date = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const dateOnly = new Date(date);
        dateOnly.setHours(0, 0, 0, 0);
        
        // Comparar datas
        if (dateOnly.getTime() === today.getTime()) {
            return 'HOJE';
        } else if (dateOnly.getTime() === tomorrow.getTime()) {
            return 'AMANHÃ';
        } else if (dateOnly.getTime() === yesterday.getTime()) {
            return 'ONTEM';
        }
        
        // Verificar se está nesta semana
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        if (dateOnly >= startOfWeek && dateOnly <= endOfWeek && dateOnly > today) {
            const days = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
            return `ESTA SEMANA (${days[dateOnly.getDay()]} ${dateOnly.getDate()})`;
        }
        
        // Verificar se está na próxima semana
        const startOfNextWeek = new Date(endOfWeek);
        startOfNextWeek.setDate(endOfWeek.getDate() + 1);
        
        const endOfNextWeek = new Date(startOfNextWeek);
        endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);
        
        if (dateOnly >= startOfNextWeek && dateOnly <= endOfNextWeek) {
            const days = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
            return `PROXIMA SEMANA (${days[dateOnly.getDay()]} ${dateOnly.getDate()})`;
        }
        
        // Se passou, mostrar "PASSADO"
        if (dateOnly < today) {
            return 'PASSADO';
        }
        
        // Caso padrão: mostrar a data formatada
        const days = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
        return `${days[dateOnly.getDay()]} ${dateOnly.getDate()}/${dateOnly.getMonth() + 1}`;
    }

    /**
     * Agrupa jogos por período inteligente
     * Retorna um objeto com as chaves sendo os períodos e valores sendo os jogos
     */
    static groupGamesBySmartPeriod(games) {
        const grouped = {};
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const periods = [
            { key: 'HOJE', label: 'HOJE' },
            { key: 'AMANHA', label: 'AMANHÃ' },
            { key: 'ESTA_SEMANA', label: 'ESTA SEMANA' },
            { key: 'PROXIMA_SEMANA', label: 'PROXIMA SEMANA' },
            { key: 'FUTURO', label: 'FUTURO' },
            { key: 'PASSADO', label: 'PASSADO' }
        ];
        
        periods.forEach(period => {
            grouped[period.key] = { label: period.label, games: [] };
        });
        
        games.forEach(game => {
            if (!game.date) {
                grouped['FUTURO'].games.push(game);
                return;
            }
            
            const gameDate = new Date(game.date);
            gameDate.setHours(0, 0, 0, 0);
            
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            
            const startOfNextWeek = new Date(endOfWeek);
            startOfNextWeek.setDate(endOfWeek.getDate() + 1);
            
            const endOfNextWeek = new Date(startOfNextWeek);
            endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);
            
            if (gameDate.getTime() === today.getTime()) {
                grouped['HOJE'].games.push(game);
            } else if (gameDate.getTime() === tomorrow.getTime()) {
                grouped['AMANHA'].games.push(game);
            } else if (gameDate >= startOfWeek && gameDate <= endOfWeek && gameDate > today) {
                grouped['ESTA_SEMANA'].games.push(game);
            } else if (gameDate >= startOfNextWeek && gameDate <= endOfNextWeek) {
                grouped['PROXIMA_SEMANA'].games.push(game);
            } else if (gameDate < today) {
                grouped['PASSADO'].games.push(game);
            } else {
                grouped['FUTURO'].games.push(game);
            }
        });
        
        return grouped;
    }

    /**
     * Obtém a ordem de exibição dos períodos
     */
    static getPeriodOrder() {
        return ['HOJE', 'AMANHA', 'ESTA_SEMANA', 'PROXIMA_SEMANA', 'FUTURO', 'PASSADO'];
    }
}

window.DateUtils = DateUtils;
