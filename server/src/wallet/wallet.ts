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

    async function addFunds(id_usuario: number, valor: number, ) {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;
    
        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });
    
        await connection.execute(
            `INSERT INTO CARTEIRA (ID_CARTEIRA, ID_USUARIO, VALOR) 
             VALUES (SEQ_CARTEIRA.NEXTVAL, :id_usuario, :valor`,
            [id_usuario, valor]
        );

        await connection.execute( 
            `INSERT INTO TRANSACAO (ID_TRANSACAO, ID_USUARIO, VALOR, TIPO, DATA_TRANSACAO) 
            VALUES (SEQ_TRANSACAO.NEXTVAL, :id_usuario, :valor, "DEPÓSITO", SYSDATE`,
           [id_usuario, valor]
        );

        await connection.commit();
        await connection.close();
    }

}