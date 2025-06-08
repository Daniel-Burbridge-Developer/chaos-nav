// src/components/transport-search/FilterOptions.tsx
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '~/components/ui/collapsible';
import { Button } from '~/components/ui/button';
import { Filter } from 'lucide-react';

// Re-define or import SearchFilter type if not already in a shared file
type SearchFilter = 'all' | 'routes' | 'stops';

interface FilterOptionsProps {
  isFiltersOpen: boolean;
  setIsFiltersOpen: (isOpen: boolean) => void;
  activeFilter: SearchFilter;
  setActiveFilter: (filter: SearchFilter) => void;
}

export const FilterOptions = ({
  isFiltersOpen,
  setIsFiltersOpen,
  activeFilter,
  setActiveFilter,
}: FilterOptionsProps) => {
  return (
    <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
      <CollapsibleTrigger asChild>
        <Button variant='outline' size='sm' className='w-full justify-between'>
          <div className='flex items-center gap-2'>
            <Filter className='h-4 w-4' />
            Filters:{' '}
            <span className='font-semibold capitalize'>
              {activeFilter}
            </span>{' '}
          </div>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className='space-y-2 pt-2'>
        <Button
          variant={activeFilter === 'all' ? 'default' : 'outline'}
          size='sm'
          className='w-full justify-start'
          onClick={() => {
            setActiveFilter('all');
            setIsFiltersOpen(false);
          }}
        >
          Show All
        </Button>
        <Button
          variant={activeFilter === 'routes' ? 'default' : 'outline'}
          size='sm'
          className='w-full justify-start'
          onClick={() => {
            setActiveFilter('routes');
            setIsFiltersOpen(false);
          }}
        >
          Only Routes
        </Button>
        <Button
          variant={activeFilter === 'stops' ? 'default' : 'outline'}
          size='sm'
          className='w-full justify-start'
          onClick={() => {
            setActiveFilter('stops');
            setIsFiltersOpen(false);
          }}
        >
          Only Stops
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
};
