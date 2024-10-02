import { Router, Request, Response } from 'express';
import { request } from 'http';
import { Connection } from 'mysql2';

const router = Router();

const usuarios = (db: Connection) => {

    router.post('/signUp', (req: Request, res: Response) => {
        const { nome, email, senha, data_nasc } = req.body;
        const tipo = 1;

        db.query(
            'INSERT INTO usuarios (nome, email, senha, data_nasc, tipo) VALUES (?, ?, ?, ?, ?)', 
            [nome, email, senha, data_nasc, tipo],
            (err, result) => {
                if (err) {
                    console.error('Erro ao cadastrar: ' + err.stack);
                    return res.status(400).send('Erro ao cadastrar.');
                }
                res.status(201).send('Usuário cadastrado com sucesso!');
            }
        );
    });

    router.get('/login', (req: Request, res: Response)=>{
        const { email, senha } = req.body;
        const tipo = 1;
        db.query(
            'SELECT * FROM usuarios WHERE email = ? AND senha = ? AND tipo = ?', [email, senha, tipo], (err, result)=>{
                if (err){
                    console.error('Erro ao buscar: ' + err.stack);
                    res.status(400).send('Erro ao logar.');
                    return;
                }
                if (Array.isArray(result) && result.length > 0) {
                    res.status(200).send("Usuário 'logado'");
                } else {
                    res.status(404).send('Email ou senha erradas. Não tem conta? Cadastre-se.');
                }
            }); 
    });

    return router; 
}

export default usuarios;
