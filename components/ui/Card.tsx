
import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

const Card: React.FC<CardProps> = ({ children, className = '', noPadding = false, ...props }) => {
  return (
    <div 
        className={`bg-gray-800/40 backdrop-blur-xl border border-white/5 shadow-xl rounded-xl ${noPadding ? '' : 'p-6'} ${className}`} 
        {...props}
    >
      {children}
    </div>
  );
};

export default Card;