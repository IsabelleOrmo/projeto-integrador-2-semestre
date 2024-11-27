import express from "express";
import {Request, Response, Router} from "express";
import { AccountsHandler } from "./accounts/accounts";
import { EventsHandler } from "./events/events";
import { WalletHandler } from "./wallet/wallet";
import { BetHandler } from "./bets/bets";
import { ClosingBetsHandler } from "./bets/closingBets";
import { Dados_BancariosHandler } from "./wallet/dados_bancarios";
import dotenv from 'dotenv'; 
import cors from "cors"
import session from 'express-session';
import cookieParser from "cookie-parser";
import { request } from "http";


const port = 5000; 
const app = express();
const routes = Router();

const allowedOrigins = ['http://localhost:5501', 'http://127.0.0.7:5501'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

dotenv.config();

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin'); 
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With'
  );
  res.setHeader("Content-Type", "application/json");
  next();
});


// Middleware para cookies
app.use(cookieParser());
app.use(express.json());


declare global {
    namespace Express{
      interface Request {
        token?: string;
        role?: number;
      }
    }    
  }

app.use(session({
    secret: 'chavesecreta',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        sameSite: 'none'
    }
  }));

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
routes.post('/getHistoryByPage', AccountsHandler.getHistoryByPageHandler);
routes.get('/getHistoryQtty', AccountsHandler.getHistoryQttyHandler);
routes.post('/addDadosBancarios', Dados_BancariosHandler.addDadosBancariosHandler);
routes.get('/getBalance', AccountsHandler.getBalanceHandler);
routes.get('/getCartao', WalletHandler.getCartaoHandler);
routes.get('/getPix', WalletHandler.getPixHandler);
routes.get('/getContaBancaria', WalletHandler.getContaBancariaHandler);
routes.get('/logout', AccountsHandler.logoutHandler);
app.get('/isLogged', AccountsHandler.IsLogged);

app.use(routes);

app.listen(port, ()=>{
    console.log(`Server is running on: ${port}`);
})