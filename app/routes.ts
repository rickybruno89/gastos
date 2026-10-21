import { index, route, type RouteConfig } from "@react-router/dev/routes";
export default [
  index("routes/month.tsx"),
  route("invitacion", "routes/invitation.tsx"),
  route("acceso", "routes/login.tsx"),
  route("tarjetas", "routes/cards.tsx"),
  route("compartidos", "routes/shared.tsx"),
  route("deudas", "routes/debts.tsx"),
  route("cuenta", "routes/account.tsx"),
] satisfies RouteConfig;
