import React from 'react';
import { motion } from 'framer-motion';
import type { Theme } from '../../utils/theme';

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | 'onDragEnd' | 'onDragStart'> {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  theme: Theme;
}

const Button: React.FC<ButtonProps> = ({ 
  className = '', 
  variant = 'primary', 
  size = 'md', 
  theme, 
  children,
  onClick,
  disabled,
  type,
 
}) => {
  const sizeClasses = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-12 px-5',
    lg: 'h-16 px-7 text-lg'
  };

  const baseClasses = `inline-flex items-center justify-center ${theme.btnRadius} font-semibold transition disabled:opacity-50 disabled:pointer-events-none select-none`;
  const variantClasses = variant === 'primary' ? theme.primaryBtn : theme.secondaryBtn;

  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 300, damping: 18 }}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses} ${className}`}
      onClick={onClick}
      disabled={disabled}
      type={type}
    >
      {children}
    </motion.button>
  );
};

export default Button;