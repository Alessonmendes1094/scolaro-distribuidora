import { useEffect, useState } from 'react';
import { buscarLogoUrl, LOGO_PADRAO } from '../lib/logo';

export default function Logo({ className, alt = 'Logo' }) {
  const [src, setSrc] = useState(LOGO_PADRAO);

  useEffect(() => {
    let ativo = true;
    buscarLogoUrl().then((url) => {
      if (ativo) setSrc(url);
    });
    return () => {
      ativo = false;
    };
  }, []);

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={(e) => {
        if (e.target.src !== window.location.origin + LOGO_PADRAO) {
          e.target.src = LOGO_PADRAO;
        }
      }}
    />
  );
}
