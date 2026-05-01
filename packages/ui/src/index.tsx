import { getWashedTheme, type WashedTheme, type WashedThemeName } from '@washed/design-tokens';
import {
  createContext,
  forwardRef,
  useContext,
  useId,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';

export type WashedThemeInput = WashedTheme | WashedThemeName;
export type ComponentSize = 'lg' | 'md' | 'sm';
export type Tone = 'accent' | 'danger' | 'muted' | 'primary' | 'success';

export interface WashedThemeProviderProps extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
  readonly theme?: WashedThemeInput;
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly fullWidth?: boolean;
  readonly leftIcon?: ReactNode;
  readonly loading?: boolean;
  readonly rightIcon?: ReactNode;
  readonly size?: ComponentSize;
  readonly variant?: 'danger' | 'ghost' | 'primary' | 'secondary';
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly label: string;
  readonly size?: ComponentSize;
  readonly variant?: ButtonProps['variant'];
}

export interface TextFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'aria-describedby' | 'aria-invalid' | 'id'
> {
  readonly error?: string;
  readonly hint?: string;
  readonly id?: string;
  readonly label: string;
}

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  readonly elevated?: boolean;
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  readonly tone?: Tone;
}

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  readonly title?: string;
  readonly tone?: Tone;
}

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  readonly action?: ReactNode;
  readonly description?: string;
  readonly title: string;
}

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  readonly height?: number | string;
  readonly width?: number | string;
}

export interface ListItemProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  readonly after?: ReactNode;
  readonly before?: ReactNode;
  readonly description?: ReactNode;
  readonly title: ReactNode;
}

export interface BottomNavItem {
  readonly active?: boolean;
  readonly href?: string;
  readonly icon?: ReactNode;
  readonly label: string;
  readonly onClick?: () => void;
}

export interface BottomNavProps extends HTMLAttributes<HTMLElement> {
  readonly items: readonly BottomNavItem[];
}

export interface TabsProps extends HTMLAttributes<HTMLDivElement> {
  readonly tabs: readonly TabItem[];
}

export interface TabItem {
  readonly active?: boolean;
  readonly label: string;
  readonly onClick?: () => void;
}

type CssVariables = CSSProperties & Record<`--washed-${string}`, string>;

const ThemeContext = createContext<WashedTheme>(getWashedTheme('subscriber'));

export function WashedThemeProvider({
  children,
  style,
  theme = 'subscriber',
  ...props
}: WashedThemeProviderProps): ReactElement {
  const resolvedTheme = resolveTheme(theme);

  return (
    <ThemeContext.Provider value={resolvedTheme}>
      <div
        {...props}
        data-washed-theme={resolvedTheme.name}
        style={{
          ...themeToCssVariables(resolvedTheme),
          ...surfaceReset(resolvedTheme),
          ...style,
        }}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useWashedTheme(): WashedTheme {
  return useContext(ThemeContext);
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    disabled,
    fullWidth = false,
    leftIcon,
    loading = false,
    rightIcon,
    size = 'md',
    style,
    type = 'button',
    variant = 'primary',
    ...props
  },
  ref,
) {
  const theme = useWashedTheme();
  const isDisabled = disabled === true || loading;

  return (
    <button
      {...props}
      ref={ref}
      aria-busy={loading || undefined}
      disabled={isDisabled}
      style={{
        ...buttonStyle(theme, variant, size, fullWidth, isDisabled),
        ...style,
      }}
      type={type}
    >
      {leftIcon === undefined ? null : <span aria-hidden="true">{leftIcon}</span>}
      {loading ? <span aria-hidden="true">...</span> : null}
      <span>{children}</span>
      {rightIcon === undefined ? null : <span aria-hidden="true">{rightIcon}</span>}
    </button>
  );
});

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { children, label, size = 'md', style, variant = 'ghost', ...props },
  ref,
) {
  const theme = useWashedTheme();

  return (
    <button
      {...props}
      ref={ref}
      aria-label={label}
      style={{
        ...buttonStyle(theme, variant, size, false, props.disabled === true),
        aspectRatio: '1 / 1',
        borderRadius: theme.shared.radius.control,
        padding: 0,
        width: size === 'sm' ? 40 : size === 'lg' ? 52 : 44,
        ...style,
      }}
      title={props.title ?? label}
      type={props.type ?? 'button'}
    >
      {children}
    </button>
  );
});

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { error, hint, id, label, style, ...props },
  ref,
) {
  const theme = useWashedTheme();
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = hint === undefined ? undefined : `${inputId}-hint`;
  const errorId = error === undefined ? undefined : `${inputId}-error`;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div style={{ display: 'grid', gap: 8, ...style }}>
      <label
        htmlFor={inputId}
        style={{ color: theme.colors.foreground, fontSize: 14, fontWeight: 700 }}
      >
        {label}
      </label>
      <input
        {...props}
        ref={ref}
        aria-describedby={describedBy}
        aria-invalid={error === undefined ? undefined : true}
        id={inputId}
        style={{
          background: theme.colors.surface,
          border: `1px solid ${error === undefined ? theme.colors.border : theme.colors.danger}`,
          borderRadius: theme.shared.radius.control,
          boxSizing: 'border-box',
          color: theme.colors.foreground,
          font: `500 16px ${theme.shared.fontFamily.body}`,
          minHeight: theme.shared.tapTarget.minimum,
          outlineColor: theme.colors.primary,
          padding: '10px 12px',
          width: '100%',
        }}
      />
      {hint === undefined ? null : (
        <span id={descriptionId} style={{ color: theme.colors.muted, fontSize: 13 }}>
          {hint}
        </span>
      )}
      {error === undefined ? null : (
        <span id={errorId} role="alert" style={{ color: theme.colors.danger, fontSize: 13 }}>
          {error}
        </span>
      )}
    </div>
  );
});

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { children, elevated = false, style, ...props },
  ref,
) {
  const theme = useWashedTheme();

  return (
    <div
      {...props}
      ref={ref}
      style={{
        background: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.shared.radius.panel,
        boxShadow: elevated ? theme.shared.shadow.elevated : theme.shared.shadow.card,
        color: theme.colors.foreground,
        padding: 16,
        ...style,
      }}
    >
      {children}
    </div>
  );
});

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { children, tone = 'primary', style, ...props },
  ref,
) {
  const theme = useWashedTheme();
  const colors = toneColors(theme, tone);

  return (
    <span
      {...props}
      ref={ref}
      style={{
        alignItems: 'center',
        background: colors.muted,
        borderRadius: theme.shared.radius.pill,
        color: colors.strong,
        display: 'inline-flex',
        fontSize: 12,
        fontWeight: 800,
        minHeight: 24,
        padding: '2px 10px',
        ...style,
      }}
    >
      {children}
    </span>
  );
});

export const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  { children, title, tone = 'primary', style, ...props },
  ref,
) {
  const theme = useWashedTheme();
  const colors = toneColors(theme, tone);

  return (
    <div
      {...props}
      ref={ref}
      role={tone === 'danger' ? 'alert' : 'status'}
      style={{
        background: colors.muted,
        border: `1px solid ${colors.border}`,
        borderRadius: theme.shared.radius.panel,
        color: theme.colors.foreground,
        padding: 14,
        ...style,
      }}
    >
      {title === undefined ? null : (
        <strong style={{ color: colors.strong, display: 'block', marginBottom: 4 }}>{title}</strong>
      )}
      {children}
    </div>
  );
});

export function EmptyState({
  action,
  description,
  style,
  title,
  ...props
}: EmptyStateProps): ReactElement {
  const theme = useWashedTheme();

  return (
    <div
      {...props}
      style={{
        alignItems: 'center',
        color: theme.colors.foreground,
        display: 'grid',
        gap: 10,
        justifyItems: 'center',
        padding: '32px 16px',
        textAlign: 'center',
        ...style,
      }}
    >
      <strong style={{ fontSize: 18 }}>{title}</strong>
      {description === undefined ? null : (
        <span style={{ color: theme.colors.muted, maxWidth: 360 }}>{description}</span>
      )}
      {action}
    </div>
  );
}

export function Skeleton({
  height = 16,
  style,
  width = '100%',
  ...props
}: SkeletonProps): ReactElement {
  const theme = useWashedTheme();

  return (
    <div
      {...props}
      aria-hidden="true"
      style={{
        background: theme.colors.primarySoft,
        borderRadius: theme.shared.radius.control,
        height,
        width,
        ...style,
      }}
    />
  );
}

export const ListItem = forwardRef<HTMLDivElement, ListItemProps>(function ListItem(
  { after, before, description, style, title, ...props },
  ref,
) {
  const theme = useWashedTheme();

  return (
    <div
      {...props}
      ref={ref}
      style={{
        alignItems: 'center',
        background: theme.colors.surface,
        borderBottom: `1px solid ${theme.colors.border}`,
        color: theme.colors.foreground,
        display: 'grid',
        gap: 12,
        gridTemplateColumns: `${before === undefined ? '' : 'auto '}1fr${
          after === undefined ? '' : ' auto'
        }`,
        minHeight: 56,
        padding: '10px 0',
        ...style,
      }}
    >
      {before}
      <div style={{ display: 'grid', gap: 2 }}>
        <strong style={{ fontSize: 15 }}>{title}</strong>
        {description === undefined ? null : (
          <span style={{ color: theme.colors.muted, fontSize: 13 }}>{description}</span>
        )}
      </div>
      {after}
    </div>
  );
});

export function BottomNav({ items, style, ...props }: BottomNavProps): ReactElement {
  const theme = useWashedTheme();

  return (
    <nav
      {...props}
      aria-label={props['aria-label'] ?? 'Primary'}
      style={{
        background: theme.colors.surface,
        borderTop: `1px solid ${theme.colors.border}`,
        display: 'grid',
        gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
        minHeight: 64,
        ...style,
      }}
    >
      {items.map((item) => (
        <NavAction item={item} key={item.label} theme={theme} />
      ))}
    </nav>
  );
}

export function Tabs({ tabs, style, ...props }: TabsProps): ReactElement {
  const theme = useWashedTheme();

  return (
    <div
      {...props}
      role="tablist"
      style={{
        background: theme.colors.primarySoft,
        borderRadius: theme.shared.radius.pill,
        display: 'inline-grid',
        gap: 4,
        gridAutoColumns: '1fr',
        gridAutoFlow: 'column',
        padding: 4,
        ...style,
      }}
    >
      {tabs.map((tab) => (
        <button
          aria-selected={tab.active === true}
          key={tab.label}
          onClick={tab.onClick}
          role="tab"
          style={{
            background: tab.active === true ? theme.colors.surface : 'transparent',
            border: 0,
            borderRadius: theme.shared.radius.pill,
            color: tab.active === true ? theme.colors.primary : theme.colors.muted,
            cursor: 'pointer',
            font: `800 14px ${theme.shared.fontFamily.body}`,
            minHeight: 36,
            padding: '8px 14px',
          }}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function NavAction({
  item,
  theme,
}: {
  readonly item: BottomNavItem;
  readonly theme: WashedTheme;
}): ReactElement {
  const style: CSSProperties = {
    alignItems: 'center',
    background: 'transparent',
    border: 0,
    color: item.active === true ? theme.colors.primary : theme.colors.muted,
    display: 'grid',
    font: `800 12px ${theme.shared.fontFamily.body}`,
    gap: 4,
    justifyItems: 'center',
    minHeight: 64,
    padding: '8px 6px',
    textDecoration: 'none',
  };
  const content = (
    <>
      {item.icon === undefined ? null : <span aria-hidden="true">{item.icon}</span>}
      <span>{item.label}</span>
    </>
  );

  if (item.href !== undefined) {
    const anchorProps: AnchorHTMLAttributes<HTMLAnchorElement> = {
      'aria-current': item.active === true ? 'page' : undefined,
      href: item.href,
      onClick: item.onClick,
      style,
    };

    return <a {...anchorProps}>{content}</a>;
  }

  return (
    <button
      aria-current={item.active === true ? 'page' : undefined}
      onClick={item.onClick}
      style={{ ...style, cursor: 'pointer' }}
      type="button"
    >
      {content}
    </button>
  );
}

function buttonStyle(
  theme: WashedTheme,
  variant: NonNullable<ButtonProps['variant']>,
  size: ComponentSize,
  fullWidth: boolean,
  disabled: boolean,
): CSSProperties {
  const palette = buttonPalette(theme, variant);
  const height = size === 'sm' ? 40 : size === 'lg' ? 52 : 44;

  return {
    alignItems: 'center',
    background: palette.background,
    border: `1px solid ${palette.border}`,
    borderRadius: theme.shared.radius.control,
    color: palette.color,
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    font: `800 ${size === 'sm' ? 14 : 16}px ${theme.shared.fontFamily.body}`,
    gap: 8,
    justifyContent: 'center',
    minHeight: Math.max(height, Number.parseInt(theme.shared.tapTarget.minimum, 10)),
    opacity: disabled ? 0.58 : 1,
    padding: size === 'sm' ? '8px 12px' : size === 'lg' ? '12px 18px' : '10px 16px',
    width: fullWidth ? '100%' : undefined,
  };
}

function buttonPalette(
  theme: WashedTheme,
  variant: NonNullable<ButtonProps['variant']>,
): {
  readonly background: string;
  readonly border: string;
  readonly color: string;
} {
  if (variant === 'danger') {
    return {
      background: theme.colors.danger,
      border: theme.colors.danger,
      color: '#ffffff',
    };
  }

  if (variant === 'ghost') {
    return {
      background: 'transparent',
      border: 'transparent',
      color: theme.colors.primary,
    };
  }

  if (variant === 'secondary') {
    return {
      background: theme.colors.primarySoft,
      border: theme.colors.primaryMuted,
      color: theme.colors.primary,
    };
  }

  return {
    background: theme.colors.primary,
    border: theme.colors.primary,
    color: '#ffffff',
  };
}

function resolveTheme(theme: WashedThemeInput): WashedTheme {
  return typeof theme === 'string' ? getWashedTheme(theme) : theme;
}

function surfaceReset(theme: WashedTheme): CSSProperties {
  return {
    background: theme.colors.background,
    color: theme.colors.foreground,
    fontFamily: theme.shared.fontFamily.body,
  };
}

function themeToCssVariables(theme: WashedTheme): CssVariables {
  return {
    '--washed-accent': theme.colors.accent,
    '--washed-background': theme.colors.background,
    '--washed-border': theme.colors.border,
    '--washed-danger': theme.colors.danger,
    '--washed-font-body': theme.shared.fontFamily.body,
    '--washed-font-brand': theme.shared.fontFamily.brand,
    '--washed-foreground': theme.colors.foreground,
    '--washed-muted': theme.colors.muted,
    '--washed-primary': theme.colors.primary,
    '--washed-primary-soft': theme.colors.primarySoft,
    '--washed-success': theme.colors.success,
    '--washed-surface': theme.colors.surface,
  };
}

function toneColors(
  theme: WashedTheme,
  tone: Tone,
): {
  readonly border: string;
  readonly muted: string;
  readonly strong: string;
} {
  if (tone === 'accent') {
    return {
      border: theme.colors.accent,
      muted: theme.colors.accentMuted,
      strong: theme.colors.accent,
    };
  }

  if (tone === 'danger') {
    return {
      border: theme.colors.danger,
      muted: theme.colors.dangerMuted,
      strong: theme.colors.danger,
    };
  }

  if (tone === 'muted') {
    return {
      border: theme.colors.border,
      muted: theme.colors.primarySoft,
      strong: theme.colors.muted,
    };
  }

  if (tone === 'success') {
    return {
      border: theme.colors.success,
      muted: theme.colors.successMuted,
      strong: theme.colors.success,
    };
  }

  return {
    border: theme.colors.primary,
    muted: theme.colors.primaryMuted,
    strong: theme.colors.primary,
  };
}
