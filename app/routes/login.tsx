import { Link, Navigate } from "react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  CreditCard,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { Brand, GoogleMark } from "../components/brand";
import { Button } from "../components/ui";
import { authClient, useCurrentUser } from "../lib/account";
import { request } from "../../shared/api-client";
import { publicConfigSchema } from "../../shared/contracts/account";

export default function Login() {
  const account = useCurrentUser();
  const config = useQuery({
    queryKey: ["public-config"],
    queryFn: () => request("/config", publicConfigSchema),
  });
  const login = useMutation({
    mutationFn: async () => {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
      });
      if (result.error)
        throw new Error(
          "No pudimos iniciar sesión con Google. Intentá nuevamente.",
        );
    },
  });
  if (account.data) return <Navigate to="/" replace />;
  return (
    <div className="login-page">
      <section className="login-story">
        <Brand />
        <div className="story-content">
          <span className="story-kicker">
            <span />
            MENOS VUELTAS. MÁS CLARIDAD.
          </span>
          <h1>
            Tu mes en orden.
            <br />
            <span>Tu cabeza, libre.</span>
          </h1>
          <p>
            Todo lo que tenés que pagar, lo que ya resolviste y lo que
            compartís. En un solo lugar.
          </p>
          <div
            className="story-preview"
            role="img"
            aria-label="Ilustración del resumen mensual con datos de ejemplo"
          >
            <div className="mini-card">
              <div className="mini-header">
                <span className="mini-icon">
                  <Wallet size={18} />
                </span>
                <span>
                  Tu mes, de un vistazo<small>Ejemplo de resumen mensual</small>
                </span>
                <span className="mini-dots">•••</span>
              </div>
              <div className="mini-total">
                <small>Pendiente en pesos</small>
                <strong>
                  $ 148.500<span>,00</span>
                </strong>
              </div>
              <div className="mini-progress">
                <span />
              </div>
              <div className="mini-bottom">
                <span>
                  <span className="mini-check">
                    <Check size={12} />
                  </span>{" "}
                  4 de 6 pagos resueltos
                </span>
                <strong>¡Vas muy bien!</strong>
              </div>
            </div>
            <div className="floating-label">
              <span>
                <Check size={16} />
              </span>
              Internet, listo por este mes.
            </div>
          </div>
          <div className="story-features">
            <span>
              <CreditCard size={17} />
              Tus tarjetas
            </span>
            <span>
              <Users size={17} />
              Lo compartido
            </span>
            <span>
              <Wallet size={17} />
              Cada moneda
            </span>
          </div>
        </div>
        <span className="story-footnote">
          Un poco de organización. Mucha tranquilidad.
        </span>
      </section>
      <main className="login-access">
        <div className="mobile-login-brand">
          <Brand />
        </div>
        <div className="access-content">
          <div className="access-symbol">
            <Wallet size={25} />
          </div>
          <p className="eyebrow">TU ESPACIO PERSONAL</p>
          <h2>Qué bueno verte.</h2>
          <p className="access-description">
            Entrá y ocupate de tu mes.
            <br />
            Nosotros te ayudamos a verlo más claro.
          </p>
          <Button
            variant="secondary"
            className="google-button"
            disabled={
              !config.data?.googleSignInEnabled ||
              login.isPending ||
              config.isPending
            }
            onClick={() => login.mutate()}
          >
            <GoogleMark />
            {login.isPending ? "Abriendo Google…" : "Continuar con Google"}
            <ArrowRight size={17} />
          </Button>
          {login.isError && (
            <p role="alert" className="error-message">
              {login.error.message}
            </p>
          )}
          {config.isError ? (
            <div className="notice" role="alert">
              No pudimos conectar con GastApp.{" "}
              <button
                className="text-button"
                onClick={() => void config.refetch()}
              >
                Reintentar
              </button>
            </div>
          ) : (
            config.data &&
            !config.data.googleSignInEnabled && (
              <p role="status" className="notice">
                El ingreso con Google todavía no está habilitado en este
                entorno.
              </p>
            )
          )}
          <div className="login-divider">
            <span>¿Querés conocer la nueva experiencia?</span>
          </div>
          <Link to="/vista-previa" className="button ghost preview-link">
            Explorar el diseño V2 <ArrowRight size={17} />
          </Link>
          <div className="privacy-note">
            <ShieldCheck size={19} />
            <p>
              Tu información es privada.
              <span>Vos decidís qué compartir y con quién.</span>
            </p>
          </div>
        </div>
        <footer className="access-footer">
          GastApp · Hecho para simplificar tu mes
        </footer>
      </main>
    </div>
  );
}
