require('dotenv').config(); // Carrega as variáveis do arquivo .env

const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const cors = require('cors'); // 1) Importar o cors

// Obtém as credenciais do Firebase a partir da variável de ambiente
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // Caso ainda não tenha configurado, inclua seu Realtime Database URL:
  // databaseURL: "https://SEU_PROJETO.firebaseio.com"
});

const app = express();

// 2) Habilitar o CORS antes de definir as rotas
app.use(cors());
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

// Rota para retornar os timestamps de criação e último acesso de um usuário
app.get('/users/:uid/timestamps', async (req, res) => {
  try {
    const userRecord = await admin.auth().getUser(req.params.uid);
    const creationTime = userRecord.metadata.creationTime || "Indisponível";
    const lastSignInTime = userRecord.metadata.lastSignInTime || "Nunca";

    const htmlSnippet = `
      <p>Data de Criação: ${creationTime}</p>
      <p>Último Acesso: ${lastSignInTime}</p>
    `;
    res.send(htmlSnippet);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * NOVA ROTA: Retorna o tamanho (em MB) dos dados de cada usuário
 * que está salvo dentro do nó 'users' no Realtime Database.
 */
app.get('/users/size', async (req, res) => {
  try {
    // Referência ao Realtime Database
    const db = admin.database();
    const usersRef = db.ref('users');
    
    // Lê todos os usuários do nó "users"
    const snapshot = await usersRef.once('value');
    const sizes = {};

    // Percorre cada UID e calcula o tamanho do JSON
    snapshot.forEach(childSnapshot => {
      const userId = childSnapshot.key;
      const userData = childSnapshot.val();
      
      // Converte o objeto para JSON e mede em bytes
      const jsonData = JSON.stringify(userData);
      const sizeInBytes = Buffer.byteLength(jsonData, 'utf8');
      
      // Converte para MB
      const sizeInMB = sizeInBytes / (1024 * 1024);
      sizes[userId] = Number(sizeInMB.toFixed(2));
    });

    // Retorna um objeto: { uid1: 0.01, uid2: 0.54, ... }
    res.json(sizes);
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao calcular tamanho dos dados');
  }
});

// Inicia o servidor na porta definida na variável de ambiente PORT ou na 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

module.exports = app;
