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

    const formConta = document.getElementById('formConta');
    if (formConta) {
        formConta.addEventListener('submit', addContaBancaria);
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

// Função para saque
async function withdrawFunds(event) {
    event.preventDefault();

    try {
        const valor = parseFloat(document.getElementById('saqueValor').value);

            const addFundsResponse = await fetch('http://127.0.0.1:5000/withdrawFunds', {
                method: 'PATCH',
                headers: { "Content-Type": "application/json" },
                credentials: 'include',
                body: JSON.stringify({ valor })
            });

        if (addFundsResponse.ok) {
                Swal.fire({
                    title: "Valor sacado!",
                    text: "Saque realizado com sucesso",
                    icon: "success"
                });
                getBalance();
                getHistory();
                document.getElementById('saqueValor').value = '1'; // Limpa o formulário
            } else {
                const errorMessage = await addFundsResponse.text();
                Swal.fire({
                    title: "Erro!",
                    text: errorMessage,
                    icon: "error"
                });
            }
        } catch (error) {
             handleError(error);
        }
}

//Funcao para verificar metodo de saque
async function verificaSaque(event) {
    event.preventDefault();

    const tipoConta = document.querySelector('input[name="opcao"]:checked');
    if (!tipoConta) {
        Swal.fire({
            title: "Erro",
            text: "Selecione um método de saque (PIX ou Conta Bancária).",
            icon: "error"
        });
        return;
    }

    if (tipoConta.value === 'pix') {
        try {
            const response = await fetch('http://127.0.0.1:5000/getPix', {
                method: 'GET',
                headers: { "Content-Type": "application/json" },
                credentials: 'include'
            });

            if (response.ok) {
                await withdrawFunds(event);
            } else if (response.status === 404) {
                Swal.fire({
                    title: "Chave PIX não encontrada!",
                    text: "Cadastre uma chave PIX para realizar o saque.",
                    icon: "error"
                });
            } else {
                const errorMessage = await response.text();
                handleError(errorMessage, 'Erro ao verificar o PIX.');
            }
        } catch (error) {
            handleError(error);
        }
    } else if (tipoConta.value === 'contaBancaria') {
        try {
            const response = await fetch('http://127.0.0.1:5000/getContaBancaria', {
                method: 'GET',
                headers: { "Content-Type": "application/json" },
                credentials: 'include'
            });

            if (response.ok) {
                await withdrawFunds(event);
            } else if (response.status === 404) {
                Swal.fire({
                    title: "Conta bancária não encontrada!",
                    text: "Cadastre uma conta bancária para realizar o saque.",
                    icon: "error"
                });
            } else {
                const errorMessage = await response.text();
                handleError(errorMessage, 'Erro ao verificar a conta bancária.');
            }
        } catch (error) {
            handleError(error);
        }
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

        const response = await fetch('http://127.0.0.1:5000/addDadosBancarios', {
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
        } else if (response.status == 400) {
            Swal.fire({
                title: "Cartão já cadastrado!",
                text: "Você já tem um cartão de crédito já cadastrado.",
                icon: "error"
            });
        }
        else {
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
        const pix = document.getElementById('chave_pix').value;

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

// Função para adicionar uma conta bancária
async function addContaBancaria(event) {
    event.preventDefault();

    const data = {
        banco: document.getElementById('banco').value,
        agencia: document.getElementById('agencia').value,
        numero_conta: document.getElementById('numero_conta').value,
        tipo_conta: document.getElementById('tipo_conta').value,
        nome_titular: document.getElementById('nome_titular').value
    };

    console.log(document.getElementById('tipo_conta').value);
    try {
        const response = await fetch('http://127.0.0.1:5000/addDadosBancarios', {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
            body: JSON.stringify(data)
        });

        console.log(response);

        if (response.ok) {
            Swal.fire({
                title: "Conta bancária cadastrada!",
                text: "Conta bancária cadastrada com sucesso",
                icon: "success"
            });
            closeModal();
        } else {
            Swal.fire({
                title: "Conta bancária já cadastrado!",
                text: "Você já tem uma conta bancária cadastrada.",
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

