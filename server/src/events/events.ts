import { Request, RequestHandler, Response } from "express";
import OracleDB from "oracledb";
import dotenv from 'dotenv'; 
import { error } from "console";
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
            console.error('Database error:', error);
            return null; 
        } finally {
            await connection.close(); 
        }
    }
    
    async function addNewEvent(id_usuario: number, titulo: string, descricao: string, valor_cota: number, data_hora_inicio: string, data_hora_fim: string, data_evento: string) {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;

        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });

        await connection.execute(
            `INSERT INTO EVENTS (ID_EVENTO, ID_USUARIO, TITULO, DESCRICAO, VALOR_COTA, DATA_HORA_INICIO, DATA_HORA_FIM, DATA_EVENTO) 
            VALUES (SEQ_EVENTS.NEXTVAL, :id_usuario, :titulo, :descricao, :valor_cota, :data_hora_inicio, :data_hora_fim, :data_evento)`,
            [id_usuario, titulo, descricao, valor_cota, data_hora_inicio, data_hora_fim, data_evento],
            
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

    async function getEvents(status:string) {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;

        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });

        let events  = await connection.execute(
            `SELECT * FROM EVENTS WHERE STATUS_EVENTO = :status`,
            [status],
            
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
        const id_evento = req.get("id_evento");
        
        const { status } = req.body;
        var statusUpper = status.toUpperCase( );

        if(!id_evento || !statusUpper ){
            res.status(400).send('Requisição inválida - Parâmetros faltando.');
            return;
        } else {
            try {
                const eventoId = parseInt(id_evento, 10); // tranforma em number
                await evaluateNewEvent(eventoId, statusUpper);
                res.status(200).send('Status do evento alterado.'); 
            } catch (error) {
                console.error('Erro ao adicionar evento:', error);
                res.status(500).send('Erro ao criar evento.');
            } 
        }
    }

    export const getEventsHandler: RequestHandler = async (req: Request, res: Response) =>{
        const { status } = req.body;
        if(status){
            try {
                var statusUpper = status.toUpperCase( );
                let events = await getEvents(statusUpper);
                if(Array.isArray(events) && events.length>0){
                    res.status(200).json(events);
                } else {
                res.status(404).send('Eventos não encontrados');
                }
            } catch (error) {
                console.error('Erro ao adicionar evento:', error);
                res.status(500).send('Erro ao criar evento.');
            }
        } else {
            res.status(400).send('Requisição inválida - Parâmetros faltando.');
            return;
        }
    } 
    
}
