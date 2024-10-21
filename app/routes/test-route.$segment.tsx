import { LoaderFunctionArgs } from "@remix-run/node";
import { json, useLoaderData } from "@remix-run/react";

export const loader = async ({ params }: LoaderFunctionArgs) => {
  if (!params.segment) {
    throw new Error("Missing segment");
  }

  return json({
    segment: params.segment,
  });
};

export default function NestedDynamicRoute() {
  const data = useLoaderData<typeof loader>();

  return (
    <section>
      <h2>Nested Dynamic Route</h2>
      <p>This should render correctly</p>
      <p>Segment: {data.segment}</p>
    </section>
  );
}
