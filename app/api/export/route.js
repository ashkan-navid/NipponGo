import { NextResponse } from 'next/server';

const db = require('../../../lib/db.js');
const { checkAuth } = require('../../../lib/withAuth.js');

// GET - Export all user data as JSON
export async function GET(request) {
    try {
        const user = await checkAuth();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const format = searchParams.get('format') || 'json';

        // Gather all user data
        const hotels = db.getHotels(user.id);
        const activities = db.getActivities(user.id);

        // Prevent memory DoS from massive exports
        const totalItems = (hotels?.length || 0) + (activities?.length || 0);
        if (totalItems > 10000) {
            return NextResponse.json({
                error: 'Export zu groß',
                message: 'Dein Datenbestand überschreitet 10.000 Einträge. Bitte kontaktiere den Support für einen Batch-Export.',
                totalItems,
            }, { status: 413 });
        }

        const exportData = {
            exported_at: new Date().toISOString(),
            user: {
                id: user.id,
                username: user.username,
            },
            hotels: hotels || [],
            activities: activities || [],
        };

        if (format === 'csv') {
            // Generate CSV
            const hotelsCsv = generateCSV(exportData.hotels, [
                'id', 'name', 'address', 'check_in_date', 'check_out_date',
                'price_per_night', 'currency', 'rating', 'notes', 'latitude', 'longitude'
            ]);

            const activitiesCsv = generateCSV(exportData.activities, [
                'id', 'title', 'description', 'type', 'planned_date', 'planned_time',
                'completed', 'address', 'latitude', 'longitude'
            ]);

            const csv = `# NipponGo Export - ${exportData.exported_at}\n# User: ${user.username}\n\n## Hotels\n${hotelsCsv}\n\n## Activities\n${activitiesCsv}`;

            return new Response(csv, {
                headers: {
                    'Content-Type': 'text/csv; charset=utf-8',
                    'Content-Disposition': `attachment; filename="nipponogo-export-${Date.now()}.csv"`,
                },
            });
        }

        // Default: JSON export
        return new Response(JSON.stringify(exportData, null, 2), {
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Content-Disposition': `attachment; filename="nipponogo-export-${Date.now()}.json"`,
            },
        });
    } catch (error) {
        console.error('Export error:', error);
        return NextResponse.json({ error: 'Export fehlgeschlagen' }, { status: 500 });
    }
}

function generateCSV(data, columns) {
    if (!data || data.length === 0) return columns.join(',') + '\n';

    const header = columns.join(',');
    const rows = data.map(item =>
        columns.map(col => {
            const val = item[col];
            if (val === null || val === undefined) return '';
            const str = String(val).replace(/"/g, '""');
            return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
        }).join(',')
    );

    return [header, ...rows].join('\n');
}
