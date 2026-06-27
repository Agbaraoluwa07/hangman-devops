const http = require('http');
const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const dataDir = path.join(rootDir, 'data');
const adsFile = path.join(dataDir, 'ads.json');
const analyticsFile = path.join(dataDir, 'analytics.json');
const feedbackFile = path.join(dataDir, 'feedback.json');
const adminFile = path.join(rootDir, 'admin.html');
const indexFile = path.join(rootDir, 'index.html');

function ensureDataFile() {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    if (!fs.existsSync(adsFile)) {
        const seedAds = [{
            id: 'seed-ad-1',
            title: 'Sponsored',
            text: 'Your next favorite app is waiting.',
            subtext: 'Ad space for partners and promotions.',
            link: 'https://example.com',
            active: true,
            views: 0,
            clicks: 0,
            createdAt: new Date().toISOString()
        }];
        fs.writeFileSync(adsFile, JSON.stringify(seedAds, null, 2));
    }

    if (!fs.existsSync(analyticsFile)) {
        fs.writeFileSync(analyticsFile, JSON.stringify({ sessions: [], copyEvents: [] }, null, 2));
    }

    if (!fs.existsSync(feedbackFile)) {
        fs.writeFileSync(feedbackFile, JSON.stringify([], null, 2));
    }
}

function readAds() {
    ensureDataFile();
    try {
        return JSON.parse(fs.readFileSync(adsFile, 'utf8'));
    } catch {
        return [];
    }
}

function writeAds(ads) {
    ensureDataFile();
    fs.writeFileSync(adsFile, JSON.stringify(ads, null, 2));
}

function readAnalytics() {
    ensureDataFile();
    try {
        return JSON.parse(fs.readFileSync(analyticsFile, 'utf8'));
    } catch {
        return { sessions: [], copyEvents: [] };
    }
}

function writeAnalytics(data) {
    ensureDataFile();
    fs.writeFileSync(analyticsFile, JSON.stringify(data, null, 2));
}

function readFeedback() {
    ensureDataFile();
    try {
        return JSON.parse(fs.readFileSync(feedbackFile, 'utf8'));
    } catch {
        return [];
    }
}

function writeFeedback(items) {
    ensureDataFile();
    fs.writeFileSync(feedbackFile, JSON.stringify(items, null, 2));
}

function sendJson(res, payload, statusCode = 200) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(payload));
}

function getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.html': return 'text/html; charset=utf-8';
        case '.css': return 'text/css; charset=utf-8';
        case '.js': return 'application/javascript; charset=utf-8';
        case '.json': return 'application/json; charset=utf-8';
        case '.svg': return 'image/svg+xml';
        case '.png': return 'image/png';
        case '.jpg':
        case '.jpeg': return 'image/jpeg';
        case '.webp': return 'image/webp';
        default: return 'application/octet-stream';
    }
}

function serveStaticFile(res, filePath) {
    if (!fs.existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
    }

    res.writeHead(200, { 'Content-Type': getContentType(filePath) });
    fs.createReadStream(filePath).pipe(res);
}

function createServer() {
    return http.createServer((req, res) => {
        const requestUrl = new URL(req.url, 'http://127.0.0.1');
        const pathname = decodeURIComponent(requestUrl.pathname);

        if (pathname === '/api/ads' && req.method === 'GET') {
            const ads = readAds();
            const includeAll = requestUrl.searchParams.get('all') === '1';
            const activeAds = ads.filter(ad => ad.active !== false);

            if (!includeAll) {
                const updatedAds = ads.map(ad => {
                    if (ad.active !== false) {
                        return {
                            ...ad,
                            views: (ad.views || 0) + 1,
                            lastViewedAt: new Date().toISOString()
                        };
                    }
                    return ad;
                });
                writeAds(updatedAds);
                const refreshedAds = updatedAds.filter(ad => ad.active !== false).map(ad => ({
                    ...ad,
                    views: ad.views || 0
                }));
                sendJson(res, refreshedAds);
                return;
            }

            sendJson(res, ads);
            return;
        }

        if (pathname === '/api/ads' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                try {
                    const parsed = JSON.parse(body || '{}');
                    const title = (parsed.title || '').toString().trim();
                    const text = (parsed.text || '').toString().trim();
                    const link = (parsed.link || '').toString().trim();
                    const imageUrl = (parsed.imageUrl || parsed.imageData || '').toString().trim();

                    if (!title || !text || !link) {
                        sendJson(res, { error: 'Title, text, and link are required.' }, 400);
                        return;
                    }

                    const ads = readAds();
                    const ad = {
                        id: `ad-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                        title,
                        text,
                        subtext: (parsed.subtext || '').toString().trim() || 'Ad space for partners and promotions.',
                        link,
                        imageUrl,
                        active: parsed.active !== false,
                        views: 0,
                        clicks: 0,
                        createdAt: new Date().toISOString(),
                        lastViewedAt: null,
                        lastClickedAt: null
                    };
                    ads.push(ad);
                    writeAds(ads);
                    sendJson(res, ad, 201);
                } catch {
                    sendJson(res, { error: 'Invalid payload' }, 400);
                }
            });
            return;
        }

        if (pathname.startsWith('/api/ads/') && req.method === 'POST') {
            const parts = pathname.split('/').filter(Boolean);
            const id = parts[2];
            if (parts[3] === 'click') {
                const ads = readAds();
                const target = ads.find(ad => ad.id === id);
                if (!target) {
                    sendJson(res, { error: 'Ad not found' }, 404);
                    return;
                }
                target.clicks = (target.clicks || 0) + 1;
                target.lastClickedAt = new Date().toISOString();
                writeAds(ads);
                sendJson(res, { id, clicks: target.clicks });
                return;
            }
        }

        if (pathname === '/api/analytics' && req.method === 'GET') {
            const ads = readAds();
            const analytics = readAnalytics();
            const feedback = readFeedback();
            const activeAds = ads.filter(ad => ad.active !== false);
            const totalViews = ads.reduce((sum, ad) => sum + (ad.views || 0), 0);
            const totalClicks = ads.reduce((sum, ad) => sum + (ad.clicks || 0), 0);
            const ctr = totalViews > 0 ? Number(((totalClicks / totalViews) * 100).toFixed(2)) : 0;
            const topAd = [...ads].sort((a, b) => (b.clicks || 0) - (a.clicks || 0))[0] || null;
            const recentActivity = [...ads]
                .filter(ad => ad.lastViewedAt || ad.lastClickedAt)
                .map(ad => [
                    ad.lastViewedAt ? { type: 'view', adId: ad.id, adTitle: ad.title, at: ad.lastViewedAt } : null,
                    ad.lastClickedAt ? { type: 'click', adId: ad.id, adTitle: ad.title, at: ad.lastClickedAt } : null
                ])
                .flat()
                .filter(Boolean)
                .sort((a, b) => new Date(b.at) - new Date(a.at))
                .slice(0, 10);

            const userDailySummary = Object.values(analytics.sessions.reduce((acc, entry) => {
                const dayKey = entry.day || new Date(entry.at).toISOString().slice(0, 10);
                if (!acc[dayKey]) {
                    acc[dayKey] = { day: dayKey, users: new Set(), totalDurationSeconds: 0, sessions: 0 };
                }
                acc[dayKey].users.add(entry.username || 'anonymous');
                acc[dayKey].totalDurationSeconds += Number(entry.durationSeconds || 0);
                acc[dayKey].sessions += 1;
                return acc;
            }, {})).map(item => ({
                day: item.day,
                uniqueUsers: item.users.size,
                totalDurationSeconds: item.totalDurationSeconds,
                sessions: item.sessions
            })).sort((a, b) => a.day.localeCompare(b.day));

            const dailySummary = Object.values(analytics.sessions.reduce((acc, entry) => {
                const dayKey = entry.day || new Date(entry.at).toISOString().slice(0, 10);
                if (!acc[dayKey]) {
                    acc[dayKey] = { day: dayKey, activeUsers: new Set(), totalDurationSeconds: 0, sessions: 0 };
                }
                acc[dayKey].activeUsers.add(entry.username || 'anonymous');
                acc[dayKey].totalDurationSeconds += Number(entry.durationSeconds || 0);
                acc[dayKey].sessions += 1;
                return acc;
            }, {})).map(item => ({
                day: item.day,
                activeUsers: item.activeUsers.size,
                totalDurationSeconds: item.totalDurationSeconds,
                sessions: item.sessions
            })).sort((a, b) => a.day.localeCompare(b.day));

            sendJson(res, {
                totalAds: ads.length,
                activeAds: activeAds.length,
                totalViews,
                totalClicks,
                ctr,
                topAd: topAd ? {
                    id: topAd.id,
                    title: topAd.title,
                    clicks: topAd.clicks || 0,
                    views: topAd.views || 0
                } : null,
                recentActivity,
                userDailySummary,
                dailySummary,
                copyEventsCount: analytics.copyEvents.length,
                feedbackCount: feedback.length,
                feedbackItems: feedback.slice(-10).reverse()
            });
            return;
        }

        if (pathname === '/api/analytics/session' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                try {
                    const parsed = JSON.parse(body || '{}');
                    const analytics = readAnalytics();
                    analytics.sessions.push({
                        id: `session-${Date.now()}`,
                        username: (parsed.username || 'anonymous').toString().trim(),
                        durationSeconds: Number(parsed.durationSeconds || 0),
                        at: new Date().toISOString(),
                        day: new Date().toISOString().slice(0, 10)
                    });
                    writeAnalytics(analytics);
                    sendJson(res, { created: true }, 201);
                } catch {
                    sendJson(res, { error: 'Invalid session payload' }, 400);
                }
            });
            return;
        }

        if (pathname === '/api/analytics/copy' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                try {
                    const parsed = JSON.parse(body || '{}');
                    const analytics = readAnalytics();
                    analytics.copyEvents.push({
                        id: `copy-${Date.now()}`,
                        username: (parsed.username || 'anonymous').toString().trim(),
                        addressType: (parsed.addressType || 'unknown').toString().trim(),
                        at: new Date().toISOString(),
                        day: new Date().toISOString().slice(0, 10)
                    });
                    writeAnalytics(analytics);
                    sendJson(res, { created: true }, 201);
                } catch {
                    sendJson(res, { error: 'Invalid copy payload' }, 400);
                }
            });
            return;
        }

        if (pathname === '/api/feedback' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                try {
                    const parsed = JSON.parse(body || '{}');
                    const feedback = readFeedback();
                    feedback.push({
                        id: `feedback-${Date.now()}`,
                        username: (parsed.username || 'anonymous').toString().trim(),
                        message: (parsed.message || '').toString().trim(),
                        at: new Date().toISOString(),
                        day: new Date().toISOString().slice(0, 10)
                    });
                    writeFeedback(feedback);
                    sendJson(res, { created: true }, 201);
                } catch {
                    sendJson(res, { error: 'Invalid feedback payload' }, 400);
                }
            });
            return;
        }

        if (pathname.startsWith('/api/ads/') && req.method === 'DELETE') {
            const parts = pathname.split('/').filter(Boolean);
            const id = parts[2];
            const ads = readAds();
            const filtered = ads.filter(ad => ad.id !== id);
            writeAds(filtered);
            sendJson(res, { deleted: true, id });
            return;
        }

        if (pathname === '/admin') {
            serveStaticFile(res, adminFile);
            return;
        }

        if (pathname === '/') {
            serveStaticFile(res, indexFile);
            return;
        }

        if (pathname.startsWith('/api/')) {
            sendJson(res, { error: 'Route not found' }, 404);
            return;
        }

        const safePath = path.join(rootDir, pathname.replace(/^\//, ''));
        if (safePath.startsWith(rootDir) && fs.existsSync(safePath)) {
            serveStaticFile(res, safePath);
            return;
        }

        serveStaticFile(res, indexFile);
    });
}

function startServer(port = process.env.PORT || 3000) {
    const server = createServer();
    server.listen(port, () => {
        console.log(`Server running at http://127.0.0.1:${port}`);
    });
    return server;
}

module.exports = { createServer, startServer };

if (require.main === module) {
    startServer();
}
