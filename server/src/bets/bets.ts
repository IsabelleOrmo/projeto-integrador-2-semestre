import { Request, RequestHandler, Response } from "express";
import OracleDB from "oracledb";
import dotenv from 'dotenv'; 
dotenv.config();

export namespace BetHandler {

    export type Bet = {
        id_aposta: number | undefined; 
        id_usuario: number;            
        cotas_qntd: number;
        tipo: string;
        data_hora: string;
        valor_retorno: number;
        decisao_aposta: string;        
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
    

    async function userId(email: string): Promise<number | null> {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;

        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });

        try {
            const result = await connection.execute(
                `SELECT ID FROM ACCOUNTS WHERE EMAIL = :email`,
                [email]
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

    async function valorApostado(id_usuario: number, id_evento: number, valor: number) {
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

    async function valorCota(id_evento:number) {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;
    
        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });
    
        let result = await connection.execute<{VALOR_COTA: number}>( // especifica a propriedade do resultado e seu tipo
            `SELECT VALOR_COTA FROM EVENTS WHERE ID_EVENTO = :id_evento`, 
            {id_evento} 
        );
    
        await connection.close();

        if (result.rows && result.rows.length > 0) {
            return result.rows[0].VALOR_COTA; // retorna o valor da cota se existir
        } else {
            return undefined;
        }
    
    }

    async function betOnEvent(id_usuario: number, id_evento: number, cotas_qntd: number, tipo: string) {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;
    
        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });
    
        await connection.execute(
            `INSERT INTO APOSTA (ID_APOSTA, ID_USUARIO, ID_EVENTO, VALOR, TIPO, DATA_HORA) 
             VALUES (SEQ_APOSTA.NEXTVAL, :id_usuario, :id_evento, :cotas_qntd, :tipo, SYSDATE)`,
            [id_usuario, id_evento, cotas_qntd, tipo]
        );
        
        
        await connection.execute(
            `INSERT INTO TRANSACAO (ID_TRANSACAO, ID_USUARIO, ID_EVENTO, VALOR, TIPO, DATA_TRANSACAO) 
             VALUES (SEQ_TRANSACAO.NEXTVAL, :id_usuario, :id_evento, :valor, 'APOSTA', SYSDATE)`,  
            [id_usuario, id_evento, cotas_qntd]
        );

        await connection.commit();
        await connection.close();
    }

    export const betOnEventHandler: RequestHandler = async (req: Request, res: Response) => {
        const email = req.get('email');
        const id_evento = req.get('id_evento');
        const { cotas_qntd, tipo } = req.body;
        var tipoUpper = tipo.toUpperCase( );
        
        if (typeof email !== 'string') {
            res.status(400).send('Requisição inválida - tente logar novamente.');
            return; 
        }
    
        if (!cotas_qntd || cotas_qntd == 0 || !tipoUpper || !id_evento) {
            res.status(400).send('Requisição inválida - Parâmetros faltando.');
            return; 
        }
    
        try {
            const id_usuario = await userId(email);
    
            if (id_usuario === null) {
                res.status(401).send('Acesso não permitido. Tente logar novamente.');
                return;
            }
    
            const valorAtualCarteira = await getWalletFunds(id_usuario); 
    
            if(!valorAtualCarteira){
                res.status(400).send('Saldo insuficiente.');
                return;
            }

            const eventoId = parseInt(id_evento, 10);
            const cota = await valorCota(eventoId);

            if (!cota) {
                res.status(400).send('Cota para o evento não encontrada.');
                return;
            }
            
            const valor_final_aposta = cotas_qntd * cota;
            
            if (valorAtualCarteira < valor_final_aposta) {
                res.status(400).send('Saldo insuficiente.');
                return;
            }            

            const valor_carteira = valorAtualCarteira - valor_final_aposta;
            
            await betOnEvent(id_usuario, eventoId, valor_final_aposta, tipoUpper);
            await valorApostado(id_usuario, eventoId, valor_carteira);

            res.status(201).send('Aposta realizado com sucesso.'); 
    
        } catch (error) {
            console.error('Erro:', error);
            res.status(500).send('Erro.'); 
        }
    }

}