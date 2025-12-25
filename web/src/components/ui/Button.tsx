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
    md: 'h-10 sm:h-12 px-4 sm:px-5',
    lg: 'h-14 sm:h-16 lg:h-12 px-6 sm:px-7 lg:px-8 text-base sm:text-lg'
  };

  const baseClasses = `inline-flex items-center justify-center ${theme.btnRadius} font-semibold transition-all disabled:opacity-50 disabled:pointer-events-none select-none hover:brightness-110`;
  const variantClasses = variant === 'primary' ? theme.primaryBtn : theme.secondaryBtn;

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
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