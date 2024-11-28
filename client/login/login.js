
async function signIn() {
    var email = document.getElementById("email").value;
    var senha = document.getElementById("senha").value;   

    if (email.length > 0 && senha.length > 0) {
        const loginData = new Headers();
        loginData.append("Content-Type", "application/json");
        loginData.append("Connection", "Keep-alive");
        loginData.append('email', email);
        loginData.append('password', senha);

        const res = await fetch(
            'http://127.0.0.1:5000/login', {
                method: 'POST',
                headers: loginData,
                credentials: 'include'
            }
        );

        if (res.ok) {
            setTimeout(() => {
                    window.location.href = '../home/home.html';
            }, 500);
        } else {
            const errorMessage = await res.text(); 
           alert(errorMessage);
        }
    }
}