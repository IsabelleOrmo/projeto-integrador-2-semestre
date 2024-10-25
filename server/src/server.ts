import express from "express";
import {Request, Response, Router} from "express";
import { AccountsHandler } from "./accounts/accounts";
import { EventsHandler } from "./events/events";
import { WalletHandler } from "./wallet/wallet";
import { BetHandler } from "./bets/bets";
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

routes.post('/login', AccountsHandler.loginHandler);
routes.post('/singUp', AccountsHandler.singUpHandler);
routes.post('/addNewEvent', EventsHandler.addNewEventHandler);
routes.patch('/evaluateNewEvent', EventsHandler.evaluateNewEventHandler);
routes.get('/getEvents', EventsHandler.getEventsByStatusHandler);
routes.get('/availableEvents', EventsHandler.getAvailableEventsHandler);
routes.get('/finishedEvents', EventsHandler.getFinishedEventsHandler);
routes.patch('/deleteEvent', EventsHandler.deleteEventHandler);
routes.get('/searchEvent', EventsHandler.searchEventHandler);
routes.patch('/addFunds', WalletHandler.addFundsHandler);
routes.patch('/withdrawFunds', WalletHandler.withdrawFundsHandler);
routes.post('/betOnEvent', BetHandler.betOnEventHandler);

app.use(routes);

app.listen(port, ()=>{
    console.log(`Server is running on: ${port}`);
})