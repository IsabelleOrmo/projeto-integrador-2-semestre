document.addEventListener('DOMContentLoaded', () => {
    // Aguarda 500ms antes de chamar getBalance e requestNumberHistory para garantir que os cookies sejam carregados
    setTimeout(() => {
        getBalance();
        requestNumberHistory(); // Solicita o número de itens para configurar o paginador
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

// Função para exibir o saldo
function displayBalance(balanceData) {
    const balanceElement = document.getElementById('balance');
    balanceElement.innerText = `R$${balanceData.VALOR.toFixed(2)}`;
}

// Variáveis do Paginador
var ulPaginator = document.getElementById("ulPaginator");
let numPages = 0;
const pageSize = 5;
var page = 1;

/**
 * Request para obter a quantidade de transações do histórico,
 * necessário para construir o paginador.
 */
async function requestNumberHistory() {
    try {
        const resQtty = await fetch("http://127.0.0.1:5000/getHistoryQtty", {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: 'include'
        });

        if (resQtty.ok) {
            const qttyJson = await resQtty.json();
            const qtty = qttyJson[0].HISTORYQTTY;
            console.log(`Quantidade de transações: ${qtty}`);
            numPages = Math.ceil(qtty / pageSize);
            refreshPaginator();
            requestHistory(1); // Carrega a primeira página do histórico
        } else {
            alert('Erro ao obter a quantidade de registros. Verifique e tente novamente.');
        }
    } catch (error) {
        console.error(error);
    }
}

// Função para resetar a lista de páginas do paginador
function resetUlPageNumbers() {
    while (ulPaginator.firstChild) {
        ulPaginator.removeChild(ulPaginator.firstChild);
    }
}

/**
 * Prepara o paginador para o número de páginas calculado
 */
function refreshPaginator() {
    resetUlPageNumbers();
    for (let i = 1; i <= numPages; i++) {
        const status = (i === page) ? "page-item active" : "page-item";
        const strLi = `<li class="${status}"><a class="page-link" href="javascript:void(0);" onclick="requestHistory(${i});">${i}</a></li>`;
        ulPaginator.innerHTML += strLi;
    }
}

/**
 * Requisição para obter os registros do histórico por página
 */
async function requestHistory(pageNumber) {
    try {
        page = pageNumber;

        const reqHeaders = new Headers();
        reqHeaders.append("Content-Type", "application/json");
        reqHeaders.append("page", pageNumber);
        reqHeaders.append("pageSize", pageSize);

        const resHistory = await fetch("http://127.0.0.1:5000/getHistoryByPage", {
            method: "POST",
            headers: reqHeaders,
            credentials: 'include'
        });

        if (resHistory.ok) {
            refreshPaginator();
            const historyData = await resHistory.json();
            fillTableWithHistory(historyData);
        } else {
            alert('Erro ao obter histórico. Verifique e tente novamente.');
        }
    } catch (error) {
        console.error(error);
    }
}

/**
 * Preenche a tabela com os registros do histórico
 */
function fillTableWithHistory(history) {
    cleanTableRows();
    history.forEach(element => {
        addHistoryRow(element);
    });
}

/**
 * Limpa as linhas da tabela de histórico
 */
function cleanTableRows() {
    const tbody = document.querySelector('#historico');
    tbody.innerHTML = '';
}

/**
 * Adiciona uma linha na tabela de histórico para cada registro
 */
function addHistoryRow(item) {
    const tbody = document.querySelector('#historico');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td>R$${item.VALOR.toFixed(2)}</td>
        <td>${item.TIPO}</td>
        <td>${item.DATA_TRANSACAO}</td>
    `;
    tbody.appendChild(tr);
}

// Função para adicionar saldo (exemplo de função adicional)
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
                requestHistory(page); // Atualiza o histórico para mostrar o saldo atualizado
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

// Função para adicionar cartão de crédito
async function addCreditCard(event) {
    event.preventDefault();

    // Obter os valores dos campos
    const numeroCartao = document.getElementById('numero_cartao').value;
    const nomeCartao = document.getElementById('nome_cartao').value;
    let dataValidade = document.getElementById('data_validade').value;
    const cvv = document.getElementById('cvv').value;

    // Validação dos campos
    if (!numeroCartao || !nomeCartao || !dataValidade || !cvv) {
        return Swal.fire({
            title: "Campos obrigatórios!",
            text: "Todos os campos devem ser preenchidos.",
            icon: "warning"
        });
    }

    // Validação do número do cartão (aceita 13, 16 ou 19 dígitos)
    if (!/^\d{13}(\d{3})?$/.test(numeroCartao)) {
        return Swal.fire({
            title: "Número de cartão inválido!",
            text: "O número do cartão de crédito deve ter 13, 16 ou 19 dígitos.",
            icon: "warning"
        });
    }

    // Validação do CVV (3 dígitos)
    if (!/^\d{3}$/.test(cvv)) {
        return Swal.fire({
            title: "CVV inválido!",
            text: "O CVV deve ter 3 dígitos.",
            icon: "warning"
        });
    }

    // Validação da data de validade (formato MM/AAAA)
    if (!/^\d{2}\/\d{4}$/.test(dataValidade)) {
        return Swal.fire({
            title: "Data de validade inválida!",
            text: "A data de validade deve estar no formato MM/AAAA.",
            icon: "warning"
        });
    }

    // Validação do ano da data de validade (não pode ser menor que o ano atual)
    const currentYear = new Date().getFullYear();
    const year = parseInt(dataValidade.split('/')[1], 10);
    if (year < currentYear) {
        return Swal.fire({
            title: "Ano de validade inválido!",
            text: "O cartão não pode estar vencido.",
            icon: "warning"
        });
    }

    // Adiciona o dia "01" à data de validade para formatar como "DD/MM/AAAA"
    dataValidade = `01/${dataValidade}`;

    // Validação do nome no cartão (não pode estar vazio)
    if (nomeCartao.trim() === "") {
        return Swal.fire({
            title: "Nome inválido!",
            text: "O nome no cartão não pode estar vazio.",
            icon: "warning"
        });
    }

    try {
        const data = {
            numero_cartao: numeroCartao,
            nome_cartao: nomeCartao,
            data_validade: dataValidade,
            cvv: cvv
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
                text: "Cartão de crédito cadastrado com sucesso.",
                icon: "success"
            });
            closeModal();
        } else if (response.status == 400) {
            Swal.fire({
                title: "Cartão já cadastrado!",
                text: "Você já tem um cartão de crédito cadastrado.",
                icon: "error"
            });
        } else {
            const errorMessage = await response.text();
            handleError(errorMessage, 'Erro ao cadastrar o cartão.');
        }
    } catch (error) {
        handleError(error);
    }
}


// Função para adicionar uma chave Pix
async function addPix(event) {
    event.preventDefault();

    // Obter o valor da chave Pix
    const pix = document.getElementById('chave_pix').value.trim();

    // Validação da chave Pix (não pode estar vazia)
    if (!pix) {
        return Swal.fire({
            title: "Chave Pix inválida!",
            text: "A chave Pix não pode estar vazia.",
            icon: "warning"
        });
    }

    // Validação do formato da chave Pix
    // 1. CPF: 000.000.000-00
    // 2. CNPJ: 00.000.000/0000-00
    // 3. E-mail: exemplo@dominio.com
    // 4. Telefone: (00) 00000-0000
    // 5. Chave aleatória: Alfanumérica
    const regexCpf = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/; // Formato CPF
    const regexCnpj = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/; // Formato CNPJ
    const regexEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/; // Formato E-mail
    const regexTelefone = /^\(\d{2}\) \d{5}-\d{4}$/; // Formato Telefone
    const regexChaveAleatoria = /^[a-zA-Z0-9]{26,35}$/; // Chave aleatória (26 a 35 caracteres alfanuméricos)

    if (!regexCpf.test(pix) && !regexCnpj.test(pix) && !regexEmail.test(pix) && !regexTelefone.test(pix) && !regexChaveAleatoria.test(pix)) {
        return Swal.fire({
            title: "Chave Pix inválida!",
            text: "A chave Pix informada não é válida. Verifique o formato e tente novamente.",
            icon: "warning"
        });
    }

    try {
        const response = await fetch('http://127.0.0.1:5000/addDadosBancarios', {  
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
            body: JSON.stringify({
                chave_pix: pix
            })
        });

        if (response.ok) {
            Swal.fire({
                title: "Chave Pix cadastrada!",
                text: "Chave Pix cadastrada com sucesso.",
                icon: "success"
            });
            closeModal();
        } else if (response.status === 400) {
            Swal.fire({
                title: "Chave Pix já cadastrada!",
                text: "Você já tem uma chave Pix cadastrada.",
                icon: "error"
            });
        } else {
            const errorMessage = await response.text();
            handleError(errorMessage, 'Erro ao cadastrar a chave Pix.');
        }
    } catch (error) {
        handleError(error);
    }
}

// Função para adicionar uma conta bancária
async function addContaBancaria(event) {
    event.preventDefault();

    // Obtém os dados dos campos do formulário
    const banco = document.getElementById('banco').value;
    const agencia = document.getElementById('agencia').value;
    const numero_conta = document.getElementById('numero_conta').value;
    const tipo_conta = document.getElementById('tipo_conta').value;
    const nome_titular = document.getElementById('nome_titular').value;

    // Verificação de dados obrigatórios
    if (!banco || !agencia || !numero_conta || !tipo_conta || !nome_titular) {
        Swal.fire({
            title: "Erro!",
            text: "Todos os campos são obrigatórios.",
            icon: "error"
        });
        return; // Interrompe a execução se algum campo estiver vazio
    }

    // Verificação do número da conta e agência (se necessário)
    if (!/^\d+$/.test(agencia)) {
        Swal.fire({
            title: "Erro!",
            text: "Agência deve ser um número válido.",
            icon: "error"
        });
        return;
    }

    if (!/^\d+$/.test(numero_conta)) {
        Swal.fire({
            title: "Erro!",
            text: "Número da conta deve ser um número válido.",
            icon: "error"
        });
        return;
    }

    // Verificação do tipo de conta (caso haja tipos específicos)
    const tiposValidos = ["corrente", "poupanca", "outro"]; // Exemplo de tipos de conta válidos
    if (!tiposValidos.includes(tipo_conta.toLowerCase())) {
        Swal.fire({
            title: "Erro!",
            text: "Tipo de conta inválido. Escolha entre 'corrente', 'poupanca' ou 'outro'.",
            icon: "error"
        });
        return;
    }

    // Prepara os dados a serem enviados
    const data = {
        banco: banco,
        agencia: agencia,
        numero_conta: numero_conta,
        tipo_conta: tipo_conta,
        nome_titular: nome_titular
    };

    try {
        // Realiza a requisição para adicionar os dados bancários
        const response = await fetch('http://127.0.0.1:5000/addDadosBancarios', {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
            body: JSON.stringify(data)
        });

        // Log da resposta para depuração
        console.log(response);

        // Verifica se a resposta foi bem-sucedida
        if (response.ok) {
            Swal.fire({
                title: "Conta bancária cadastrada!",
                text: "Conta bancária cadastrada com sucesso.",
                icon: "success"
            });
            closeModal(); // Fecha o modal após sucesso
        } else {
            Swal.fire({
                title: "Erro!",
                text: "Você já tem uma conta bancária cadastrada.",
                icon: "error"
            });
        }
    } catch (error) {
        handleError(error); // Função para tratar erros
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
            requestHistory(page); // Atualiza o histórico
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

