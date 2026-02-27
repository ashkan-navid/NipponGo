import { NextResponse } from 'next/server';
const db = require('../../../../lib/db.js');
const { checkAuth } = require('../../../../lib/withAuth.js');

function generateICal(activities, hotels) {
    let ical = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//NipponGo//TravelPlanner//DE',
        'CALSCALE:GREGORIAN'
    ];

    const formatDate = (dateStr) => {
        if (!dateStr) return null;
        // Turn "YYYY-MM-DD" into "YYYYMMDD"
        return dateStr.replace(/-/g, '');
    };

    activities.forEach(act => {
        if (!act.planned_date) return;

        ical.push('BEGIN:VEVENT');
        ical.push(`SUMMARY:${act.title}`);

        if (act.planned_time) {
            // Timed event: use DTSTART/DTEND with time (1h duration default)
            const start = formatDate(act.planned_date);
            const [hours, minutes] = act.planned_time.split(':').map(Number);
            ical.push(`DTSTART:${start}T${String(hours).padStart(2, '0')}${String(minutes).padStart(2, '0')}00`);
            const endH = hours + 1;
            ical.push(`DTEND:${start}T${String(endH).padStart(2, '0')}${String(minutes).padStart(2, '0')}00`);
        } else {
            // All-day event
            const start = formatDate(act.planned_date);
            const endDate = new Date(act.planned_date);
            endDate.setDate(endDate.getDate() + 1);
            const end = endDate.toISOString().split('T')[0].replace(/-/g, '');
            ical.push(`DTSTART;VALUE=DATE:${start}`);
            ical.push(`DTEND;VALUE=DATE:${end}`);
        }

        if (act.description) {
            ical.push(`DESCRIPTION:${act.description.replace(/\n/g, '\\n')}`);
        }

        if (act.address) {
            ical.push(`LOCATION:${act.address}`);
        } else if (act.latitude && act.longitude) {
            ical.push(`LOCATION:${act.latitude},${act.longitude}`);
        }

        ical.push('END:VEVENT');
    });

    hotels.forEach(hotel => {
        if (!hotel.check_in_date || !hotel.check_out_date) return;
        const start = formatDate(hotel.check_in_date);
        const endStr = formatDate(hotel.check_out_date);

        ical.push('BEGIN:VEVENT');
        ical.push(`SUMMARY:Hotel: ${hotel.name}`);
        ical.push(`DTSTART;VALUE=DATE:${start}`);
        ical.push(`DTEND;VALUE=DATE:${endStr}`);

        if (hotel.notes) {
            ical.push(`DESCRIPTION:${hotel.notes.replace(/\n/g, '\\n')}`);
        }

        if (hotel.address) {
            ical.push(`LOCATION:${hotel.address}`);
        } else if (hotel.latitude && hotel.longitude) {
            ical.push(`LOCATION:${hotel.latitude},${hotel.longitude}`);
        }

        ical.push('END:VEVENT');
    });

    ical.push('END:VCALENDAR');
    return ical.join('\r\n');
}

export async function GET() {
    try {
        const user = await checkAuth();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const activities = db.getActivities(user.id);
        const hotels = db.getHotels(user.id);

        const icalData = generateICal(activities, hotels);

        const headers = new Headers();
        headers.set('Content-Type', 'text/calendar; charset=utf-8');
        headers.set('Content-Disposition', 'attachment; filename="nippongo-travel.ics"');

        return new NextResponse(icalData, { headers });
    } catch (error) {
        console.error('Export calendar error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
