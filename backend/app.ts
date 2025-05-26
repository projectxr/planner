import express, { json } from 'express';
import connectDB from './config/dbConnector';
import calendar from './routes/api/calendar';
import auth from './routes/api/auth';
import eventApi from './routes/api/events';
import config from 'config';
import cors from 'cors';
import { EventData } from './models/Calendar';
import http from 'http';
import socketManager from './sockets';

const PORT = config.get('serverPort');

//**********************************Inits**********************************/
const app = express();
app.use(express.json());
app.use(cors());
app.use(json());
connectDB().then(sequelize => EventData(sequelize));

//**********************************Routes**********************************/
app.use('/api/auth', auth);
app.use('/api/calendar', calendar);
app.use('/api/events', eventApi);

const server = http.createServer(app);

socketManager.init(server);

server.listen(PORT, () => {
	console.log(`Go on ${PORT}!`);
});
