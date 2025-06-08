// src/routes/api/v1/livestop/$stopNumber.tsx (OR wherever your API file is located)
import { json } from '@tanstack/react-start';
import { createAPIFileRoute } from '@tanstack/react-start/api';
import * as cheerio from 'cheerio';

export const APIRoute = createAPIFileRoute('/api/v1/livestop/$stopNumber')({
  GET: async ({ params }) => {
    try {
      const { stopNumber } = params;

      if (!stopNumber) {
        return json({ error: 'Missing stop number' }, { status: 400 });
      }

      const url = `https://136213.mobi/RealTime/RealTimeStopResults.aspx?SN=${stopNumber}`;
      console.log('Scraping:', url);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch page: ${response.statusText}`);
      }
      const rawHtml = await response.text();

      const $ = cheerio.load(rawHtml);
      const timetableElement = $('#pnlStopTimetable');

      if (timetableElement.length === 0) {
        console.warn(
          `#pnlStopTimetable not found for stop number: ${stopNumber}.`
        );
        return json(
          { error: 'Failed to find timetable data on the page.' },
          { status: 500 }
        );
      }

      const parsedData = parseTimetableHtml(timetableElement.html() || '');

      return json({ data: parsedData });
    } catch (err: any) {
      console.error('Scrape error:', err.message || err);
      return json(
        { error: 'Failed to scrape page or extract data: ' + err.message },
        { status: 500 }
      );
    }
  },
});

function parseTimetableHtml(html: string) {
  const $ = cheerio.load(html);
  const rows: {
    liveStatus: boolean;
    busNumber: string;
    timeUntilArrival: string;
    destination: string;
    tripId: string;
    fleetId: string | null;
  }[] = [];

  $('.tpm_row_timetable').each((_, el) => {
    const row = $(el);

    const tripId = row.data('tripid')?.toString() || '';
    const fleetId = row.data('fleet')?.toString() || null;

    if (!tripId) {
      console.warn('Could not extract tripId for a row.');
    }

    const liveStatus =
      row.find('.tt-livetext').text().trim().toUpperCase() === 'LIVE';

    const busNumber = row.children('div').eq(0).find('span').text().trim();

    const timeUntilArrival = row
      .children('div')
      .eq(2)
      .find('strong')
      .text()
      .trim();

    let destination = row // Use `let` because we'll reassign it
      .children('div')
      .eq(1)
      .find('.route-display-name')
      .first()
      .text()
      .trim();

    // === CRITICAL CHANGE HERE: Remove "To " prefix ===
    // Use a regular expression with 'i' flag for case-insensitive matching
    // and 'g' flag for global replacement (though 'To ' should only appear once at the start)
    // Add \s* to handle potential spaces after "To"
    if (destination.toLowerCase().startsWith('to ')) {
      destination = destination.substring(3).trim(); // Remove "To " (3 characters) and re-trim
    }
    // Alternatively, a more robust regex replacement:
    // destination = destination.replace(/^to\s+/i, '').trim();

    if (!timeUntilArrival) {
      console.warn('Could not extract timeUntilArrival for a row.');
    }
    if (!destination) {
      console.warn('Could not extract destination for a row.');
    }

    rows.push({
      liveStatus,
      busNumber,
      timeUntilArrival,
      destination, // Now 'destination' will be cleaned
      tripId,
      fleetId,
    });
  });

  return rows;
}
