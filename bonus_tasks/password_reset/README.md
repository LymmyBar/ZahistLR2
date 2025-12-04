# Додаткове завдання: зміна пароля через Auth0 Management API

Це швидка інструкція для демонстрації, як змінити пароль користувача за допомогою Management API та client_credentials grant. Вона базується на вимогах із скріншотів («LR3 Management Client») і використовує вже наявний у репозиторії скрипт `scripts/change_password.sh`.

## 1. Готуємо M2M застосунок

1. **Applications → Create Application → Machine to Machine.** Назви його `LR3 Management Client`.
2. **APIs → Auth0 Management API → Machine to Machine Applications.** Знаходимо новий клієнт і видаємо йому scopes:
   - `read:users`
   - `update:users`
3. Натискаємо **Authorize**.

> Якщо M2M клієнт уже існує (наприклад, той, що використовувався в ЛР2–ЛР4), достатньо переконатися, що ці scope присутні.

## 2. Отримуємо токен

```bash
cd /workspaces/ZahistLR2
export AUTH0_DOMAIN="dev-qpb2xt3kxhpqx4fk.us.auth0.com"
export AUTH0_CLIENT_ID="I2sHGI0LvIApEjOMT0LZhFb7R7T1v19vH"   # або ID нового клієнта
export AUTH0_CLIENT_SECRET="Y6IRq8WpmGx7bLr-GGfzx1njQjxBZjphgfyQEFtyruyprB9mHzwsjFMh9qidN_dh"
export AUTH0_AUDIENCE="https://dev-qpb2xt3kxhpqx4fk.us.auth0.com/api/v2/"

bash scripts/request_token.sh
export AUTH0_MGMT_TOKEN="$(jq -r '.access_token' artifacts/token.json)"
```

## 3. Визначаємо користувача та connection

- **User ID**: шукаємо у `artifacts/user_creation.json` або в Auth0 Dashboard → User Management → Users. Наприклад `auth0|692d9002f1ea45fabe0b3231` (для `lab.student+ropg3@domain.com`).
- **Connection**: `Username-Password-Authentication`.

## 4. Виконуємо PATCH на /api/v2/users/{id}

Швидший спосіб — скористатися готовим скриптом:

```bash
bash scripts/change_password.sh lab.student+ropg3@domain.com 'NewPassw0rd!2025'
```

Скрипт сам знаходить user_id через `GET /api/v2/users-by-email`, після чого виконує `PATCH /api/v2/users/{user_id}` з тілом:

```json
{
  "password": "NewPassw0rd!2025",
  "connection": "Username-Password-Authentication"
}
```

Результат зберігається в `artifacts/password_change.json`. За потреби можна повторити із будь-яким іншим паролем.

## 5. Перевіряємо результат

- У відповіді Management API (`password_change.json`) поле `last_password_reset` покаже час оновлення.
- Або відкриваємо Auth0 Dashboard → **User Management → Users → {email} → Identities**: поле **Last Password Reset** має відповідати часу запиту.

## Примітка про середовище

Dev-контейнер не має доступу до Інтернету, тому реальні виклики треба виконувати локально (або на машині з доступом до Auth0). Цей документ — пам'ятка, як відтворити додаткове завдання під час «живого» захисту.
