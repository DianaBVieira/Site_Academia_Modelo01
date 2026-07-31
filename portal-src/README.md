# Brothers Gestão de Alunos

Aplicação multiacademia (SaaS) para administração e acompanhamento de alunos. Cada academia (tenant) tem seus próprios alunos, planos, pagamentos e treinos, isolados das demais.

## Papéis de acesso

- **owner** — dono da plataforma; enxerga e ativa/desativa todas as academias (`OwnerWorkspace.tsx`).
- **admin** — administrador de uma academia específica; gerencia alunos, planos, pagamentos e treinos daquela academia (`AdminWorkspace.tsx`).
- **student** — aluno; acessa apenas os próprios dados.

Todo usuário tem um documento `users/{uid}` com `role` e, para admin/student, `academyId`. Os dados de cada academia ficam em `academies/{academyId}/...` (ver `src/database.ts`, função `paths`).

## Estado atual

- Login, fluxo do aluno (anamnese, treinos, cronômetro, histórico corporal) e biblioteca de exercícios (integração com wger.de) funcionam de ponta a ponta com Firebase real.
- `AdminWorkspace.tsx` está sendo conectado ao Firestore (alunos, planos, pagamentos, treinos, medidas) — verifique o estado de cada aba antes de assumir que está persistindo de verdade.
- Upload de foto/vídeo de exercício usa `uploadExerciseMedia` (Firebase Storage) — ver `src/database.ts`.
- Regras de segurança (`firestore.rules`, `storage.rules`) isolam cada academia por `academyId`.

## Biblioteca de exercícios — segunda fonte em PT (protótipo interno)

Além da integração ao vivo com o wger.de, `ExerciseLibrary.tsx` pode carregar um dataset local de
1.324 exercícios traduzidos do repositório
[hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset) (`src/data/exercises-pt.json`,
gerado em 30/07/2026). Fica atrás da flag `VITE_ENABLE_EXERCISES_PT_PROTO` (`.env`), **desligada por padrão**.

**Por que a flag existe — leia antes de ligar:**
- O **texto** (nomes, categorias, instruções) é MIT — livre para uso comercial, já traduzido.
- As **imagens e GIFs** (`portal-src/public/exercises-pt/`, ~138MB) são **© Gym visual**, incluídas naquele
  repositório com permissão pessoal do autor original para o app dele. Essa permissão **não se estende** a
  este projeto — o próprio `NOTICE.md` do repositório é explícito: clonar não dá licença para reusar a mídia.
- **Nunca habilite essa flag num deploy que atenda cliente real** sem antes obter licença própria da Gym
  visual (https://gymvisual.com/content/3-terms-and-conditions-of-use). Até lá, é só protótipo interno/demo.
- Se decidir não seguir com a licença, dá pra manter só a parte traduzida (nomes/instruções) e trocar as
  mídias por fotos/vídeos próprios, ou pelas imagens já licenciadas do wger.de.

## Como criar uma nova academia (provisionamento manual)

Não existe cadastro público. Toda nova academia é criada por você com o script abaixo:

1. No Console do Firebase: **Configurações do projeto → Contas de serviço → Gerar nova chave privada**. Salve o `.json` fora do repositório (o `.gitignore` já bloqueia arquivos chamados `*serviceAccount*.json`/`*service-account*.json`, mas evite deixá-los dentro da pasta do projeto).
2. Rode:
   ```bash
   npm install
   node scripts/create-academy.mjs <caminho/para/service-account.json> "Nome da Academia" admin@academia.com "Nome do Administrador"
   ```
3. O script cria a academia, o usuário admin no Firebase Auth (com senha aleatória nunca revelada) e imprime um **link de redefinição de senha** — envie esse link ao administrador para que ele defina a própria senha. Nunca envie uma senha por e-mail.
4. Publique as regras atualizadas quando mudar `firestore.rules`/`storage.rules`:
   ```bash
   firebase deploy --only firestore:rules,storage:rules
   ```

## Executar o app

```bash
npm install
npm run dev
```

Copie `.env.example` para `.env` e preencha a configuração pública do projeto Firebase (`academia-brothers-vv` ou outro, conforme o ambiente).

## Pendências conhecidas

- Política de privacidade, termo de consentimento formal e processo de exportação/exclusão de dados (LGPD) ainda não têm página própria — hoje há apenas o checkbox de consentimento na ficha de saúde.
- Não há suíte de testes automatizados.
- Considere configurar o Firebase Emulator Suite para testar `firestore.rules`/`storage.rules` localmente antes de publicar mudanças de isolamento entre academias.
