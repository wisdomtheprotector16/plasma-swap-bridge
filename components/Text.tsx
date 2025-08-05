// @/components/Text

import React from "react";
import { cn } from "@/lib/utils";

export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  variant?:
    | "heading"
    | "subheading"
    | "body"
    | "caption"
    | "label"
    | "value"
    | "muted";
  size?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
  as?: keyof JSX.IntrinsicElements;
  weight?: "normal" | "medium" | "semibold" | "bold";
}

const variants = {
  heading: "text-foreground font-semibold",
  subheading: "text-muted-foreground font-medium",
  body: "text-foreground",
  caption: "text-muted-foreground text-xs",
  label: "text-foreground font-medium",
  value: "text-foreground font-medium",
  muted: "text-muted-foreground",
};

const sizes = {
  xs: "text-[10px] md:text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
  "3xl": "text-3xl  md:text-4xl ",
  "4xl": "text-4xl md:text-5xl lg:text-6xl", // Your requested responsive heading size
};

const weights = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

const defaultElements = {
  heading: "h2",
  subheading: "h3",
  body: "p",
  caption: "span",
  label: "label",
  value: "span",
  muted: "p",
} as const;

export const Text = ({
  children,
  className,
  variant = "body",
  size,
  weight,
  as,
  ...props
}: TextProps) => {
  const Component = as || (defaultElements[variant] as keyof JSX.IntrinsicElements);
  
  return (
    <Component
      className={cn(
        variants[variant],
        size && sizes[size],
        weight && weights[weight],
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
};

// Optional: Export convenience components for better DX
export const Heading = (props: Omit<TextProps, 'variant'>) => (
  <Text variant="heading" {...props} />
);

export const Subheading = (props: Omit<TextProps, 'variant'>) => (
  <Text variant="subheading" {...props} />
);

export const Body = (props: Omit<TextProps, 'variant'>) => (
  <Text variant="body" {...props} />
);

export const Caption = (props: Omit<TextProps, 'variant'>) => (
  <Text variant="caption" {...props} />
);

export const Label = (props: Omit<TextProps, 'variant'>) => (
  <Text variant="label" {...props} />
);

export const Value = (props: Omit<TextProps, 'variant'>) => (
  <Text variant="value" {...props} />
);

export const Muted = (props: Omit<TextProps, 'variant'>) => (
  <Text variant="muted" {...props} />
);