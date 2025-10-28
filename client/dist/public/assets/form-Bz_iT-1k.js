import { r as reactExports, j as jsxRuntimeExports, f as cn, L as Label, I as Slot } from "./index-DF734YkB.js";
import { FormProvider, Controller, useFormContext } from "./index.esm-CjJt7FRq.js";
const Form = FormProvider;
const FormFieldContext = reactExports.createContext({});
const FormField = ({
  ...props
}) => {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(FormFieldContext.Provider, {
    value: {
      name: props.name
    },
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(Controller, {
      ...props
    })
  });
};
const useFormField = () => {
  const fieldContext = reactExports.useContext(FormFieldContext);
  const itemContext = reactExports.useContext(FormItemContext);
  const {
    getFieldState,
    formState
  } = useFormContext();
  const fieldState = getFieldState(fieldContext.name, formState);
  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>");
  }
  const {
    id
  } = itemContext;
  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState
  };
};
const FormItemContext = reactExports.createContext({});
const FormItem = reactExports.forwardRef(({
  className,
  ...props
}, ref) => {
  const id = reactExports.useId();
  return /* @__PURE__ */ jsxRuntimeExports.jsx(FormItemContext.Provider, {
    value: {
      id
    },
    children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {
      ref,
      className: cn("space-y-2", className),
      ...props
    })
  });
});
FormItem.displayName = "FormItem";
const FormLabel = reactExports.forwardRef(({
  className,
  ...props
}, ref) => {
  const {
    error,
    formItemId
  } = useFormField();
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Label, {
    ref,
    className: cn(error && "text-destructive", className),
    htmlFor: formItemId,
    ...props
  });
});
FormLabel.displayName = "FormLabel";
const FormControl = reactExports.forwardRef(({
  ...props
}, ref) => {
  const {
    error,
    formItemId,
    formDescriptionId,
    formMessageId
  } = useFormField();
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Slot, {
    ref,
    id: formItemId,
    "aria-describedby": !error ? `${formDescriptionId}` : `${formDescriptionId} ${formMessageId}`,
    "aria-invalid": !!error,
    ...props
  });
});
FormControl.displayName = "FormControl";
const FormDescription = reactExports.forwardRef(({
  className,
  ...props
}, ref) => {
  const {
    formDescriptionId
  } = useFormField();
  return /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
    ref,
    id: formDescriptionId,
    className: cn("text-sm text-muted-foreground", className),
    ...props
  });
});
FormDescription.displayName = "FormDescription";
const FormMessage = reactExports.forwardRef(({
  className,
  children,
  ...props
}, ref) => {
  const {
    error,
    formMessageId
  } = useFormField();
  const body = error ? String(error?.message ?? "") : children;
  if (!body) {
    return null;
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("p", {
    ref,
    id: formMessageId,
    className: cn("text-sm font-medium text-destructive", className),
    ...props,
    children: body
  });
});
FormMessage.displayName = "FormMessage";
export {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField
};
