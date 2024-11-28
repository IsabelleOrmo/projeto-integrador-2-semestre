// ==================================
// Funções Utilitárias
// ==================================


    // Função para tratar erros de requisições
    function handleError(error, defaultMessage = 'Erro ao fazer a requisição ao servidor.') {
        console.error('Erro capturado:', error);
        Swal.fire({
            title: "Erro!",
            text: defaultMessage,
            icon: "error"
        });
    }



    // Função para apostar
    async function submitBet(event) {
        event.preventDefault();

    const eventId = document.getElementById('betEventId').value;
    const cotas = parseInt(document.getElementById('cotas_qntd').value);
    const betType = document.getElementById('betType').value;

    console.log('Dados do formulário:', { eventId, cotas, betType });

    // Validações básicas no frontend
    if (!eventId || !cotas || cotas <= 0 || !betType) {
        Swal.fire({
            title: "Erro!",
            text: "Por favor, preencha todos os campos corretamente.",
            icon: "error",
        });
        return;
    }

    try {
        const response = await fetch('http://127.0.0.1:5000/betOnEvent', {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "id_evento": eventId, // Cabeçalho com o ID do evento
            },
            body: JSON.stringify({ cotas_qntd: cotas, tipo: betType }),
            credentials: 'include', // Para enviar cookies junto
        });

        // Resposta do backend
        if (response.ok) {
            const message = await response.text();
            Swal.fire({
                title: "Sucesso!",
                text: message || "Aposta realizada com sucesso!",
                icon: "success",
            }).then(() => {
                document.getElementById('betEventForm').reset(); // Limpa o formulário
                bootstrap.Modal.getOrCreateInstance(document.getElementById('betEventModal')).hide(); // Fecha o modal
            });
        } else {
            const errorMessage = await response.text();
            console.error('Erro na resposta do servidor:', errorMessage);
            Swal.fire({
                title: "Erro!",
                text: errorMessage || "Houve um problema ao realizar a aposta.",
                icon: "error",
            });
        }
    } catch (error) {
        console.error('Erro ao apostar:', error);
        Swal.fire({
            title: "Erro!",
            text: "Não foi possível realizar a aposta. Tente novamente mais tarde.",
            icon: "error",
        });
    }
}

document.getElementById('betEventForm').addEventListener('submit', submitBet);





        // Função para formatar data e hora
        function formatDateTime(raw) {
            const date = new Date(raw);
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            const hh = String(date.getHours()).padStart(2, '0');
            const mi = String(date.getMinutes()).padStart(2, '0');
            const ss = String(date.getSeconds()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
        }

        // Função para formatar apenas a data
        function formatDate(raw) {
            const date = new Date(raw);
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        }



        // Função para adicionar um novo evento
        async function addNewEvent(event) {
            event.preventDefault(); // Evita que o formulário recarregue a página
            console.log('Submetendo o formulário...');

            try {
                // Coleta os valores dos campos do formulário
                const Titulo = document.getElementById('eventTitle').value.trim();
                const Descricao = document.getElementById('eventDescription').value.trim();
                const Categoria = document.getElementById('eventCategory').value.trim();
                const ValorCota = parseFloat(document.getElementById('eventCota').value);

                // Captura os valores de data e hora
                const rawDataHoraInicio = document.getElementById('eventStartTime').value; // formato ISO
                const rawDataHoraFim = document.getElementById('eventEndTime').value; // formato ISO
                const rawDataEvento = document.getElementById('eventDate').value; // formato ISO

                // Converte os valores para os formatos esperados pelo backend
                const DataHoraInicio = formatDateTime(rawDataHoraInicio); // YYYY-MM-DD HH:MM:SS
                const DataHoraFim = formatDateTime(rawDataHoraFim); // YYYY-MM-DD HH:MM:SS
                const DataEvento = formatDate(rawDataEvento); // YYYY-MM-DD

                // Log para depuração
                console.log('Dados do Formulário:', {
                    titulo: Titulo,
                    descricao: Descricao,
                    categoria: Categoria,
                    valor_cota: ValorCota,
                    data_hora_inicio: DataHoraInicio,
                    data_hora_fim: DataHoraFim,
                    data_evento: DataEvento
                });

                // Validação básica no frontend
                if (!Titulo || !Descricao || !Categoria || isNaN(ValorCota) || !DataHoraInicio || !DataHoraFim || !DataEvento) {
                    Swal.fire({
                        title: "Erro!",
                        text: "Por favor, preencha todos os campos corretamente.",
                        icon: "error"
                    });
                    return;
                }

                            // Validação de Datas
            const startDateTime = new Date(rawDataHoraInicio);
            const endDateTime = new Date(rawDataHoraFim);
            const eventDate = new Date(rawDataEvento);

            if (eventDate < startDateTime) {
                Swal.fire({
                    title: "Erro!",
                    text: "A data do evento não pode ser anterior à data e hora de início.",
                    icon: "error"
                });
                return;
            }

            if (startDateTime > endDateTime) {
                Swal.fire({
                    title: "Erro!",
                    text: "A data e hora de início não podem ser posteriores à data e hora de encerramento.",
                    icon: "error"
                });
                return;
            }

            if (eventDate < endDateTime) {
                Swal.fire({
                    title: "Erro!",
                    text: "A data do evento deve ser posterior ou igual à data e hora de encerramento das apostas.",
                    icon: "error"
                });
                return;
            }

                // Envio da requisição para o backend
                const response = await fetch('http://127.0.0.1:5000/addNewEvent', {
                    method: 'POST',
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        titulo: Titulo,
                        descricao: Descricao,
                        categoria: Categoria,
                        valor_cota: ValorCota,
                        data_hora_inicio: DataHoraInicio,
                        data_hora_fim: DataHoraFim,
                        data_evento: DataEvento
                    })
                });

                // Verifica a resposta do servidor
                console.log('Resposta do servidor:', response);

                if (response.ok) {
                    // Exibe o SweetAlert e depois fecha o modal
                    Swal.fire({
                        title: "Sucesso!",
                        text: "Evento criado com sucesso.",
                        icon: "success"
                    }).then(() => {
                        closeModal(); // Fecha o modal após o usuário fechar o SweetAlert
                        // Opcional: Limpar o formulário após o sucesso
                        document.getElementById('eventForm').reset();
                    });
                } else {
                    const mensagem = await response.text();
                    Swal.fire({
                        title: "Erro!",
                        text: mensagem || "Não foi possível criar o evento.",
                        icon: "error"
                    });
                }
            } catch (error) {
                handleError(error, 'Houve um erro inesperado ao tentar criar o evento.');
            }
        }


        // Adicionar o event listener após a definição das funções
        document.getElementById('eventForm').addEventListener('submit', addNewEvent);

        // Seleciona o contêiner onde os eventos disponíveis serão exibidos
        var eventsContainer = document.getElementById('events');

        // Seleciona o contêiner onde os eventos mais apostados serão exibidos
        var eventsContainerMaisApostados = document.getElementById('eventos-apostados');

        // Array para armazenar todos os eventos disponíveis
        let allEvents = [];



        // ================================
        // Funções para Eventos Disponíveis
        // ================================

        /**
         * Função assíncrona para buscar eventos disponíveis do backend.
         * Faz uma requisição GET para o endpoint /availableEvents.
         */
        async function requestAvailableEvents() {
            try {
                const resEvent = await fetch("http://localhost:5000/availableEvents", {
                    method: "GET"
                });

                if (resEvent.ok) {
                    let eventsData = await resEvent.json();

                    // Remove duplicados com base no ID_EVENTO
                    eventsData = eventsData.filter((event, index, self) =>
                        index === self.findIndex(e => e.ID_EVENTO === event.ID_EVENTO)
                    );

                    // Armazena os eventos únicos em allEvents
                    allEvents = eventsData;
                    
                    // Preenche os cartões de eventos disponíveis
                    fillAvailableEventCards(allEvents);

                    // Preenche o dropdown de categorias
                    populateCategoryDropdown(allEvents);
                } else {
                    alert("Nenhum evento encontrado.");
                }
            } catch (error) {
                console.error("Erro ao buscar eventos disponíveis:", error);
            }
        }

        /**
         * Função para preencher os cartões de eventos disponíveis na página.
         * @param {Array} events - Array de objetos representando os eventos.
         */
        function fillAvailableEventCards(events) {
            // Limpa o conteúdo atual do contêiner de eventos disponíveis
            eventsContainer.innerHTML = '';

            // Itera sobre cada evento recebido
            events.forEach(event => {
                // Formata o valor da cota para ter 2 casas decimais
                const valorCotaFormatado = parseFloat(event.VALOR_COTA).toFixed(2);

                // Cria o HTML do cartão do evento utilizando template literals
                const eventCard = 
                    `<div class="event-card">
                        <h3>${event.TITULO}</h3>
                        <div class="data-evento">Data: ${event.DATA_EVENTO}</div>
                        <p class="descricao">${event.DESCRICAO}</p>
                        <p class="valor">Valor da cota: R$ ${valorCotaFormatado}</p>
                        <p class="data-fim">Data e hora final: ${event.DATA_HORA_FIM}</p>
                        <button 
                            type="button" 
                            class="btn btn-primary" 
                            data-bs-toggle="modal" 
                            data-bs-target="#betEventModal" 
                            data-id="${event.ID_EVENTO}" 
                            onclick="openBetModal('${event.TITULO}', '${event.ID_EVENTO}')">
                            Apostar
                        </button>
                    </div>`;

                // Insere o cartão do evento no contêiner de eventos disponíveis
                eventsContainer.insertAdjacentHTML('beforeend', eventCard);
            });
        }

        // ==================================
        // Funções para Eventos Mais Apostados
        // ==================================

        /**
         * Função assíncrona para buscar os eventos mais apostados do backend.
         * Faz uma requisição GET para o endpoint /eventosMaisApostados.
         */
        async function requestEventosMaisApostados() {
            try {
                // Realiza a requisição para obter os eventos mais apostados
                const resEvent = await fetch("http://localhost:5000/eventosMaisApostados", {
                    method: "GET"
                });

                // Verifica se a resposta foi bem-sucedida
                if (resEvent.ok) {
                    // Converte a resposta para JSON
                    const eventsData = await resEvent.json();
                    
                    // Preenche os cartões de eventos mais apostados na página
                    fillMostBetEventCards(eventsData);
                } else {
                    // Exibe um alerta caso nenhum evento mais apostado seja encontrado
                    alert("Nenhum evento mais apostado encontrado.");
                }
            } catch (error) {
                // Loga qualquer erro que ocorrer durante a requisição
                console.error("Erro ao buscar eventos mais apostados:", error);
            }
        }



        /**
         * Função para preencher os cartões de eventos mais apostados na página.
         * @param {Array} events - Array de objetos representando os eventos mais apostados.
         */
        function fillMostBetEventCards(events) {
            // Limpa o conteúdo atual do contêiner de eventos mais apostados
            eventsContainerMaisApostados.innerHTML = '';

            // Itera sobre cada evento recebido
            events.forEach(event => {
                // Formata o valor da cota para ter 2 casas decimais
                const valorCotaFormatado = parseFloat(event.VALOR_COTA).toFixed(2);

                // Cria o HTML do cartão do evento utilizando template literals
                const eventCard = 
                    `<div class="event-card">
                        <h3>${event.TITULO}</h3>
                        <div class="data-evento">Data: ${event.DATA_EVENTO}</div>
                        <p class="descricao">${event.DESCRICAO}</p>
                        <p class="valor">Valor da cota: R$ ${valorCotaFormatado}</p>
                        <p class="data-fim">Data e hora final: ${event.DATA_HORA_FIM}</p>
                        <button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#betEventModal" onclick="openBetModal('${event.TITULO}', '${event.ID_EVENTO}')">
                            Apostar
                        </button>
                    </div>`;

                // Insere o cartão do evento no contêiner de eventos mais apostados
                eventsContainerMaisApostados.insertAdjacentHTML('beforeend', eventCard);
            });
        }



        // ==================================
        // Funções para Manipulação do Modal
        // ==================================

        /**
         * Função para abrir o modal de aposta e preencher os dados do evento selecionado.
         * @param {string} eventTitle - Título do evento selecionado.
         */
         function openBetModal(eventTitle, eventId) {
        // Define o título do evento no campo do modal
        document.getElementById('betEventTitle').value = eventTitle;

        // Define o ID do evento no campo oculto
        document.getElementById('betEventId').value = eventId;

        console.log(`Evento Selecionado: ${eventTitle}, ID: ${eventId}`);
    }

        // Função para fechar o modal
        function closeModal() {
            console.log('Fechando o modal...');
            const modalElement = document.getElementById('addEventModal');
            if (!modalElement) {
                console.error('Elemento do modal não encontrado.');
                return;
            }
            const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
            if (!modal) {
                console.error('Instância do modal não foi criada.');
                return;
            }
            modal.hide();
        }


        // ==================================
        // Funções para Filtragem de Eventos
        // ==================================

        /**
         * Função para filtrar os eventos com base no termo de busca fornecido.
         * @param {string} searchTerm - Termo de busca inserido pelo usuário.
         */
        function filterEvents(searchTerm) {
            // Converte o termo de busca para letras minúsculas para facilitar a comparação
            const lowerCaseSearchTerm = searchTerm.toLowerCase();

            // Filtra os eventos que contêm o termo de busca no título ou na descrição
            const filteredEvents = allEvents.filter(event =>
                event.TITULO.toLowerCase().includes(lowerCaseSearchTerm) ||
                event.DESCRICAO.toLowerCase().includes(lowerCaseSearchTerm)
            );

            // Preenche os cartões de eventos disponíveis com os eventos filtrados
            fillAvailableEventCards(filteredEvents);
        }

        /**
         * Função para extrair categorias únicas dos eventos e preencher o dropdown,
         * tratando as categorias de forma insensível a maiúsculas e minúsculas.
         * @param {Array} events - Array de objetos representando os eventos.
         */
        function populateCategoryDropdown(events) {
            const categoryFilter = document.getElementById('categoryFilter');

            // Cria um Map para rastrear categorias únicas de forma insensível a maiúsculas e minúsculas
            const categoryMap = new Map();

            events.forEach(event => {
                const categoryOriginal = event.CATEGORIA.trim();
                const categoryLower = categoryOriginal.toLowerCase();
                if (!categoryMap.has(categoryLower)) {
                    categoryMap.set(categoryLower, categoryOriginal);
                }
            });

            // Obtém as categorias únicas preservando a capitalização original da primeira ocorrência
            const uniqueCategories = Array.from(categoryMap.values());

            // Opcional: Ordena as categorias alfabeticamente
            uniqueCategories.sort((a, b) => a.localeCompare(b));

            // Limpa as opções atuais, exceto "Todas as Categorias"
            categoryFilter.innerHTML = '<option value="all">Todas as Categorias</option>';

            // Adiciona cada categoria única como uma opção no dropdown
            uniqueCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.toLowerCase(); // Valor em lowercase para consistência
                // Capitaliza a primeira letra e mantém o restante como está
                option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
                categoryFilter.appendChild(option);
            });
        }


        /**
         * Função para exibir eventos filtrados por categoria.
         * @param {string} category - Categoria selecionada pelo usuário.
         */
        function displayEventsByCategory(category) {
            const eventsByCategoryContainer = document.getElementById('eventsByCategory');

            // Limpa o conteúdo atual
            eventsByCategoryContainer.innerHTML = '';

            // Filtra os eventos com base na categoria selecionada
            const filteredEvents = category === 'all' 
                ? allEvents 
                : allEvents.filter(event => event.CATEGORIA.toLowerCase() === category);

            if (filteredEvents.length === 0) {
                eventsByCategoryContainer.innerHTML = '<p>Nenhum evento encontrado para esta categoria.</p>';
                return;
            }

            // Itera sobre os eventos filtrados e cria os cartões
            filteredEvents.forEach(event => {
                const valorCotaFormatado = parseFloat(event.VALOR_COTA).toFixed(2);

                const eventCard = 
                    `<div class="event-card">
                        <h3>${event.TITULO}</h3>
                        <div class="data-evento">Data: ${event.DATA_EVENTO}</div>
                        <p class="descricao">${event.DESCRICAO}</p>
                        <p class="valor">Valor da cota: R$ ${valorCotaFormatado}</p>
                        <p class="data-fim">Data e hora final: ${event.DATA_HORA_FIM}</p>
                        <button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#betEventModal" onclick="openBetModal('${event.TITULO}', '${event.ID_EVENTO}')">
                            Apostar
                        </button>
                    </div>`;

                eventsByCategoryContainer.insertAdjacentHTML('beforeend', eventCard);
            });
        }


        // ================================
        // Event Listeners
        // ================================

        // Adiciona um listener para o evento "input" na barra de pesquisa
        document.getElementById('searchBar').addEventListener('input', (event) => {
            // Obtém o termo de busca atual
            const searchTerm = event.target.value;
            
            // Chama a função de filtragem com o termo de busca
            filterEvents(searchTerm);
        });

        // Adiciona um listener para mudanças no dropdown de categorias
        document.getElementById('categoryFilter').addEventListener('change', (event) => {
            const selectedCategory = event.target.value;
            displayEventsByCategory(selectedCategory);
        });


        // ================================
        // Inicialização das Funções
        // ================================

        // Executa as funções de busca de eventos quando o DOM é completamente carregado
        document.addEventListener('DOMContentLoaded', () => {
            requestAvailableEvents();          // Busca e exibe os eventos disponíveis
            requestEventosMaisApostados();    // Busca e exibe os eventos mais apostados
        });
