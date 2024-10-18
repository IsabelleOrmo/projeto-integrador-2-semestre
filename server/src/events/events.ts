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
            { autoCommit: true }
        );

        await connection.close();
    }

    export const addNewEventHandler: RequestHandler = async (req: Request, res: Response) => {
        const token = req.get('token');
        const { titulo, descricao, valor_cota, data_hora_inicio, data_hora_fim, data_evento } = req.body;
        
        if (typeof token === 'string') {
            try {
                const id_usuario = await userId(token);
                console.log(id_usuario);
                if (id_usuario !== null) { 
                    await addNewEvent(id_usuario, titulo, descricao, valor_cota, data_hora_inicio, data_hora_fim, data_evento);
                    res.status(200).send('Evento Criado!'); 
                } else {
                    res.status(401).send('Token inválido ou usuário não encontrado.');
                }
            } catch (error) {
                console.error('Erro ao adicionar evento:', error);
                res.status(500).send('Erro ao criar evento.'); 
            }
        } else {
            res.status(400).send('Token inválido.');
        }
    };
}
