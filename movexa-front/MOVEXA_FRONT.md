# MOVEXA : contexte du front (Angular)

> **Pour Claude (nouvelle conversation) :** ce fichier décrit le front `movexa-front`. Lis-le avec `MOVEXA_PROJECT.md` (contexte global et backend).
> Reprends à la section « État actuel et prochaines étapes ». Les points `À CONFIRMER` sont à vérifier avec moi avant de coder.
> Je suis seul, en apprentissage, sous Windows/PowerShell, éditeur VS Code. Réponds en français et explique avant de coder.

---

## 1. Stack et versions

- **Angular récent** (les liens d'erreur pointent vers `v22.angular.dev` ; version exacte : **À CONFIRMER** avec `ng version`).
- Composants **standalone par défaut** (pas de `standalone: true` dans les décorateurs, pas de NgModule).
- Syntaxe de template moderne : `@if`, `@for`, signaux (`signal`, `computed`, `input`).
- Injection avec `inject()`. Formulaires **réactifs** (`ReactiveFormsModule`, `fb.nonNullable.group`).
- CSS classique avec **variables CSS** (pas de préprocesseur).
- Le front ne parle **qu'au gateway** (port 8080) ; en dev, via le **proxy Angular**.
- Nommage récent des fichiers : composant `Login` dans `features/auth/login/login.ts` (pas de suffixe `.component`). Le template et le CSS suivent (`login.html`, `login.css`) : **À CONFIRMER** (j'ai aussi eu `login-component/` avant de renommer).

## 2. Lancer le front

```powershell
ng serve --proxy-config proxy.conf.json    # http://localhost:4200
```

`proxy.conf.json` (à la racine) :

```json
{ "/api": { "target": "http://localhost:8080", "secure": false } }
```

Le proxy n'existe qu'en développement (`ng serve`) : il évite le CORS en faisant croire au navigateur que tout est sur `localhost:4200`. Redémarrer `ng serve` après modification. En production, un reverse proxy/CDN joue ce rôle, ou on configure `jhipster.cors.allowed-origins` côté gateway.

Backend à lancer avant (`.\mvnw` dans `movexa-gateway`, Docker Desktop démarré).

## 3. Structure du projet

Organisation **par fonctionnalité** :

```
src/app/
├── core/                 ← transversal, singletons
│   └── auth/
│       ├── auth.models.ts          LoginRequest, LoginResponse, User
│       ├── auth.service.ts         login(), logout(), getToken(), isLoggedIn()
│       ├── current-user.store.ts   utilisateur courant (signal), roles(), hasAnyRole(), load(), clear()
│       ├── auth.interceptor.ts     ajoute Authorization: Bearer (uniquement vers apiUrl)
│       ├── error.interceptor.ts    401 → logout + /login ; 403 → /forbidden
│       ├── auth.guard.ts           connecté ? charge le profil
│       └── role.guard.ts           rôles lus dans route.data['roles']
├── shared/               ← réutilisable sans état global
│   ├── validators/       phone, password, text, date, match + index.ts
│   └── form-error/       FormErrorComponent (<app-form-error [control] label>)
├── layouts/              ← coquilles de pages (public, connecté) : à créer
├── features/
│   └── auth/
│       ├── auth.routes.ts
│       └── login/        composant Login
├── app.config.ts
├── app.routes.ts
└── app.ts
src/environments/environment.ts   { production: false, apiUrl: '/api' }
src/styles/tokens.css, base.css   design tokens et styles globaux
src/styles.css                    @import des deux fichiers ci-dessus
```

Règles :
- `features/*` peut utiliser `core` et `shared`, **jamais une autre feature**.
- Un service va dans `core` s'il est transversal ; dans sa feature s'il est propre à un domaine (ex. `MembersService` dans `features/members/`) ; en `shared` s'il est réutilisable sans état.
- `providedIn: 'root'` rend un service singleton où qu'il soit rangé : `core` est une convention.
- Alias TypeScript attendus dans `tsconfig.json` (`compilerOptions.paths`) : `@core/*`, `@shared/*`, `@features/*` (vers `src/app/...`). **À CONFIRMER** qu'ils sont déclarés ; sinon l'erreur « Cannot find module '@features/...' » apparaît. Un import dynamique doit viser un **fichier** (pas un dossier sans `index.ts`).

## 4. Authentification côté front

Flux :
1. `Login.submit()` → `AuthService.login()` → `POST /api/authenticate` (`{username, password, rememberMe}`).
2. Le token (`id_token`) est stocké sous la clé `movexa_token` : `localStorage` si « se souvenir de moi », sinon `sessionStorage`.
3. `switchMap` vers `CurrentUserStore.load(true)` → `GET /api/account` (profil et rôles dans `authorities`).
4. Redirection (cible prévue `/members`, route pas encore créée : utiliser une route existante en attendant).
5. Chaque requête vers `apiUrl` porte `Authorization: Bearer <token>` (intercepteur).

`app.config.ts` : `provideRouter(routes)` et `provideHttpClient(withInterceptors([authInterceptor, errorInterceptor]))`.

Méthode `submit()` visée :

```ts
this.auth.login(this.form.getRawValue())
  .pipe(switchMap(() => this.store.load(true)))
  .subscribe({
    next: () => { this.loading.set(false); this.router.navigate(['/members']); },
    error: (err: HttpErrorResponse) => {
      this.loading.set(false);
      this.auth.logout(); this.store.clear();
      this.errorMessage.set(err.status === 401
        ? 'Identifiant ou mot de passe incorrect.'
        : 'Connexion impossible. Réessayez plus tard.');
    },
  });
```

Points importants :
- L'`errorInterceptor` **ne redirige pas** sur un 401 de `/authenticate` (sinon le message d'erreur du login serait perdu).
- `roleGuard` doit passer **après** `authGuard`. Les rôles se déclarent dans la route : `data: { roles: ['ROLE_ADMIN', 'ROLE_COACH'] }`.
- **Les guards améliorent l'expérience, ils ne sont pas de la sécurité** : le vrai contrôle est dans le gateway et les services.
- Stockage du token en `localStorage` : acceptable en apprentissage, vulnérable au XSS. Production : cookie `httpOnly` + `SameSite` posé par le serveur (demandera une adaptation du gateway).
- Ne pas mettre `strongPasswordValidator` sur le formulaire de login (seulement `required`).

## 5. Routes (état visé)

```ts
export const routes: Routes = [
  { path: 'login', loadComponent: () => import('@features/auth/login/login').then(m => m.Login) },
  // à ajouter quand les composants existent :
  // { path: 'members', canActivate: [authGuard, roleGuard], data: { roles: ['ROLE_ADMIN','ROLE_COACH'] }, loadComponent: ... },
  // { path: 'forbidden', loadComponent: ... },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
```

Garder **une seule** version du fichier (j'avais une ancienne version commentée à nettoyer) et ne pas importer `Login` statiquement en plus du `loadComponent` (cela annule le lazy loading). À prévoir : route `**` (404), page `/forbidden`, layouts public/connecté.

## 6. Validateurs partagés (`shared/validators`)

Règle commune : **un champ vide est valide** (renvoie `null`) ; l'obligation se gère avec `Validators.required`.

| Validateur | Clé d'erreur | Rôle |
|---|---|---|
| `phoneValidator()` | `phone` | Format international E.164 |
| `strongPasswordValidator(rules?)` | `passwordStrength: { missing[] }` | Mot de passe fort |
| `notBlankValidator()` | `blank` | Refuse « uniquement des espaces » |
| `noWhitespaceValidator()` | `whitespace` | Refuse les espaces |
| `loginValidator()` | `login` | Même règle que JHipster : `[_.@A-Za-z0-9-]+` |
| `strictEmailValidator()` | `email` | Email plus strict que `Validators.email` |
| `notFutureDateValidator()` | `futureDate` | Date non future |
| `minAgeValidator(n)` | `minAge: { requiredAge }` | Âge minimum |
| `matchFieldsValidator(a, b)` | `fieldsMismatch` | **Sur le FormGroup** (confirmation de mot de passe) |

Import : `import { ... } from '@shared/validators';`. Les mêmes règles doivent exister côté backend (le backend fait foi).

`FormErrorComponent` : affiche la **première erreur** d'un contrôle, seulement s'il est `touched` ou `dirty`. Les messages sont en dur en français (à externaliser si i18n).

## 7. Design system (tokens CSS)

Fichiers : `src/styles/tokens.css`, `src/styles/base.css`, importés dans `src/styles.css` (`@import` en tête). Les variables sur `:root` traversent l'encapsulation des composants : utiliser `var(--...)` dans tout fichier CSS, **jamais de valeur en dur**.

Thème **sombre** par défaut (`color-scheme: dark`), basé sur une référence « Twinkle ». Les hex sont des **estimations visuelles** à affiner avec une pipette :

| Couleur | Hex estimé | Usage |
|---|---|---|
| Bleu nuit | `#1e2336` | Fond (`--color-bg`) |
| Ardoise | `#3f4a63` | Surfaces (`--palette-slate-600`) |
| Sable | `#c8a47e` | Accent (`--color-primary`) |
| Gris-bleu | `#94a7ae` | Texte secondaire (`--color-text-muted`) |

Deux niveaux de tokens :
- **Palette brute** (`--palette-navy-900/800`, `--palette-slate-700/600/500`, `--palette-sand-400/500/600`, `--palette-mist-100/300/400`) : seul endroit des hex.
- **Rôles d'usage** (à utiliser dans les composants) : `--color-bg`, `--color-bg-deep`, `--color-surface`, `--color-surface-raised`, `--color-border`, `--color-text`, `--color-text-muted`, `--color-primary` (+ `-hover`, `-active`), `--color-on-primary` (texte sur bouton sable : bleu nuit, pas blanc), `--color-focus-ring`.
- Sémantiques : `--color-success|warning|danger|info` (+ `-bg`), éclaircis pour fond sombre.
- Aussi : `--font-family-base|mono`, `--font-size-xs..2xl`, `--font-weight-*`, `--line-height-*`, `--space-1..8` (échelle 4 px), `--radius-sm..full`, `--shadow-sm..lg`, `--transition-*`, `--z-*`, `--container-max-width`, `--sidebar-width`, `--header-height`.

Conventions :
- Le sable est **rare** : actions principales et éléments actifs seulement.
- Nommer par **rôle**, pas par apparence.
- Pas de `var()` dans les media queries (breakpoints en dur : 640, 768, 1024 px).
- **Thème par salle** (multi-tenant) : surcharger `--color-primary` (et variantes) au chargement avec `document.documentElement.style.setProperty(...)`.
- Ne pas garder le bloc `@media (prefers-color-scheme: dark)` de la première version des tokens.
- Si du violet apparaît encore (`#7c3aed`, `#4c1d95`), il reste une valeur en dur à remplacer.
- Police : système pour l'instant ; option `@fontsource-variable/inter` hébergée en local.

## 8. Qualité de code (ESLint, Prettier)

À mettre en place (**À CONFIRMER** ce qui est déjà installé) :
- `ng add angular-eslint` → `eslint.config.js` (flat config), `ng lint`.
- `npm i -D prettier eslint-config-prettier`, `.prettierrc` (`printWidth: 100`, `singleQuote`, `trailingComma: all`, parser `angular` pour `*.html`), `.prettierignore`. `prettier` placé **en dernier** dans les `extends` d'ESLint ; pas de `eslint-plugin-prettier`.
- Règles voulues : `no-explicit-any: error`, `no-unused-vars` (préfixe `_` ignoré), `consistent-type-imports: warn`, `no-console` (autorise `warn`/`error`).
- Scripts `lint`, `lint:fix`, `format`, `format:check` ; premier `npm run format` dans un **commit séparé**.
- VS Code : extensions ESLint + Prettier, `formatOnSave`, `source.fixAll.eslint`.
- Optionnel : Husky + lint-staged.

## 9. Pièges déjà rencontrés

- **NG8002 « Can't bind to 'formGroup' »** : `ReactiveFormsModule` doit être dans `imports` du composant ; souvent un cache du service de langage → relancer `ng serve`, « Developer: Reload Window », « Angular: Restart Angular Language Server ».
- **« Cannot find module '@features/auth' »** : alias `paths` absent de `tsconfig.json`, ou import visant un dossier au lieu d'un fichier. Redémarrer `ng serve` et le TS Server après modification.
- **CORS** : résolu en dev par le proxy ; en prod, domaine unique ou `allowed-origins` côté gateway.
- Le port du front Angular est **4200**.

## 10. État actuel et prochaines étapes

### Fait
- Composant de login (formulaire réactif, validation, bascule afficher/masquer le mot de passe, « se souvenir de moi », message d'erreur).
- `core/auth` créé (modèles, service, store, deux intercepteurs, deux guards).
- Validateurs partagés et `FormErrorComponent`.
- Tokens CSS et thème sombre sable/ardoise appliqués au login.
- Plan ESLint/Prettier défini.

### À faire (ordre conseillé)
1. **Vérifier la chaîne de bout en bout** : `admin/admin` → 200 sur `authenticate` puis `account` (F12 → Network), `movexa_token` présent dans le storage.
2. Brancher `Login` sur `CurrentUserStore` (méthode `submit()` du §4) et corriger la cible de redirection.
3. Créer la page `/forbidden`, la route `**`, et une page d'accueil/`members` minimale.
4. **Layouts** : public (login) et connecté (en-tête, menu filtré par `store.roles()`).
5. Lazy loading de toutes les features.
6. Service de notifications (toasts) et `ErrorHandler` global.
7. ESLint/Prettier/lint-staged si pas encore faits.
8. Tests unitaires : validateurs, `AuthService`, guards.
9. Préparer le **multi-tenant** (lecture centralisée du tenant courant : claim `tenantId` du token ou sous-domaine) et l'**i18n** si plusieurs langues.
10. Formulaires de gestion (création de coach/adhérent) quand le Core Service existera.

### Rappel sécurité
Pas de `innerHTML` avec des données utilisateur, pas de `bypassSecurityTrust...`, aucun secret dans le bundle, `npm audit` régulier, CSP/HSTS au déploiement.
