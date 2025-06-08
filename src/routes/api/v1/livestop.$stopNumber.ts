import { json } from '@tanstack/react-start';
import { createAPIFileRoute } from '@tanstack/react-start/api';
import * as cheerio from 'cheerio';

export const APIRoute = createAPIFileRoute('/api/v1/livestop/$stopNumber')({
  GET: async ({ params }) => {
    // Change from POST to GET, and use params
    try {
      const { stopNumber } = params; // Access the dynamic segment from params

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

    // Extract tripId and fleetId from data attributes
    const tripId = row.data('tripid')?.toString() || '';
    const fleetId = row.data('fleet')?.toString() || null;

    if (!tripId) {
      console.warn('Could not extract tripId for a row.');
    }

    const liveStatus =
      row.find('.tt-livetext').text().trim().toUpperCase() === 'LIVE';

    // Bus number is in a span inside the first child div of .tpm_row_timetable
    const busNumber = row.children('div').eq(0).find('span').text().trim();

    // Time until arrival is in a strong tag inside the third child div of .tpm_row_timetable
    const timeUntilArrival = row
      .children('div')
      .eq(2)
      .find('strong')
      .text()
      .trim();

    // The destination is in a div with class 'route-display-name' inside the second child div
    const destination = row
      .children('div')
      .eq(1)
      .find('.route-display-name')
      .first()
      .text()
      .trim();
    // Use .first() to ensure you get the first one if there are multiple divs with this class,
    // though in your example, there's only one relevant one.

    // Basic validation for timeUntilArrival (optional, but good for robustness)
    if (!timeUntilArrival) {
      console.warn('Could not extract timeUntilArrival for a row.');
    }
    // Basic validation for destination (optional)
    if (!destination) {
      console.warn('Could not extract destination for a row.');
    }

    rows.push({
      liveStatus,
      busNumber,
      timeUntilArrival,
      destination,
      tripId,
      fleetId,
    });
  });

  return rows;
}
