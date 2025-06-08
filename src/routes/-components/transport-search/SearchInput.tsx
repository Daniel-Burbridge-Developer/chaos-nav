// src/components/transport-search/SearchInput.tsx
import { Input } from '~/components/ui/library';
import { Search } from 'lucide-react';

interface SearchInputProps {
  searchTerm: string;
  updateSearchTerm: (term: string) => void;
  isSearching: boolean;
  isFetching: boolean;
}

export const SearchInput = ({
  searchTerm,
  updateSearchTerm,
  isSearching,
  isFetching,
}: SearchInputProps) => {
  return (
    <div className='relative'>
      <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
      <Input
        placeholder='Search routes or stops'
        value={searchTerm}
        onChange={(e) => updateSearchTerm(e.target.value)}
        className='pl-10'
      />
      {(isSearching || isFetching) && (
        <div className='absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2'>
          <div className='h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent' />
        </div>
      )}
    </div>
  );
};
