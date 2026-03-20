'use client';

import { ReactNode, MouseEvent } from 'react';
import './ChromaText.css';

interface ChromaTextProps {
  children: ReactNode;
  borderColor?: string;
  gradient?: string;
  className?: string;
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'p' | 'div';
  style?: React.CSSProperties;
}

export default function ChromaText({
  children,
  borderColor = '#3b82f6',
  gradient = 'linear-gradient(145deg, #3b82f6, #06b6d4)',
  className = '',
  as = 'span',
  style: customStyle
}: ChromaTextProps) {
  const handleCardMove = (e: MouseEvent<HTMLElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);
  };

  const baseClasses = `chroma-text relative inline-block ${className}`;
  const style = {
    '--card-border': borderColor,
    '--card-gradient': gradient,
    '--mouse-x': '50%',
    '--mouse-y': '50%',
    '--spotlight-color': 'rgba(255, 255, 255, 0.4)',
    background: gradient,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    ...customStyle,
  } as React.CSSProperties;

  const Component = as;

  return (
    <Component
      className={baseClasses}
      style={style}
      onMouseMove={handleCardMove}
    >
      {children}
    </Component>
  );
}

