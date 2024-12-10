export interface Route {
  routeId: string;
  enabled: boolean;
  path: string;
  method: string;
}

export interface RouteResponse {
  routes: Route[];
}

export interface RouteHeader {
  key: string;
  value: string;
  type: 'ADD_REQUEST_HEADER' | 'ADD_REQUEST_HEADER_IF_NOT_PRESENT';
}

export interface RouteFormData {
  routeId: string;
  path: string;
  method: string;
  headers: RouteHeader[];
} 