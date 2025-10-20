const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Olá do backend!' });
});

// Array em memória para guardar presenças
const fs = require('fs')
const path = require('path')
const DATA_FILE = path.join(__dirname, 'presencas.json')
const USERS_FILE = path.join(__dirname, 'users.json')

let presencas = []
let users = []
try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8')
    presencas = JSON.parse(raw)
  }
  if (fs.existsSync(USERS_FILE)) {
    const rawu = fs.readFileSync(USERS_FILE, 'utf-8')
    users = JSON.parse(rawu)
    let usersUpdated = false
    users = users.map((u) => {
      if (!u) return u
      let updatedUser = { ...u }
      if (!u.createdAt) {
        usersUpdated = true
        updatedUser = { ...updatedUser, createdAt: new Date().toISOString() }
      }
      if (typeof u.profilePhoto !== 'string') {
        usersUpdated = true
        updatedUser = { ...updatedUser, profilePhoto: '' }
      }
      return updatedUser
    })
    if (usersUpdated) {
      salvarUsers()
    }
  }
} catch (err) {
  console.error('Erro ao carregar presencas do arquivo:', err)
  presencas = []
}

// Gera um ID aleatório simples
function gerarId() {
  return Math.random().toString(36).slice(2, 10);
}

// Salva users em arquivo
function salvarUsers() {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2))
  } catch (err) {
    console.error('Erro ao salvar users:', err)
  }
}

// POST /api/register
// Recebe { userName, matricula, curso, did, publicKey }
app.post('/api/register', (req, res) => {
  const { userName, matricula, curso, did, publicKey } = req.body || {}
  if (!userName || !matricula || !did || !publicKey) {
    return res.status(400).json({ error: 'Campos userName, matricula, did e publicKey são obrigatórios' })
  }

  const existente = users.find((u) => u.did === did || u.matricula === matricula)
  if (existente) {
    return res.status(409).json({ error: 'Usuário já registrado' })
  }

  const user = {
    id: gerarId(),
    userName,
    matricula,
    curso: curso || '',
    did,
    publicKey,
    createdAt: new Date().toISOString(),
    profilePhoto: typeof req.body.profilePhoto === 'string' ? req.body.profilePhoto : '',
  }
  users.push(user)
  salvarUsers()
  return res.status(201).json(user)
})

// GET /api/users?did=... ou ?matricula=...
app.get('/api/users', (req, res) => {
  const { did, matricula } = req.query
  if (did) {
    const found = users.filter((u) => u.did === did)
    return res.json(found)
  }
  if (matricula) {
    const found = users.filter((u) => u.matricula === matricula)
    return res.json(found)
  }
  return res.json(users.map((u) => ({ ...u, createdAt: u.createdAt || null, profilePhoto: u.profilePhoto || '' })))
})

app.put('/api/users/photo', (req, res) => {
  const { did, profilePhoto } = req.body || {}
  if (!did) {
    return res.status(400).json({ error: 'Campo "did" é obrigatório' })
  }

  const index = users.findIndex((u) => u.did === did)
  if (index === -1) {
    return res.status(404).json({ error: 'Usuário não encontrado' })
  }

  const sanitizedPhoto = typeof profilePhoto === 'string' ? profilePhoto : ''
  users[index] = { ...users[index], profilePhoto: sanitizedPhoto }
  salvarUsers()
  return res.json(users[index])
})

// POST /api/login
// Recebe { nome } -> retorna { userId, nome }
app.post('/api/login', (req, res) => {
  const { nome } = req.body || {};
  if (!nome) {
    return res.status(400).json({ error: 'Campo "nome" é obrigatório' });
  }

  const userId = gerarId();
  return res.json({ userId, nome });
});

// POST /api/presenca
// Recebe { userId?, did?, eventoID, nomeEvento?, dataHora?, hash? } -> salva e retorna o registro
app.post('/api/presenca', (req, res) => {
  const { userId, did, eventoID, nomeEvento, dataHora, hash } = req.body || {};
  if (!eventoID) {
    return res.status(400).json({ error: 'Campo "eventoID" é obrigatório' });
  }

  const presenca = {
    id: gerarId(),
    userId: userId || null,
    did: did || null,
    eventoID,
    nomeEvento: nomeEvento || eventoID,
    dataHora: dataHora || new Date().toISOString(),
    hash: hash || gerarId(),
  };

  presencas.push(presenca);
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(presencas, null, 2))
  } catch (err) {
    console.error('Erro ao salvar presencas:', err)
  }
  return res.status(201).json(presenca);
});

// GET /api/presencas?userId=... or ?did=...
// Retorna presenças filtradas por userId ou did (se fornecido)
app.get('/api/presencas', (req, res) => {
  const { userId, did } = req.query;
  if (userId) {
    const filtradas = presencas.filter((p) => p.userId === userId);
    return res.json(filtradas);
  }
  if (did) {
    const filtradas = presencas.filter((p) => p.did === did);
    return res.json(filtradas);
  }
  return res.json(presencas);
});

app.listen(PORT, () => {
  console.log(`Server rodando na porta ${PORT}`);
});
