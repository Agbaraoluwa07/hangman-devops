const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../server');

test('ads API increments views in the returned payload', async () => {
    const server = createServer();
    await new Promise(resolve => server.listen(0, resolve));
    const { port } = server.address();
    const base = `http://127.0.0.1:${port}`;

    try {
        const createdRes = await fetch(`${base}/api/ads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: 'View Test Ad',
                text: 'View test',
                subtext: 'Tracking views',
                link: 'https://example.com/view-test',
                active: true
            })
        });
        const created = await createdRes.json();
        assert.equal(createdRes.status, 201);

        const res = await fetch(`${base}/api/ads`);
        const ads = await res.json();
        const target = ads.find(ad => ad.id === created.id);

        assert.ok(target);
        assert.equal(target.views, 1);
    } finally {
        await new Promise(resolve => server.close(resolve));
    }
});

test('ads API can create and track clicks', async () => {
    const server = createServer();
    await new Promise(resolve => server.listen(0, resolve));
    const { port } = server.address();
    const base = `http://127.0.0.1:${port}`;

    try {
        let res = await fetch(`${base}/api/ads`);
        assert.equal(res.status, 200);
        const ads = await res.json();
        assert.ok(Array.isArray(ads));

        res = await fetch(`${base}/api/ads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: 'Test Ad',
                text: 'Try this product',
                subtext: 'Short promo',
                link: 'https://example.com',
                active: true
            })
        });
        const created = await res.json();
        assert.equal(created.title, 'Test Ad');
        assert.equal(res.status, 201);

        res = await fetch(`${base}/api/ads/${created.id}/click`, { method: 'POST' });
        const clickResult = await res.json();
        assert.equal(clickResult.clicks, 1);

        res = await fetch(`${base}/api/ads/${created.id}`, { method: 'DELETE' });
        const deleteResult = await res.json();
        assert.equal(deleteResult.deleted, true);
    } finally {
        await new Promise(resolve => server.close(resolve));
    }
});

test('ads API rejects incomplete ad payloads', async () => {
    const server = createServer();
    await new Promise(resolve => server.listen(0, resolve));
    const { port } = server.address();
    const base = `http://127.0.0.1:${port}`;

    try {
        const res = await fetch(`${base}/api/ads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: '',
                text: '',
                link: ''
            })
        });

        assert.equal(res.status, 400);
        const payload = await res.json();
        assert.match(payload.error, /title|text|link/i);
    } finally {
        await new Promise(resolve => server.close(resolve));
    }
});

test('ads API exposes analytics for images and clicks', async () => {
    const server = createServer();
    await new Promise(resolve => server.listen(0, resolve));
    const { port } = server.address();
    const base = `http://127.0.0.1:${port}`;

    try {
        const res = await fetch(`${base}/api/ads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: 'Image Ad',
                text: 'Great product',
                subtext: 'Fresh promo',
                link: 'https://example.com',
                imageUrl: 'https://example.com/ad.png',
                active: true
            })
        });
        const created = await res.json();
        assert.equal(res.status, 201);

        await fetch(`${base}/api/ads/${created.id}/click`, { method: 'POST' });
        await fetch(`${base}/api/ads`);

        const analyticsRes = await fetch(`${base}/api/analytics`);
        const analytics = await analyticsRes.json();
        assert.ok(analytics.totalClicks >= 1);
        assert.ok(analytics.totalViews >= 1);
        assert.ok(analytics.topAd || analytics.activeAds >= 1);
    } finally {
        await new Promise(resolve => server.close(resolve));
    }
});

test('analytics endpoint stores user sessions, copy events, and feedback', async () => {
    const server = createServer();
    await new Promise(resolve => server.listen(0, resolve));
    const { port } = server.address();
    const base = `http://127.0.0.1:${port}`;

    try {
        const sessionRes = await fetch(`${base}/api/analytics/session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'Ada', durationSeconds: 120 })
        });
        assert.equal(sessionRes.status, 201);

        const copyRes = await fetch(`${base}/api/analytics/copy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'Ada', addressType: 'ETH' })
        });
        assert.equal(copyRes.status, 201);

        const feedbackRes = await fetch(`${base}/api/feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'Ada', message: 'Loved the game' })
        });
        assert.equal(feedbackRes.status, 201);

        const analyticsRes = await fetch(`${base}/api/analytics`);
        const analytics = await analyticsRes.json();
        assert.ok(analytics.copyEventsCount >= 1);
        assert.ok(analytics.feedbackCount >= 1);
        assert.ok(analytics.dailySummary.length >= 1);
        assert.ok(analytics.userDailySummary.length >= 1);
    } finally {
        await new Promise(resolve => server.close(resolve));
    }
});
