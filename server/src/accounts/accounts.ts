import {Request, RequestHandler, Response} from "express";
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
        completeName:string;
        email:string;
        password:string | undefined;
        birthday: string;
    };

    interface Account {
        ID: number;
    }
    

    async function login(email: string, password: string) {

        OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;

        // passo 1 - conectar-se ao oracle. 
        let connection = await OracleDB.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });

        let accounts = await connection.execute(
            'SELECT * FROM ACCOUNTS WHERE email = :email AND password = :password',
            [email, password]
        );

        await connection.close();

        return accounts.rows;
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
    
        // Verificação para que o retorno da verificação nao seja vazio
        if (verify.rows && verify.rows.length > 0) {
            // percorre e retorna o array com apenas o numero
            let emptyRole = verify.rows.map((row) => row.ISADM); 
            return emptyRole; 
        } else {
            return []; 
        }
    }
    
    

    export const loginHandler: RequestHandler = async (req: Request, res: Response) => {
        const { email: pEmail, password: pPassword } = req.body; 
    
        if (pEmail && pPassword) {
            try {
                const role = await verifyRole(pEmail);
                    const result =  await login(pEmail, pPassword); 
                    if (Array.isArray(result) && result.length>0) {  // Se houver resultado da função login
                        if (role.includes(1)) { // Verifica se o role contém 1
                            res.status(200).send('Login realizado... confira...');
                        } else {
                            res.status(200).send('Bem-vindo administrador');
                        }
                    } else {
                        res.status(404).send('Email ou senha não encontrados. Não tem conta? Cadastre-se.');
                    }
            } catch (error) {
                console.error('Erro ao realizar login:', error);
                res.status(500).send('Erro ao realizar login.'); 
            }
        } else {
            res.status(400).send('Requisição inválida - Parâmetros faltando.'); 
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

        async function singUp(completeName: string, email: string, password: string, birthday: string){

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

        async function getHistory(id_usuario: number) {
            OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;
    
            const connection = await OracleDB.getConnection({
                user: process.env.ORACLE_USER,
                password: process.env.ORACLE_PASSWORD,
                connectString: process.env.ORACLE_CONN_STR
            });
    
                const result = await connection.execute(
                    `SELECT ID_TRANSACAO, ID_USUARIO, ID_EVENTO, VALOR, TIPO, TO_CHAR(DATA_TRANSACAO, 'YYYY-MM-DD HH24:MI:SS') AS DATA_TRASACAO FROM TRANSACAO WHERE ID_USUARIO = :id_usuario`,
                    [id_usuario]
                );
            
                await connection.close(); 

                return result.rows;
        }
        
        async function validateBirthDate(inputDate: string): Promise <boolean> {
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

    export const singUpHandler: RequestHandler = async (req: Request, res: Response) => {
            const { completeName, email, password, birthday } = req.body;
            if (completeName && email && password && birthday ) {
                const validacaoData = await validateBirthDate(birthday);
                if(validacaoData==false){
                    res.status(400).send('Você precisa ter no mínimo 18 anos para se cadastrar.');
                    return; 
                }             
                const verify = await verifyEmail(email);
                    if(Array.isArray(verify) && verify.length>0){
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
            }  else {
                res.status(400).send('Requisição inválida - Parâmetros faltando.'); 
            }
    }

    export const getHistoryHandler: RequestHandler = async (req: Request, res: Response) => {
        const token = req.get('token');
        if (token) {
            const id_usuario = await userId(token);
            if(!id_usuario){
                res.status(400).send('Parametros faltando tente logar novamente.'); 
                return;
            }
            const historico = await getHistory(id_usuario);
                if(Array.isArray(historico) && historico.length>0){
                   res.status(200).json(historico); 
                   return;
                } else {
                    res.status(404).send("Historico não encontrado");
                    return; 
                }
        }  else {
            res.status(400).send('Requisição inválida - Parâmetros faltando.'); 
        }
    }
    
}
