# Trabalho Blockchain - Projeto Template

Estrutura:

- `client` - Frontend: React + Vite
- `server` - Backend: Node.js + Express

Instalação:

1. Na raiz do projeto, instale dependências do root (concurrently):

```powershell
npm install
```

2. Instale dependências do server:

```powershell
npm install --prefix server
```

3. Instale dependências do client:

```powershell
npm install --prefix client
```

Execução em desenvolvimento (roda client e server simultaneamente):

```powershell
npm run dev
```

Observações:

- O backend roda por padrão na porta 4000.
- O Vite está configurado para proxiar requests de `/api` para `http://localhost:4000`.
