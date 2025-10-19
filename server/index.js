const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors())
app.use(express.json())

const DATA_FILE = path.join(__dirname, 'presencas.json')
const USERS_FILE = path.join(__dirname, 'users.json')

function readJsonArray(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8')
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    }
  } catch (err) {
    console.error(`Erro ao ler ${filePath}:`, err)
  }
  return []
}

function writeJsonArray(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
  } catch (err) {
    console.error(`Erro ao salvar ${filePath}:`, err)
  }
}

function gerarId() {
  return Math.random().toString(36).slice(2, 10)
}

let presencas = readJsonArray(DATA_FILE)
let users = readJsonArray(USERS_FILE)

app.post('/api/register', (req, res) => {
  const { userName, matricula, curso = '', did, publicKey } = req.body || {}

  if (!userName || !matricula || !did || !publicKey) {
    return res.status(400).json({ error: 'Campos userName, matricula, did e publicKey são obrigatórios' })
  }

  const existente = users.find((user) => user.did === did || user.matricula === matricula)
  if (existente) {
    return res.status(409).json({ error: 'Usuário já registrado' })
  }

  const user = { id: gerarId(), userName, matricula, curso, did, publicKey }
  users.push(user)
  writeJsonArray(USERS_FILE, users)

  return res.status(201).json(user)
})

app.get('/api/users', (req, res) => {
  const { did, matricula } = req.query

  if (did) {
    return res.json(users.filter((user) => user.did === did))
  }

  if (matricula) {
    return res.json(users.filter((user) => user.matricula === matricula))
  }

  return res.json(users)
})

app.post('/api/presenca', (req, res) => {
  const { userId = null, did = null, eventoID, nomeEvento, dataHora, hash } = req.body || {}

  if (!eventoID) {
    return res.status(400).json({ error: 'Campo "eventoID" é obrigatório' })
  }

  const presenca = {
    id: gerarId(),
    userId,
    did,
    eventoID,
    nomeEvento: nomeEvento || eventoID,
    dataHora: dataHora || new Date().toISOString(),
    hash: hash || gerarId(),
  }

  presencas.push(presenca)
  writeJsonArray(DATA_FILE, presencas)

  return res.status(201).json(presenca)
})

app.get('/api/presencas', (req, res) => {
  const { userId, did } = req.query

  if (userId) {
    return res.json(presencas.filter((presenca) => presenca.userId === userId))
  }

  if (did) {
    return res.json(presencas.filter((presenca) => presenca.did === did))
  }

  return res.json(presencas)
})

app.listen(PORT, () => {
  console.log(`Server rodando na porta ${PORT}`)
})
