  // Função para buscar eventos criados pelo usuário
  async function fetchEventosCriados() {
    try {
      const response = await fetch('http://127.0.0.1:5000/userEvents', {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: 'include'
      });

      if (response.ok) {
        const eventos = await response.json();
        return eventos;
      } else {
        console.error("Erro ao buscar eventos:", response.status);
        return [];
      }
    } catch (error) {
      console.error("Erro ao conectar com o servidor:", error);
      return [];
    }
  }

  // Função para renderizar os eventos na lista
  async function renderEventos() {
    const eventList = document.getElementById("event-list");
    const eventosCriados = await fetchEventosCriados();

    // Limpa a lista de eventos antes de renderizar
    eventList.innerHTML = "";

    if (eventosCriados.length === 0) {
      eventList.innerHTML = "<p>Nenhum evento criado até o momento.</p>";
      return;
    }

    eventosCriados.forEach(evento => {
      const eventItem = document.createElement("li");
      eventItem.className = "event-item";

      eventItem.innerHTML = `
      <h2>${evento.TITULO}</h2>
      <p><strong>Data:</strong> ${evento.DATA_EVENTO}</p>
      <p>${evento.DESCRICAO}</p>
      <p>${evento.STATUS_EVENTO}</p>
      <div class="row">
        <div class="col-2 offset-0">
          <button 
            type="button" 
            class="btn btn-success btn-large" 
            style="margin-left: 20px; margin-top: 15px;" 
                onclick="excluirEvento('${evento.ID_EVENTO}')">
            Excluir Evento
          </button>
        </div>
        <div class="col-10">
            <!-- Espaço reservado para o restante do conteúdo -->
        </div>
      </div>
    `;
    

      eventList.appendChild(eventItem);
    });
  }

//função excluir 
async function excluirEvento(eventId) {
    try {
        console.log(eventId);
        const reqHeaders = new Headers();
        reqHeaders.append("Content-Type", "application/json");
        reqHeaders.append("id_evento", eventId); 
        
        const response = await fetch('http://127.0.0.1:5000/deleteEvent', {
            method: "PATCH",
            headers: reqHeaders, 
            credentials: 'include' 
        });

      if (response.ok) {
        Swal.fire({
            title: "Evento excluído",
            text: "Evento excluído com sucesso.",
            icon: "success"
         }); 
         renderEventos();
    } else {
        Swal.fire({
            title: "Erro ao excluir evento.",
            icon: "error"
            });
      }
    } catch (error) {
      console.error("Erro ao conectar com o servidor:", error);
      return [];
    }
}

// Inicializa a renderização dos eventos ao carregar a página
document.addEventListener("DOMContentLoaded", renderEventos);