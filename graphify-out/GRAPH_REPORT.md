# Graph Report - C:/dev/precos-pecas  (2026-09-08)

## Corpus Check
- 1 files · ~52,598 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 163 nodes · 261 edges · 30 communities (10 shown, 20 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.82)
- Token cost: 0 input · 108,368 output

## Community Hubs (Navigation)
- Admin Products & Pricing Management
- Proposal Engine (LASER) Page Builders
- Public Price Table & Stock Availability
- Auth, Login & Session Management
- Marketing Catalog Editor
- Proposal Data Model & Flow
- BMAX Equipment Photo Assets
- Tekweld Stack Conventions & Skill Docs
- BMAX Logo Asset
- Boxer Logo (White Variant)
- Boxer Logo (Full Color)
- Boxer Star Icon
- Project Index Page
- Add Caracteristica Row
- Add Equipamento Row
- Marketing Logout
- Marketing Catalog Page
- Preview Acessorio Image
- Preview Equipamento Image
- Preview Cover Image
- Preview Secondary Image
- Save Commercial Policy
- IBGE Cidades Lookup
- Public Proposal Viewer
- Project README
- Tabela Admin (Redirect Stub)
- Tabela Automacao (Redirect Stub)
- Tabela Principal (Redirect Stub)

## God Nodes (most connected - your core abstractions)
1. `sb (Supabase REST wrapper)` - 20 edges
2. `esc()` - 15 edges
3. `gerarHTMLProposta()` - 14 edges
4. `toast` - 10 edges
5. `showTab` - 10 edges
6. `montarCorpoLaser()` - 9 edges
7. `load` - 9 edges
8. `saveProd` - 9 edges
9. `render` - 8 edges
10. `loadProdutos` - 8 edges

## Surprising Connections (you probably didn't know these)
- `sbFetch` --semantically_similar_to--> `sb (Supabase REST wrapper)`  [INFERRED] [semantically similar]
  tabela-de-precos.html → admin_supabase.html
- `gerarProposta() — create proposal, items, contacts` --calls--> `gerarHTMLProposta()`  [EXTRACTED]
  propostas/novo.html → propostas/proposta-engine.js
- `propostas/login.html — Vendor Login` --references--> `Tabela de Preços Page`  [EXTRACTED]
  propostas/login.html → tabela-de-precos.html
- `IS_TEST flag (t=3)` --conceptually_related_to--> `Revendas Teste option (tabela_id=3)`  [INFERRED]
  tabela-de-precos.html → marketing.html
- `propostas/login.html — Vendor Login` --implements--> `Supabase project bmepxcnrsofofoswubuu`  [EXTRACTED]
  propostas/login.html → skills/sistemas-tekweld-stack/SKILL.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Authentication entry flow (hash link, password login, profile resolution, session setup)** — admin_supabase_checkhashlogin, admin_supabase_dologin, admin_supabase_resolverperfileentrar, admin_supabase_setupadminsession [INFERRED 0.85]
- **Tabelas.atualizado_em touch pattern (cache-busting after data edits)** — admin_supabase_saveprod, admin_supabase_applyreajuste, admin_supabase_saveest, admin_supabase_savemult [INFERRED 0.80]
- **Bulk price adjustment flow (category selection, preview, apply)** — admin_supabase_openreajustemodal, admin_supabase_toggleallcats, admin_supabase_selectedcats, admin_supabase_previewreajuste, admin_supabase_applyreajuste [INFERRED 0.85]
- **Revendas Teste (tabela_id=3) Cross-File Feature** — marketing_revendas_teste_option, tabela_de_precos_is_test_flag [INFERRED 0.85]
- **ZenERP Stock Availability Flow** — tabela_de_precos_sbfetchall, tabela_de_precos_estoque_zenerp, tabela_de_precos_estoque_map, tabela_de_precos_avaliardisponibilidade [EXTRACTED 1.00]
- **Shared Supabase backend across Boxer pricing/proposal apps** — marketing_page, tabela_de_precos_page, propostas_login_page, skills_sistemas_tekweld_stack_skill_supabase_project_bmepxcnrsofofoswubuu [EXTRACTED 1.00]
- **End-to-end proposal creation/management/viewing flow** — propostas_login_page, propostas_novo_page, propostas_gerenciar_page, propostas_index_page, propostas_ver_page [EXTRACTED 1.00]

## Communities (30 total, 20 thin omitted)

### Community 0 - "Admin Products & Pricing Management"
Cohesion: 0.15
Nodes (32): applyReajuste, atualizarBloqueioPvSp, closeModal, delProd, delUser, editComissao, editMult, fetchCom (+24 more)

### Community 1 - "Proposal Engine (LASER) Page Builders"
Cohesion: 0.18
Nodes (25): criarMeasureFrame(), eqLinhaHTML(), equipamentosBodyHTML(), esc(), espessuraMiniHTML(), gerarHTMLProposta(), medir(), montarBlocosEscopo() (+17 more)

### Community 2 - "Public Price Table & Stock Availability"
Cohesion: 0.11
Nodes (24): Revendas Teste option (tabela_id=3), propostas/login.html — Vendor Login, Supabase project bmepxcnrsofofoswubuu, avaliarDisponibilidade, buildFilters, Disponível? column (stock dot), ESTOQUE map (client-side stock lookup), estoque_zenerp (Supabase table) (+16 more)

### Community 3 - "Auth, Login & Session Management"
Cohesion: 0.18
Nodes (17): checkHashLogin, doDefinirNovaSenha, doLogin, doLogout, DOMContentLoaded init handler, loadComissoes, loadMult, Login page (loginPage) (+9 more)

### Community 4 - "Marketing Catalog Editor"
Cohesion: 0.17
Nodes (16): addAcessorioRow, atualizarBotaoAcessorio, collectAcessoriosParaSalvar, collectCaracRows, collectEquipItensParaSalvar, doLogin, filterProdutos, Imagem Secundária (Escopo de Fornecimento) Rationale (+8 more)

### Community 5 - "Proposal Data Model & Flow"
Cohesion: 0.18
Nodes (9): propostas/gerenciar.html — Manage Proposal, Supabase table: comercial.propostas, init() — load vendor's proposals, propostas/index.html — Minhas Propostas, fazerLogin(), gerarProposta() — create proposal, items, contacts, propostas/novo.html — New Proposal Form, Supabase table: comercial.vendedor_perfis (+1 more)

### Community 6 - "BMAX Equipment Photo Assets"
Cohesion: 0.67
Nodes (6): Boxer Alumig 400 CP Welding Machine, Boxer (Brand), Boxer LQ2050 Control/Power Unit, Boxer Robotmeta Welding Robot Arm, Equipamentos Boxer (Product Cutout Image), Sales Proposal Cover Hero Image (Use Case)

### Community 7 - "Tekweld Stack Conventions & Skill Docs"
Cohesion: 0.40
Nodes (5): GitHub Pages hosting (Tekweld org), Naming conventions (snake_case files/tables, camelCase JS), Single self-contained HTML file per system, Sistemas Tekweld Stack (skill doc), Supabase REST API via fetch pattern

## Ambiguous Edges - Review These
- `index.ts` → `estoque_zenerp (Supabase table)`  [AMBIGUOUS]
  tabela-de-precos.html · relation: references

## Knowledge Gaps
- **42 isolated node(s):** `PAGE_H`, `boxer-app (README)`, `Supabase REST API via fetch pattern`, `GitHub Pages hosting (Tekweld org)`, `Naming conventions (snake_case files/tables, camelCase JS)` (+37 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `index.ts` and `estoque_zenerp (Supabase table)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `sb (Supabase REST wrapper)` connect `Admin Products & Pricing Management` to `Public Price Table & Stock Availability`, `Auth, Login & Session Management`?**
  _High betweenness centrality (0.190) - this node is a cross-community bridge._
- **Why does `sbFetch` connect `Public Price Table & Stock Availability` to `Admin Products & Pricing Management`?**
  _High betweenness centrality (0.154) - this node is a cross-community bridge._
- **What connects `PAGE_H`, `boxer-app (README)`, `Supabase REST API via fetch pattern` to the rest of the system?**
  _42 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Admin Products & Pricing Management` be split into smaller, more focused modules?**
  _Cohesion score 0.14516129032258066 - nodes in this community are weakly interconnected._
- **Should `Public Price Table & Stock Availability` be split into smaller, more focused modules?**
  _Cohesion score 0.1076923076923077 - nodes in this community are weakly interconnected._