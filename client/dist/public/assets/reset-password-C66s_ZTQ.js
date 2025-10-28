import { u as useLocation, r as reactExports, J as supabase, j as jsxRuntimeExports, C as Card, a as CardHeader, b as CardTitle, d as CardDescription, c as CardContent, B as Button } from "./index-DF734YkB.js";
import { I as Input } from "./input-vX2xFcRS.js";
function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const [ready, setReady] = reactExports.useState(false);
  const [hasSession, setHasSession] = reactExports.useState(false);
  const [password, setPassword] = reactExports.useState("");
  const [confirm, setConfirm] = reactExports.useState("");
  const [submitting, setSubmitting] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const [message, setMessage] = reactExports.useState(null);
  reactExports.useEffect(() => {
    const processAuthCallback = async () => {
      const hashFragment = window.location.hash;
      console.log("Reset password page - hash:", hashFragment);
      if (hashFragment && hashFragment.includes("access_token")) {
        const params = new URLSearchParams(hashFragment.substring(1));
        const accessToken = params.get("access_token");
        const type = params.get("type");
        if (accessToken && type === "recovery") {
          console.log("Recovery token detected, processing...");
          try {
            const {
              data,
              error: error2
            } = await supabase.auth.exchangeCodeForSession(window.location.href);
            if (error2) {
              console.error("Error exchanging code for session:", error2);
              const {
                data: sessionData2,
                error: sessionError
              } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: params.get("refresh_token") || ""
              });
              if (!sessionError && sessionData2.session) {
                setHasSession(true);
                console.log("Session set manually, user can reset password");
                window.history.replaceState(null, "", "/auth/reset-password");
              }
            } else if (data.session) {
              setHasSession(true);
              console.log("Session established via exchange, user can reset password");
              window.history.replaceState(null, "", "/auth/reset-password");
            }
          } catch (err) {
            console.error("Error processing recovery token:", err);
          }
        }
      }
      const {
        data: sessionData
      } = await supabase.auth.getSession();
      if (sessionData.session) {
        setHasSession(true);
        console.log("Existing session found");
      }
      setReady(true);
    };
    processAuthCallback();
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state change:", event);
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setHasSession(true);
        console.log("Auth event detected:", event);
      }
    });
    return () => subscription.unsubscribe();
  }, []);
  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);
    if (password.length < 6) {
      setError("A password deve ter pelo menos 6 caracteres.");
      setSubmitting(false);
      return;
    }
    if (password !== confirm) {
      setError("As passwords não coincidem.");
      setSubmitting(false);
      return;
    }
    try {
      const {
        error: error2
      } = await supabase.auth.updateUser({
        password
      });
      if (error2) throw error2;
      setMessage("Password alterada com sucesso. Redirecionando para login…");
      setTimeout(() => setLocation("/login"), 1200);
    } catch (err) {
      setError(err?.message || "Não foi possível alterar a password.");
    } finally {
      setSubmitting(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
    className: "min-h-screen flex items-center justify-center px-4",
    children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, {
      className: "w-full max-w-md",
      children: [/* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, {
        children: [/* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, {
          children: "Definir nova password"
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardDescription, {
          children: ready && !hasSession ? "Abra esta página através do link enviado por email para continuar." : "Introduza a sua nova password."
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", {
          onSubmit,
          className: "space-y-4",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
            type: "password",
            placeholder: "Nova password",
            value: password,
            onChange: (e) => setPassword(e.target.value),
            disabled: !hasSession || submitting,
            required: true
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
            type: "password",
            placeholder: "Confirmar password",
            value: confirm,
            onChange: (e) => setConfirm(e.target.value),
            disabled: !hasSession || submitting,
            required: true
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
            type: "submit",
            disabled: !hasSession || submitting,
            className: "w-full",
            children: submitting ? "A atualizar…" : "Atualizar password"
          }), message && /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-sm text-green-600 dark:text-green-400",
            children: message
          }), error && /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
            className: "text-sm text-red-600 dark:text-red-400",
            children: error
          })]
        })
      })]
    })
  });
}
export {
  ResetPasswordPage as default
};
