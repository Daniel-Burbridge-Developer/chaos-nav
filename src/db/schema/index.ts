import * as routes from './routes';
import * as stops from './stops';
import * as trips from './trips';
import * as shapes from './shapes';

// Export all your schemas
export const schema = {
  ...routes,
  ...stops,
  ...trips,
  ...shapes,
};
