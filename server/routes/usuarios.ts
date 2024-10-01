import { Router, Request, Response } from 'express';
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

    return router; 
}

export default usuarios;
