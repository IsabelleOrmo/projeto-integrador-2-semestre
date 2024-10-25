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
            `UPDATE CARTEIRA SET VALOR = :valor WHERE ID_USUARIO = :id_usuario`, 
            { valor, id_usuario } 
        );
        
    
        await connection.execute(
            `INSERT INTO TRANSACAO (ID_TRANSACAO, ID_USUARIO, VALOR, TIPO, DATA_TRANSACAO) 
             VALUES (SEQ_TRANSACAO.NEXTVAL, :id_usuario, :valor, 'DEPÓSITO', SYSDATE)`,  
            [id_usuario, valor]
        );
    
        await connection.commit();
        await connection.close();
    }    

    async function withdrawFunds(id_usuario: number, valor: number) {
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
             VALUES (SEQ_TRANSACAO.NEXTVAL, :id_usuario, :valor, 'SAQUE', SYSDATE)`,  
            [id_usuario, valor]
        );
    
        await connection.commit();
        await connection.close();
    }

    async function getWalletFunds(id_usuario: number) {
        
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;
    
        let connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });

        const result = await connection.execute<{ VALOR: number }>(
            `SELECT VALOR FROM CARTEIRA WHERE ID_USUARIO = :id_usuario`,
            [id_usuario]
        );

        await connection.close();

        if (result.rows && result.rows.length > 0) {
            return result.rows[0].VALOR;
        } else {
            return undefined;
        }
    
    }

    async function valorComTaxa(valor: number) {
        if(valor<=100){
            valor = valor - ((4/100)*valor);
        } else if (valor>=101 || valor <=1000){
            valor = valor - ((3/100)*valor);
        } else if (valor>=1001 || valor <=5000){
            valor = valor - ((2/100)*valor);
        } else if (valor>=5001 || valor <=100000){
            valor = valor - ((2/100)*valor);
        } else {
            valor = valor;
        }

        return valor;
    }

    export const withdrawFundsHandler: RequestHandler = async (req: Request, res: Response) => {
        const token = req.get('token');
        const { valor } = req.body;
    
        
        if (typeof token !== 'string') {
            res.status(400).send('Requisição inválida - tente logar novamente.');
            return; 
        }
    
        if (!valor || valor == 0) {
            res.status(400).send('Requisição inválida - Parâmetros faltando.');
            return; 
        }
    
        try {
            const id_usuario = await userId(token);
    
            if (id_usuario === null) {
                res.status(401).send('Acesso não permitido. Tente logar novamente.');
                return;
            }
    
            const valorTaxa = await valorComTaxa(valor); 
            const valorAtualCarteira = await getWalletFunds(id_usuario); 
    
            if(!valorAtualCarteira){
                res.status(400).send('Saldo insuficiente.');
                return;
            }

            if (valorAtualCarteira < valorTaxa) {
                res.status(400).send('Saldo insuficiente.');
                return;
            }
    
            const valorFinal = valorAtualCarteira - valorTaxa;
            await withdrawFunds(id_usuario, valorFinal);
            res.status(201).send('Saque realizado com sucesso.'); 
    
        } catch (error) {
            console.error('Erro:', error);
            res.status(500).send('Erro.'); 
        }
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
    

            const valorAtual = await getWalletFunds(id_usuario);
            const valorTransacao = valorAtual + valor;
            await addFunds(id_usuario, valorTransacao);
            res.status(201).send('Valor adicionado.'); 
    
        } catch (error) {
            console.error('Erro:', error);
            res.status(500).send('Erro.'); 
        }
    }

}