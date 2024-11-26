import { Request, RequestHandler, Response } from "express";
import OracleDB from "oracledb";
import dotenv from 'dotenv'; 
dotenv.config();

export namespace Dados_BancariosHandler {

    export type Dados_Bancarios = {
        id_conta_bancaria: number | undefined; 
        banco: string | null;
        agencia: string | null;
        numero_conta: string | null;
        tipo_conta: string | null;
        chave_pix: string | null;
        cvv: number | null;
        data_validade: string | null;
        numero_cartao: number | null;
        nome_cartao: string | null;
        nome_titular: string | null;
        id_usuario: number;            
    };

    interface Account {
        ID: number;
    }

    // Função para obter o ID do usuário com base no token
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

    // Função para obter todos os dados bancários do usuário
    async function getDadosBancarios(id_usuario: number): Promise<Dados_Bancarios | null> {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;

        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });

        try {
            let result = await connection.execute(
                `SELECT * FROM DADOS_BANCARIOS WHERE ID_USUARIO = :id_usuario`,
                [id_usuario]
            );
            
            if (result.rows && result.rows.length > 0) {
                const row = result.rows[0] as any;
                const dadosBancarios: Dados_Bancarios = {
                    id_conta_bancaria: row.ID_CONTA_BANCARIA || null,
                    id_usuario: row.ID_USUARIO || null,
                    chave_pix: row.CHAVE_PIX || null,
                    banco: row.BANCO || null,
                    agencia: row.AGENCIA || null,
                    numero_conta: row.NUMERO_CONTA || null,
                    tipo_conta: row.TIPO_CONTA || null,
                    nome_titular: row.NOME_TITULAR || null,
                    cvv: row.CVV || null,
                    data_validade: row.DATA_VALIDADE || null,
                    numero_cartao: row.NUMERO_CARTAO || null,
                    nome_cartao: row.NOME_CARTAO || null,
                };
                return dadosBancarios;
            }
            return null; 
        } catch (error) {
            console.error('Erro:', error);
            return null;
        } finally {
            await connection.close();
        }
    }

    // Funções para adicionar dados bancários específicos
    async function addPix(id_usuario: number, chave_pix: string) {
        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });

        try {
            await connection.execute(
                `UPDATE DADOS_BANCARIOS 
                SET CHAVE_PIX = :chave_pix 
                WHERE ID_USUARIO = :id_usuario`,  
                { id_usuario, chave_pix }
            );

            await connection.commit();
        } finally {
            await connection.close();
        }
    }  

    async function addContaBanco(id_usuario: number, banco: string, agencia: string, numero_conta: string, tipo_conta: string, nome_titular: string) {
        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });

        try {
            await connection.execute(
                `UPDATE DADOS_BANCARIOS 
                SET BANCO = :banco, AGENCIA = :agencia, NUMERO_CONTA = :numero_conta, TIPO_CONTA = :tipo_conta, NOME_TITULAR = :nome_titular
                WHERE ID_USUARIO = :id_usuario`,  
                { id_usuario, banco, agencia, numero_conta, tipo_conta, nome_titular }
            );

            await connection.commit();
        } finally {
            await connection.close();
        }
    } 

    async function addCartao(id_usuario: number, cvv: number, data_validade: string, numero_cartao: number, nome_cartao: string) {
        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });

        try {
            await connection.execute(
                `UPDATE DADOS_BANCARIOS 
                SET CVV = :cvv, DATA_VALIDADE = TO_DATE(:data_validade, 'DD/MM/YYYY'), NUMERO_CARTAO = :numero_cartao, NOME_CARTAO = :nome_cartao
                WHERE ID_USUARIO = :id_usuario`,  
                { id_usuario, cvv, data_validade, numero_cartao, nome_cartao }
            );

            await connection.commit();
        } finally {
            await connection.close();
        }
    } 

    export const addDadosBancariosHandler: RequestHandler = async (req, res): Promise<void> => {
        const token = req.cookies.token;
        const { chave_pix, banco, agencia, numero_conta, tipo_conta, nome_titular, cvv, data_validade, numero_cartao, nome_cartao } = req.body;
                            
        if (typeof token !== 'string') {
            res.status(400).send('Requisição inválida - tente logar novamente.');
            return;
        }
        
        const id_usuario = await userId(token);
        if (!id_usuario) {
            res.status(400).send('Requisição inválida - tente logar novamente.');
            return;
        }
        
        try {
            const dadosBancarios = await getDadosBancarios(id_usuario);
            
            console.log(dadosBancarios?.nome_cartao);
            if (chave_pix) {
                if (dadosBancarios?.chave_pix!=null) {
                    res.status(400).send('Chave-pix já cadastrado.');
                    return;
                } else {
                    await addPix(id_usuario, chave_pix);
                    res.status(201).send('PIX cadastrado com sucesso.');
                    return;
                }    

            }
    
            if (banco && agencia && numero_conta && tipo_conta && nome_titular) {
                if (dadosBancarios?.banco != null) {
                    res.status(400).send('Conta bancária já cadastrado.');
                    return;
                } else {
                    await addContaBanco(id_usuario, banco, agencia, numero_conta, tipo_conta, nome_titular);
                    res.status(201).send('Conta bancária cadastrada com sucesso.');
                    return;
                }
            }
    
            if (cvv && data_validade && numero_cartao && nome_cartao) {
                if (dadosBancarios?.nome_cartao != null) {
                    res.status(400).send('Cartão já cadastrado.');
                    return;
                } else{
                    await addCartao(id_usuario, cvv, data_validade, numero_cartao, nome_cartao);
                    res.status(201).send('Cartão cadastrado com sucesso.');
                    return;
                }
            }
    
            res.status(400).send('Parâmetros inválidos ou incompletos.');
        } catch (error) {
            console.error('Erro ao cadastrar dados bancários:', error);
            res.status(500).send('Erro ao cadastrar dados bancários.');
        }
    };
    
}
