// src/components/transport-search/RouteCard.tsx
import { Badge, Card, CardContent } from '~/components/ui/library';
import type { Route } from '~/db/schema/routes';

interface RouteCardProps {
  route: Route;
}

export const RouteCard = ({ route }: RouteCardProps) => {
  return (
    <Card className='cursor-pointer transition-all duration-200 hover:scale-[1.01] hover:shadow-md'>
      <CardContent className='p-3'>
        <div className='flex items-center gap-2'>
          <Badge
            variant='secondary'
            className='px-2 py-1 text-sm font-semibold rounded-md'
            style={{
              backgroundColor: 'hsl(var(--secondary))',
              color: 'hsl(var(--secondary-foreground))',
            }}
          >
            {route.short_name}
          </Badge>
          <h4 className='font-medium text-base leading-none'>
            {route.long_name}
          </h4>
        </div>
        {/* Add more route details here if needed */}
      </CardContent>
    </Card>
  );
};
