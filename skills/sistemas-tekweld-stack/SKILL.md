# Sistemas Tekweld Stack

## Visão Geral
Esta skill define os padrões técnicos para desenvolvimento e publicação de sistemas internos da Tekweld criados com o Claude.

## Stack Obrigatória

### Frontend
- **HTML + JavaScript puro** — sem frameworks (sem React, Vue, Angular etc.)
- **CSS embutido** no próprio arquivo HTML (sem arquivos externos)
- Todo o sistema deve caber em **um único arquivo `.html`** autocontido
- Pode usar bibliotecas via CDN (ex: Google Fonts, Chart.js) desde que não exijam instalação

### Banco de Dados
- **Supabase** — PostgreSQL gerenciado
- URL do projeto: `https://bmepxcnrsofofoswubuu.supabase.co`
- Chave anon pública: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtZXB4Y25yc29mb2Zvc3d1YnV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MTczNzMsImV4cCI6MjA5NTI5MzM3M30.S55ouFczRYlUYNFf5PotYKXBPT5idypTSmbzR-x2Pk0`
- Toda leitura/escrita de dados deve usar a **API REST do Supabase** via fetch JavaScript
- Autenticação de usuários deve usar o **Supabase Auth**

### Hospedagem
- **GitHub Pages** — organização Tekweld
- Repositório principal: `https://github.com/Tekweld/boxer-app`
- Novos sistemas devem ser adicionados como novos arquivos `.html` neste repositório
- Acesso público via: `https://app.boxersoldas.com.br`

## Estrutura de um Sistema

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nome do Sistema</title>
    <!-- CSS embutido -->
    <style>
        /* estilos aqui */
    </style>
</head>
<body>
    <!-- HTML aqui -->
    <script>
        const SUPABASE_URL = 'https://bmepxcnrsofofoswubuu.supabase.co';
        const SUPABASE_ANON = 'CHAVE_ANON_AQUI';
        
        // JavaScript aqui
        async function sbFetch(path) {
            const r = await fetch(SUPABASE_URL + '/rest/v1' + path, {
                headers: {
                    'apikey': SUPABASE_ANON,
                    'Authorization': 'Bearer ' + SUPABASE_ANON
                }
            });
            return r.json();
        }
    </script>
</body>
</html>
```

## Convenções de Nomenclatura
- Nomes de arquivo em **snake_case** e em português: `tabela_precos.html`, `gestao_usuarios.html`
- Nomes de tabelas no Supabase em **snake_case** e no plural: `produtos`, `log_alteracoes`
- Variáveis JavaScript em **camelCase**: `curState`, `loadProdutos`

## Referência
O sistema `tabela_supabase.html` e `admin_supabase.html` no repositório `boxer-app` são os exemplos de referência desta stack em produção.
