import { Request, RequestHandler, Response } from "express";
import OracleDB from "oracledb";
import dotenv from 'dotenv'; 
dotenv.config();

export namespace EventsHandler {
    
    export type Event = {
        id_evento: number | undefined; 
        id_usuario: number;            
        titulo: string;                 
        descricao: string;              
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
    
    async function addNewEvent(
        id_usuario: number, 
        titulo: string, 
        descricao: string, 
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
    
        await connection.execute(
            `INSERT INTO EVENTS (ID_EVENTO, ID_USUARIO, TITULO, DESCRICAO, VALOR_COTA, DATA_HORA_INICIO, DATA_HORA_FIM, DATA_EVENTO) 
             VALUES (SEQ_EVENTS.NEXTVAL, :id_usuario, :titulo, :descricao, :valor_cota, 
             TO_DATE(:data_hora_inicio, 'yyyy/mm/dd hh24:mi:ss'), 
             TO_DATE(:data_hora_fim, 'yyyy/mm/dd hh24:mi:ss'), 
             TO_DATE(:data_evento, 'YYYY-MM-DD'))`,
            [id_usuario, titulo, descricao, valor_cota, data_hora_inicio, data_hora_fim, data_evento]
        );
        
        
        await connection.commit();
        await connection.close();
    }
    
    async function evaluateNewEvent(id_evento: number, status: string) {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;

        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });

        await connection.execute(
            `UPDATE EVENTS SET STATUS_EVENTO = :status WHERE ID_EVENTO = :id_evento`,
            [status, id_evento],
            
        );

        await connection.commit();
        await connection.close();
    }

    async function getEventsByStatus(status:string) {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;

        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });

        let events = await connection.execute(
            `SELECT 
                id_evento, 
                id_usuario, 
                titulo, 
                descricao, 
                valor_cota, 
                TO_CHAR(data_hora_inicio, 'YYYY-MM-DD HH24:MI:SS') AS data_hora_inicio, 
                TO_CHAR(data_hora_fim, 'YYYY-MM-DD HH24:MI:SS') AS data_hora_fim, 
                TO_CHAR(data_evento, 'YYYY-MM-DD') AS data_evento, 
                status_evento 
            FROM 
                EVENTS 
            WHERE 
                STATUS_EVENTO = :status`,
            [status],
        );

        await connection.close();

        return events.rows;
    }

    async function getAvailableEvents() {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;

        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });

        let events = await connection.execute(
            `SELECT 
                id_evento, 
                id_usuario, 
                titulo, 
                descricao, 
                valor_cota, 
                TO_CHAR(data_hora_inicio, 'YYYY-MM-DD HH24:MI:SS') AS data_hora_inicio, 
                TO_CHAR(data_hora_fim, 'YYYY-MM-DD HH24:MI:SS') AS data_hora_fim, 
                TO_CHAR(data_evento, 'YYYY-MM-DD') AS data_evento, 
                status_evento 
            FROM 
                EVENTS 
            WHERE 
                status_evento = 'APROVADO' 
                AND data_hora_fim > SYSDATE`
        );

        await connection.close();
        return events.rows;
        
    }

    async function getFinishedEvents() {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;

        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });

        let events = await connection.execute(
            `SELECT 
                id_evento, 
                id_usuario, 
                titulo, 
                descricao, 
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

        
        await connection.close();
        return events.rows;
        
    }

    async function deleteEvent(id_evento: number) {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;

        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });

        await connection.execute(
            `UPDATE EVENTS SET STATUS_EVENTO = 'EXCLUÍDO' WHERE ID_EVENTO = :id_evento`,
            [id_evento],
            
        );

        await connection.commit();
        await connection.close();
    }

    async function eventExists(id_evento:number) {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;

        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });

        let events  = await connection.execute(
            `SELECT * FROM EVENTS WHERE ID_EVENTO = :id_evento`,
            [id_evento],
            
        );

        await connection.close();

        return events.rows;
    }

    async function searchEvent(keywords: string) {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;
    
        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });

        const keyword = `%${keywords}%`;
    
        let events = await connection.execute(
            `SELECT 
                id_evento, 
                id_usuario, 
                titulo, 
                descricao, 
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
    
        await connection.close();
    
        return events.rows;
    }
    
    export const addNewEventHandler: RequestHandler = async (req: Request, res: Response) => {
        const token = req.get('token');
        const { titulo, descricao, valor_cota, data_hora_inicio, data_hora_fim, data_evento } = req.body;
    
        
        if (typeof token !== 'string') {
            res.status(400).send('Requisição inválida - tente logar novamente.');
            return; 
        }
    
        if (!titulo || !descricao || !valor_cota || !data_evento || !data_hora_inicio || !data_hora_fim) {
            res.status(400).send('Requisição inválida - Parâmetros faltando.');
            return; 
        }
    
        try {
            const id_usuario = await userId(token);
    
            if (id_usuario === null) {
                res.status(401).send('Acesso não permitido. Tente logar novamente.');
                return;
            }
    
            await addNewEvent(id_usuario, titulo, descricao, valor_cota, data_hora_inicio, data_hora_fim, data_evento);
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

        const { status } = req.body;
        var statusUpper = status.toUpperCase( );

        if(!id_evento || !statusUpper ){
            res.status(400).send('Requisição inválida - Parâmetros faltando.');
            return;
        } else {
            if(role.includes(2)){
                try {
                    const eventoId = parseInt(id_evento, 10); // tranforma em number
                    await evaluateNewEvent(eventoId, statusUpper);
                    res.status(200).send('Status do evento alterado.'); 
                } catch (error) {
                    console.error('Erro ao adicionar evento:', error);
                    res.status(500).send('Erro ao criar evento.');
                } 
            } else {
                res.status(403).send('Acesso negado.');
            }
        }
    }

    export const getEventsByStatusHandler: RequestHandler = async (req: Request, res: Response) =>{
        const { status } = req.body;
        if(status){
            try {
                var statusUpper = status.toUpperCase( );
                let events = await getEventsByStatus(statusUpper);
                if(Array.isArray(events) && events.length>0){
                    res.status(200).json(events);
                } else {
                res.status(404).send('Eventos não encontrados');
                }
            } catch (error) {
                console.error('Erro ao adicionar evento:', error);
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
                if(Array.isArray(events) && events.length>0){
                    res.status(200).json(events);
                } else {
                res.status(404).send('Eventos não encontrados');
                }
            } catch (error) {
                console.error('Erro ao buscar evento:', error);
                res.status(500).send('Erro ao buscar evento.');
            }
    }

    export const getFinishedEventsHandler: RequestHandler = async (req: Request, res: Response) =>{
        try {
            let events = await getFinishedEvents();
            if(Array.isArray(events) && events.length>0){
                res.status(200).json(events);
            } else {
            res.status(404).send('Eventos não encontrados');
            }
        } catch (error) {
            console.error('Erro ao buscar evento:', error);
            res.status(500).send('Erro ao buscar evento.');
        }
}

    export const deleteEventHandler: RequestHandler = async (req: Request, res: Response) =>{
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

        if(!id_evento){
            res.status(400).send('Requisição inválida - Parâmetros faltando.');
            return;
        } 

        const eventoId = parseInt(id_evento, 10);
        let owner = await verifyOwner(id_usuario, eventoId);
            
        if (Array.isArray(owner) && owner.length>0){
                try {
                    const eventoId = parseInt(id_evento, 10); // tranforma em number
                    let existe = await eventExists(eventoId);
                    if(Array.isArray(existe) && existe.length>0){
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

    export const searchEventHandler: RequestHandler = async (req: Request, res: Response) =>{
        const { keywords } = req.body;
        if(keywords){
            try {
                let events = await searchEvent(keywords);
                if(Array.isArray(events) && events.length>0){
                    res.status(200).json(events);
                } else {
                    res.status(404).send('Eventos não encontrados');
                }
            } catch (error) {
                console.error('Erro:', error);
                res.status(500).send('Erro ao buscar evento.');
            }
        } else {
            res.status(400).send('Requisição inválida - Parâmetros faltando.');
            return;
        }
    } 

}
