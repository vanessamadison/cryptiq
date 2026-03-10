import { Suspense } from "react";
import AuthClient from "./AuthClient";

export const dynamic = "force-dynamic";

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="container">
          <div className="panel">
            <div className="meta">Loading authentication…</div>
          </div>
        </div>
      }
    >
      <AuthClient />
    </Suspense>
  );
}
