import { Navigate, useSearchParams } from "react-router";
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
  const [params] = useSearchParams();
  const back = params.get("volver");
  const destination = back?.startsWith("/invitacion#") ? back : "/";
  const config = useQuery({
    queryKey: ["public-config"],
    queryFn: () => request("/config", publicConfigSchema),
  });
  const callbackError = params.has("error");
  const errorDestination =
    destination === "/"
      ? "/acceso"
      : `/acceso?volver=${encodeURIComponent(destination)}`;
  const login = useMutation({
    mutationFn: async () => {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: destination,
        errorCallbackURL: errorDestination,
      });
      if (result.error)
        throw new Error(
          "No pudimos iniciar sesión con Google. Intentá nuevamente.",
        );
    },
  });
  if (account.data) return <Navigate to={destination} replace />;
  return (
    <div className="login-page block grid-cols-[1.08fr_1fr] min-h-svh [background:white] desktop:grid">
      <section
        className={
          'login-story text-white [background:radial-gradient(ellipse_at_20%_90%,_#4168e2_0,_transparent_58%),_radial-gradient(ellipse_at_85%_15%,_#3653b4_0,_transparent_55%),_#253f98] hidden flex-col relative overflow-hidden px-[9%] py-11 desktop:pr-[7%] desktop:pl-[7%] desktop:flex before:[content:""] before:absolute before:top-0 before:right-0 before:bottom-0 before:left-0 before:[background-image:linear-gradient(#ffffff03_1px,_transparent_1px),_linear-gradient(90deg,_#ffffff03_1px,_transparent_1px)] before:bg-size-[56px_56px] before:pointer-events-none [&_.brand]:relative [&_.brand]:text-white [&_.brand-mark]:[background:#ffffff19] [&_.brand-period]:text-[#a8bcff]'
        }
      >
        <Brand />
        <div className="story-content max-w-[480px] pt-17.5 pb-[45px] w-full relative m-auto px-0 [&_h1]:text-[36px] [&_h1]:leading-[1.18] [&_h1]:tracking-[-1.4px] [&_h1]:font-semibold [&_h1]:mx-0 [&_h1]:my-5.5 desktop:[&_h1]:text-[clamp(34px,_3.55vw,_56px)] desktop:[&_h1]:tracking-[-2px] [&_h1>span]:text-[#b2c3ff] [&>p]:text-[#b5c7f3] [&>p]:text-[13px] [&>p]:leading-[1.9] [&>p]:max-w-[360px]">
          <span className="story-kicker text-[11px] tracking-[2px] text-[#aabcff] font-semibold flex items-center gap-2.5 [&>span]:w-[5px] [&>span]:h-[5px] [&>span]:[background:#aabcff] [&>span]:rounded-full">
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
            className="story-preview relative mt-10.5 mb-[45px] pr-7.5 mx-0"
            role="img"
            aria-label="Ilustración del resumen mensual con datos de ejemplo"
          >
            <div className="mini-card [background:white] text-ink shadow-[0_20px_35px_#0d226c20] [transform:rotate(-3deg)] p-4.5 border border-solid border-[#ffffff45] rounded-[17px] desktop:p-[23px]">
              <div className="mini-header flex items-center text-[11px] font-[550] gap-2.5 [&_small]:block [&_small]:text-[11px] [&_small]:text-[#9aa6bb] [&_small]:mt-[3px] [&_small]:font-normal">
                <span className="mini-icon grid place-content-center text-[#5e7edd] [background:#eef3ff] w-9 h-9 rounded-[10px]">
                  <Wallet size={18} />
                </span>
                <span>
                  Tu mes, de un vistazo<small>Ejemplo de resumen mensual</small>
                </span>
                <span className="mini-dots ml-auto text-[#aab5c7] tracking-[2px]">
                  •••
                </span>
              </div>
              <div className="mini-total mx-0 my-5.5 [&>small]:block [&>small]:text-[#929eb3] [&>small]:text-[11px] [&>small]:mb-1.5 [&>strong]:text-[26px] [&>strong]:tracking-[-1px] [&>strong]:font-[650] desktop:[&>strong]:text-[33px] [&>strong>span]:text-[#aeb8cc] [&>strong>span]:text-[21px]">
                <small>Pendiente en pesos</small>
                <strong>
                  $ 148.500<span>,00</span>
                </strong>
              </div>
              <div className="mini-progress h-[5px] [background:#edf1fa] rounded-[5px] [&>span]:block [&>span]:w-[66%] [&>span]:h-full [&>span]:[background:#5677e5] [&>span]:rounded-[5px]">
                <span />
              </div>
              <div className="mini-bottom flex items-center justify-between mt-3.5 text-[11px] text-[#8a98ae] gap-2.5 [&>span]:flex [&>span]:items-center [&>span]:gap-[5px] [&_strong]:text-[#6683cf] [&_strong]:font-medium max-desktop:[&>strong]:hidden">
                <span>
                  <span className="mini-check text-[#468b74]">
                    <Check size={12} />
                  </span>{" "}
                  4 de 6 pagos resueltos
                </span>
                <strong>¡Vas muy bien!</strong>
              </div>
            </div>
            <div className="floating-label absolute right-0 -bottom-4.5 flex items-center [background:#f9fbff] text-[#697d9e] text-[11px] shadow-[0_7px_20px_#19398b18] [transform:rotate(3deg)] px-[17px] py-3 border border-solid border-[#e7eefb] rounded-[11px] gap-[9px] [&>span]:w-[25px] [&>span]:h-[25px] [&>span]:[background:#e8f7f0] [&>span]:text-[#5d9f85] [&>span]:grid [&>span]:place-content-center [&>span]:rounded-full">
              <span>
                <Check size={16} />
              </span>
              Internet, listo por este mes.
            </div>
          </div>
          <div className="story-features max-desktop:flex-wrap flex items-center gap-y-3 gap-x-4.5 text-[#b4c6f6] text-[11px] pt-2.5 desktop:gap-[21px] [&>span]:flex [&>span]:items-center [&>span]:gap-[7px]">
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
        <span className="story-footnote text-[#a4b8ef] text-[11px] relative">
          Un poco de organización. Mucha tranquilidad.
        </span>
      </section>
      <main className="login-access pt-[calc(24px_+_env(safe-area-inset-top))] pr-[max(24px,_env(safe-area-inset-right))] pb-[calc(24px_+_env(safe-area-inset-bottom))] pl-[max(24px,_env(safe-area-inset-left))] flex flex-col items-center min-h-svh [background:radial-gradient(ellipse_at_40%_0,_#eef3ff,_transparent_55%),_white] desktop:[background:white] desktop:p-[45px]">
        <div className="mobile-login-brand block self-start desktop:hidden">
          <Brand />
        </div>
        <div className="access-content max-w-[380px] w-full m-auto px-0 py-9.5 desktop:max-w-[340px] desktop:pt-17.5 desktop:pb-17.5 [&_.eyebrow]:text-[11px] [&_.eyebrow]:tracking-[1.7px] [&_.eyebrow]:mb-3 [&_h2]:text-[2.0625rem] [&_h2]:font-[650] [&_h2]:tracking-[-1.1px] [&_h2]:mb-3.5">
          <div className="access-symbol grid place-content-center h-[55px] w-[55px] text-[#6684de] [background:#eef3ff] mb-[27px] rounded-[15px] min-[701px]:h-[53px] min-[701px]:w-[53px]">
            <Wallet size={25} />
          </div>
          <p className="eyebrow text-muted tracking-[1.45px] text-[11px] font-[650] mb-[11px]">
            TU ESPACIO PERSONAL
          </p>
          <h2>Qué bueno verte.</h2>
          <p className="access-description text-muted text-[0.9375rem] leading-[1.9] mb-7.5">
            Entrá y ocupate de tu mes.
            <br />
            Nosotros te ayudamos a verlo más claro.
          </p>
          <Button
            variant="secondary"
            className="google-button w-full min-h-13 text-[0.875rem] gap-[15px] [&>svg:last-child]:ml-auto [&>svg:last-child]:text-[#8b9ab6] [&>svg:first-child]:mr-auto"
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
          {(login.isError || callbackError) && (
            <p
              role="alert"
              className="error-message text-[12px] text-[#b64f51] leading-[1.7] mx-0 my-3"
            >
              {login.isError
                ? login.error.message
                : "No se completó el ingreso con Google. Intentá nuevamente."}
            </p>
          )}
          {config.isError ? (
            <div
              className="notice text-muted [background:#f2f5fb] text-[11px] leading-[1.7] mx-0 my-4 px-[15px] py-[13px] rounded-[9px]"
              role="alert"
            >
              No pudimos conectar con GastApp.{" "}
              <button
                className="text-button text-brand underline [background:transparent] p-0 border-0 border-none border-current"
                onClick={() => void config.refetch()}
              >
                Reintentar
              </button>
            </div>
          ) : (
            config.data &&
            !config.data.googleSignInEnabled && (
              <p
                role="status"
                className="notice text-muted [background:#f2f5fb] text-[11px] leading-[1.7] mx-0 my-4 px-[15px] py-[13px] rounded-[9px]"
              >
                El ingreso no está disponible en este momento. Intentá más
                tarde.
              </p>
            )
          )}
          <div className="privacy-note flex text-[#9aa9c2] justify-center items-start mt-[29px] gap-2.5 [&_p]:text-[11px] [&_p]:text-muted [&_p]:leading-[1.9] [&_p>span]:block [&_p>span]:text-muted">
            <ShieldCheck size={19} />
            <p>
              Tu información es privada.
              <span>Vos decidís qué compartir y con quién.</span>
            </p>
          </div>
        </div>
        <footer className="access-footer text-muted text-[11px]">
          GastApp · Hecho para simplificar tu mes
        </footer>
      </main>
    </div>
  );
}
