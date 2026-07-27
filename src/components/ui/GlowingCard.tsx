'use client';

import React from 'react';

export const GlowingCard = ({
  children,
  className = '',
  containerClassName = '',
}: {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
}) => {
  return (
    <div className={`relative p-[1px] rounded-3xl group overflow-hidden ${containerClassName}`}>
      {/* Aceternity Glowing Border Gradient Accent */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-gold-500 via-royal-500 to-amber-300 opacity-30 group-hover:opacity-100 transition-opacity duration-700 blur-[2px]" />
      
      {/* Content Container */}
      <div className={`relative bg-white/90 backdrop-blur-xl rounded-[23px] p-8 ${className}`}>
        {children}
      </div>
    </div>
  );
};
