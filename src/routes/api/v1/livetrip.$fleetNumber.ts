import { json } from '@tanstack/react-start';
import { createAPIFileRoute } from '@tanstack/react-start/api';
import * as cheerio from 'cheerio';

interface LiveTripStop {
  stopName: string;
  stopNumber: string;
  time: string;
  status: string; // e.g., "Departed", "Predicted", "Unknown"
}

interface LiveTripData {
  routeNumber: string | null;
  associatedFleetNumber: string | null; // The fleet number displayed on the page
  serviceAlert: string | null;
  stops: LiveTripStop[];
}

function parseLiveTripHtml(html: string): LiveTripData {
  const $ = cheerio.load(html);

  const routeNumberText = $('#lblTripHeading').text().trim(); // e.g., "Route 584"
  const routeNumber = routeNumberText.replace('Route ', '').trim() || null;

  const fleetNumberText = $('#lblTripHeading2').text().trim(); // e.g., " with bus 2615"
  const associatedFleetNumber =
    fleetNumberText.replace(' with bus ', '').trim() || null;

  const serviceAlertLink = $('#interruption_link');
  let serviceAlert = null;
  if (serviceAlertLink.length > 0 && serviceAlertLink.text().trim()) {
    serviceAlert = serviceAlertLink.text().trim();
    // const alertHref = serviceAlertLink.attr('href'); // Potentially useful if it's not just "#"
    // if (alertHref && alertHref !== "#") {
    //   serviceAlert += ` (Details: ${alertHref})`;
    // }
  }

  const stops: LiveTripStop[] = [];
  const stopsContainer = $('#serverSideRenderList'); // Based on provided HTML, stops are here

  if (stopsContainer.length === 0) {
    console.warn(
      '#serverSideRenderList not found. Trip stops might be missing or loaded dynamically.'
    );
    // You could also check #clientSideRenderList if serverSideRenderList is empty
    // and potentially merge results or prioritize.
  }

  stopsContainer.find('.tpm_row_fleettrip_wrap').each((_, el) => {
    const row = $(el);
    const stopName = row.find('.service-stop-name').text().trim();
    const stopNumberText = row.find('.service-stop-number').text().trim(); // e.g., "Stop 17382"
    const stopNumber = stopNumberText.replace('Stop ', '').trim();
    const time = row.find('.service-time').text().trim();

    let status = 'Unknown';
    if (row.hasClass('Departed')) {
      status = 'Departed';
    } else if (row.hasClass('Predicted')) {
      status = 'Predicted';
    } else {
      // Fallback to the text in .service-status-flag if available
      const statusFlagText = row.find('.service-status-flag').text().trim();
      if (statusFlagText) {
        status = statusFlagText.replace(/[()]/g, '').trim(); // Remove parentheses
      }
    }

    if (stopName && stopNumber && time) {
      stops.push({
        stopName,
        stopNumber,
        time,
        status,
      });
    } else {
      // Log if essential data for a stop row is missing
      console.warn(
        'Could not extract complete stop data for a row. HTML: ',
        row.html()?.substring(0, 100) + '...'
      );
    }
  });

  return { routeNumber, associatedFleetNumber, serviceAlert, stops };
}

export const APIRoute = createAPIFileRoute('/api/v1/livetrip/$fleetNumber')({
  GET: async ({ params }) => {
    try {
      const { fleetNumber } = params;

      if (!fleetNumber) {
        return json({ error: 'Missing fleet number' }, { status: 400 });
      }

      const url = `https://136213.mobi/RealTime/RealTimeFleetTrip.aspx?nq=false&fleet=${fleetNumber}`;
      console.log('Scraping live trip for fleet:', url);

      const response = await fetch(url);
      if (!response.ok) {
        // Specific handling for 404, which might mean fleet not found or no current trip
        if (response.status === 404) {
          console.warn(
            `Page not found for fleet ${fleetNumber} at ${url}. May indicate invalid fleet or no trip.`
          );
          return json(
            {
              error: `No trip information found for fleet number ${fleetNumber}. It might be invalid or not currently running.`,
            },
            { status: 404 }
          );
        }
        throw new Error(
          `Failed to fetch page: ${response.status} ${response.statusText}`
        );
      }
      const rawHtml = await response.text();
      const $ = cheerio.load(rawHtml);

      // Basic check if the page content seems valid for scraping
      // (e.g., expected heading or main content container is present)
      if (
        $('#lblTripHeading').length === 0 &&
        $('#serverSideRenderList').length === 0
      ) {
        console.warn(
          `Core elements for trip data not found for fleet number: ${fleetNumber}. The page structure might have changed, the fleet number could be incorrect, or there's no active trip.`
        );
        // Check for specific messages on the page if possible, e.g., "No trip information"
        // For now, returning a generic message.
        return json(
          {
            error:
              'Failed to find expected trip data structure on the page for fleet ' +
              fleetNumber +
              '. The fleet might not be active or the page is different than expected.',
          },
          { status: 404 } // Or 500 if it's an unexpected structure
        );
      }

      const parsedData = parseLiveTripHtml(rawHtml);

      if (
        !parsedData.routeNumber &&
        parsedData.stops.length === 0 &&
        !parsedData.associatedFleetNumber
      ) {
        console.warn(
          `No meaningful data extracted for fleet ${fleetNumber}. The fleet might have no current trip data, or the page structure for this state is not fully handled.`
        );
        // This might not be an error if the fleet is valid but has no data to show.
        // Returning the (empty) parsed data allows the client to decide how to handle.
      }

      return json({ data: parsedData });
    } catch (err: any) {
      console.error(
        `Scrape error for live trip (fleet ${params.fleetNumber || 'unknown'}):`,
        err.message || err
      );
      return json(
        { error: 'Failed to scrape page or extract data: ' + err.message },
        { status: 500 }
      );
    }
  },
});
