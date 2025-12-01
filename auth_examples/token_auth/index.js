const uuid = require('uuid');
const express = require('express');
const onFinished = require('on-finished');
const bodyParser = require('body-parser');
const path = require('path');
const port = 3000;
const fs = require('fs');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const SESSION_KEY = 'Authorization';

class Session {
    #sessions = {}

    constructor() {
        try {
            this.#sessions = fs.readFileSync('./sessions.json', 'utf8');
            this.#sessions = JSON.parse(this.#sessions.trim());

            console.log(this.#sessions);
        } catch(e) {
            this.#sessions = {};
        }
    }

    #storeSessions() {
        fs.writeFileSync('./sessions.json', JSON.stringify(this.#sessions), 'utf-8');
    }

    set(key, value) {
        if (!value) {
            value = {};
        }
        this.#sessions[key] = value;
        this.#storeSessions();
    }

    get(key) {
        return this.#sessions[key];
    }

    init(res) {
        const sessionId = uuid.v4();
        this.set(sessionId);

        return sessionId;
    }

    destroy(req, res) {
        const sessionId = req.sessionId;
        delete this.#sessions[sessionId];
        this.#storeSessions();
    }
}

const sessions = new Session();

app.use((req, res, next) => {
    let currentSession = {};
    let sessionId = req.get(SESSION_KEY);

    if (sessionId) {
        currentSession = sessions.get(sessionId);
        if (!currentSession) {
            currentSession = {};
            sessionId = sessions.init(res);
        }
    } else {
        sessionId = sessions.init(res);
    }

    req.session = currentSession;
    req.sessionId = sessionId;

    onFinished(req, () => {
        const currentSession = req.session;
        const sessionId = req.sessionId;
        sessions.set(sessionId, currentSession);
    });

    next();
});

app.get('/', (req, res) => {
    if (req.session.username) {
        return res.json({
            username: req.session.username,
            logout: 'http://localhost:3000/logout',
            auth0Tokens: req.session.auth0Tokens || null,
        })
    }
    res.sendFile(path.join(__dirname+'/index.html'));
})

app.get('/logout', (req, res) => {
    sessions.destroy(req, res);
    res.redirect('/');
});

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || 'dev-qpb2xt3kxhpqx4fk.us.auth0.com';
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID || 'I2sHGI0LvIApEjOMT0LZhFb7R7T1v19vH';
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET || 'Y6IRq8WpmGx7bLr-GGfzx1njQjxBZjphgfyQEFtyruyprB9mHzwsjFMh9qidN_dh';
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || 'https://dev-qpb2xt3kxhpqx4fk.us.auth0.com/api/v2/';
const AUTH0_SCOPE = process.env.AUTH0_SCOPE || 'openid profile email offline_access';

const tokenUrl = `https://${AUTH0_DOMAIN}/oauth/token`;
const userInfoUrl = `https://${AUTH0_DOMAIN}/userinfo`;

async function exchangePasswordForToken(username, password) {
    const payload = new URLSearchParams({
        grant_type: 'password',
        username,
        password,
        audience: AUTH0_AUDIENCE,
        scope: AUTH0_SCOPE,
        client_id: AUTH0_CLIENT_ID,
        client_secret: AUTH0_CLIENT_SECRET,
    });

    const response = await axios.post(tokenUrl, payload.toString(), {
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
    });

    return response.data;
}

async function fetchUserProfile(accessToken) {
    const response = await axios.get(userInfoUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    return response.data;
}

app.post('/api/login', async (req, res) => {
    const { login, password } = req.body;

    if (!login || !password) {
        return res.status(400).json({ error: 'Login and password are required' });
    }

    try {
        const tokenResponse = await exchangePasswordForToken(login, password);
        const profile = await fetchUserProfile(tokenResponse.access_token);

        req.session.username = profile.name || profile.nickname || profile.email || login;
        req.session.login = profile.email || login;
        req.session.auth0Tokens = {
            access_token: tokenResponse.access_token,
            refresh_token: tokenResponse.refresh_token,
            expires_in: tokenResponse.expires_in,
            token_type: tokenResponse.token_type,
            scope: tokenResponse.scope,
        };

        return res.json({
            token: req.sessionId,
            username: req.session.username,
            auth0Tokens: req.session.auth0Tokens,
        });
    } catch (error) {
        console.error('Auth0 login error', error.response?.data || error.message);
        return res.status(401).json({ error: 'Invalid credentials or Auth0 error' });
    }
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
