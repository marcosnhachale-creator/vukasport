document.addEventListener('DOMContentLoaded', () => {
    console.log("Painel Administrativo VukaSport carregado.");
    
    const adminForm = document.querySelector('#admin-form');
    if (adminForm) {
        adminForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert("Dados salvos com sucesso!");
        });
    }
});

