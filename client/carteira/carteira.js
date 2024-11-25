document.addEventListener('DOMContentLoaded', () => {
    // Aguarda 500ms antes de chamar getHistory e getBalance para garantir que os cookies sejam carregados
    setTimeout(() => {
        getHistory();
        getBalance();
    }, 500);

    const formCartao = document.getElementById('formCartao');
    if (formCartao) {
        formCartao.addEventListener('submit', addCreditCard);
    }

    const formPix = document.getElementById('formPix');
    if (formPix) {
        formPix.addEventListener('submit', addPix);
    }
});


// Função para tratar erros de requisições
function handleError(error, defaultMessage = 'Erro ao fazer a requisição ao servidor.') {
    console.error(error);
    Swal.fire({
        title: "Erro!",
        text: defaultMessage,
        icon: "error"
    });
}

// Função para buscar o histórico de transações
async function getHistory() {
    try {
        const response = await fetch('http://127.0.0.1:5000/getHistory', {
            method: 'GET',
            headers: { "Content-Type": "application/json" },
            credentials: 'include'
        });

        if (response.ok) {
            const history = await response.json();
            displayHistory(history);
        } else if(response.status==404){
            console.log("Nenhuma transação.")
        }
        else {
            const errorMessage = await response.text();
            handleError(errorMessage, 'Erro ao obter o histórico.');
        }
    } catch (error) {
        handleError(error);
    }
}

// Função para buscar o saldo
async function getBalance() {
    try {
        const response = await fetch('http://127.0.0.1:5000/getBalance', {
            method: 'GET',
            headers: { "Content-Type": "application/json" },
            credentials: 'include'
        });

        if (response.ok) {
            const balanceData = await response.json();
            displayBalance(balanceData);
        } else {
            const errorMessage = await response.text();
            handleError(errorMessage, 'Erro ao obter o saldo.');
        }
    } catch (error) {
        handleError(error);
    }
}

// Função para exibir o histórico na tabela
function displayHistory(history) {
    const tbody = document.querySelector('#historico');
    tbody.innerHTML = ''; // Limpa o conteúdo da tabela

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

// Função para exibir o saldo
function displayBalance(balanceData) {
    const balanceElement = document.getElementById('balance');
    balanceElement.innerText = `R$${balanceData.VALOR.toFixed(2)}`;
}

// Função para adicionar saldo
async function addFunds(event) {
    event.preventDefault();

    try {
        const valor = parseFloat(document.getElementById('recarga').value);

        const response = await fetch('http://127.0.0.1:5000/getCartao', {
            method: 'GET',
            headers: { "Content-Type": "application/json" },
            credentials: 'include'
        });

        if (response.ok) {
            const addFundsResponse = await fetch('http://127.0.0.1:5000/addFunds', {
                method: 'PATCH',
                headers: { "Content-Type": "application/json" },
                credentials: 'include',
                body: JSON.stringify({ valor })
            });

            if (addFundsResponse.ok) {
                Swal.fire({
                    title: "Saldo atualizado!",
                    text: "Recarga feita com sucesso",
                    icon: "success"
                });
                getBalance();
                getHistory();
                document.getElementById('recarga').value = '1'; // Limpa o formulário
            } else {
                const errorMessage = await addFundsResponse.text();
                handleError(errorMessage, 'Erro ao adicionar saldo.');
            }
        } else if (response.status === 404) {
            Swal.fire({
                title: "Nenhum cartão cadastrado",
                text: "Cadastre um cartão de crédito para realizar recargas.",
                icon: "error"
            });
        } else {
            const errorMessage = await response.text();
            handleError(errorMessage, 'Erro ao adicionar saldo.');
        }
    } catch (error) {
        handleError(error);
    }
}

// Função para adicionar um cartão de crédito
async function addCreditCard(event) {
    event.preventDefault();

    try {
        const data = {
            numero_cartao: document.getElementById('numero_cartao').value,
            nome_cartao: document.getElementById('nome_cartao').value,
            data_validade: document.getElementById('data_validade').value,
            cvv: document.getElementById('cvv').value
        };

        const response = await fetch('http://127.0.0.1:5000addDadosBancarios', {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
            body: JSON.stringify(data)
        });

        if (response.ok) {
            Swal.fire({
                title: "Cartão cadastrado!",
                text: "Cartão de crédito cadastrado com sucesso",
                icon: "success"
            });
            closeModal();
        } else {
            const errorMessage = await response.text();
            handleError(errorMessage, 'Erro ao cadastrar o cartão.');
        }
    } catch (error) {
        handleError(error);
    }
}

// Função para adicionar um a chave-pix
async function addPix(event) {
    event.preventDefault();

    try {
        const pix = document.getElementById('pix').value;

        const response = await fetch('http://127.0.0.1:5000/addDadosBancarios', {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
            body: JSON.stringify({
                chave_pix: pix
            })
        });

        console.log(response);

        if (response.ok) {
            Swal.fire({
                title: "Chave-pix cadastrada!",
                text: "Chave-pix cadastrado com sucesso",
                icon: "success"
            });
            closeModal();
        } else {
            Swal.fire({
                title: "Chave-pix já cadastrada!",
                text: "Você já tem uma chave-pix cadastrada.",
                icon: "error"
            });
        }
    } catch (error) {
        handleError(error);
    }
}


// Função para fechar o modal de cadastro
function closeModal() {
    const modalElement = document.getElementById('cadastroModal');
    const modalInstance = bootstrap.Modal.getInstance(modalElement);
    if (modalInstance) {
        modalInstance.hide();
    }
}
