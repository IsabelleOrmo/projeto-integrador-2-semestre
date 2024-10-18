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

        console.log(accounts.rows)
    }

    export const loginHandler: RequestHandler = async (req: Request, res: Response) => {
        const { email: pEmail, password: pPassword } = req.body; // Aqui você pode desestruturar diretamente

        console.log(pEmail, pPassword); 
        if (pEmail && pPassword) {
            try {
                const result = await login(pEmail, pPassword); 
                if (Array.isArray(result)) {
                    res.statusCode = 200;
                    res.send('Login realizado... confira...');
                } else {
                    res.statusCode = 404;
                    res.send('Email ou senha não encontrados. Não tem conta? Cadastre-se.');
                }
            } catch (error) {
                console.error('Erro ao realizar login:', error);
                res.status(500).send('Erro ao realizar login.'); 
            }
        } else {
            res.status(400).send('Requisição inválida - Parâmetros faltando.'); 
        }
    };

        async function verifyAccounts(email: string) {
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
                    { autoCommit: true }
                );
            
            await connection.close();
        
        }
        

    export const singUpHandler: RequestHandler =
        async (req: Request, res: Response) => {
            const { completeName, email, password } = req.body;
            if (completeName && email && password) {
                const verify = await verifyAccounts(email);
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
