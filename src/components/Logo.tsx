import epPartnersLogo from "@/assets/ep-partners-logo.png";

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const Logo = ({ size = 'md', className = '' }: LogoProps) => {
  const sizeClasses = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-16',
    xl: 'h-20'
  };

  return (
    <img 
      src={epPartnersLogo} 
      alt="EP Partners" 
      className={`object-contain ${sizeClasses[size]} ${className}`}
    />
  );
};

export default Logo;
