import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/livetimes/')({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/livetimes/"!</div>;
}
