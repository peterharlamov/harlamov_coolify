import express from 'express';
import dotenv from 'dotenv';
import PocketBase from 'pocketbase';

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT) || 3000;
const POCKETBASE_URL = process.env.POCKETBASE_URL;
const PB_COLLECTION = process.env.PB_COLLECTION || 'grades';

const pb = POCKETBASE_URL ? new PocketBase(POCKETBASE_URL) : null;

if (pb) {
    pb.autoCancellation(false);
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

async function ensurePocketBaseAuth() {
    if (!pb) {
        throw new Error('Missing POCKETBASE_URL in .env');
    }

    if (pb.authStore.isValid) {
        return;
    }

    const adminEmail = process.env.PB_ADMIN_EMAIL;
    const adminPassword = process.env.PB_ADMIN_PASSWORD;

    if (adminEmail && adminPassword) {
        await pb.admins.authWithPassword(adminEmail, adminPassword);
    }
}

async function getGradeRecords() {
    await ensurePocketBaseAuth();

    const records = await pb.collection(PB_COLLECTION).getFullList({
        sort: '-created',
    });

    return records.map((record) => ({
        id: record.id,
        student_name: record.student_name ?? '',
        subject: record.subject ?? '',
        grades: record.grades ?? '',
        status: record.status ?? '',
        created: record.created,
        updated: record.updated,
    }));
}

app.get('/api/grades', async (req, res) => {
    try {
        const items = await getGradeRecords();
        res.json({
            collection: PB_COLLECTION,
            total: items.length,
            items,
        });
    } catch (error) {
        console.error('Failed to load collection:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get('/', async (req, res) => {
    try {
        const items = await getGradeRecords();
        const rows = items
            .map(
                (item) =>
                    `<tr><td>${escapeHtml(item.id)}</td><td>${escapeHtml(item.student_name)}</td><td>${escapeHtml(item.subject)}</td><td>${escapeHtml(item.grades)}</td><td>${escapeHtml(item.status)}</td></tr>`
            )
            .join('');

        res.type('html').send(`<!doctype html>
<html>
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>PocketBase grades</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 24px; background: #f6f7fb; color: #111827; }
            h1 { margin: 0 0 16px; }
            table { border-collapse: collapse; width: 100%; background: #fff; }
            th, td { border: 1px solid #d1d5db; padding: 8px 10px; text-align: left; }
            th { background: #eef2ff; }
            .meta { margin-bottom: 12px; color: #4b5563; }
        </style>
    </head>
    <body>
        <h1>Collection: ${escapeHtml(PB_COLLECTION)}</h1>
        <p class="meta">Records: ${items.length} | API: /api/grades</p>
        <table>
            <thead>
                <tr>
                    <th>id</th>
                    <th>student_name</th>
                    <th>subject</th>
                    <th>grades</th>
                    <th>status</th>
                </tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="5">No records</td></tr>'}</tbody>
        </table>
    </body>
</html>`);
    } catch (error) {
        res.status(500).type('text/plain').send(`Failed to load collection: ${error.message}`);
    }
});

app.listen(PORT, () => {
    console.log(`Server on port ${PORT}`);
});