import { r as reactExports, j as jsxRuntimeExports, C as Card, a as CardHeader, b as CardTitle, d as CardDescription, c as CardContent, B as Button, J as supabase } from "./index-DF734YkB.js";
import { I as Input } from "./input-vX2xFcRS.js";
function ForgotPasswordPage() {
  const [email, setEmail] = reactExports.useState("");
  const [submitting, setSubmitting] = reactExports.useState(false);
  const [message, setMessage] = reactExports.useState(null);
  const [error, setError] = reactExports.useState(null);
  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      const redirectUrl = window.location.hostname === "localhost" ? "https://128.140.45.28.sslip.io/auth/reset-password" : `${window.location.origin}/auth/reset-password`;
      const {
        error: error2
      } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      });
      if (error2) throw error2;
      setMessage("Enviámos um email com instruções para redefinir a sua password.");
    } catch (err) {
      setError(err?.message || "Não foi possível enviar o email.");
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
          children: "Recuperar password"
        }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardDescription, {
          children: "Introduza o seu email para receber um link de recuperação."
        })]
      }), /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, {
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", {
          onSubmit,
          className: "space-y-4",
          children: [/* @__PURE__ */ jsxRuntimeExports.jsx(Input, {
            type: "email",
            placeholder: "o.seu@email.com",
            value: email,
            onChange: (e) => setEmail(e.target.value),
            required: true
          }), /* @__PURE__ */ jsxRuntimeExports.jsx(Button, {
            type: "submit",
            disabled: submitting,
            className: "w-full",
            children: submitting ? "A enviar…" : "Enviar link de recuperação"
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
  ForgotPasswordPage as default
};
