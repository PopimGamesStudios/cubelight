import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { classNames } from "@/lib/format";
import { useApp } from "@/store/app";

export function Toasts() {
  const toasts = useApp((state) => state.toasts);
  const dismissToast = useApp((state) => state.dismissToast);

  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => {
        const Icon = toast.tone === "error" ? AlertTriangle : toast.tone === "success" ? CheckCircle2 : Info;
        return (
          <div key={toast.id} className={classNames("toast", `toast--${toast.tone}`)}>
            <span className="toast-icon">
              <Icon size={16} />
            </span>
            <div className="toast-copy">
              <strong>{toast.title}</strong>
              {toast.message ? <p>{toast.message}</p> : null}
            </div>
            <button type="button" aria-label="Dismiss" onClick={() => dismissToast(toast.id)}>
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
