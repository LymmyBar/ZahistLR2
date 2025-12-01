# Звіт з лабораторної роботи №2 (OAuth2 Client Credentials, Auth0)

**Мета:** засвоїти Client Credentials Grant у Auth0 та продемонструвати створення користувача через Management API. Усі кроки автоматизовано скриптами репозиторію, щоб можна було швидко відтворити демонстрацію для викладача.

## Вхідні дані та інструменти

| Параметр            | Значення                                                                |
|---------------------|-------------------------------------------------------------------------|
| Auth0 Domain        | `dev-qpb2xt3kxhpqx4fk.us.auth0.com`                                    |
| Client ID           | `I2sHGI0LvIApEjOMT0LZhFb7R7T1v19vH`                                    |
| Client Secret       | `Y6Irq8WpmGx7bLr-GGfzx1nJQjxBZjphgfyQEFtyruyprB9mHzwsjFMh9qidN_dh`    |
| Audience            | `https://dev-qpb2xt3kxhpqx4fk.us.auth0.com/api/v2/`                   |
| ПЗ                  | Linux shell, `curl`, `jq`, Bash 5                                      |

> Рекомендація з безпеки: перед захистом лабораторної перенесіть секрети у змінні середовища або `.env`, що не комітиться у репо.

## Структура рішення

- `scripts/request_token.sh` — автоматизація Client Credentials Flow та збереження відповіді в `artifacts/token.json`.
- `scripts/create_user.sh` — створення користувача через Management API, результат пишеться в `artifacts/user_creation.json`.
- `artifacts/` — теку зберігання фактичних відповідей, які можна показати викладачу.

Перед запуском встановіть `jq` (якщо відсутній): `sudo apt-get update && sudo apt-get install -y jq`.

## Хід виконання

### Крок 1. Отримання токена (Client Credentials Flow)

```bash
bash scripts/request_token.sh
```

Скрипт:

1. Підтягує значення `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_AUDIENCE` з оточення (або використовує значення з таблиці вище).
2. Виконує `POST https://dev-qpb2xt3kxhpqx4fk.us.auth0.com/oauth/token` з JSON-телом, аналогічним тому, що пропонує Auth0 Dashboard (`grant_type=client_credentials`).
3. Зберігає відповідь у `artifacts/token.json` для подальших викликів.

Фрагмент файлу, який треба показати викладачу:

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 86400,
  "token_type": "Bearer"
}
```

> **Якщо отримуєте токен через Dashboard:** натисніть кнопку **Get Access Token** у вкладці Machine-to-Machine application, скопіюйте значення `access_token` і передайте його скриптам:
> ```bash
> export AUTH0_MGMT_TOKEN="<скопійований токен>"
> printf '{"access_token":"%s"}' "$AUTH0_MGMT_TOKEN" > artifacts/token.json
> ```
> Після цього можна одразу запускати `bash scripts/create_user.sh ...`.

### Крок 2. Створення користувача через Management API

```bash
bash scripts/create_user.sh student.example@domain.com 'Passw0rd!2024'
```

Параметри:

1. Email і пароль передаються явно, тому оберіть власну адресу (має бути унікальною в tenant).
2. Якщо `AUTH0_MGMT_TOKEN` не встановлено, скрипт підхопить токен з `artifacts/token.json`.
3. За замовчуванням використовується connection `Username-Password-Authentication`.

Після виконання в `artifacts/user_creation.json` зберігається результуючий JSON. Для звіту достатньо показати викладачу уривок з `user_id`, `email`, `created_at`:

```json
{
  "user_id": "auth0|6761a2c1f3d0f2b714f9c999",
  "email": "student.example@domain.com",
  "email_verified": false,
  "created_at": "2025-12-01T10:21:35.123Z",
  "updated_at": "2025-12-01T10:21:35.123Z"
}
```

### Крок 3. Верифікація результатів

- Перевірити, що файли `artifacts/token.json` та `artifacts/user_creation.json` містять свіже значення.
- За потреби виконати `jq -r '.access_token' artifacts/token.json` та підставити токен у Postman для демонстрації.
- У Auth0 Dashboard → **User Management → Users** показати створеного студента (той самий email).

## Додаткове завдання: власний Auth0 tenant (виконано)

- Створено персональний tenant `dev-qpb2xt3kxhpqx4fk.us.auth0.com` (скріни Dashboard додано в артефакти захисту).
- Налаштовано Machine-to-Machine application з дозволами `create:users` та `read:users` для Auth0 Management API.
- Скрипти репозиторію вже містять ці параметри за замовчуванням, тому запуск `bash scripts/request_token.sh` і `bash scripts/create_user.sh` одразу працює з власним tenant.
- Для демонстрації викладачу достатньо показати `artifacts/token.json`, `artifacts/user_creation.json` і користувача в Dashboard → **User Management → Users**.

## Висновки

- Реалізовано повний сценарій Client Credentials Grant + виклик Auth0 Management API через автоматизовані Bash-скрипти.
- Створені артефакти дозволяють швидко підтвердити виконання лабораторної без повторного набору команд вручну.
- Інструкція для додаткового завдання додає кроки, необхідні для отримання максимального балу при роботі зі своїм tenant.