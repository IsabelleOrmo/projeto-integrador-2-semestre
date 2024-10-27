import { Request, RequestHandler, Response } from "express";
import OracleDB from "oracledb";
import dotenv from 'dotenv'; 
dotenv.config();

export namespace ClosingBetsHandler {

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

    export type Bet = {
        id_aposta: number | undefined; 
        ID_USUARIO: number;            
        cotas_qntd: number;
        VALOR: number;
        tipo: string;
        data_hora: string;
        valor_retorno: number;
        decisao_aposta: string;        
    };

    async function finishEvent(id_evento: number, decisao_aposta: string) {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;
    
        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });
    
        await connection.execute(
            `UPDATE EVENTS SET DECISAO = :decisao_aposta WHERE ID_EVENTO = :id_evento`,
            [decisao_aposta, id_evento]
        );

        await connection.execute(
            `UPDATE EVENTS SET STATUS_EVENTO = 'FINALIZADO' WHERE ID_EVENTO = :id_evento`,
            [id_evento]
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

    async function updateCarteira(id_usuario: number, id_evento:number, valor: number) {
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
            `INSERT INTO TRANSACAO (ID_TRANSACAO, ID_USUARIO, ID_EVENTO, VALOR, TIPO, DATA_TRANSACAO) 
             VALUES (SEQ_TRANSACAO.NEXTVAL, :id_usuario, :id_evento, :valor, 'DEPÓSITO DE APOSTA', SYSDATE)`,  
            [id_usuario, id_evento, valor]
        );
    
        await connection.commit();
        await connection.close();
    }

    async function getWinners(id_evento: number, decisao_aposta: string): Promise<Bet[]> {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;
    
        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });
    
        const result = await connection.execute<Bet>(
            `SELECT * FROM APOSTA WHERE ID_EVENTO = :id_evento AND TIPO = :decisao_aposta`,
            [id_evento, decisao_aposta]
        );
    
        await connection.close();
    
        return (result.rows as Bet[]) || [];
    }

    async function getLosers(id_evento: number, decisao_aposta: string): Promise<Bet[]> {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;
        
        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });
    
        const result = await connection.execute<Bet>(
            `SELECT * FROM APOSTA WHERE ID_EVENTO = :id_evento AND TIPO = :decisao_aposta`,
            [id_evento, decisao_aposta]
        );
    
        await connection.close();
    
        // Verifica se rows está definida, caso contrário retorna um array vazio
        return (result.rows as Bet[]) || [];
    }
    
    async function getCotas(id_evento: number): Promise<number | undefined> {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;
        
        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });
    
            const result = await connection.execute<{ VALOR_COTA: number }>(
                `SELECT VALOR_COTA FROM EVENTS WHERE ID_EVENTO = :id_evento`, 
                { id_evento } 
            );

            await connection.close();
    
            if (result.rows && result.rows.length > 0) {
                return result.rows[0].VALOR_COTA; 
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
            
            const eventoId = parseInt(id_evento, 10);
            await finishEvent(eventoId, decisao_apostaUpper);
            let cota = await getCotas(eventoId);
            if (!cota) {
                res.status(400).send('Requisição inválida - Parâmetros faltando.');
                return; 
            }
            if (decisao_apostaUpper === 'NÃO') {
                const winners = await getWinners(eventoId, decisao_apostaUpper);
                const losers = await getLosers(eventoId, 'SIM');
                if (!losers || !winners) {
                    res.status(400).send('Requisição inválida - Parâmetros faltando.');
                    return; 
                }
                let valorPerdedores = 0;
                for (let index = 0; index < losers.length; index++) {
                    const valor = losers[index].VALOR;
                    if (valor !== undefined) {
                        valorPerdedores = valorPerdedores + valor;
                    }
                }

                
                let valorDistruibuido = valorPerdedores; 

                let valorTotal = 0; 

                for (let index = 0; index < winners.length; index++) {
                    const valorW = winners[index].VALOR;
                    if (valorW !== undefined) {
                        valorTotal = valorTotal + valorW;
                    }
                }

                const valorTotalCotas = valorTotal/cota;
                const valorPorCota = valorDistruibuido/valorTotalCotas;

                for (let index = 0; index < winners.length; index++) {
                    const valor = winners[index].VALOR;
                    const id = winners[index].ID_USUARIO;
                    if (valor !== undefined) {
                        let qntdCota = valor/cota;
                        const valorUp = valorPorCota*qntdCota;
                        const currentlyWallet = await getWalletFunds(id);
                        if (!currentlyWallet) {
                            res.status(400).send('Requisição inválida - Parâmetros faltando.');
                            return; 
                        }
                        const valorRetorno = currentlyWallet + valorUp + valor;
                        await updateCarteira(id, eventoId,valorRetorno);
                    }
                }

            } else if (decisao_apostaUpper === 'SIM') {
                const winners = await getWinners(eventoId, decisao_apostaUpper);
                const losers = await getLosers(eventoId, 'NÃO');
                if (!losers || !winners) {
                    res.status(400).send('Requisição inválida - Parâmetros faltando.');
                    return; 
                }
                let valorPerdedores = 0;

                for (let index = 0; index < losers.length; index++) {
                    const valor = losers[index].VALOR;
                    if (valor !== undefined) {
                        valorPerdedores = valorPerdedores + valor;
                    }
                }

                
                let valorDistruibuido = valorPerdedores; 

                let valorTotal = 0; 

                for (let index = 0; index < winners.length; index++) {
                    const valorW = winners[index].VALOR;
                    if (valorW !== undefined) {
                        valorTotal = valorTotal + valorW;
                    }
                }

                const valorTotalCotas = valorTotal/cota;
                const valorPorCota = valorDistruibuido/valorTotalCotas;

                for (let index = 0; index < winners.length; index++) {
                    const valor = winners[index].VALOR;
                    const id = winners[index].ID_USUARIO;
                    if (valor !== undefined) {
                        let qntdCota = valor/cota;
                        const valorUp = valorPorCota*qntdCota;
                        const currentlyWallet = await getWalletFunds(id);
                        if (!currentlyWallet) {
                            res.status(400).send('Requisição inválida - Parâmetros faltando.');
                            return; 
                        }
                        const valorRetorno = currentlyWallet + valorUp + valor;
                        await updateCarteira(id, eventoId,valorRetorno);
                    }
                }
            }
            res.status(201).send('Evento finalizado e fundos distribuidos com sucesso.'); 
    
        } catch (error) {
            console.error('Erro:', error);
            res.status(500).send('Erro.'); 
        }
    }

}