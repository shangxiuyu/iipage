import React from 'react';

interface BuiltinImageBackgroundProps {
  isActive: boolean;
  imagePath?: string | null;
}

const BuiltinImageBackground: React.FC<BuiltinImageBackgroundProps> = ({
  isActive,
  imagePath
}) => {
  if (!isActive || !imagePath) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -10,
        pointerEvents: 'none',
        backgroundImage: `url(${imagePath})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    />
  );
};

export default BuiltinImageBackground; 