# Pátio & Lavagem: app próprio no seu celular

Este é o app de gestão do estacionamento em versão independente, sem depender do claude.ai:

- os **dados ficam no seu Firebase**, um banco de dados gratuito do Google em seu nome;
- o app pode ser **instalado no celular** com ícone próprio, como um aplicativo;
- funciona com **internet fraca**: o que você registra sem sinal é enviado quando a conexão volta.

O plano gratuito do Firebase (Spark) é bem mais que suficiente para um estacionamento: cerca de 50 mil leituras e 20 mil gravações por dia, sem cartão de crédito.

---

## Parte 1: criar seu banco de dados no Firebase (uns 10 minutos, uma vez só)

Faça pelo computador, é mais fácil.

### 1. Criar o projeto
1. Entre em **https://console.firebase.google.com** com sua conta Google.
2. Clique em **Criar um projeto**. Nome sugerido: `patio-lavagem`.
3. Pode **desativar** o Google Analytics (não é usado). Clique em **Criar projeto**.

### 2. Ativar o login por e-mail e senha
1. No menu da esquerda: **Criação → Authentication → Vamos começar**.
2. Em **Provedores de login**, escolha **E-mail/senha**, ative a primeira chave e clique em **Salvar**.
3. Vá na aba **Usuários → Adicionar usuário** e crie:
   - o **seu** login (seu e-mail e uma senha);
   - o login do **funcionário** (e-mail dele e uma senha).

### 3. Criar o banco de dados
1. No menu da esquerda: **Criação → Firestore Database → Criar banco de dados**.
2. Local: escolha **southamerica-east1 (São Paulo)**.
3. Escolha **Iniciar no modo de produção** e clique em **Criar**.
4. Abra a aba **Regras**, apague o que estiver lá e cole o conteúdo do arquivo [`firestore.rules`](firestore.rules).
5. **Troque os dois e-mails** de exemplo pelos e-mails reais (o seu e o do funcionário), em letras minúsculas. Clique em **Publicar**.

> As regras garantem que só esses e-mails conseguem ver e alterar os dados. Para tirar o acesso de alguém, apague o e-mail da lista e publique de novo.

### 4. Pegar o código de configuração
1. Clique na **engrenagem** ao lado de "Visão geral do projeto" → **Configurações do projeto**.
2. Em **Seus apps**, clique no ícone **`</>`** (Web).
3. Apelido: `patio`. **Não** marque Firebase Hosting. Clique em **Registrar app**.
4. Aparece um bloco assim. **Copie esse bloco:**

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "patio-lavagem.firebaseapp.com",
  projectId: "patio-lavagem",
  storageBucket: "patio-lavagem.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abc123"
};
```

Esse código **não é senha**: ele só diz ao app qual é o seu banco. Quem protege os dados são o login e as regras do passo 3. Você pode mandar esse bloco para o Claude colocar no arquivo `config.js`, assim todos os celulares já abrem conectados.

---

## Parte 2: colocar o app no ar

O app são arquivos simples (esta pasta `app/`) e precisa de um endereço na internet. Opções gratuitas:

- **Netlify** (mais simples): o Claude publica para você, ou você entra em **https://app.netlify.com/drop** pelo computador e arrasta a pasta `app` para a página. Você recebe um endereço como `patio-lavagem.netlify.app`, que pode renomear.
- **GitHub Pages**: em Settings → Pages deste repositório, publique a partir da branch principal. Exige que o repositório seja público (os dados continuam protegidos, já que ficam no Firebase).

Na primeira vez que abrir o endereço, o app pede o código de configuração (se ele não estiver no `config.js`) e depois o seu e-mail e senha.

---

## Parte 3: instalar no celular

**Android (Chrome)**
1. Abra o endereço do app no Chrome.
2. Toque nos **três pontinhos** → **Instalar app** (ou **Adicionar à tela inicial**).

**iPhone (Safari)**
1. Abra o endereço do app no **Safari**.
2. Toque em **Compartilhar** (quadrado com seta) → **Adicionar à Tela de Início** → **Adicionar**.

O app aparece com o ícone azul "P" e abre em tela cheia, sem barra do navegador. Faça o mesmo no celular do funcionário, entrando com o login dele.

---

## Dúvidas comuns

- **"E-mail ou senha incorretos"**: confira se o usuário foi criado em Authentication → Usuários. Para trocar a senha, use "Esqueci a senha" na tela de login.
- **"Este e-mail não tem acesso"**: o e-mail não está na lista das regras (Parte 1, passo 3). Coloque-o lá e clique em Publicar.
- **Backup**: em Ajustes → Seus dados, baixe a planilha do caixa do mês ou o backup completo quando quiser.
- **Ver os dados direto no banco**: Firebase → Firestore Database → aba Dados.
