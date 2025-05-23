import { Input } from '~/components/ui/input';

const StopInput = () => {
  return (
    <Input
      type='text'
      placeholder='Enter Stop Number or Name'
      className='w-full p-3 rounded-lg bg-zinc-700 border border-zinc-600 text-white focus:ring-2 focus:ring-blue-500'
    />
  );
};

export default StopInput;
