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
    };
    

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
                if (role.includes(1)) { // Verifica se o role contém 1
                    const result = await login(pEmail, pPassword); 
                    if (Array.isArray(result) && result) { // Se houver resultado da função login
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

        async function singUp(completeName: string, email: string, password: string) {
        
            OracleDB.outFormat = OracleDB.OUT_FORMAT_OBJECT;
        
            let connection = await OracleDB.getConnection({
                user: process.env.ORACLE_USER,
                password: process.env.ORACLE_PASSWORD,
                connectString: process.env.ORACLE_CONN_STR
            });

            
            let accounts = await connection.execute(
                    `INSERT INTO ACCOUNTS (ID, EMAIL, PASSWORD, COMPLETE_NAME, TOKEN) 
                    VALUES (SEQ_ACCOUNTS.NEXTVAL, :email, :password, :completeName, dbms_random.string('x', 32))`,
                    [email, password, completeName],
                    
                );
            
            await connection.commit();

            await connection.close();
        
        }
        

    export const singUpHandler: RequestHandler =
        async (req: Request, res: Response) => {
            const { completeName, email, password } = req.body;
            if (completeName && email && password) {
                const verify = await verifyEmail(email);
                    if( Array.isArray(verify) && verify.length>0){
                        res.statusCode = 400;
                        res.send('Email já cadastrado');
                    } else {
                        try {
                            await singUp(completeName, email, password);
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
}
