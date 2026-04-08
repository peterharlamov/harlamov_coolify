import express from 'express';
import dotenv from 'dotenv';
import PocketBase from 'pocketbase';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT) || 3000;
const POCKETBASE_URL = process.env.POCKETBASE_URL;
const PB_COLLECTION = process.env.PB_COLLECTION || 'devices';

if (!POCKETBASE_URL) {
    throw new Error('Missing POCKETBASE_URL in .env');
}

const pb = new PocketBase(POCKETBASE_URL);
pb.autoCancellation(false);

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

async function ensurePocketBaseAuth() {
    if (pb.authStore.isValid) {
        return;
    }

    const adminEmail = process.env.PB_ADMIN_EMAIL;
    const adminPassword = process.env.PB_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
        throw new Error('Missing PB_ADMIN_EMAIL or PB_ADMIN_PASSWORD in .env');
    }

    await pb.admins.authWithPassword(adminEmail, adminPassword);
}

async function getDeviceRecords() {
    await ensurePocketBaseAuth();

    const records = await pb.collection(PB_COLLECTION).getFullList({
        sort: '-created',
        expand: 'assigned_to',
    });

    return records.map((record) => ({
        id: record.id,
        name: record.name ?? '',
        type: record.type ?? '',
        inventory_number: record.inventory_number ?? '',
        serial_number: record.serial_number ?? '',
        status: record.status ?? '',
        assigned_to: record.expand?.assigned_to?.name ?? '',
        notes: record.notes ?? '',
        usage_marked: record.usage_marked ?? false,
        last_used_at: record.last_used_at ?? '',
        created: record.created,
        updated: record.updated,
    }));
}

app.get('/api/devices', async (req, res) => {
    try {
        const items = await getDeviceRecords();

        res.json({
            collection: PB_COLLECTION,
            total: items.length,
            items,
        });
    } catch (error) {
        console.error('Failed to load collection:', error);
        res.status(500).json({
            error: error.message,
        });
    }
});

app.get('/', async (req, res) => {
    try {
        const items = await getDeviceRecords();

        const rows = items
            .map(
                (item) => `
                    <tr>
                        <td>${escapeHtml(item.id)}</td>
                        <td>${escapeHtml(item.name)}</td>
                        <td>${escapeHtml(item.type)}</td>
                        <td>${escapeHtml(item.inventory_number)}</td>
                        <td>${escapeHtml(item.serial_number)}</td>
                        <td>${escapeHtml(item.status)}</td>
                        <td>${escapeHtml(item.assigned_to)}</td>
                        <td>${escapeHtml(item.notes)}</td>
                        <td>${escapeHtml(item.usage_marked)}</td>
                        <td>${escapeHtml(item.last_used_at)}</td>
                    </tr>
                `
            )
            .join('');

        res.type('html').send(`<!doctype html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Inventory devices</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 24px;
            background: #f6f7fb;
            color: #111827;
        }
        h1 {
            margin-bottom: 16px;
        }
        .meta {
            margin-bottom: 12px;
            color: #4b5563;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            background: white;
        }
        th, td {
            border: 1px solid #d1d5db;
            padding: 8px 10px;
            text-align: left;
            vertical-align: top;
        }
        th {
            background: #eef2ff;
        }
    </style>
</head>
<body>
    <h1>Collection: ${escapeHtml(PB_COLLECTION)}</h1>
    <p class="meta">Records: ${items.length} | API: /api/devices</p>

    <table>
        <thead>
            <tr>
                <th>id</th>
                <th>name</th>
                <th>type</th>
                <th>inventory_number</th>
                <th>serial_number</th>
                <th>status</th>
                <th>assigned_to</th>
                <th>notes</th>
                <th>usage_marked</th>
                <th>last_used_at</th>
            </tr>
        </thead>
        <tbody>
            ${rows || '<tr><td colspan="10">No records</td></tr>'}
        </tbody>
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