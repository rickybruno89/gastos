import { index, route, type RouteConfig } from "@react-router/dev/routes";
export default [
  index("routes/month.tsx"),
  route("acceso", "routes/login.tsx"),
  route("compartidos", "routes/shared.tsx"),
  route("deudas", "routes/debts.tsx"),
  route("cuenta", "routes/account.tsx"),
  route("vista-previa", "routes/preview.tsx"),
] satisfies RouteConfig;
