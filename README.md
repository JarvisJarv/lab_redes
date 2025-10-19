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

## Como baixar as alterações mais recentes

1. **Clonar o repositório (primeira vez)**

   ```bash
   git clone <URL-do-repositorio>
   cd lab_redes
   ```

2. **Buscar atualizações do servidor remoto**

   ```bash
   git pull
   ```

   Esse comando traz os commits mais recentes para a sua cópia local. Se preferir uma cópia compactada sem usar Git, acesse a página do repositório (por exemplo, no GitHub) e utilize a opção **Download ZIP**.

3. **Aplicar manualmente um patch (quando fornecido)**

   Caso receba um arquivo `.patch` com as mudanças:

   ```bash
   git apply caminho/do/arquivo.patch
   ```

4. **Verificar o conteúdo atualizado**

   ```bash
   git status
   ```

   O comando mostra o estado dos arquivos. Se tudo estiver atualizado, a mensagem será `nothing to commit, working tree clean`.

5. **Instalar dependências novamente (quando necessário)**

   ```bash
   npm install
   npm install --prefix server
   npm install --prefix client
   ```

   Rodar essas instalações garante que novas bibliotecas adicionadas aos commits estejam presentes antes de executar `npm run dev` ou `npm run build`.
