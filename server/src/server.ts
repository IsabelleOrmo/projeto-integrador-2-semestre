import express from "express";
import {Request, Response, Router} from "express";
import { AccountsHandler } from "./accounts/accounts";
import { EventsHandler } from "./events/events";
import OracleDB from 'oracledb';
import dotenv from 'dotenv'; 

const port = 3000; 
const app = express();
const routes = Router();

// definir as rotas. 
// a rota tem um verbo/método http (GET, POST, PUT, DELETE)

dotenv.config();


routes.get('/', (req: Request, res: Response)=>{
    res.statusCode = 403;
    res.send('Acesso não permitido.');
});

app.use(express.json())

// vamos organizar as rotas em outro local 
// login...

routes.post('/login',AccountsHandler.loginHandler);
routes.post('/singUp', AccountsHandler.singUpHandler);
routes.post('/addNewEvent', EventsHandler.addNewEventHandler);
routes.patch('/evaluateNewEvent', EventsHandler.evaluateNewEventHandler);


app.use(routes);

app.listen(port, ()=>{
    console.log(`Server is running on: ${port}`);
})