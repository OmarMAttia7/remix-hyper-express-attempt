import { Outlet } from "@remix-run/react";

export default function TestRouteLayout() {
  return (
    <main>
      <h1>Test Route Layout</h1>
      <div className="p-4">
        <Outlet />
      </div>
    </main>
  );
}
