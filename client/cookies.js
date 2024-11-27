document.addEventListener("DOMContentLoaded", async () => {
    await isLogged();
});

async function isLogged() {
    try {
        const response = await fetch('http://127.0.0.1:5000/isLogged', {
            method: 'GET',
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
        });
         if(response.status==400){
            Swal.fire({
                title: "Erro ao acessar!",
                text: "Faça login ou crie sua conta para ter acesso a página",
                icon: "error"
            });
            setTimeout(() => {
                window.location.href = '../login/login.html';;
            }, 2000);
            
        }
       } catch (error) {
            Swal.fire({
                title: "Erro ao pegar credenciais",
                icon: "error"
            });
            console.log(error);
       }    
}

async function logout() {
   try {
    const response = await fetch('http://127.0.0.1:5000/logout', {
        method: 'GET',
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
    });
    if (response.status==200) {
        window.location.href = '../login/login.html';
    } else if(response.status==400){
        Swal.fire({
            title: "Erro ao deslogar",
            icon: "error"
        });
    }
   } catch (error) {
        Swal.fire({
            title: "Erro ao deslogar",
            icon: "error"
        });
        console.log(error);
   }    
}