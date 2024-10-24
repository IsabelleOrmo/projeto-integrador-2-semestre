import { Request, RequestHandler, Response } from "express";
import OracleDB from "oracledb";
import dotenv from 'dotenv'; 
dotenv.config();

export namespace WalletHandler {

    export type Wallet = {
        id_carteira: number | undefined; 
        id_usuario: number;            
        valor: number;        
    };

    export type Transacao = {
        id_transacao: number | undefined; 
        id_usuario: number;
        id_evento: number;               
        valor: number;
        tipo: string;
        data_transacao: string;
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

    async function addFunds(id_usuario: number, valor: number) {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;
    
        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });
    
        await connection.execute(
            `UPDATE CARTEIRA SET VALOR = :valor 
             WHERE ID_USUARIO = :id_usuario`, 
            [valor, id_usuario]
        );
    
        await connection.execute(
            `INSERT INTO TRANSACAO (ID_TRANSACAO, ID_USUARIO, VALOR, TIPO, DATA_TRANSACAO) 
             VALUES (SEQ_TRANSACAO.NEXTVAL, :id_usuario, :valor, 'DEPÓSITO', SYSDATE)`,  
            [id_usuario, valor]
        );
    
        await connection.commit();
        await connection.close();
    }    

    export const addFundsHandler: RequestHandler = async (req: Request, res: Response) => {
        const token = req.get('token');
        const { valor } = req.body;
    
        
        if (typeof token !== 'string') {
            res.status(400).send('Requisição inválida - tente logar novamente.');
            return; 
        }
    
        if (!valor) {
            res.status(400).send('Requisição inválida - Parâmetros faltando.');
            return; 
        }
    
        try {
            const id_usuario = await userId(token);
    
            if (id_usuario === null) {
                res.status(401).send('Acesso não permitido. Tente logar novamente.');
                return;
            }
    
            await addFunds(id_usuario, valor);
            res.status(201).send('Valor adicionado.'); 
    
        } catch (error) {
            console.error('Erro:', error);
            res.status(500).send('Erro.'); 
        }
    }

}