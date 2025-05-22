import { json } from '@tanstack/react-start';
import { createAPIFileRoute } from '@tanstack/react-start/api';
import * as cheerio from 'cheerio';

export const APIRoute = createAPIFileRoute('/api/busstop-id/$stopNumber')({
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
        // If the element isn't found, it might indicate that Playwright was actually needed
        // or the page structure has changed, or it's a temporary issue.
        // It's good to log this for debugging.
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
  }[] = [];

  $('.tpm_row_timetable').each((_, el) => {
    const row = $(el);

    const liveStatus =
      row.find('.tt-livetext').text().trim().toUpperCase() === 'LIVE';

    const busNumber = row.find('span').first().text().trim();

    const timeUntilArrival = row
      .find('div')
      .filter((_, divEl) => $(divEl).text().includes('MIN'))
      .first()
      .text()
      .trim();

    rows.push({
      liveStatus,
      busNumber,
      timeUntilArrival,
    });
  });

  return rows;
}
