import express from "express";
import {Request, Response, Router} from "express";
import { AccountsHandler } from "./accounts/accounts";
import { EventsHandler } from "./events/events";
import { WalletHandler } from "./wallet/wallet";
import { BetHandler } from "./bets/bets";
import { ClosingBetsHandler } from "./bets/closingBets";
import { Dados_BancariosHandler } from "./wallet/dados_bancarios";
import OracleDB from 'oracledb';
import dotenv from 'dotenv'; 
import cors from "cors"
import session from 'express-session';
import bodyParser from "body-parser";

declare module "express-session" {
    interface SessionData {
        user?: {
            email: string;
            role: number[];
        };
    }
}


const port = 5000; 
const app = express();
const routes = Router();
const corsOptions = {
    origin: "http://127.0.0.7:5500", // Domínio do front-end
    credentials: true, // Permite o envio de cookies
};
app.use(express.urlencoded({ extended: true }));

app.use(cors(corsOptions));

dotenv.config();

app.use(express.json());



app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set('trust proxy', 1) // trust first proxy
app.use(
    session({
        name: "sessionID",
        secret: "some-secret-example",
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: false, // Use true em produção com HTTPS
            httpOnly: true,
            maxAge: 1000 * 60 * 60, // 1 hora
            sameSite: "lax", // "strict" ou "none" dependendo do caso
        },
    })
);


routes.get('/', (req: Request, res: Response)=>{
    res.statusCode = 403;
    res.send('Acesso não permitido.');
});


routes.post('/login', AccountsHandler.loginHandler);
routes.post('/singUp', AccountsHandler.singUpHandler);
routes.post('/addNewEvent', EventsHandler.addNewEventHandler);
routes.patch('/evaluateNewEvent', EventsHandler.evaluateNewEventHandler);
routes.get('/getEventsStatus', EventsHandler.getEventsByStatusHandler);
routes.get('/availableEvents', EventsHandler.getAvailableEventsHandler);
routes.get('/eventosMaisApostados', EventsHandler.getEventosMaisApostadosHandler);
routes.get('/finishedEvents', EventsHandler.getFinishedEventsHandler);
routes.patch('/deleteEvent', EventsHandler.deleteEventHandler);
routes.get('/searchEvent', EventsHandler.searchEventHandler);
routes.patch('/addFunds', WalletHandler.addFundsHandler);
routes.patch('/withdrawFunds', WalletHandler.withdrawFundsHandler);
routes.post('/betOnEvent', BetHandler.betOnEventHandler);
routes.patch('/finishEvent', ClosingBetsHandler.finishEventHandler);
routes.get('/getHistory', AccountsHandler.getHistoryHandler);
routes.post('/addDadosBancarios', Dados_BancariosHandler.addDadosBancariosHandler);
routes.get("/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Erro ao destruir sessão:", err);
            res.status(500).send("Erro ao encerrar sessão");
        } else {
            res.send("Logout bem-sucedido. Volte sempre!");
        }
    });
});
routes.get("/check-session", (req: Request, res: Response) => {
    console.log("Sessão atual:", req.session); // Para depuração
    if (req.session.user) {
        res.status(200).json({ user: req.session.user });
    } else {
        res.status(401).send("Usuário não autenticado.");
    }
});

app.use(routes);

app.listen(port, ()=>{
    console.log(`Server is running on: ${port}`);
})