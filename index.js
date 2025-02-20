require('dotenv').config(); // Carrega as variáveis do arquivo .env

const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');

// Obtém as credenciais do Firebase a partir da variável de ambiente
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();
app.use(bodyParser.json());

// Rota raiz para informar que a API está funcionando
app.get('/', (req, res) => {
  res.json({ message: 'API de Usuários com Firebase - Funcionando' });
});

// ========== Endpoints de CRUD para Usuários ==========

// Criar usuário (POST /users)
app.post('/users', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName,
    });
    res.status(201).json({ message: 'Usuário criado com sucesso', user: userRecord });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Obter detalhes de um usuário (GET /users/:uid)
app.get('/users/:uid', async (req, res) => {
  try {
    const userRecord = await admin.auth().getUser(req.params.uid);
    res.json(userRecord);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Atualizar usuário (PUT /users/:uid)
app.put('/users/:uid', async (req, res) => {
  try {
    const userRecord = await admin.auth().updateUser(req.params.uid, req.body);
    res.json({ message: 'Usuário atualizado com sucesso', user: userRecord });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Excluir usuário (DELETE /users/:uid)
app.delete('/users/:uid', async (req, res) => {
  try {
    await admin.auth().deleteUser(req.params.uid);
    res.json({ message: 'Usuário excluído com sucesso' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Listar todos os usuários (GET /users)
app.get('/users', async (req, res) => {
  try {
    let users = [];
    // Função recursiva para listar todos os usuários (até 1000 por página)
    const listAllUsers = async (nextPageToken) => {
      const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
      listUsersResult.users.forEach(userRecord => {
        users.push({
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
          creationTime: userRecord.metadata.creationTime,
          lastSignInTime: userRecord.metadata.lastSignInTime,
        });
      });
      if (listUsersResult.pageToken) {
        await listAllUsers(listUsersResult.pageToken);
      }
    };
    await listAllUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Inicia o servidor na porta definida na variável de ambiente PORT ou na 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

module.exports = app;
