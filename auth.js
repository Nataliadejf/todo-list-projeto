/**
 * Autenticação: cadastro/login por e-mail + senha (hash bcrypt), sessão via
 * JWT em cookie httpOnly, aprovação/revogação de usuários e registro de acessos.
 *
 * Admin é criado no boot a partir de ADMIN_EMAIL / ADMIN_PASSWORD (nunca no código).
 * Segredo do JWT em JWT_SECRET (se ausente, gera efêmero e avisa).
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const store = require('./repository');

const COOKIE = 'ght_session';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'administradorportfolio@gmail.com').toLowerCase();
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    JWT_SECRET = crypto.randomBytes(32).toString('hex');
    console.warn('JWT_SECRET não definido — usando segredo efêmero (sessões caem a cada reinício).');
}

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function safeUser(u) {
    return { id: u.id, email: u.email, name: u.name, role: u.role, status: u.status };
}
function isAdminUser(u) {
    return Boolean(u) && (u.role === 'admin' || String(u.email || '').toLowerCase() === ADMIN_EMAIL);
}
function setCookie(res, token) {
    res.cookie(COOKIE, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 3600 * 1000,
    });
}

async function seedAdmin() {
    const pwd = process.env.ADMIN_PASSWORD;
    const existing = await store.getUserByEmail(ADMIN_EMAIL);
    if (existing) {
        if (pwd) {
            const h = await bcrypt.hash(pwd, 10);
            await store.updateUserPasswordHash(existing.id, h);
        }
        if (existing.status !== 'approved') await store.setUserStatus(existing.id, 'approved', 'system');
        return;
    }
    if (!pwd) {
        console.warn('ADMIN_PASSWORD não definido — usuário admin não será criado.');
        return;
    }
    const hash = await bcrypt.hash(pwd, 10);
    await store.createUser({
        id: crypto.randomUUID(), email: ADMIN_EMAIL, name: 'Administrador',
        passwordHash: hash, role: 'admin', status: 'approved',
        approvedBy: 'system', approvedAt: new Date().toISOString(),
    });
    console.log('Usuário admin criado:', ADMIN_EMAIL);
}

function middleware(req, res, next) {
    const token = req.cookies ? req.cookies[COOKIE] : null;
    if (token) {
        try { req.auth = jwt.verify(token, JWT_SECRET); } catch { /* inválido */ }
    }
    next();
}
function requireAuth(req, res, next) {
    if (!req.auth) return res.status(401).json({ error: 'Não autenticado' });
    next();
}
function requireAdmin(req, res, next) {
    if (!req.auth) return res.status(401).json({ error: 'Não autenticado' });
    if (!isAdminUser(req.auth)) return res.status(403).json({ error: 'Acesso restrito ao administrador' });
    next();
}

function mountRoutes(app) {
    app.post('/api/auth/register', async (req, res) => {
        try {
            const email = String(req.body?.email || '').trim().toLowerCase();
            const password = String(req.body?.password || '');
            const name = String(req.body?.name || '').trim();
            if (!emailRe.test(email)) return res.status(400).json({ error: 'E-mail inválido.' });
            if (password.length < 6) return res.status(400).json({ error: 'A senha deve ter ao menos 6 caracteres.' });
            if (email === ADMIN_EMAIL) return res.status(400).json({ error: 'Este e-mail é reservado.' });
            if (await store.getUserByEmail(email)) return res.status(409).json({ error: 'E-mail já cadastrado.' });
            const hash = await bcrypt.hash(password, 10);
            await store.createUser({
                id: crypto.randomUUID(), email, name, passwordHash: hash,
                role: 'user', status: 'pending',
            });
            return res.status(201).json({ ok: true, pending: true });
        } catch (err) {
            console.error('register:', err);
            return res.status(500).json({ error: 'Erro ao cadastrar.' });
        }
    });

    app.post('/api/auth/login', async (req, res) => {
        try {
            const email = String(req.body?.email || '').trim().toLowerCase();
            const password = String(req.body?.password || '');
            const user = await store.getUserByEmail(email);
            if (!user || !(await bcrypt.compare(password, user.passwordHash || ''))) {
                return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
            }
            if (user.status === 'pending') return res.status(403).json({ error: 'Cadastro aguardando aprovação do administrador.' });
            if (user.status !== 'approved') return res.status(403).json({ error: 'Acesso revogado. Contate o administrador.' });
            const sid = crypto.randomUUID();
            await store.startSession(sid, user.email);
            const token = jwt.sign(
                { sub: user.id, email: user.email, role: isAdminUser(user) ? 'admin' : 'user', sid },
                JWT_SECRET, { expiresIn: '30d' },
            );
            setCookie(res, token);
            return res.json({ ok: true, user: safeUser({ ...user, role: isAdminUser(user) ? 'admin' : user.role }) });
        } catch (err) {
            console.error('login:', err);
            return res.status(500).json({ error: 'Erro ao entrar.' });
        }
    });

    app.post('/api/auth/logout', async (req, res) => {
        try { if (req.auth?.sid) await store.touchSession(req.auth.sid); } catch { /* ignora */ }
        res.clearCookie(COOKIE);
        res.json({ ok: true });
    });

    app.get('/api/auth/me', async (req, res) => {
        if (!req.auth) return res.status(401).json({ error: 'Não autenticado' });
        const user = await store.getUserById(req.auth.sub);
        if (!user || user.status !== 'approved') return res.status(401).json({ error: 'Sessão inválida' });
        res.json({ user: safeUser({ ...user, role: isAdminUser(user) ? 'admin' : user.role }) });
    });

    app.post('/api/auth/heartbeat', requireAuth, async (req, res) => {
        try { if (req.auth.sid) await store.touchSession(req.auth.sid); } catch { /* ignora */ }
        res.json({ ok: true });
    });

    // ---- Admin ----
    app.get('/api/admin/users', requireAdmin, async (req, res) => {
        try {
            const [users, stats] = await Promise.all([store.listUsers(), store.getAccessStats()]);
            const byEmail = new Map(stats.map((s) => [String(s.email).toLowerCase(), s]));
            const rows = users.map((u) => {
                const s = byEmail.get(String(u.email).toLowerCase()) || {};
                return {
                    ...safeUser(u),
                    createdAt: u.createdAt,
                    sessions: s.sessions || 0,
                    totalSeconds: s.totalSeconds || 0,
                    lastLogin: s.lastLogin || null,
                };
            });
            res.json(rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/admin/users/:id/approve', requireAdmin, async (req, res) => {
        try { res.json(safeUser(await store.setUserStatus(req.params.id, 'approved', req.auth.email))); }
        catch (err) { res.status(500).json({ error: err.message }); }
    });

    app.post('/api/admin/users/:id/revoke', requireAdmin, async (req, res) => {
        try { res.json(safeUser(await store.setUserStatus(req.params.id, 'revoked', req.auth.email))); }
        catch (err) { res.status(500).json({ error: err.message }); }
    });
}

module.exports = { middleware, requireAuth, requireAdmin, mountRoutes, seedAdmin, isAdminUser };
