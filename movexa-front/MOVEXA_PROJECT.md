# MOVEXA : contexte du projet (backend et architecture)

> **Pour Claude (nouvelle conversation) :** ce fichier résume tout ce qui a été décidé et construit jusqu'ici.
> Lis-le en entier, considère-le comme la source de vérité, et continue à partir de la section « État actuel et prochaines étapes ».
> Ne suppose pas ce qui est marqué `À CONFIRMER` : demande-le-moi ou fais-moi vérifier.

---

## 1. Profil et manière de travailler

- Je travaille **seul**, en **apprentissage**. Explique les notions (avec analogies si utile) avant de coder.
- Environnement : **Windows**, terminal **PowerShell**, localisation Bénin. Réponses en **français**.
- Poste fourni par mon entreprise : un `settings.xml` Maven global pointe vers leur **Nexus** (`reqistry.hyperion-dev.com`). Ce projet est **personnel**, donc je veux m'en séparer (voir §9).
- Éditeurs : IntelliJ (backend au début), **VS Code** (front, et backend envisagé).
- Outils : pgAdmin (connecté à la base du conteneur), Docker Desktop, un PostgreSQL 18 installé localement sur Windows (à ne pas confondre avec celui du conteneur).
- Je préfère : avancer étape par étape, pas de sur-ingénierie, des conseils honnêtes (y compris « ne fais pas ça maintenant »).

## 2. Le produit

**Movexa** : plateforme SaaS de gestion de salles de sport, **multi-tenant**, scalable et sécurisée.

- Clients prévus : Web Admin, Web Coach, Espace Adhérent (tous en front web), Application mobile (V2, React Native).
- Multi-tenant : isolation des données **par salle**, sous-domaines (`salle-a.movexa.com`...), abonnements par salle, facturation centralisée.
- Le schéma d'architecture d'origine (très ambitieux) prévoyait : API Gateway, Auth, User, Subscription, Access (QR code), Notification, Scheduling (V2), Media, AI (V3), Audit, Kafka, PostgreSQL primaire + réplica, Redis, Elasticsearch, Data Warehouse, AWS (ECS Fargate, RDS, ElastiCache, S3, CloudFront, WAF, Route 53), CI/CD GitHub Actions, Prometheus/Grafana.
- Intégrations externes prévues : paiement (PayTech/Stripe/Orange Money), WhatsApp Business API, SMS, email (SendGrid/SES), stockage S3, IA.

## 3. Décision d'architecture : version réduite (MVP)

J'ai décidé de **ne pas créer 8 microservices**. Découpage retenu :

| Service | Regroupe | Statut |
|---|---|---|
| **Gateway** (créé) | API Gateway + **Auth (JWT)** | En cours |
| **Core Service** | User + Subscription + Access (QR) | À générer (MVP) |
| **Scheduling Service** | Cours, réservations, plannings | V2 |
| **Support Service** | Notification + Audit + Media | Après le MVP |

**MVP = Gateway + Core Service.**

**Volontairement repoussé :** Kafka (REST suffit au début, à introduire avec Support), Elasticsearch, Data Warehouse, réplica PostgreSQL, AWS/déploiement, AI Service (V3). Développement et tests en local avec Docker Compose.

**Organisation Git envisagée :** un monorepo (un dossier par service) pour apprendre ; séparable plus tard.

## 4. Stack backend (générée avec JHipster)

- **JHipster** : application de type **Gateway**, Java + Maven, **réactive** (WebFlux, accès base via **r2dbc**, Liquibase en JDBC).
- Package Java : `com.movexa.gateway` ; projet : `movexa-gateway`.
- Base : **PostgreSQL**, base nommée `movexa-gateway`, créée par Docker Compose.
- Registre : **JHipster Registry v7.5.0** (Eureka Server + Spring Cloud Config Server), UI sur `http://localhost:8761` (`admin`/`admin` par défaut).
- Authentification : **JWT intégré** (HS512). `authenticationType` dans `.yo-rc.json` : **À CONFIRMER** (le comportement observé est celui de `jwt`).
- Version exacte de JHipster / Spring Boot / Java : **À CONFIRMER** (`<java.version>` dans `pom.xml`).
- Port du gateway : **8080** (`server.port` dans `application-dev.yml`).
- Le projet contient un `.yo-rc.json`, `.lintstagedrc.cjs`, `sonar-project.properties`, `checkstyle.xml`.

### Notions déjà expliquées (acquis)
Maven Wrapper (`mvnw`), Nexus vs Maven Central, dépôt local `.m2`, Docker Compose support de Spring Boot (lance les conteneurs au démarrage), hôte/IP/port, registre et Eureka, rôle du gateway, JWT vs OAuth2, Liquibase, CORS et proxy Angular.

## 5. Rôle du gateway

Porte d'entrée **unique** du backend. Le front ne parle **qu'au gateway**, jamais directement aux microservices ni au registre.

1. Routage (`/services/<nom-service>/api/...`) via découverte Eureka.
2. **Authentification** : login `POST /api/authenticate`, émission du JWT, stockage des utilisateurs (`jhi_user`, `jhi_authority`, `jhi_user_authority`).
3. Autorisation de première ligne (`SecurityConfiguration`).
4. Répartition de charge, rate limiting, CORS.
5. Pas de logique métier, pas de données métier.

## 6. Authentification : fonctionnement

- Login : `POST /api/authenticate` avec `{"username","password","rememberMe"}` → `{"id_token":"<JWT>"}`.
- Mot de passe vérifié via BCrypt (`password_hash`).
- Payload du JWT observé : `sub` (login), `auth` (rôles séparés par des virgules, ex. `ROLE_ADMIN,ROLE_USER`), `exp` (≈ 24 h). **Pas encore de `tenantId`.**
- Requêtes suivantes : en-tête `Authorization: Bearer <token>`, validation par signature uniquement (pas d'accès base).
- Conséquences connues : un token volé reste valable jusqu'à expiration ; un changement de rôle n'agit qu'au prochain login ; le logout côté front n'invalide rien côté serveur.
- Comptes par défaut en dev : `admin/admin`, `user/user` (à supprimer ou changer avant tout déploiement). La clé `jhipster.security.authentication.jwt.base64-secret` doit être remplacée en production et jamais commitée.

Test PowerShell validé :

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/authenticate -ContentType "application/json" -Body '{"username":"admin","password":"admin"}'
```

(Avec `curl.exe`, l'échappement des guillemets pose problème sous PowerShell : préférer `Invoke-RestMethod`.)

## 7. Rôles Movexa

| Rôle | Qui | Portée |
|---|---|---|
| `ROLE_SUPER_ADMIN` | Moi (plateforme) | Toutes les salles |
| `ROLE_ADMIN` | Gérant de salle | Sa salle |
| `ROLE_COACH` | Coach | Sa salle, accès limité |
| `ROLE_MEMBER` | Adhérent | Ses propres données |
| `ROLE_USER` | Rôle de base JHipster | À conserver |

**Fait :** migration Liquibase `20261012000001_added_movexa_authorities.xml` ajoutée et référencée dans `master.xml` ; les 3 nouveaux rôles sont **présents en base** (`jhi_authority`).

**À faire côté code :** constantes dans `AuthoritiesConstants.java` (`SUPER_ADMIN`, `COACH`, `MEMBER`) : **À CONFIRMER** si déjà ajoutées.

Règle Liquibase : **ne jamais modifier une migration déjà exécutée** (erreur de checksum) ; toujours ajouter un nouveau fichier.

## 8. Multi-tenant (décision, pas encore implémenté)

- Approche retenue : **colonne `tenant_id`** dans chaque table (une base, un schéma).
- Le `tenantId` sera un **claim du JWT** (champ ajouté à l'entité `User` + migration Liquibase + ajout dans la génération du token). Chaque service filtre sur ce claim.
- À faire **après** la génération du Core Service, pour tester de bout en bout.
- Tant que ce n'est pas fait : réserver `/api/admin/**` au `ROLE_SUPER_ADMIN` (un gérant verrait sinon tous les utilisateurs).

## 9. Configuration locale (points d'attention déjà rencontrés)

### Séparer Maven perso / entreprise
- Créer `C:\Users\elisee.houinlin\.m2\settings-perso.xml` (settings vide) et le référencer via `.mvn/maven.config` (`-s C:/Users/elisee.houinlin/.m2/settings-perso.xml`), ou l'option `-s`, ou le champ « User settings file » d'IntelliJ, ou `java.configuration.maven.userSettings` dans VS Code. Chercher aussi `hyperion` dans le `pom.xml`. **À CONFIRMER** : appliqué ou non.
- Un WARNING `Failed to write tracking file ... .lastUpdated (Accès refusé)` est apparu : non bloquant (verrou antivirus ou permissions sur `.m2`).

### Docker et ports
- Erreur rencontrée : `ports are not available: exposing port TCP 127.0.0.1:5432` (erreur Windows 10013, plage de ports réservée ou PostgreSQL local). Correction recommandée : mapper `127.0.0.1:5433:5432` dans le fichier compose. **À CONFIRMER** : port réellement utilisé (voir `docker ps`).
- Warning du registre `UnknownHostException: <id conteneur>` : non bloquant (Eureka seul, pas de réplication). Option : `hostname: jhipster-registry` dans le compose.

### Identifiants base (erreurs vécues)
- `Password must not be null` (r2dbc) et `SCRAM ... password is an empty string` (Liquibase) : `application-dev.yml` n'avait que les `url`.
- Correction : renseigner `user`/`password` (Liquibase) et `username`/`password` (r2dbc) avec les valeurs `POSTGRES_USER` / `POSTGRES_PASSWORD` du compose, et le bon port.
- Résultat : **Liquibase a créé les tables, la base est visible dans pgAdmin.** Valeurs réelles (utilisateur, mot de passe, port) : **À CONFIRMER, ne pas les coller ici**, mais ne pas commiter le mot de passe en clair si le dépôt est publié.
- Tables vues : `jhi_user`, `jhi_authority`, `jhi_user_authority`, `databasechangelog`, `databasechangeloglock`. Contexte Liquibase : `dev, faker` (données d'exemple).

### Lancer le backend
```powershell
.\mvnw          # profil dev par défaut ; Docker Compose démarre PostgreSQL et le registre
```
Docker Desktop doit être lancé. Sans Docker : installer PostgreSQL à la main et `spring.docker.compose.enabled=false`, ou lancer le registre en `.jar`.

## 10. État actuel et prochaines étapes

### Fait
- Gateway généré, démarre, base initialisée par Liquibase, registre fonctionnel.
- Login JWT testé en PowerShell (`admin/admin`), token décodé.
- 3 rôles Movexa ajoutés en base.
- pgAdmin connecté.
- Front Angular démarré (voir `MOVEXA_FRONT.md`).

### À faire côté backend (dans l'ordre conseillé)
1. **Sécuriser les routes** dans `SecurityConfiguration` : retirer `permitAll` sur `/api/register`, réserver `/api/admin/**` à `ROLE_SUPER_ADMIN`.
2. Donner `ROLE_SUPER_ADMIN` au compte `admin` (idéalement via migration Liquibase, pas seulement en SQL manuel) pour ne pas se verrouiller dehors.
3. Créer un utilisateur `coach1` (`ROLE_USER` + `ROLE_COACH`) et vérifier : `admin` → 200, `coach1` sur `/api/admin/users` → **403**, sans token → **401**. (Les utilisateurs créés via `/api/admin/users` reçoivent un mot de passe aléatoire : pour un test, copier le `password_hash` du compte `user`.)
4. Autoriser l'origine du front si on n'utilise pas le proxy : `jhipster.cors.allowed-origins: 'http://localhost:4200'`.
5. **Générer le Core Service** (JHipster, type « Microservice application », même registre Eureka) : entités Adhérent, Coach, Plan, Abonnement, avec `tenant_id`.
6. Valider la chaîne : Angular → gateway → Core, puis ajouter le `tenantId` au JWT.
7. Plus tard : Support Service (notifications email), Scheduling (V2), Keycloak si besoin de SSO/MFA, déploiement.

### Sécurité à ne pas oublier
Changer/supprimer `admin/admin` et `user/user`, remplacer la clé JWT, durée de token courte, HTTPS en production, contrôle d'accès **côté backend** (les guards du front ne sont pas de la sécurité).

---

## 11. MVP « salle de sport Bénin » (12/11/2026)

Implémenté selon le document « MVP – SaaS de gestion de salle de sport » et la maquette MOVEXA (canvas claude.ai).

### Backend (`movexa-back1`, migration `20261112000001_mvp_modules.xml`)
| Module | Tables | API (`/services/movexa-back1/api/...`) |
|---|---|---|
| Membres | `member` (+ `qr_token`, `archived`), `app_user` (+ `phone_digits`) | `members`, `members/search`, `members/lite`, `members/by-qr/{t}`, `members/{id}/overview`, `members/import` |
| Formules / abonnements | `plan`, `subscription` | `plans` (écriture : gérant) |
| Encaissements | `payment`, séquence `receipt_seq`, `cash_closure` | `payments`, `payments/links`, `payments/{id}/cancel` (gérant), `payments/{id}/confirm` (gérant), `payments/{id}/receipt`, `cash`, `cash/closures`, `public/payments/webhook` (HMAC) |
| Pointage | `check_in` (`client_id` unique = hors ligne idempotent) | `check-ins`, `check-ins/today` |
| Relances | `reminder` | `reminders/queue`, `reminders`, `reminders/history`, `reminders/stats` |
| Prospects | `prospect`, `prospect_event`, `prospect_outcome` (anonyme), `job_run` | `prospects`, `.../interactions`, `.../follow-ups`, `.../lost`, `prospects/decay` (gérant), `prospects/stats` ; tâche `ProspectDecayJob` à 2 h |
| Tableau de bord, paramètres | `gym_settings` (1 ligne) | `dashboard` (gérant), `reception/today`, `settings` (écriture : gérant) |

Règles clés : statut calculé depuis la date de fin (actif / expire bientôt ≤ N jours / expiré / sans abonnement) ; renouvellement à partir de la fin si encore actif, sinon d'aujourd'hui ; aucune suppression d'argent (annulation avec motif) ; « supprimer » un membre = l'archiver ; doublon = mêmes 8 derniers chiffres du téléphone.

### Rôles
- Gérant = `ROLE_ADMIN` ; réceptionniste = `ROLE_RECEPTION` (migration gateway `20261112_reception_role.xml`, en dev le compte `user/user`).

### Front
Écrans : tableau de bord, accueil, pointage (caméra via `jsqr`, hors ligne via `OfflineService`), encaissements + caisse, reçu, membres, fiche membre (QR via `qrcode`), import CSV, prospects, abonnements + formules, relances, paramètres. API dans `core/api`, composants partagés `shared/pay-dialog`, `shared/member-form`, `shared/cancel-payment`, `shared/qr-code`. `angular.json` lit maintenant `src/styles.scss` (les `.css` générés à côté ne servent plus).

### Pas encore fait (à suivre)
1. **Multi-salles** (colonne `tenant_id` + claim JWT) : tout est mono-salle (`gym_settings` id = 1).
2. **Agrégateur KKiaPay / FedaPay** : webhook générique signé + confirmation manuelle ; à adapter au format réel une fois le compte marchand ouvert (`application.payment.webhook-secret`, `payment_link_base_url`).
3. **Envoi SMS automatique** : pas de fournisseur ; les relances partent par lien wa.me / sms: depuis le téléphone de la salle.
4. **Création des comptes réceptionnistes** depuis Paramètres (côté gateway).
5. Paiements hors ligne (seuls les pointages le sont), import `.xlsx` direct, tests automatisés des nouveaux services, admin plateforme.
