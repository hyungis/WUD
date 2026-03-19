import type { ReactElement } from "react";
import AuthGuard from "./AuthGuard";

type PrivateRouteProps = {
  children: ReactElement;
};

function PrivateRoute({ children }: PrivateRouteProps) {
  return <AuthGuard>{children}</AuthGuard>;
}

export default PrivateRoute;
