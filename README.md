# Trabalho Blockchain

Este repositório é um template completo de aplicação web com **frontend em React + Vite** e **backend em Node.js + Express**. Ele foi pensado para acelerar o desenvolvimento de um laboratório de blockchain, fornecendo endpoints REST básicos e uma interface pronta para ser customizada.

## Pré-requisitos

Antes de começar, instale:

- [Node.js](https://nodejs.org/) >= 18 (inclui `npm`)
- Opcional, mas recomendado: [Git](https://git-scm.com/) para clonar o repositório

Verifique se a versão do Node está correta:

```bash
node --version
```

## Estrutura do projeto

```
lab_redes/
├── client/   # Aplicação React + Vite (frontend)
├── server/   # API REST em Express (backend)
├── scripts/  # Utilitários (ex.: instalador via requirements)
├── package.json
├── requirements.txt
└── README.md
```

- **Raiz** – contém scripts utilitários e a dependência `concurrently`, usada para subir client e server juntos.
- **client** – interface em React configurada com Tailwind CSS e React Router.
- **server** – API que expõe rotas para cadastro de usuários e controle de presença.

## requirements.txt

O arquivo [`requirements.txt`](requirements.txt) consolida todas as bibliotecas do projeto (frontend, backend e raiz). O formato de cada linha é `escopo:pacote@versao`, onde os escopos padrão são `root`, `server` e `client`.

### Como instalar usando o requirements

Na raiz do projeto há um script que lê o `requirements.txt` e executa os `npm install` necessários:

```bash
npm run setup:requirements
```

O comando acima funciona em Windows, macOS e Linux porque o script é escrito em Node.js (`scripts/install-from-requirements.js`). Ele realiza, em ordem:

1. Instalação das dependências da raiz (`root`)
2. Instalação das dependências do backend (`server`)
3. Instalação das dependências do frontend (`client`)

Caso prefira executar manualmente, basta filtrar as linhas pelo escopo desejado. Exemplo em sistemas Unix-like:

```bash
# Dependências da raiz
grep '^root:' requirements.txt | cut -d: -f2 | xargs -r npm install

# Dependências do backend
grep '^server:' requirements.txt | cut -d: -f2 | xargs -r npm install --prefix server

# Dependências do frontend
grep '^client:' requirements.txt | cut -d: -f2 | xargs -r npm install --prefix client
```

> 💡 O `requirements.txt` complementa os `package.json`. Ele é útil para documentar rapidamente todas as bibliotecas e para permitir a instalação em lote com o comando `npm run setup:requirements`.

## Instalação manual (alternativa)

Se preferir instalar cada parte manualmente, utilize os comandos a seguir na raiz do projeto:

```bash
# Dependências do escopo root
npm install

# Dependências do backend (Express)
npm install --prefix server

# Dependências do frontend (React)
npm install --prefix client
```

## Executando em desenvolvimento

### Frontend + backend juntos

```bash
npm run dev
```

Este comando usa `concurrently` para subir o backend na porta **4000** e o frontend do Vite na porta **5173**, com proxy automático das requisições para `/api`.

### Backend isolado

```bash
npm run dev --prefix server
```

### Frontend isolado

```bash
npm run dev --prefix client
```

## Endpoints principais do backend

Todos os endpoints estão disponíveis a partir de `http://localhost:4000/api`.

| Método | Rota              | Descrição                                                     |
| ------ | ----------------- | ------------------------------------------------------------- |
| GET    | `/hello`          | Endpoint de teste, retorna uma mensagem simples.             |
| POST   | `/register`       | Cria um usuário (`userName`, `matricula`, `curso`, `did`).    |
| GET    | `/users`          | Lista usuários ou filtra por `did`/`matricula`.               |
| PUT    | `/users/photo`    | Atualiza a foto de perfil a partir do `did`.                  |
| POST   | `/login`          | Gera um identificador simples de sessão para o usuário.       |
| POST   | `/presenca`       | Registra presença vinculada a usuário ou DID.                 |
| GET    | `/presencas`      | Lista presenças, podendo filtrar por `userId` ou `did`.       |

Os dados persistem em arquivos JSON (`server/users.json` e `server/presencas.json`).

## Boas práticas e próximos passos

- Configure variáveis de ambiente no backend conforme necessário (ex.: `PORT`).
- Expanda o frontend consumindo os endpoints listados acima.
- Atualize o `requirements.txt` sempre que adicionar uma nova biblioteca.

Pronto! Agora você tem um ambiente completo com instruções detalhadas para instalar, executar e manter o projeto.
