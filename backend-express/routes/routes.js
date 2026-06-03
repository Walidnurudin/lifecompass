const express = require('express');
const cors = require('cors');
const { authMiddleware } = require('../middleware/auth');

// Import handlers
const authHandler = require('../handlers/auth');
const taskHandler = require('../handlers/task');
const cashflowHandler = require('../handlers/cashflow');
const noteHandler = require('../handlers/note');
const aiHandler = require('../handlers/ai');

function setupRouter(app) {
  // CORS configuration matching Go backend
  const corsOptions = {
    origin: true, // Echoes back the origin header, allowing all origins with credentials
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Content-Length'],
    credentials: true,
  };
  
  app.use(cors(corsOptions));
  
  // Leapcell Healthchecks
  app.get('/kaithhealthcheck', (req, res) => {
    res.status(200).send('OK');
  });
  app.get('/kaithheathcheck', (req, res) => {
    res.status(200).send('OK');
  });

  const apiRouter = express.Router();

  apiRouter.get('/test', (req, res) => {
    res.status(200).json({ message: 'API is working' });
  });

  // Auth routes
  const authRouter = express.Router();
  authRouter.post('/register', authHandler.register);
  authRouter.post('/login', authHandler.login);
  authRouter.post('/logout', authHandler.logout);
  authRouter.get('/me', authMiddleware, authHandler.getMe);
  apiRouter.use('/auth', authRouter);

  // Task routes
  const taskRouter = express.Router();
  taskRouter.use(authMiddleware);
  taskRouter.get('/', taskHandler.getTasks);
  taskRouter.post('/', taskHandler.createTask);
  taskRouter.get('/:id', taskHandler.getTask);
  taskRouter.put('/:id', taskHandler.updateTask);
  taskRouter.delete('/:id', taskHandler.deleteTask);
  apiRouter.use('/tasks', taskRouter);

  // Cashflow routes
  const cashflowRouter = express.Router();
  cashflowRouter.use(authMiddleware);
  cashflowRouter.get('/', cashflowHandler.getCashFlows);
  cashflowRouter.post('/', cashflowHandler.createCashFlow);
  cashflowRouter.put('/:id', cashflowHandler.updateCashFlow);
  cashflowRouter.delete('/:id', cashflowHandler.deleteCashFlow);
  apiRouter.use('/cashflow', cashflowRouter);

  // Note routes
  const noteRouter = express.Router();
  noteRouter.use(authMiddleware);
  noteRouter.get('/', noteHandler.getNote);
  noteRouter.put('/', noteHandler.updateNote);
  apiRouter.use('/note', noteRouter);

  // Chat/AI routes
  const aiRouter = express.Router();
  aiRouter.use(authMiddleware);
  aiRouter.post('/', aiHandler.consultAI);
  apiRouter.use('/chat', aiRouter);

  app.use('/api', apiRouter);
}

module.exports = {
  setupRouter,
};
