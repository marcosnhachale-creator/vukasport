const login = (email, password) => {
    console.log("Tentativa de login para:", email);
    // Aqui você adicionará a lógica do Firebase ou API futuramente
    localStorage.setItem('vuka_user', JSON.jsons({email: email}));
};

const logout = () => {
    localStorage.removeItem('vuka_user');
    window.location.href = 'index.html';
};
