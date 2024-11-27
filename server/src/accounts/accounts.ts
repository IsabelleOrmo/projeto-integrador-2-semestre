import { Request, RequestHandler, Response } from "express";
import OracleDB from "oracledb";
import dotenv from 'dotenv';
dotenv.config();

/*
    Nampespace que contém tudo sobre "contas de usuários"
*/

export namespace AccountsHandler {

    /**
     * Tipo UserAccount
     */
    export type UserAccount = {
        id: number | undefined;
        completeName: string;
        email: string;
        password: string | undefined;
        birthday: string;
    };

    interface Account {
        ID: number;
        TOKEN: string;
        ROLE: number;
    }

    async function login(email: string, password: string) {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;

        // Passo 1 - Conectar-se ao Oracle. 
        const connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR,
        });

        try {
            // Executa a consulta e define o tipo do resultado.
            const result = await connection.execute<{ email: string; password: string; TOKEN: string; ROLE: number }>(
                'SELECT * FROM ACCOUNTS WHERE email = :email AND password = :password',
                [email, password]
            );

            // Retorna apenas as linhas (rows) do resultado.
            return result.rows;
        } finally {
            // Garante o fechamento da conexão.
            await connection.close();
        }
    }

    async function verifyRole(email: string) {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;

        let connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });

        // Define o formato esperado para a linha da consulta
        let verify = await connection.execute<{ ISADM: number }>(
            `SELECT ISADM FROM ACCOUNTS WHERE EMAIL = :email`,
            [email]
        );

        await connection.close();

        // Verificação para que o retorno da verificação não seja vazio
        if (verify.rows && verify.rows.length > 0) {
            // percorre e retorna o array com apenas o número
            let emptyRole = verify.rows.map((row) => row.ISADM);
            return emptyRole;
        } else {
            return [];
        }
    }

    export const loginHandler: RequestHandler = async (req: Request, res: Response) => {
        const pEmail = req.get('email');
        const pPassword = req.get('password');
    

        if (pEmail && pPassword) {
            try {
                const role = await verifyRole(pEmail);
                const result = await login(pEmail, pPassword);
    
                if (Array.isArray(result) && result.length > 0) { // Se houver resultado da função login
                    const token = result[0].TOKEN;
                    res.setHeader('Set-Cookie', `token=${token}; Path=/; HttpOnly; Secure; SameSite=None`);
    
                    res.status(200).json({
                        message: "Bem-vindo administrador.",
                        role: "Administrador",
                    });
                } else {
                    res.status(404).json({
                        message: "Email ou senha não encontrados. Não tem conta? Cadastre-se.",
                    });
                }
            } catch (error) {
                console.error("Erro ao realizar login:", error);
                res.status(500).json({ message: "Erro ao realizar login." });
            }
        } else {
            res.status(400).json({
                message: "Requisição inválida - Parâmetros faltando.",
            });
        }
    };
    

    async function verifyEmail(email: string) {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;

        let connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });

        let verify = await connection.execute(
            `SELECT * FROM ACCOUNTS WHERE EMAIL = :email `,
            [email]
        );

        await connection.close();

        return verify.rows;
    }

    async function getBalance(id_usuario: number) {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;
    
        const connection = await OracleDB.getConnection({
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
            return { VALOR: result.rows[0].VALOR };
        } else {
            return { VALOR: 0 }; 
        }
    }
    

    async function singUp(completeName: string, email: string, password: string, birthday: string) {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;

        let connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });

        await connection.execute(
            `INSERT INTO ACCOUNTS (ID, EMAIL, PASSWORD, COMPLETE_NAME, TOKEN, BIRTHDAY) 
            VALUES (SEQ_ACCOUNTS.NEXTVAL, :email, :password, :completeName, dbms_random.string('x', 32), TO_DATE(:birthday, 'YYYY-MM-DD'))`,
            [email, password, completeName, birthday]
        );

        await connection.commit();
        await connection.close();
    }

    async function getId(email: string) {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;

        let connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });

        const result = await connection.execute<{ ID: number }>(
            `SELECT ID FROM ACCOUNTS WHERE EMAIL = :email`,
            [email]
        );

        await connection.close();

        if (result.rows && result.rows.length > 0) {
            return result.rows[0].ID;
        } else {
            return undefined;
        }
    }

    async function createWallet(id_usuario: number | undefined) {
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;

        let connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });

        await connection.execute(
            `INSERT INTO CARTEIRA (ID_CARTEIRA, ID_USUARIO) 
             VALUES (SEQ_CARTEIRA.NEXTVAL, :id_usuario)`,
            [id_usuario]
        );

        await connection.execute(
            `INSERT INTO DADOS_BANCARIOS (ID_CONTA_BANCARIA, ID_USUARIO) 
             VALUES (SEQ_DADOS_BANCARIOS.NEXTVAL, :id_usuario)`,
            [id_usuario]
        );

        await connection.commit();
        await connection.close();
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


    async function validateBirthDate(inputDate: string): Promise<boolean> {
        const currentDate = new Date();
        const userDate = new Date(inputDate);

        if (isNaN(userDate.getTime()) || userDate > currentDate) {
            return false;
        }

        const minAgeDate = new Date();
        minAgeDate.setFullYear(minAgeDate.getFullYear() - 18);
        if (userDate > minAgeDate) {
            return false;
        }

        return true;
    }

    async function getHistoryQtty(id_usuario: number) : Promise<OracleDB.Result<unknown>> {

        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;

        // passo 1 - conectar-se ao oracle. 
        let connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });

        let historyQtty = await connection.execute(
            'SELECT count(ID_TRANSACAO) as historyQtty FROM TRANSACAO WHERE ID_USUARIO = :id_usuario',
            [id_usuario]
        );

        await connection.close();

        return historyQtty;
    }
        
    async function getHistoryByPage(page: number, pageSize: number, id_usuario: number): Promise<OracleDB.Result<unknown>> {
        const startRecord = (page - 1) * pageSize;
    
        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;
    
        // passo 1 - conectar-se ao oracle.
        let connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });
    
        try {
            const query = `
                SELECT ID_TRANSACAO, ID_USUARIO, ID_EVENTO, VALOR, TIPO, 
                       TO_CHAR(DATA_TRANSACAO, 'YYYY-MM-DD HH24:MI:SS') AS DATA_TRANSACAO
                FROM TRANSACAO 
                WHERE ID_USUARIO = :id_usuario 
                ORDER BY DATA_TRANSACAO DESC 
                OFFSET ${startRecord} ROWS FETCH NEXT ${pageSize} ROWS ONLY
            `;
    
            const result = await connection.execute(query, [id_usuario]);
            return result;
    
        } catch (error) {
            console.error('Erro ao buscar histórico paginado:', error);
            throw error;
        } finally {
            await connection.close();
        }
    }
    

    export const singUpHandler: RequestHandler = async (req: Request, res: Response) => {
        const { completeName, email, password, birthday } = req.body;
        if (completeName && email && password && birthday) {
            const validacaoData = await validateBirthDate(birthday);
            if (validacaoData == false) {
                res.status(400).send('Você precisa ter no mínimo 18 anos para se cadastrar.');
                return;
            }
            const verify = await verifyEmail(email);
            if (Array.isArray(verify) && verify.length > 0) {
                res.statusCode = 400;
                res.send('Email já cadastrado');
            } else {
                try {
                    await singUp(completeName, email, password, birthday);
                    const id_usuario = await getId(email);
                    await createWallet(id_usuario);
                    res.status(201).send('Cadastro realizado com sucesso!');
                } catch (error) {
                    console.error('Erro ao realizar cadastro:', error);
                    res.status(500).send('Erro ao realizar cadastro.');
                }
            }
        } else {
            res.status(400).send('Requisição inválida - Parâmetros faltando.');
        }
    };

    export const getBalanceHandler: RequestHandler = async (req: Request, res: Response) => {
        const token = req.cookies.token;
        //const token = req.get('token');
        if (token) {
            const id_usuario = await userId(token);
            if (!id_usuario) {
                res.status(400).send('Parâmetros faltando. Tente logar novamente.');
                return;
            }
    
            const balance = await getBalance(id_usuario);
            res.status(200).json(balance);
        } else {
            res.status(400).send('Requisição inválida - Parâmetros faltando.');
        }
    };

    export const logoutHandler: RequestHandler = async (req: Request, res: Response) => {
        res.setHeader('Set-Cookie', 'token=; Path=/; HttpOnly; Secure; SameSite=None; Expires=Thu, 01 Jan 1970 00:00:00 GMT'); //data no passado dizendo que o cookie expirou
        res.status(200).send("Logout realizado com sucesso.");
    }

    export const IsLogged: RequestHandler = async (req: Request, res: Response) =>{
        const cookieValue = req.cookies.token;
        if (cookieValue) {
          res.status(200).send("Logado");
        } else {
          res.status(400).send('Logue para acessar!');
        }
    }

    export const getHistoryByPageHandler: RequestHandler = async (req: Request, res: Response) => {
        const pPage = req.get('page');
        const pPageSize = req.get('pageSize');
        const token = req.cookies.token;
    
        if (!token) {
            res.status(400).send('Requisição inválida - Token faltando.');
            return;
        }
    
        const id_usuario = await userId(token);
        if (pPage && pPageSize && id_usuario) {
            try {
                const page = parseInt(pPage as string, 10);
                const pageSize = parseInt(pPageSize as string, 10);
    
                if (isNaN(page) || isNaN(pageSize)) {
                    res.status(400).send('Requisição inválida - Page ou PageSize inválidos.');
                    return;
                }
    
                const history = await getHistoryByPage(page, pageSize, id_usuario);
                res.status(200).json(history.rows);
            } catch (error) {
                console.error('Erro ao buscar histórico paginado:', error);
                res.status(500).send('Erro ao buscar histórico paginado.');
            }
        } else {
            res.status(400).send('Requisição inválida - Parâmetros faltando.');
        }
    };
    

    export const getHistoryQttyHandler: RequestHandler = 
    async (req: Request, res: Response) => {       
        const token = req.cookies.token;
        const id_usuario = await userId(token); 
        if (!id_usuario) {
            res.status(400).send('Parâmetros faltando. Tente logar novamente.');
            return;
        }
        const htsrQtty = await getHistoryQtty(id_usuario);
        res.statusCode = 200;
        // enviando uma resposta JSON com a quantidade.
        res.send(htsrQtty.rows);
    }

}

    