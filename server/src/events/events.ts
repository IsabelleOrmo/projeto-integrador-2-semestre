import { Request, RequestHandler, Response } from "express";
import { sendMail } from "../accounts/email";
import OracleDB from "oracledb";
import dotenv from 'dotenv'; 
dotenv.config();

export namespace EventsHandler {
    
    export type Event = {
        id_evento: number | undefined; 
        id_usuario: number;            
        titulo: string;                 
        descricao: string; 
        categoria: string;             
        valor_cota: number;             
        data_hora_inicio: string;        
        data_hora_fim: string;          
        data_evento: string;              
        status_evento: string;          
    };

    interface Account {
        ID: number;
    }

    async function userId(token: string): Promise<number | null> {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;

        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });

        try {
            const result = await connection.execute(
                `SELECT ID FROM ACCOUNTS WHERE TOKEN = :token`,
                [token]
            );

            const rows = result.rows as Account[];

            if (rows && rows.length > 0) {
                return rows[0].ID; 
            } else {
                return null; 
            }
        } catch (error) {
            console.error('Erro:', error);
            return null; 
        } finally {
            await connection.close(); 
        }
    }

    async function verifyRole(id_usuario: number) {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;
    
        let connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });
    
        // Define o formato esperado para a linha da consulta
        let verify = await connection.execute<{ ISADM: number }>(
            `SELECT ISADM FROM ACCOUNTS WHERE ID = :id_usuario`,
            [id_usuario]
        );
    
        await connection.close();
    
        // Verificação para que o retorno da verificação nao seja vazio
        if (verify.rows && verify.rows.length > 0) {
            // percorre e retorna o array com apenas o numero
            let emptyRole = verify.rows.map((row) => row.ISADM); 
            return emptyRole; 
        } else {
            return []; 
        }
    }

    async function verifyOwner(id_usuario: number, id_evento: number) {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;
    
        let connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });
    
        let verify = await connection.execute(
            `SELECT ID_USUARIO FROM EVENTS WHERE ID_USUARIO = :id_usuario AND ID_EVENTO = :id_evento`,
            [id_usuario, id_evento]
        );
    
        await connection.close();
    
        return verify.rows;
    }

    async function getIdEventOwner(id_evento: number): Promise<number | undefined> {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;
    
        let connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });
    
        let verify = await connection.execute<{ ID_USUARIO: number }>(
            `SELECT ID_USUARIO FROM EVENTS WHERE ID_EVENTO = :id_evento`,
            [id_evento]
        );
    
        await connection.close();
        
        return verify.rows?.[0]?.ID_USUARIO;
    }

    async function getEmail(id_usuario: number): Promise<string | undefined> {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;
    
        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });
    
        try {
            const result = await connection.execute<{ EMAIL: string }>(
                `SELECT EMAIL FROM ACCOUNTS WHERE ID = :id_usuario`,
                [id_usuario]
            );
    
            const rows = result.rows;
            
            if (rows && rows.length > 0) {
                return rows[0].EMAIL;
            } else {
                return undefined; 
            }
        } catch (error) {
            console.error('Erro ao obter email:', error);
            return undefined;
        } finally {
            await connection.close();
        }
    }
    

    async function addNewEvent(
        id_usuario: number, 
        titulo: string, 
        descricao: string, 
        categoria: string,
        valor_cota: number, 
        data_hora_inicio: string, 
        data_hora_fim: string, 
        data_evento: string
    ) {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;
    
        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });
    
        try {
            // Converte 'categoria' para minúsculas
            const categoriaLower = categoria.toLowerCase();
    
            await connection.execute(
                `INSERT INTO EVENTS (
                    ID_EVENTO, 
                    ID_USUARIO, 
                    TITULO, 
                    DESCRICAO, 
                    CATEGORIA, 
                    VALOR_COTA, 
                    DATA_HORA_INICIO, 
                    DATA_HORA_FIM, 
                    DATA_EVENTO
                ) VALUES (
                    SEQ_EVENTS.NEXTVAL, 
                    :id_usuario, 
                    :titulo, 
                    :descricao, 
                    :categoria, 
                    :valor_cota, 
                    TO_DATE(:data_hora_inicio, 'yyyy/mm/dd hh24:mi:ss'), 
                    TO_DATE(:data_hora_fim, 'yyyy/mm/dd hh24:mi:ss'), 
                    TO_DATE(:data_evento, 'YYYY-MM-DD')
                )`,
                {
                    id_usuario,
                    titulo,
                    descricao,
                    categoria: categoriaLower, // Utiliza a versão em minúsculas
                    valor_cota,
                    data_hora_inicio,
                    data_hora_fim,
                    data_evento
                }
            );
            
            await connection.commit();
        } catch (error) {
            console.error('Erro ao adicionar evento:', error);
            throw error; // Propaga o erro para ser tratado no handler
        } finally {
            await connection.close();
        }
    }
    
    
    async function evaluateNewEvent(id_evento: number, razao: string, status: string) {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;

        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });

        try {
            await connection.execute(
                `UPDATE EVENTS SET RAZAO = :razao, STATUS_EVENTO = :status WHERE ID_EVENTO = :id_evento AND STATUS_EVENTO = 'PENDENTE'`,
                [razao, status, id_evento]
            );

            await connection.commit();
        } catch (error) {
            console.error('Erro ao avaliar evento:', error);
            throw error;
        } finally {
            await connection.close();
        }
    }

    async function getEventsByStatus(status: string) {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;

        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });

        try {
            let events = await connection.execute(
                `SELECT 
                    id_evento, 
                    id_usuario, 
                    titulo, 
                    descricao, 
                    categoria,
                    valor_cota, 
                    TO_CHAR(data_hora_inicio, 'YYYY-MM-DD HH24:MI:SS') AS data_hora_inicio, 
                    TO_CHAR(data_hora_fim, 'YYYY-MM-DD HH24:MI:SS') AS data_hora_fim, 
                    TO_CHAR(data_evento, 'YYYY-MM-DD') AS data_evento, 
                    status_evento 
                FROM 
                    EVENTS 
                WHERE 
                    STATUS_EVENTO = :status`,
                [status]
            );

            return events.rows;
        } catch (error) {
            console.error('Erro ao buscar eventos por status:', error);
            throw error;
        } finally {
            await connection.close();
        }
    }

    async function getAvailableEvents() {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;

        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });

        try {
            let events = await connection.execute(
                `SELECT 
                    id_evento, 
                    id_usuario, 
                    titulo, 
                    descricao, 
                    categoria,
                    valor_cota, 
                    TO_CHAR(data_hora_inicio, 'YYYY-MM-DD HH24:MI:SS') AS data_hora_inicio, 
                    TO_CHAR(data_hora_fim, 'YYYY-MM-DD HH24:MI:SS') AS data_hora_fim, 
                    TO_CHAR(data_evento, 'YYYY-MM-DD') AS data_evento, 
                    status_evento 
                FROM 
                    EVENTS 
                WHERE 
                    status_evento = 'APROVADO' 
                    AND data_hora_fim > SYSDATE AND data_hora_inicio < SYSDATE`
            );

            return events.rows;
        } catch (error) {
            console.error('Erro ao buscar eventos disponíveis:', error);
            throw error;
        } finally {
            await connection.close();
        }
    }

    async function getEventosMaisApostados() {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;

        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });

        try {
            let events = await connection.execute(
                `SELECT 
                    EVENTS.id_evento, 
                    EVENTS.id_usuario, 
                    EVENTS.titulo, 
                    EVENTS.descricao, 
                    EVENTS.categoria,
                    EVENTS.valor_cota, 
                    TO_CHAR(EVENTS.data_hora_inicio, 'YYYY-MM-DD HH24:MI:SS') AS data_hora_inicio, 
                    TO_CHAR(EVENTS.data_hora_fim, 'YYYY-MM-DD HH24:MI:SS') AS data_hora_fim, 
                    TO_CHAR(EVENTS.data_evento, 'YYYY-MM-DD') AS data_evento, 
                    EVENTS.status_evento,
                    COUNT(APOSTA.id_evento) AS total_apostas
                FROM 
                    EVENTS 
                INNER JOIN
                    APOSTA ON EVENTS.id_evento = APOSTA.id_evento
                WHERE 
                    EVENTS.status_evento = 'APROVADO' 
                    AND EVENTS.data_hora_fim > SYSDATE
                GROUP BY 
                    EVENTS.id_evento, EVENTS.id_usuario, EVENTS.titulo, EVENTS.descricao, EVENTS.categoria, EVENTS.valor_cota, 
                    EVENTS.data_hora_inicio, EVENTS.data_hora_fim, EVENTS.data_evento, EVENTS.status_evento
                ORDER BY 
                    total_apostas DESC`
            );

            return events.rows;
        } catch (error) {
            console.error('Erro ao buscar eventos mais apostados:', error);
            throw error;
        } finally {
            await connection.close();
        }
    }

    async function getFinishedEvents() {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;

        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });

        try {
            let events = await connection.execute(
                `SELECT 
                    id_evento, 
                    id_usuario, 
                    titulo, 
                    descricao, 
                    categoria,
                    valor_cota, 
                    TO_CHAR(data_hora_inicio, 'YYYY-MM-DD HH24:MI:SS') AS data_hora_inicio, 
                    TO_CHAR(data_hora_fim, 'YYYY-MM-DD HH24:MI:SS') AS data_hora_fim, 
                    TO_CHAR(data_evento, 'YYYY-MM-DD') AS data_evento, 
                    status_evento 
                FROM 
                    EVENTS 
                WHERE 
                    status_evento = 'APROVADO' 
                    AND data_hora_fim < SYSDATE`
            );

            return events.rows;
        } catch (error) {
            console.error('Erro ao buscar eventos finalizados:', error);
            throw error;
        } finally {
            await connection.close();
        }
    }

    async function deleteEvent(id_evento: number) {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;

        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });

        try {
            await connection.execute(
                `UPDATE EVENTS SET STATUS_EVENTO = 'EXCLUÍDO' WHERE ID_EVENTO = :id_evento`,
                [id_evento]
            );

            await connection.commit();
        } catch (error) {
            console.error('Erro ao deletar evento:', error);
            throw error;
        } finally {
            await connection.close();
        }
    }

    async function getEvent(id_evento: number) {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;

        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });

        try {
            let result = await connection.execute(
                `SELECT * FROM EVENTS WHERE ID_EVENTO = :id_evento AND STATUS_EVENTO = 'PENDENTE'`,
                [id_evento],
            );

            return result.rows;
        } catch (error) {
            console.error('Erro ao buscar evento:', error);
            throw error;
        } finally {
            await connection.close();
        }
    }

    async function eventExists(id_evento: number) {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;

        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });

        try {
            let events = await connection.execute(
                `SELECT * FROM EVENTS WHERE ID_EVENTO = :id_evento`,
                [id_evento],
            );

            return events.rows;
        } catch (error) {
            console.error('Erro ao verificar existência do evento:', error);
            throw error;
        } finally {
            await connection.close();
        }
    }

    async function verifyDate(inputDate: string): Promise<boolean> {
        const currentDate = new Date();
        const userDate = new Date(inputDate);
    
        if (isNaN(userDate.getTime()) || userDate < currentDate) {
            return false;
        }
        
        return true;
    }

    async function searchEvent(keywords: string) {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;
    
        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });

        const keyword = `%${keywords}%`; // Corrigido
    
        try {
            let events = await connection.execute(
                `SELECT 
                    id_evento, 
                    id_usuario, 
                    titulo, 
                    descricao, 
                    categoria,
                    valor_cota, 
                    TO_CHAR(data_hora_inicio, 'YYYY-MM-DD HH24:MI:SS') AS data_hora_inicio, 
                    TO_CHAR(data_hora_fim, 'YYYY-MM-DD HH24:MI:SS') AS data_hora_fim, 
                    TO_CHAR(data_evento, 'YYYY-MM-DD') AS data_evento, 
                    status_evento 
                FROM 
                    EVENTS 
                WHERE 
                    descricao LIKE :keywords AND status_evento = 'APROVADO'`,
                [keyword]
            );
    
            return events.rows;
        } catch (error) {
            console.error('Erro ao buscar eventos por keywords:', error);
            throw error;
        } finally {
            await connection.close();
        }
    }
    
    export const addNewEventHandler: RequestHandler = async (req: Request, res: Response) => {
        const token = req.cookies.token;
        const { titulo, descricao, categoria, valor_cota, data_hora_inicio, data_hora_fim, data_evento } = req.body;


        if (typeof token !== 'string' && !token) {
            res.status(400).send('Requisição inválida - tente logar novamente.');
            return; 
        }
    
        if (!titulo || !descricao || !categoria || !valor_cota || !data_evento || !data_hora_inicio || !data_hora_fim) {
            res.status(400).send('Requisição inválida - Parâmetros faltando.');
            return; 
        }

        if(valor_cota < 1){
            res.status(400).send('O valor da cota não pode ser menor que R$1,00');
            return; 
        }

        try {
            const id_usuario = await userId(token);
    
            if (id_usuario === null) {
                res.status(401).send('Acesso não permitido. Tente logar novamente.');
                return;
            }
    
            await addNewEvent(id_usuario, titulo, descricao, categoria, valor_cota, data_hora_inicio, data_hora_fim, data_evento);
            res.status(201).send('Evento criado com sucesso!'); 
    
        } catch (error) {
            console.error('Erro ao adicionar evento:', error);
            res.status(500).send('Erro ao criar evento.'); 
        }
    }

    export const evaluateNewEventHandler: RequestHandler = async (req: Request, res: Response) =>{
        const token = req.get('token');
        const id_evento = req.get("id_evento");
        
        if (typeof token !== 'string') {
            res.status(400).send('Requisição inválida - tente logar novamente.');
            return; 
        }

        const id_usuario = await userId(token);

        if (id_usuario === null) {
            res.status(401).send('Acesso não permitido. Tente logar novamente.');
            return;
        }

        let role = await verifyRole(id_usuario);

        const { status, razao } = req.body;
        var statusUpper = status.toUpperCase();

        if(!id_evento || !statusUpper ){
            res.status(400).send('Requisição inválida - Parâmetros faltando.');
            return;
        } else {
            if(role.includes(2)){
                try {
                    const eventoId = parseInt(id_evento, 10); // transforma em number
                    const evento = await getEvent(eventoId);
                    console.log(evento);
                    if(Array.isArray(evento) && evento.length === 0){
                        res.status(404).send('Evento não encontrado');
                        return;
                    }
                    await evaluateNewEvent(eventoId, razao, statusUpper);
                    const idOwner = await getIdEventOwner(eventoId);
                
                    if(!idOwner){
                        res.status(404).send('Email não encontrado');
                        return;
                    }
                    const email = await getEmail(idOwner);
                    
                    if (email && statusUpper === 'REPROVADO') {
                        const from: string = 'k1tk4tc4t@gmail.com';
                        const to: string = email;
                        const subject: string = 'EVENTO REPROVADO';
                        const mailTemplate: string = razao;
                        sendMail(from, to, subject, mailTemplate);
                    } else if (!email) {
                        console.error("Email is undefined or invalid for user:", id_usuario);
                    }

                    res.status(200).send('Status do evento alterado.'); 
                } catch (error) {
                    console.error('Erro ao avaliar evento:', error);
                    res.status(500).send('Erro ao mudar o status do evento.');
                } 
            } else {
                res.status(403).send('Acesso negado.');
            }
        }
    }

    export const getEventsByStatusHandler: RequestHandler = async (req: Request, res: Response) =>{
        const { status } = req.body;
        const token = req.get('token');
        if (typeof token !== 'string') {
            res.status(400).send('Requisição inválida - tente logar novamente.');
            return; 
        }

        const id_usuario = await userId(token);
        if (!id_usuario) {
            res.status(400).send('Requisição inválida - tente logar novamente.');
            return; 
        }

        let role = await verifyRole(id_usuario);

        if(role.includes(1)){
            res.status(400).send('Acesso negado');
            return; 
        }

        if(status){
            try {
                var statusUpper = status.toUpperCase();
                let events = await getEventsByStatus(statusUpper);
                if(Array.isArray(events) && events.length > 0){
                    res.status(200).json(events);
                } else {
                    res.status(404).send('Eventos não encontrados');
                }
            } catch (error) {
                console.error('Erro ao buscar eventos por status:', error);
                res.status(500).send('Erro ao buscar evento.');
            }
        } else {
            res.status(400).send('Requisição inválida - Parâmetros faltando.');
            return;
        }
    } 

    export const getAvailableEventsHandler: RequestHandler = async (req: Request, res: Response) =>{
        try {
            let events = await getAvailableEvents();
            if(Array.isArray(events) && events.length > 0){
                res.status(200).json(events);
            } else {
                res.status(404).send('Eventos não encontrados');
            }
        } catch (error) {
            console.error('Erro ao buscar eventos disponíveis:', error);
            res.status(500).send('Erro ao buscar evento.');
        }
    }

    export const getEventosMaisApostadosHandler: RequestHandler = async (req: Request, res: Response) =>{
        try {
            let events = await getEventosMaisApostados();
            if(Array.isArray(events) && events.length > 0){
                res.status(200).json(events);
            } else {
                res.status(404).send('Eventos não encontrados');
            }
        } catch (error) {
            console.error('Erro ao buscar eventos mais apostados:', error);
            res.status(500).send('Erro ao buscar evento.');
        }
    }

    async function getUserEvents(userId: number) {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;
    
        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });
    
        try {
            const events = await connection.execute(
                `SELECT 
                    titulo, 
                    descricao,  
                    TO_CHAR(data_evento, 'YYYY-MM-DD') AS data_evento, 
                    status_evento,
                    id_evento 
                FROM 
                    EVENTS 
                WHERE 
                    id_usuario = :userId 
                    AND status_evento IN ('APROVADO','PENDENTE')`, // Adicionado o operador AND
                [userId]
            );            
    
            return events.rows;
        } catch (error) {
            console.error('Erro ao buscar eventos do usuário:', error);
            throw error;
        } finally {
            await connection.close();
        }
    }


    export const getFinishedEventsHandler: RequestHandler = async (req: Request, res: Response) =>{
        try {
            let events = await getFinishedEvents();
            if(Array.isArray(events) && events.length > 0){
                res.status(200).json(events);
            } else {
                res.status(404).send('Eventos não encontrados');
            }
        } catch (error) {
            console.error('Erro ao buscar eventos finalizados:', error);
            res.status(500).send('Erro ao buscar evento.');
        }
    }

    export const deleteEventHandler: RequestHandler = async (req: Request, res: Response) =>{
        const token = req.cookies.token;
        const id_evento = req.get("id_evento");

        if (typeof token !== 'string') {
            res.status(400).send('Requisição inválida - tente logar novamente.');
            return; 
        }

        const id_usuario = await userId(token);

        if (id_usuario === null) {
            res.status(401).send('Acesso não permitido. Tente logar novamente.');
            return;
        }

        if(!id_evento){
            res.status(400).send('Requisição inválida - Parâmetros faltando.');
            return;
        } 

        const eventoId = parseInt(id_evento, 10);
        let owner = await verifyOwner(id_usuario, eventoId);
            
        if (Array.isArray(owner) && owner.length > 0){
            try {
                let existe = await eventExists(eventoId);
                if(Array.isArray(existe) && existe.length > 0){
                    await deleteEvent(eventoId);
                    res.status(200).send('Evento excluído.'); 
                } else {
                    res.status(404).send('Evento não encontrado.'); 
                }  
            } catch (error) {
                console.error('Erro ao deletar evento:', error);
                res.status(500).send('Erro ao deletar evento.');
            } 
        } else {
            res.status(403).send('Acesso negado'); 
        }
    }         

    
    export const getUserEventsHandler: RequestHandler = async (req: Request, res: Response) => {
        const token = req.cookies.token;
        try {
            const id_usuario = await userId(token);
            console.log(id_usuario);
            if (!id_usuario) {
                res.status(400).send('ID do usuário não fornecido.');
                return; // Finaliza a execução da função
            }
    
            const events = await getUserEvents(id_usuario);
    
            if (Array.isArray(events) && events.length > 0) {
                res.status(200).json(events);
            } else {
                res.status(404).send('Nenhum evento encontrado para este usuário.');
            }
        } catch (error) {
            console.error('Erro ao buscar eventos do usuário:', error);
            res.status(500).send('Erro ao buscar eventos do usuário.');
        }
    };

    export const searchEventHandler: RequestHandler = async (req: Request, res: Response) =>{
        const { keywords } = req.body;
        if(keywords){
            try {
                let events = await searchEvent(keywords);
                if(Array.isArray(events) && events.length > 0){
                    res.status(200).json(events);
                } else {
                    res.status(404).send('Eventos não encontrados');
                }
            } catch (error) {
                console.error('Erro ao buscar eventos por keywords:', error);
                res.status(500).send('Erro ao buscar evento.');
            }
        } else {
            res.status(400).send('Requisição inválida - Parâmetros faltando.');
            return;
        }
    } 

}
