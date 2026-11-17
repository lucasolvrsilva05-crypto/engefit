# ENGEFIT

Site estático (HTML + PWA). Sem build, sem dependências.

## Publicar na Vercel (pelo site, sem instalar nada)
1. Crie um repositório no GitHub e envie estes arquivos na raiz.
2. Em vercel.com, entre com o GitHub e clique em **Add New > Project**.
3. Escolha o repositório. Framework Preset: **Other**. Não preencha build nem output. Clique em **Deploy**.
4. A URL fica algo como `engefit.vercel.app`.

## Publicar pelo terminal
```
npm i -g vercel
vercel --prod
```

## Instalar no celular
- Android (Chrome): menu ⋮ > **Instalar app**.
- iPhone (Safari): Compartilhar > **Adicionar à Tela de Início**.

## Atualizações
Ao mudar o código, aumente a versão em `sw.js` (`const V = 'engefit-v2'`) para os usuários receberem a atualização.

## Dados
Ficam no navegador de cada pessoa (localStorage). Use Perfil > Ajustes > Copiar backup para levar a outro aparelho.
