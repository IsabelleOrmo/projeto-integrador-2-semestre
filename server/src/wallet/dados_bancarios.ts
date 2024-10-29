import { Request, RequestHandler, Response } from "express";
import OracleDB from "oracledb";
import dotenv from 'dotenv'; 
dotenv.config();

export namespace Dados_BancariosHandler {

    export type Dados_Bancarios = {
        id_conta_bancaria: number | undefined; 
        banco: string;
        agencia: string;
        numero_conta: string;
        tipo_conta: string;
        chave_pix: string;
        cvv: number;
        data_validade: string;
        numero_cartao: number,
        nome_cartao: string;
        nome_titular: string;
        id_usuario: number;            
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
                { token }
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

    async function addPix(id_usuario: number, chave_pix: string) {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;
    
        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });
    
        await connection.execute(
            `UPDATE DADOS_BANCARIOS 
            SET CHAVE_PIX = :chave_pix 
            WHERE ID_USUARIO = :id_usuario`,  
            { id_usuario, chave_pix }
        );
    
        await connection.commit();
        await connection.close();
    }  
    
    async function addContaBanco(id_usuario: number, banco: string, agencia: string, numero_conta: string, tipo_conta: string, nome_titular: string) {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;
    
        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });
    
        await connection.execute(
            `UPDATE DADOS_BANCARIOS 
            SET BANCO = :banco, AGENCIA = :agencia, NUMERO_CONTA = :numero_conta, TIPO_CONTA = :tipo_conta, NOME_TITULAR = :nome_titular
            WHERE ID_USUARIO = :id_usuario`,  
            { id_usuario, banco, agencia, numero_conta, tipo_conta, nome_titular }
        );
    
        await connection.commit();
        await connection.close();
    } 
    
    async function addCartao(id_usuario: number, cvv: number, data_validade: string, numero_cartao: number, nome_cartao: string) {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;
    
        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });
    
        await connection.execute(
            `UPDATE DADOS_BANCARIOS 
            SET CVV = :cvv, DATA_VALIDADE = TO_DATE(:data_validade, 'YYYY-MM-DD'), NUMERO_CARTAO = :numero_cartao, NOME_CARTAO = :nome_cartao
            WHERE ID_USUARIO = :id_usuario`,  
            { id_usuario, cvv, data_validade, numero_cartao, nome_cartao }
        );
    
        await connection.commit();
        await connection.close();
    } 

    async function getPix(id_usuario: number) {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;
    
        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });
    
        let result = await connection.execute(
            `SELECT * FROM DADOS_BANCARIOS WHERE ID_USUARIO = :id_usuario AND CHAVE_PIX IS NOT NULL`,
            [id_usuario]
        );
    
        await connection.commit();
        await connection.close();

        return result.rows;
    }

    async function getContaBancaria(id_usuario: number) {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;
    
        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });
    
        let result = await connection.execute(
            `SELECT * FROM DADOS_BANCARIOS WHERE ID_USUARIO = :id_usuario AND BANCO IS NOT NULL`,
            [id_usuario]
        );
    
        await connection.commit();
        await connection.close();

        return result.rows;
    }

    async function getCartao(id_usuario: number) {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;
    
        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });
    
        let result = await connection.execute(
            `SELECT * FROM DADOS_BANCARIOS WHERE ID_USUARIO = :id_usuario AND NUMERO_CARTAO IS NOT NULL`,
            [id_usuario]
        );
    
        await connection.commit();
        await connection.close();

        return result.rows;
    }

    export const addDadosBancariosHandler: RequestHandler = async (req: Request, res: Response) => {
        const token = req.get('token');
        const { chave_pix, banco, agencia, numero_conta, tipo_conta, nome_titular, cvv, data_validade, numero_cartao, nome_cartao } = req.body;
    
        // Verificação de token
        if (typeof token !== 'string') {
            res.status(400).send('Requisição inválida - tente logar novamente.');
            return;
        }
    
        const id_usuario = await userId(token);
        if (!id_usuario) {
            res.status(400).send('Requisição inválida - tente logar novamente.');
            return;
        }
    
        // Verificar categorias de dados
        const hasPix = Boolean(chave_pix);
        const hasBanco = Boolean(banco || agencia || numero_conta || tipo_conta || nome_titular);
        const hasCartao = Boolean(cvv || data_validade || numero_cartao || nome_cartao);
    
        const categoryCount = [hasPix, hasBanco, hasCartao].filter(Boolean).length;
    
        if (categoryCount > 1) {
            res.status(400).send('Parâmetros inválidos.');
            return;
        }
    
        if (hasPix) {
            const verificaPix = await getPix(id_usuario);
            if (Array.isArray(verificaPix) && verificaPix.length > 0) {
                res.status(400).send('PIX já cadastrado');
                return;
            }
            try {
                await addPix(id_usuario, chave_pix);
                res.status(200).send('PIX cadastrado');
                return;
            } catch (error) {
                console.error('Erro:', error);
                res.status(500).send('Erro ao cadastrar PIX.');
                return;
            }
        }
    
        if (hasBanco) {
            const verificaContaBancaria = await getContaBancaria(id_usuario);
            if (Array.isArray(verificaContaBancaria) && verificaContaBancaria.length > 0) {
                res.status(400).send('Conta bancária já cadastrada');
                return;
            }
            try {
                await addContaBanco(id_usuario, banco, agencia, numero_conta, tipo_conta, nome_titular);
                res.status(200).send('Conta bancária cadastrada');
                return;
            } catch (error) {
                console.error('Erro:', error);
                res.status(500).send('Erro ao cadastrar conta bancária.');
                return;
            }
        }

        if (hasCartao) {
            const verificaCartao = await getCartao(id_usuario);
            if (Array.isArray(verificaCartao) && verificaCartao.length > 0) {
                res.status(400).send('Cartão já cadastrado');
                return;
            }
            try {
                await addCartao(id_usuario, cvv, data_validade, numero_cartao, nome_cartao);
                res.status(200).send('Cartão cadastrado');
                return;
            } catch (error) {
                console.error('Erro:', error);
                res.status(500).send('Erro ao cadastrar cartão.');
                return;
            }
        }
    
        res.status(400).send('Parâmetros inválidos.');
    }
    
}