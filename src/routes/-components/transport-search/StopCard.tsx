// src/components/transport-search/StopCard.tsx
import { Badge, Card, CardContent } from '~/components/ui/library';
import type { Stop } from '~/db/schema/stops';
import { MapPin } from 'lucide-react';

interface StopCardProps {
  stop: Stop;
}

export const StopCard = ({ stop }: StopCardProps) => {
  return (
    <Card className='cursor-pointer transition-all duration-200 hover:scale-[1.01] hover:shadow-md'>
      <CardContent className='p-3'>
        <div className='flex items-center gap-2'>
          <Badge
            variant='outline'
            className='px-2 py-1 text-sm font-semibold rounded-md border-dashed'
          >
            {stop.id}
          </Badge>
          <h4 className='font-medium text-base leading-none'>{stop.name}</h4>
        </div>
        <div className='mt-1 flex items-center gap-1 text-xs text-muted-foreground'>
          <MapPin className='h-3 w-3' />
          <span>
            {stop.lat}, {stop.lon}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
