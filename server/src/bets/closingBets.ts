import { Request, RequestHandler, Response } from "express";
import OracleDB from "oracledb";
import dotenv from 'dotenv'; 
dotenv.config();

export namespace ClosingBetsHandler {

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

    async function updateCarteira(id_usuario: number, id_evento: number, valor: number) {
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

    async function finishEvent(id_evento: number, decisao_aposta: string) {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;
    
        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });
    
        await connection.execute(
            `UPDATE APOSTA SET DECISAO_APOSTA = :decisao_aposta WHERE ID_EVENTO = :id_evento`,
            [decisao_aposta, id_evento]
        );

        await connection.execute(
            `UPDATE EVENTS SET STATUS_EVENTO = 'FINALIZADO' WHERE ID_EVENTO = :id_evento`,
            [id_evento]
        );

        await connection.commit();
        await connection.close();
    }

    async function getDecisao(id_evento:number) {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;
    
        let connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });

        const result = await connection.execute<{ DECISAO: string }>(
            `SELECT DECISAO_APOSTA FROM APOSTA WHERE ID_EVENTO = :id_evento`,
            [id_evento]
        );

        await connection.close();

        if (result.rows && result.rows.length > 0) {
            return result.rows[0].DECISAO;
        } else {
            return undefined;
        }
    }

    async function getBet(id_evento:number, tipo: string) {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;
    
        let connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });

        const result = await connection.execute(
            `SELECT ID_USUARIO FROM APOSTA WHERE ID_EVENTO = :id_evento AND TIPO = :tipo`,
            [id_evento, tipo]
        );

        await connection.close();

        if (result.rows && result.rows.length > 0) {
            return result.rows;
        } else {
            return undefined;
        }
    }

    async function getAllBets(id_evento:number) {
            OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;
        
            const connection = await OracleDB.getConnection({
                user: process.env.ORACLE_USER,
                password: process.env.ORACLE_PASSWORD,
                connectString: process.env.ORACLE_CONN_STR
            });
        
            const result = await connection.execute<Bet[]>(
                `SELECT * FROM APOSTA WHERE ID_EVENTO = :id_evento`,
                [id_evento]
            );
        
            await connection.close();
        
            
        if (result.rows && result.rows.length > 0) {
            return result.rows;
        } else {
            return undefined;
        }
    }

    export const finishEventHandler: RequestHandler = async (req: Request, res: Response) => {
        const token = req.get('token');
        const id_evento = req.get('id_evento');
        const { decisao_aposta } = req.body;
        var decisao_apostaUpper = decisao_aposta.toUpperCase( );
        
        if (typeof token !== 'string') {
            res.status(400).send('Requisição inválida - tente logar novamente.');
            return; 
        }
    
        if (!decisao_apostaUpper || !id_evento) {
            res.status(400).send('Requisição inválida - Parâmetros faltando.');
            return; 
        }
    
        try {
            const id_usuario = await userId(token);
    
            if (id_usuario === null) {
                res.status(401).send('Acesso não permitido. Tente logar novamente.');
                return;
            }

            const eventoId = parseInt(id_evento, 10);
            const cota = await valorCota(eventoId);

            if (!cota) {
                res.status(400).send('Cota para o evento não encontrada.');
                return;
            }

            const decisaoFinal = await getDecisao(eventoId);

            if (!decisaoFinal) {
                res.status(400).send('Decisão final para o evento não encontrada.');
                return;
            }

            const winners = await getBet(eventoId, decisaoFinal);
            const totalBets = await getAllBets(eventoId);
            
            if (!winners) {
                res.status(400).send('Vencedores não encontrada.');
                return;
            }

            for (let index = 0; index < winners.length; index++) {
                const element = Number(winners[index]);
                const valorAtualCarteira = await getWalletFunds(element); 
    
                if(valorAtualCarteira == null){
                    res.status(404).send('Carteira não encontrada');
                    return;
                }


                
            }
            
            const valor_carteira = valorAtualCarteira - valor_final_aposta;
            
            res.status(201).send('Aposta realizado com sucesso.'); 
    
        } catch (error) {
            console.error('Erro:', error);
            res.status(500).send('Erro.'); 
        }
    }

}