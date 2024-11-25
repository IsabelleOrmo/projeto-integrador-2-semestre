document.addEventListener('DOMContentLoaded', () => {
        // Aguarda 500ms antes de chamar getHistory e getBalance para garantir que os cookies sejam carregados
        setTimeout(() => {
            getHistory();
            getBalance();
        }, 500);
    });

    // Função para buscar o histórico de transações
    async function getHistory() {
        try {
            const reqHeaders = new Headers();
            reqHeaders.append("Content-Type", "application/json");
                
            // Faz a requisição para o backend para obter o histórico
            const response = await fetch('http://127.0.0.1:5000/getHistory', {
                method: 'GET',
                headers: reqHeaders,
                credentials: 'include'
            });

            if (response.ok) {
                const history = await response.json();
                displayHistory(history);
            } else {
                const errorMessage = await response.text();
                alert('Erro ao obter o histórico: ' + errorMessage);
            }
        } catch (error) {
            console.error('Erro ao fazer a requisição:', error);
            alert('Erro ao fazer a requisição ao servidor.');
        }
    }

    // Função para buscar o saldo
    async function getBalance() {
        try {
            const reqHeaders = new Headers();
            reqHeaders.append("Content-Type", "application/json");
                
            // Faz a requisição para o backend para obter o saldo
            const response = await fetch('http://127.0.0.1:5000/getBalance', {
                method: 'GET',
                headers: reqHeaders,
                credentials: 'include'
            });

            if (response.ok) {
                const balanceData = await response.json();
                displayBalance(balanceData);
            } else {
                const errorMessage = await response.text();
                alert('Erro ao obter o saldo: ' + errorMessage);
            }
        } catch (error) {
            console.error('Erro ao fazer a requisição:', error);
            alert('Erro ao fazer a requisição ao servidor.');
        }
    }

    // Função para exibir o histórico na tabela
    function displayHistory(history) {
        const tbody = document.querySelector('#historico');

        // Limpa o conteúdo da tabela antes de preencher novamente
        tbody.innerHTML = '';

        history.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>R$${item.VALOR.toFixed(2)}</td>
                <td>${item.TIPO}</td>
                <td>${item.DATA_TRASACAO}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Função para exibir o saldo no elemento <span> com id "balance"
    function displayBalance(balanceData) {
        const balanceElement = document.getElementById('balance');

        // Atualiza o conteúdo do elemento com o valor do saldo
        balanceElement.innerText = `R$${balanceData.VALOR.toFixed(2)}`;
    }

    async function addFunds(event) {
        // Previne o comportamento padrão do formulário
        event.preventDefault();
            
            const reqHeaders = new Headers();
            reqHeaders.append("Content-Type", "application/json");
    
            // Obtém o valor do campo de recarga
            const valor = document.getElementById('recarga').value;
    
            // Faz a requisição para o backend para adicionar o saldo
            try {
                const response = await fetch('http://127.0.0.1:5000/addFunds', {
                    method: 'PATCH', // Utilize PATCH ou POST
                    headers: reqHeaders,
                    credentials: 'include', // Inclui o cookie com o token
                    body: JSON.stringify({ valor: parseFloat(valor) }) // Envia o valor da recarga
                });
        
                if (response.ok) {
                    Swal.fire({
                        title: "Saldo atualizado!",
                        text: "Recarga feita com sucesso",
                        icon: "success"
                      });
                    // Atualiza o saldo na página
                    getBalance();
                    getHistory();
                    //limpa o formulario
                    document.getElementById('recarga').value='1';
                } else {
                    const errorMessage = await response.text();
                    alert('Erro ao adicionar saldo: ' + errorMessage);
                }
            } catch (error) {
                console.log(error);
            } 
}


