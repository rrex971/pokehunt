interface TypeIconProps {
  type: string;
  size?: number;
  withGlow?: boolean;
  showLabel?: boolean;
  className?: string;
}

export default function TypeIcon({ type, size = 20, withGlow = false, showLabel = false, className = '' }: TypeIconProps) {
  const typeLower = type.toLowerCase();
  
  if (withGlow) {
    return (
      <div className={`relative inline-block ${className}`} style={{ width: size, height: size }}>
        <div 
          className="absolute inset-0 rounded-full blur-md opacity-60"
          style={{ 
            backgroundColor: `var(--type-${typeLower}, #888)`,
            filter: 'blur(6px)'
          }}
        />
        <img 
          src={`/types/${typeLower}.png`} 
          alt={type} 
          className="relative z-10 w-full h-full object-contain"
          style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.5))' }}
        />
      </div>
    );
  }
  
  if (showLabel) {
    return (
      <div className={`inline-flex items-center gap-1 ${className}`}>
        <img 
          src={`/types/${typeLower}.png`} 
          alt={type} 
          width={size}
          height={size}
          className="inline-block object-contain"
        />
        <span className="uppercase font-bold">{type}</span>
      </div>
    );
  }
  
  return (
    <img 
      src={`/types/${typeLower}.png`} 
      alt={type} 
      width={size}
      height={size}
      className={`inline-block object-contain ${className}`}
    />
  );
}
