import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/routes/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/routes/"!</div>;
}
