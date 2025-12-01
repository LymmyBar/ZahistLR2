# Лабораторна робота №2. OAuth2 Client Credentials в Auth0

Я виконав лабораторну роботу з теми OAuth2, реалізував client_credentials flow на своєму Auth0 tenant і створив користувача через Management API. У цьому репозиторії лежить увесь код та інструкції, якими користувався під час виконання.

## Початкові налаштування

| Параметр            | Значення                                                                |
|---------------------|-------------------------------------------------------------------------|
| Auth0 Domain        | `dev-qpb2xt3kxhpqx4fk.us.auth0.com`                                    |
| Client ID           | `I2sHGI0LvIApEjOMT0LZhFb7R7T1v19vH`                                    |
| Client Secret       | `Y6Irq8WpmGx7bLr-GGfzx1nJQjxBZjphgfyQEFtyruyprB9mHzwsjFMh9qidN_dh`    |
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