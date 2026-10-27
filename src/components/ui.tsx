import {
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
  useEffect,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Loader2, X } from "lucide-react";
import { classNames } from "@/lib/format";

type ButtonVariant = "primary" | "outline" | "ghost" | "danger" | "subtle";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  trailingIcon?: ReactNode;
  loading?: boolean;
}

export function Button({
  variant = "outline",
  size = "md",
  icon,
  trailingIcon,
  loading,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={classNames("btn", `btn--${variant}`, size !== "md" && `btn--${size}`, className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 size={14} className="spin" /> : icon}
      {children ? <span>{children}</span> : null}
      {trailingIcon}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  size?: "sm" | "md";
  tone?: "default" | "danger" | "accent";
}

export function IconButton({ label, size = "md", tone = "default", className, children, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      className={classNames("btn", "btn--icon", size === "sm" && "btn--icon-sm", `btn--icon-${tone}`, className)}
      title={label}
      aria-label={label}
      {...rest}
    >
      {children}
    </button>
  );
}

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="toggle"
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  ariaLabel?: string;
  disabled?: boolean;
}

export function Slider({ value, min, max, step = 1, onChange, ariaLabel, disabled }: SliderProps) {
  const percent = max === min ? 0 : ((value - min) / (max - min)) * 100;
  return (
    <input
      className="slider"
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(event) => onChange(Number(event.target.value))}
      style={{ "--fill": `${percent}%` } as CSSProperties}
    />
  );
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
  title?: string;
}

export function Select({ value, onChange, options, ariaLabel, disabled, className, title }: SelectProps) {
  return (
    <span className={classNames("select-wrap", className)} title={title}>
      <select
        className="select"
        value={value}
        aria-label={ariaLabel}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} aria-hidden />
    </span>
  );
}

export function Chip({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: "default" | "accent" | "danger" | "success";
  className?: string;
}) {
  return <span className={classNames("chip", `chip--${tone}`, className)}>{children}</span>;
}

export function Panel({
  title,
  eyebrow,
  description,
  actions,
  children,
  className,
  flush,
}: {
  title?: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  flush?: boolean;
}) {
  return (
    <section className={classNames("panel", className)}>
      {title || actions ? (
        <header className="panel-head">
          <div className="panel-heading">
            {eyebrow ? <span className="panel-eyebrow">{eyebrow}</span> : null}
            {title ? <h2 className="panel-title">{title}</h2> : null}
            {description ? <p className="panel-description">{description}</p> : null}
          </div>
          {actions ? <div className="panel-actions">{actions}</div> : null}
        </header>
      ) : null}
      <div className={flush ? "panel-flush" : "panel-body"}>{children}</div>
    </section>
  );
}

export function ProgressBar({
  value,
  indeterminate,
  className,
}: {
  value?: number;
  indeterminate?: boolean;
  className?: string;
}) {
  return (
    <div
      className={classNames("progress", indeterminate && "progress--indeterminate", className)}
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : Math.round(value ?? 0)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={indeterminate ? undefined : { width: `${Math.max(0, Math.min(100, value ?? 0))}%` }} />
    </div>
  );
}

export function Spinner({ size = 16 }: { size?: number }) {
  return <Loader2 size={size} className="spin" aria-hidden />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {action ? <div className="empty-action">{action}</div> : null}
    </div>
  );
}

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; icon?: ReactNode }>;
  ariaLabel?: string;
}

export function Segmented<T extends string>({ value, onChange, options, ariaLabel }: SegmentedProps<T>) {
  return (
    <div className="segmented" role="tablist" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          className={classNames("segmented-item", value === option.value && "is-active")}
          onClick={() => onChange(option.value)}
        >
          {option.icon}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  eyebrow?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
  className?: string;
}

export function Modal({ open, onClose, title, eyebrow, children, footer, width, className }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={classNames("modal", className)}
        style={width ? { width: `min(${width}px, 100%)` } : undefined}
        role="dialog"
        aria-modal="true"
      >
        <header className="modal-head">
          <div>
            {eyebrow ? <span className="panel-eyebrow">{eyebrow}</span> : null}
            <h2 className="modal-title">{title}</h2>
          </div>
          <IconButton label="Close" size="sm" onClick={onClose}>
            <X size={16} />
          </IconButton>
        </header>
        <div className="modal-body">{children}</div>
        {footer ? <footer className="modal-foot">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger,
  busy,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      eyebrow="Please confirm"
      width={440}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="confirm-message">{message}</p>
    </Modal>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={classNames("field", className)}>
      <span className="field-label">{label}</span>
      {children}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

export function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className={classNames("stat-value", accent && "stat-value--accent")}>{value}</span>
      {hint ? <span className="stat-hint">{hint}</span> : null}
    </div>
  );
}
