'use client';

import React from 'react';

export const BentoGrid = ({
  className = '',
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={`grid md:auto-rows-[18rem] grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto ${className}`}
    >
      {children}
    </div>
  );
};

export const BentoGridItem = ({
  className = '',
  title,
  description,
  header,
  icon,
}: {
  className?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
}) => {
  return (
    <div
      className={`row-span-1 rounded-3xl group/bento hover:shadow-gold-glow transition duration-500 p-6 bg-white/95 backdrop-blur-xl border border-gold-500/20 justify-between flex flex-col space-y-4 hover:-translate-y-1 ${className}`}
    >
      {header}
      <div className="group-hover/bento:translate-x-2 transition duration-500 space-y-2">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-serif text-lg text-royal-950">{title}</h3>
        </div>
        <p className="text-xs text-charcoal-400 font-sans leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
};
