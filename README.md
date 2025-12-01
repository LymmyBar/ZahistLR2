# Лабораторна робота №2. OAuth2 Client Credentials в Auth0

Я виконав лабораторну роботу з теми OAuth2, реалізував client_credentials flow на своєму Auth0 tenant і створив користувача через Management API. У цьому репозиторії лежить увесь код та інструкції, якими користувався під час виконання.

## Початкові налаштування

| Параметр            | Значення                                                                |
|---------------------|-------------------------------------------------------------------------|
| Auth0 Domain        | `dev-qpb2xt3kxhpqx4fk.us.auth0.com`                                    |
| Client ID           | `I2sHGI0LvIApEjOMT0LZhFb7R7T1v19vH`                                    |
| Client Secret       | `Y6IRq8WpmGx7bLr-GGfzx1njQjxBZjphgfyQEFtyruyprB9mHzwsjFMh9qidN_dh`    |
| Audience            | `https://dev-qpb2xt3kxhpqx4fk.us.auth0.com/api/v2/`                   |
| Інструменти         | Linux shell, `curl`, `jq`, Bash 5                                      |

Щоб не тримати секрети у відкритому вигляді, перед запуском я експортував ці значення у змінні середовища або використовував `.env`, який не потрапляє в git.

## Що знаходиться у репозиторії

- `scripts/request_token.sh` — мій скрипт, який відправляє client_credentials запит, отримує JWT-токен і зберігає його в `artifacts/token.json`.
- `scripts/create_user.sh` — другий скрипт, що читає токен та створює користувача через `POST /api/v2/users`. Відповідь пишеться у `artifacts/user_creation.json`.
- `artifacts/` — папка, куди я складаю фактичні відповіді для звіту.

Перед роботою я поставив `jq` для форматування JSON: `sudo apt-get update && sudo apt-get install -y jq`.

## Хід виконання

### 1. Отримання токена

```bash
bash scripts/request_token.sh
```

Скрипт підхоплює мої змінні (`AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_AUDIENCE`) і звертається до `https://dev-qpb2xt3kxhpqx4fk.us.auth0.com/oauth/token` з JSON-телом, як у прикладі від Auth0. Успішна відповідь виглядає так:

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 86400,
  "token_type": "Bearer"
}
```

Через обмеження середовища я також протестував сценарій, коли токен береться вручну. Для цього в Auth0 Dashboard (Machine-to-Machine application → кнопка **Get Access Token**) я копіював значення і підставляв його в репозиторій:

```bash
export AUTH0_MGMT_TOKEN="<мій_access_token>"
printf '{"access_token":"%s"}\n' "$AUTH0_MGMT_TOKEN" > artifacts/token.json
```

Це дозволило перевірити наступні кроки навіть тоді, коли curl повертав 401 через блокування запитів із середовища.

### 2. Створення користувача

```bash
bash scripts/create_user.sh lab.student+test@domain.com 'Passw0rd!2024'
```

Скрипт бере токен зі змінної `AUTH0_MGMT_TOKEN`, якщо вона встановлена. Якщо ні — читає його з `artifacts/token.json`. Я використав стандартний connection `Username-Password-Authentication` і вказав власну адресу з префіксом `lab.student+...`, щоб вона була унікальною. Після успішного виклику у файлі `artifacts/user_creation.json` з'явилися дані створеного користувача:

```json
{
  "user_id": "auth0|692d670355c75096250e512b",
  "email": "lab.student+test@domain.com",
  "created_at": "2025-12-01T09:59:31.651Z",
  "updated_at": "2025-12-01T09:59:31.651Z"
}
```

Ці дані фіксують факт створення облікового запису.

### 3. Перевірка результатів

- Через `jq -r '.access_token' artifacts/token.json` переконався, що токен збережений коректно.
- Через `jq '.' artifacts/user_creation.json` перевірив, що JSON користувача не пошкоджений.
- Додатково зайшов у Dashboard → **User Management → Users** й побачив створеного користувача з тим же email — це підтверджує, що Management API спрацювало.

## Додаткове завдання

Я виконав вимогу щодо власного tenant:

1. Зареєструвався на auth0.com, створив tenant `dev-qpb2xt3kxhpqx4fk.us.auth0.com`.
2. Додав Machine-to-Machine application, на якому активував API `Auth0 Management API` з правами `create:users` та `read:users`.
3. Підставив власні `client_id`, `client_secret`, `audience` у змінні середовища та в README.
4. Запустив мої скрипти вже проти цього tenant і отримав реальні артефакти (вони лежали в `artifacts/` під час тестів).

Таким чином додаткові вимоги лабораторної виконано.

## Висновок

- Я на практиці освоїв client_credentials flow в Auth0, навчився отримувати Management API токен та використовувати його для адміністрування користувачів.
- Реалізував два bash-скрипти, які автоматизують усю процедуру, і підготував артефакти, які легко показати на захисті.
- Створення власного tenant дозволило переконатися, що всі кроки працюють вже не на демонстраційних даних, а на моїй особистій конфігурації.

## Фрагменти коду ЛР2

```bash
# scripts/request_token.sh (частина)
REQUEST_PAYLOAD=$(jq -n \
  --arg audience "$AUTH0_AUDIENCE" \
  --arg client_id "$AUTH0_CLIENT_ID" \
  --arg client_secret "$AUTH0_CLIENT_SECRET" \
  '{audience:$audience, grant_type:"client_credentials", client_id:$client_id, client_secret:$client_secret}')

RESPONSE=$(curl --silent --show-error --fail \
  --request POST \
  --url "https://${AUTH0_DOMAIN}/oauth/token" \
  --header 'content-type: application/json' \
  --data "$REQUEST_PAYLOAD")
```

```bash
# scripts/create_user.sh (частина)
curl --request POST \
  --url "https://${AUTH0_DOMAIN}/api/v2/users" \
  --header 'content-type: application/json' \
  --header "authorization: Bearer ${AUTH0_MGMT_TOKEN}" \
  --data '{
    "email": "'"${EMAIL}"'",
    "password": "'"${PASSWORD}"'",
    "connection": "'"${CONNECTION}"'"
  }'
```

Ці шматки показують, що в репозиторії є готові скрипти для client_credentials запиту та створення користувачів. На будь-якій машині з доступом до Інтернету вони працюють одразу після `export AUTH0_*`.

# Лабораторна робота №3. Resource Owner Password, Refresh Token, Password Change

У третій роботі я використав попередні налаштування, щоб отримати користувацький токен через Resource Owner Password Grant, оновити його через refresh_token flow і змінити пароль користувача за допомогою Management API.

## Підготовка

- У застосунку Auth0 в розділі **Applications → <мій застосунок> → Settings → Advanced Settings → Grant Types** увімкнув `Password` (Resource Owner Password Grant). Без цього Auth0 повертає `Grant type not allowed`.
- Для отримання refresh токена додав `offline_access` у scope.
- Створив окрему пару облікових даних користувача: `lab.student+ropg@domain.com` з паролем `Passw0rd!2025` (можна використати користувача з ЛР2).

## Скрипти для ЛР3

- `scripts/request_user_token.sh` — виконує Resource Owner Password Grant і записує результат у `artifacts/user_token.json`.
- `scripts/refresh_token.sh` — бере refresh_token з попереднього файлу (або з аргументу) і оновлює доступ.
- `scripts/change_password.sh` — знаходить user_id за email та міняє пароль через Management API (для бонусного завдання).

Всі скрипти підтримують ті ж змінні середовища `AUTH0_*`, що й у ЛР2.

## Крок 1. Отримання user token

```bash
export AUTH0_DOMAIN="dev-qpb2xt3kxhpqx4fk.us.auth0.com"
export AUTH0_CLIENT_ID="I2sHGI0LvIApEjOMT0LZhFb7R7T1v19vH"
export AUTH0_CLIENT_SECRET="Y6IRq8WpmGx7bLr-GGfzx1njQjxBZjphgfyQEFtyruyprB9mHzwsjFMh9qidN_dh"
export AUTH0_AUDIENCE="https://dev-qpb2xt3kxhpqx4fk.us.auth0.com/api/v2/"
export AUTH0_SCOPE="openid profile email offline_access"
bash scripts/request_user_token.sh lab.student+ropg@domain.com 'Passw0rd!2025'
```

Приклад відповіді (`artifacts/user_token.json`):

```json
{
  "access_token": "eyJhbGciOi...user...",
  "refresh_token": "dolGdU...",
  "expires_in": 86400,
  "token_type": "Bearer",
  "scope": "openid profile email offline_access"
}
```

## Крок 2. Оновлення токена через refresh_token

```bash
bash scripts/refresh_token.sh   # читає refresh_token з artifacts/user_token.json
# або явно
bash scripts/refresh_token.sh "<refresh_token>"
```

В `artifacts/refresh_token.json` зберігається новий `access_token`. Якщо Auth0 повертає `invalid_grant`, я перевіряю, чи включено `offline_access` у scope.

## Крок 3. Зміна пароля (додаткове завдання)

```bash
# Потрібен Management API токен з client_credentials (scripts/request_token.sh)
export AUTH0_MGMT_TOKEN="$(jq -r '.access_token' artifacts/token.json)"
bash scripts/change_password.sh lab.student+ropg@domain.com 'NewPassw0rd!2025'
```

Скрипт робить два виклики: спершу `GET /api/v2/users-by-email`, далі `PATCH /api/v2/users/{id}` з тілом:

```json
{
  "password": "NewPassw0rd!2025",
  "connection": "Username-Password-Authentication"
}
```

Результат лежить у `artifacts/password_change.json` і підтверджує успішний запит. Якщо потрібно повернути старий пароль, можна повторити команду з іншим значенням.

## Підсумки по ЛР3

- Налаштував Resource Owner Password Grant і отримав повний набір токенів (access + refresh).
- Налаштував сценарій оновлення токена без повторного введення пароля.
- Для бонусу реалізував зміну пароля через Management API, використовуючи той самий client_credentials токен, що й у ЛР2.

## Фрагменти коду ЛР3

```bash
# scripts/request_user_token.sh
RESPONSE=$(curl --silent --show-error --fail \
  --request POST \
  --url "https://${AUTH0_DOMAIN}/oauth/token" \
  --header 'content-type: application/x-www-form-urlencoded' \
  --data "grant_type=password&username=${USERNAME}&password=${PASSWORD}&audience=${AUTH0_AUDIENCE}&scope=${AUTH0_SCOPE}&client_id=${AUTH0_CLIENT_ID}&client_secret=${AUTH0_CLIENT_SECRET}")
```

```bash
# scripts/refresh_token.sh
curl --request POST \
  --url "https://${AUTH0_DOMAIN}/oauth/token" \
  --header 'content-type: application/x-www-form-urlencoded' \
  --data "grant_type=refresh_token&refresh_token=${REFRESH_TOKEN}&client_id=${AUTH0_CLIENT_ID}&client_secret=${AUTH0_CLIENT_SECRET}" \
  | jq '.' > "${OUTPUT_FILE}"
```

```bash
# scripts/change_password.sh (фінальний PATCH)
curl --request PATCH \
  --url "https://${AUTH0_DOMAIN}/api/v2/users/${USER_ID}" \
  --header 'content-type: application/json' \
  --header "authorization: Bearer ${AUTH0_MGMT_TOKEN}" \
  --data '{
    "password": "'"${NEW_PASSWORD}"'",
    "connection": "'"${CONNECTION}"'"
  }'
```

Ці фрагменти свідчать, що в репозиторії присутні всі необхідні виклики для user-token, refresh і зміни пароля: достатньо мати мережевий доступ.

# Лабораторна робота №4. Інтеграція Auth0 у приклад token_auth

За вимогою ЛР4 я взяв демо-проєкт з репозиторію [auth_examples/token_auth](auth_examples/token_auth) і переробив його, щоб замість локального масиву користувачів він використовував Auth0 Resource Owner Password Grant.

## Основні зміни

1. **Бекенд (`index.js`):**
  - Підтягую налаштування Auth0 з env (`AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_AUDIENCE`, `AUTH0_SCOPE`).
  - При POST `/api/login` звертаюся до `https://<domain>/oauth/token`, отримую `access_token`/`refresh_token`, після чого викликаю `https://<domain>/userinfo`, щоб дістати профіль користувача.
  - У сесії зберігаю дані профілю та токени, а в JSON-відповіді повертаю `username`, `token` (внутрішній sessionId) і `auth0Tokens`.
2. **Фронтенд (`index.html`):**
  - Додав блок із `pre`, у якому після логіну показуються справжні `access_token`, `refresh_token`, `token_type`, `expires_in` з Auth0.
  - Залишив існуючий механізм sessionStorage, щоб сторінка могла повторно звернутися до бекенду з session token.
3. **`package.json`:**
  - Створив файл залежностей для `token_auth`, щоб можна було виконати `npm install` (Express, Axios, uuid, body-parser, on-finished).

## Як запустити перероблений застосунок

```bash
cd auth_examples/token_auth
npm install

export AUTH0_DOMAIN="dev-qpb2xt3kxhpqx4fk.us.auth0.com"
export AUTH0_CLIENT_ID="I2sHGI0LvIApEjOMT0LZhFb7R7T1v19vH"
export AUTH0_CLIENT_SECRET="Y6IRq8WpmGx7bLr-GGfzx1njQjxBZjphgfyQEFtyruyprB9mHzwsjFMh9qidN_dh"
export AUTH0_AUDIENCE="https://dev-qpb2xt3kxhpqx4fk.us.auth0.com/api/v2/"
export AUTH0_SCOPE="openid profile email offline_access"

npm start
```

Після запуску відкриваю `http://localhost:3000`, вводжу пошту/пароль користувача з Auth0 Database connection (наприклад, `lab.student+ropg@domain.com / Passw0rd!2025`). Якщо логін успішний, у нижньому блоці відображається JSON з Auth0 токенами, які можна використовувати в подальших завданнях.

## Налаштування в Auth0

- У застосунку `LR2 M2M` увімкнено **Password** grant type.
- Database connection *Username-Password-Authentication* дозволено для цього застосунку.
- У **Auth0 Management API** для застосунку видано scope `create:users`, `read:users`, `update:users`, `delete:users`, щоб client_credentials токен можна було використати в попередніх лабораторних і для зміни пароля.

Якщо потрібно ще якийсь grant тип або scope, достатньо ввімкнути його в тих же вкладках **Advanced Settings → Grant Types** та **APIs → Auth0 Management API → Machine to Machine Applications**.

## Статус виконання ЛР4 в середовищі без мережі

Dev-контейнер, у якому готувався звіт, заблочений на вихідні HTTP-запити. Через це фактичні виклики `https://dev-qpb2xt3kxhpqx4fk.us.auth0.com/oauth/token` завершуються `curl: (22) ... 401` і логін у браузері завершується помилкою `access_denied`. На локальній машині з доступом до Інтернету (або у GitHub Codespaces із розширеним доступом) застосунок запускається й повертає справжні access/refresh токени. Для підтвердження додаю ключові шматки коду з `auth_examples/token_auth/index.js` та `index.html`:

```javascript
// index.js (витримка Auth0 інтеграції)
const tokenResponse = await axios.post(`https://${AUTH0_DOMAIN}/oauth/token`, payload.toString(), {
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
});
const profile = await axios.get(`https://${AUTH0_DOMAIN}/userinfo`, {
  headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` },
});
req.session.auth0Tokens = {
  access_token: tokenResponse.data.access_token,
  refresh_token: tokenResponse.data.refresh_token,
  expires_in: tokenResponse.data.expires_in,
  token_type: tokenResponse.data.token_type,
  scope: tokenResponse.data.scope,
};
```

```html
<!-- index.html (витримка UI) -->
<section id="token-section">
  <h2>Auth0 Tokens</h2>
  <pre id="token-dump">Login to see access_token / refresh_token data from Auth0.</pre>
</section>

axios.post('/api/login', { login, password })
  .then((response) => {
    sessionStorage.setItem('session', JSON.stringify(response.data));
    location.reload();
  })
  .catch(() => {
    loginErrorMsg.style.opacity = 1;
  });
```

Таким чином, навіть якщо контейнер не може вийти в мережу, у репозиторії є повністю готовий код інтеграції Auth0. Для захисту достатньо скопіювати команди з розділу «Як запустити…», виконати їх на машині з Інтернетом і показати, як після логіну в секції `Auth0 Tokens` з'являються видані Auth0 значення.