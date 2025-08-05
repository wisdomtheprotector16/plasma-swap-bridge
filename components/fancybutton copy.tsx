import * as React from "react";
import styled from "styled-components";
import { Button as ShadCNButton, type ButtonProps as ShadCNButtonProps } from "@/components/ui/button";

interface CustomButtonProps extends ShadCNButtonProps {
  hoverText?: string;
  defaultText?: string;
  gradientColors?: [string, string];
  width?: string;
  height?: string;
}

const Button: React.FC<CustomButtonProps> = ({
  hoverText = "Hello!",
  defaultText = "Hover me",
  gradientColors = ["#7b4397", "#dc2430"],
  width = "150px",
  height = "60px",
  className,
  children,
  ...props
}) => {
  return (
    <StyledWrapper
      $gradientStart={gradientColors[0]}
      $gradientEnd={gradientColors[1]}
      $width={width}
      $height={height}
    >
      <ShadCNButton
        className={`button ${className || ""}`}
        {...props}
      >
        {children || (
          <>
            <span className="default-text">{defaultText}</span>
            <span className="hover-text">{hoverText}</span>
          </>
        )}
      </ShadCNButton>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div<{
  $gradientStart: string;
  $gradientEnd: string;
  $width: string;
  $height: string;
}>`
  .button {
    position: relative;
    background-color: transparent;
    color: #e8e8e8;
    font-size: 17px;
    font-weight: 600;
    border-radius: 10px;
    width: ${props => props.$width};
    height: ${props => props.$height};
    border: none;
    text-transform: uppercase;
    cursor: pointer;
    overflow: hidden;
    box-shadow: 0 10px 20px rgba(51, 51, 51, 0.2);
    transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;

    /* Default shadcn button styles we want to keep */
    font-family: inherit;
    font-size: 0.875rem;
    line-height: 1.25rem;
    font-weight: 500;
    white-space: nowrap;
    vertical-align: middle;
    user-select: none;

    /* Hide the default button content */
    .default-text,
    .hover-text {
      position: absolute;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1);
      left: 0;
      top: 0;
    }

    .default-text {
      background-color: #333;
      transform: translateY(0%);
    }

    .hover-text {
      background: linear-gradient(
        135deg,
        ${props => props.$gradientStart},
        ${props => props.$gradientEnd}
      );
      transform: translateY(100%);
    }

    &:hover {
      .default-text {
        transform: translateY(-100%);
      }

      .hover-text {
        transform: translateY(0%);
      }
    }

    &:focus {
      outline: none;
    }

    &:active {
      scale: 0.95;
    }
  }
`;

export { Button };
export type { CustomButtonProps as ButtonProps };