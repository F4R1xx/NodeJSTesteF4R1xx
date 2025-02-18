// index.js

require('dotenv').config(); // Carrega as variáveis do arquivo .env

const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');

// Em vez de require do arquivo, use a variável de ambiente
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();
app.use(bodyParser.json());

/**
 * Rota que serve a interface web com HTML, CSS e JavaScript.
 */
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>CRUD Usuários Firebase</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1, h2 { color: #333; }
    .form-group { margin-bottom: 10px; }
    label { display: block; margin-bottom: 5px; }
    input { padding: 8px; width: 100%; box-sizing: border-box; }
    button { padding: 10px 15px; margin-top: 10px; cursor: pointer; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    table, th, td { border: 1px solid #ccc; }
    th, td { padding: 10px; text-align: left; }
    th { background-color: #f9f9f9; }
  </style>
</head>
<body>
  <h1>CRUD Usuários Firebase</h1>

  <h2>Criar Novo Usuário</h2>
  <div id="createUser">
    <div class="form-group">
      <label for="email">Email:</label>
      <input type="email" id="email" placeholder="Email">
    </div>
    <div class="form-group">
      <label for="password">Senha:</label>
      <input type="password" id="password" placeholder="Senha">
    </div>
    <div class="form-group">
      <label for="displayName">Nome:</label>
      <input type="text" id="displayName" placeholder="Nome">
    </div>
    <button onclick="createUser()">Criar Usuário</button>
  </div>

  <h2>Lista de Usuários</h2>
  <button onclick="loadUsers()">Carregar Usuários</button>
  <table id="usersTable">
    <thead>
      <tr>
        <th>UID</th>
        <th>Email</th>
        <th>Nome</th>
        <th>Data de Criação</th>
        <th>Último Acesso</th>
        <th>Ações</th>
      </tr>
    </thead>
    <tbody>
      <!-- Usuários serão carregados aqui -->
    </tbody>
  </table>

  <script>
    // Função para criar um usuário via endpoint POST /users
    async function createUser() {
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const displayName = document.getElementById('displayName').value;
      
      const response = await fetch('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName })
      });
      const data = await response.json();
      if(response.ok) {
        alert('Usuário criado com sucesso');
        loadUsers();
      } else {
        alert('Erro: ' + data.error);
      }
    }

    // Função para carregar e exibir os usuários via endpoint GET /users
    async function loadUsers() {
      const response = await fetch('/users');
      const users = await response.json();
      const tbody = document.querySelector('#usersTable tbody');
      tbody.innerHTML = '';
      users.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = \`
          <td>\${user.uid}</td>
          <td>\${user.email}</td>
          <td>\${user.displayName || ''}</td>
          <td>\${user.creationTime}</td>
          <td>\${user.lastSignInTime || 'Nunca'}</td>
          <td>
            <button onclick="deleteUser('\${user.uid}')">Excluir</button>
            <button onclick="showUpdateForm('\${user.uid}', '\${user.displayName || ""}')">Atualizar</button>
          </td>
        \`;
        tbody.appendChild(tr);
      });
    }

    // Função para excluir um usuário via endpoint DELETE /users/:uid
    async function deleteUser(uid) {
      if(confirm('Tem certeza que deseja excluir este usuário?')) {
        const response = await fetch('/users/' + uid, { method: 'DELETE' });
        const data = await response.json();
        if(response.ok) {
          alert('Usuário excluído com sucesso');
          loadUsers();
        } else {
          alert('Erro: ' + data.error);
        }
      }
    }

    // Exibe um prompt para atualizar o nome do usuário e chama o endpoint PUT /users/:uid
    function showUpdateForm(uid, currentName) {
      const newDisplayName = prompt('Novo nome (atual: ' + currentName + ')', currentName);
      if(newDisplayName !== null && newDisplayName !== currentName) {
        updateUser(uid, { displayName: newDisplayName });
      }
    }

    // Função para atualizar o usuário
    async function updateUser(uid, updatedData) {
      const response = await fetch('/users/' + uid, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });
      const data = await response.json();
      if(response.ok) {
        alert('Usuário atualizado com sucesso');
        loadUsers();
      } else {
        alert('Erro: ' + data.error);
      }
    }

    // Carrega os usuários quando a página é carregada
    window.onload = loadUsers;
  </script>
</body>
</html>`);
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

// Inicia o servidor na porta 3000 (ou na porta definida na variável de ambiente PORT)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
