const uuid = require('uuid');
const express = require('express');
const onFinished = require('on-finished');
const bodyParser = require('body-parser');
const path = require('path');
const port = 3000;
const fs = require('fs');
const axios = require('axios');
const jwt = require('jsonwebtoken');

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
            jwtVerification: req.session.jwtVerification || null,
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
const AUTH0_CONNECTION = process.env.AUTH0_CONNECTION || 'Username-Password-Authentication';

const tokenUrl = `https://${AUTH0_DOMAIN}/oauth/token`;
const userInfoUrl = `https://${AUTH0_DOMAIN}/userinfo`;
const usersUrl = `https://${AUTH0_DOMAIN}/api/v2/users`;
const pemUrl = `https://${AUTH0_DOMAIN}/pem`;

let cachedPem;

async function getPem() {
    if (cachedPem) {
        return cachedPem;
    }

    const response = await axios.get(pemUrl);
    cachedPem = response.data;
    return cachedPem;
}

async function verifyAccessToken(token) {
    if (!token) {
        return { valid: false, error: 'Token is missing' };
    }

    try {
        const pem = await getPem();
        const payload = jwt.verify(token, pem, {
            algorithms: ['RS256'],
            audience: AUTH0_AUDIENCE,
            issuer: `https://${AUTH0_DOMAIN}/`,
        });

        const header = jwt.decode(token, { complete: true })?.header;
        return {
            valid: true,
            header,
            payload,
            issued_at: payload.iat,
            expires_at: payload.exp,
        };
    } catch (error) {
        return {
            valid: false,
            error: error.message,
        };
    }
}

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

async function getManagementToken() {
    const payload = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: AUTH0_CLIENT_ID,
        client_secret: AUTH0_CLIENT_SECRET,
        audience: AUTH0_AUDIENCE,
    });

    const response = await axios.post(tokenUrl, payload.toString(), {
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
    });

    return response.data.access_token;
}

async function createAuth0User(email, password) {
    const mgmtToken = await getManagementToken();

    const response = await axios.post(usersUrl, {
        email,
        password,
        connection: AUTH0_CONNECTION,
        email_verified: false,
        verify_email: false,
    }, {
        headers: { Authorization: `Bearer ${mgmtToken}` },
    });

    return response.data;
}

async function refreshAuth0Token(refreshToken) {
    const payload = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: AUTH0_CLIENT_ID,
        client_secret: AUTH0_CLIENT_SECRET,
    });

    const response = await axios.post(tokenUrl, payload.toString(), {
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
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
            expires_at: Date.now() + tokenResponse.expires_in * 1000,
        };
        req.session.jwtVerification = await verifyAccessToken(tokenResponse.access_token);

        return res.json({
            token: req.sessionId,
            username: req.session.username,
            auth0Tokens: req.session.auth0Tokens,
            jwtVerification: req.session.jwtVerification,
        });
    } catch (error) {
        console.error('Auth0 login error', error.response?.data || error.message);
        return res.status(401).json({ error: 'Invalid credentials or Auth0 error' });
    }
});

app.post('/api/register', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const createdUser = await createAuth0User(email, password);
        return res.status(201).json({
            user_id: createdUser.user_id,
            email: createdUser.email,
            connection: createdUser.identities?.[0]?.connection || AUTH0_CONNECTION,
        });
    } catch (error) {
        console.error('Auth0 register error', error.response?.data || error.message);
        const status = error.response?.status || 500;
        return res.status(status).json({ error: 'Failed to create user', details: error.response?.data });
    }
});

app.post('/api/refresh', async (req, res) => {
    const sessionTokens = req.session.auth0Tokens;
    if (!sessionTokens || !sessionTokens.refresh_token) {
        return res.status(400).json({ error: 'No refresh token available in session' });
    }

    const millisLeft = (sessionTokens.expires_at || 0) - Date.now();
    if (millisLeft > 60_000 && !req.body?.force) {
        return res.json({ skipped: true, expires_in_ms: millisLeft });
    }

    try {
        const refreshed = await refreshAuth0Token(sessionTokens.refresh_token);
        req.session.auth0Tokens = {
            ...sessionTokens,
            access_token: refreshed.access_token,
            id_token: refreshed.id_token,
            scope: refreshed.scope || sessionTokens.scope,
            token_type: refreshed.token_type || sessionTokens.token_type,
            expires_in: refreshed.expires_in,
            expires_at: Date.now() + refreshed.expires_in * 1000,
        };
        req.session.jwtVerification = await verifyAccessToken(req.session.auth0Tokens.access_token);

        return res.json({
            refreshed: true,
            auth0Tokens: req.session.auth0Tokens,
            jwtVerification: req.session.jwtVerification,
        });
    } catch (error) {
        console.error('Auth0 refresh error', error.response?.data || error.message);
        return res.status(401).json({ error: 'Failed to refresh token', details: error.response?.data });
    }
});

app.post('/api/verify', async (req, res) => {
    const sessionTokens = req.session.auth0Tokens;
    if (!sessionTokens?.access_token) {
        return res.status(400).json({ error: 'No access token available for verification' });
    }

    const verification = await verifyAccessToken(sessionTokens.access_token);
    req.session.jwtVerification = verification;

    return res.status(verification.valid ? 200 : 400).json({ jwtVerification: verification });
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
