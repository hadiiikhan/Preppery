'use client';

import { ReactNode, MouseEvent } from 'react';
import Link from 'next/link';
import './ChromaButton.css';

interface ChromaButtonProps {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  /** Border color (matches app blue/slate accents) */
  borderColor?: string;
  /** Button fill: solid hex or any valid CSS background (default plain primary blue) */
  gradient?: string;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  style?: React.CSSProperties;
}

export default function ChromaButton({
  children,
  href,
  onClick,
  borderColor = '#1e40af',
  gradient = '#2563eb',
  className = '',
  disabled = false,
  type = 'button',
  style: customStyle
}: ChromaButtonProps) {
  const handleCardMove = (e: MouseEvent<HTMLElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);
  };

  const baseClasses = `chroma-button relative inline-flex items-center justify-center px-6 py-3 font-semibold text-white transition-all ${className}`;
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : '';

  const style = {
    '--card-border': borderColor,
    '--card-gradient': gradient,
    '--mouse-x': '50%',
    '--mouse-y': '50%',
    '--spotlight-color': 'rgba(255, 255, 255, 0.28)',
    background: gradient,
    cursor: disabled ? 'not-allowed' : 'pointer',
    ...customStyle
  } as React.CSSProperties;

  if (href && !disabled) {
    return (
      <Link
        href={href}
        className={`${baseClasses} ${disabledClasses}`}
        style={style}
        onMouseMove={handleCardMove}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${disabledClasses}`}
      style={style}
      onMouseMove={handleCardMove}
    >
      {children}
    </button>
  );
}

