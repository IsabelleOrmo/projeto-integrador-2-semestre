/*npx nodemon ./server.ts*/

import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import mysql from 'mysql2';
import usuarios from './routes/usuarios';

const app = express(); 
const PORT = 5000;
const db = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '17122005',
    database: 'puc'
});

db.connect((err) => {
    if(err){
        console.error('Erro: ' + err.stack);
        return;
    }
    console.log('Conectado');
});

app.use(bodyParser.json());

app.use('/', usuarios(db))

app.listen(PORT, () => console.log(`Servidor rodando na porta: http://localhost:${PORT}`));