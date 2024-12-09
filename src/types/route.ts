export interface Route {
  routeId: string;
  enabled: boolean;
  path: string;
  method: string;
}

export interface RouteResponse {
  routes: Route[];
} 