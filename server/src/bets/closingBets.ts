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
        carteira: string;           
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

    function calcularValorTotal(apostas: Bet[]): number {
        let valorTotal = 0;
        for (let index = 0; index < apostas.length; index++) {
            const valor = apostas[index].VALOR;
            if (valor !== undefined) {
                valorTotal += valor;
            }
        }
        return valorTotal;
    }    

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

    
        await connection.commit();
        await connection.close();
    }

    
    async function updateTransacao(id_usuario: number, id_evento:number, valor: number) {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;
    
        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });
    
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

    async function getEndDate(id_evento: number): Promise<string | null> {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;
    
        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });
    
        let result = await connection.execute<{ DATA_EVENTO: string }>(
            `SELECT TO_CHAR(DATA_EVENTO, 'YYYY-MM-DD') AS DATA_EVENTO 
             FROM EVENTS WHERE ID_EVENTO = :id_evento AND STATUS_EVENTO = 'APROVADO'`,
            { id_evento }
        );
    
        await connection.close();
    
        if (result.rows && result.rows.length > 0) {
            return result.rows[0].DATA_EVENTO;
        } else {
            return null;
        }
    }

    async function verifyDate(inputDate: string): Promise<boolean> {
        const currentDate = new Date(); // Obtém a data e hora atual.
        const userDate = new Date(inputDate); // Converte a string `inputDate` em um objeto Date.
    
        // Verifica se userDate é inválido.
        if (isNaN(userDate.getTime())) {
            return false; // Retorna false se a data for inválida.
        }
    
        // Cria uma nova data para um dia após a userDate.
        const nextDay = new Date(userDate);
        nextDay.setDate(userDate.getDate() + 1); // Adiciona um dia à data de início.
    
        // Verifica se a data atual é menor ou igual ao dia após a data de início.
        if (currentDate < nextDay) {
            return false; // Retorna false se a data atual é antes ou igual a um dia após userDate.
        }
        
        return true; // Retorna true se a data atual é mais de um dia após userDate.
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

        if (!token) {
            res.status(400).send('Requisição inválida - tente logar novamente.');
            return; 
        }
    
        if (!decisao_apostaUpper || !id_evento) {
            res.status(400).send('Requisição inválida - Parâmetros faltando.');
            return; 
        }

        const eventoId = parseInt(id_evento, 10);

        const dataFim = await getEndDate(eventoId);
        if (!dataFim) {
            res.status(400).send('Requisição inválida');
            return; 
        }
        const validarData = await verifyDate(dataFim);
    
        if(validarData==false){
            res.status(400).send('O evento só pode ser encerrado um dia após sua ocorência');
            return;
        }

        try {
            
            await finishEvent(eventoId, decisao_apostaUpper);
            let cota = await getCotas(eventoId);
            if (!cota) {
                res.status(404).send('Requisição inválida - Parâmetros faltando.');
                return; 
            }
            if (decisao_apostaUpper === 'NÃO') {
                const winners = await getWinners(eventoId, decisao_apostaUpper);
                const losers = await getLosers(eventoId, 'SIM');
                if (!losers || !winners) {
                    res.status(404).send('Requisição inválida - Parâmetros faltando.');
                    return; 
                }
                
                let valorDistruibuido = calcularValorTotal(losers);

                const valorTotalCotas = calcularValorTotal(winners)/cota; //ATRAVES DO VALOR TOTAL APOSTADO PELO VENCEDORES E O VALOR DE CADA COTA OBTEMOS O TOTAL DE COTAS APOSTADAS PELOS VENCEDORES QUE SERA ESSENCIAL NA DISTRIBUICAO DOS GANHOS
                const valorPorCota = valorDistruibuido/valorTotalCotas; //ATRAVES DO VALOR A SER DISTRIBUIDO E O NUMERO TOTAL DE COTAS APOSTADOS PELOS GANHADORES TEMOS O VALOR A SER DISTRIBUIDO POR CADA COTA APOSTADA

                for (let index = 0; index < winners.length; index++) {
                    const valor = winners[index].VALOR;
                    const id = winners[index].ID_USUARIO;
                    if (valor !== undefined) {
                        let qntdCota = valor/cota; //QUANTIDADE DE COTAS APOSTADAS POR CADA GANHADOR
                        const valorUp = valorPorCota*qntdCota; //VALOR POR COTA QUE DEVE SER DISTRIBUIDO MUTIPLICADO PELA QUANTIDADE DE COTAS RESULTANDO NO VALOR GANHO PELO USUARIO PELA APOSTA FEITA
                        const currentlyWallet = await getWalletFunds(id); //OBTEM O VALOR ATUAL DA CARTEIRA
                        if (!currentlyWallet) {
                            res.status(400).send('Requisição inválida - Parâmetros faltando.');
                            return; 
                        }
                        const valorRetorno = currentlyWallet + valorUp + valor;
                        const valorTransacao = valorUp + valor;
                        await updateCarteira(id, eventoId, valorRetorno);
                        await updateTransacao(id, eventoId, valorTransacao);
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
                        const valorTransacao = valorUp + valor;
                        await updateCarteira(id, eventoId, valorRetorno);
                        await updateTransacao(id, eventoId, valorTransacao);
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