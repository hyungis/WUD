import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

type PublicRouteProps = {
  children: ReactElement;
  redirectTo?: string;
  redirectIfAuthenticated?: boolean;
};

function PublicRoute({
  children,
  redirectTo = "/",
  redirectIfAuthenticated = true,
}: PublicRouteProps) {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated && redirectIfAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}

export default PublicRoute;
