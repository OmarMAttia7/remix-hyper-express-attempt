import { Link } from "@remix-run/react";

export default function TestRoute() {
  return (
    <section>
      <h2>Test Route</h2>
      <p>This should render correctly</p>
      <Link to="/test-route/nested">Here's a link to a nested route</Link>
      <br />
      <Link to="/test-route/segmented">
        Here's a link to a nested route with a dynamic segment
      </Link>
    </section>
  );
}
