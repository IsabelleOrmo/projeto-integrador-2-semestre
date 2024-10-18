"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountsHandler = void 0;
const oracledb_1 = __importDefault(require("oracledb"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
/*
    Nampespace que contém tudo sobre "contas de usuários"
*/
var AccountsHandler;
(function (AccountsHandler) {
    async function login(email, password) {
        oracledb_1.default.outFormat = oracledb_1.default.OUT_FORMAT_OBJECT;
        // passo 1 - conectar-se ao oracle. 
        let connection = await oracledb_1.default.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONN_STR
        });
        let accouts = await connection.execute('SELECT * FROM ACCOUNTS WHERE email = :email AND password = :password', [email, password]);
        await connection.close();
        console.log(accouts.rows);
    }
    AccountsHandler.loginHandler = async (req, res) => {
        const pEmail = req.get('email');
        const pPassword = req.get('password');
        if (pEmail && pPassword) {
            // chamar a funcao de login. 
            await login(pEmail, pPassword);
            res.statusCode = 200;
            res.send('Login realizado... confira...');
        }
        else {
            res.statusCode = 400;
            res.send('Requisição inválida - Parâmetros faltando.');
        }
    };
})(AccountsHandler || (exports.AccountsHandler = AccountsHandler = {}));
