interface SimpleLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function SimpleLink({ href, children, className }: SimpleLinkProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log('SimpleLink clicked:', href);
    console.log('Current location before:', window.location.pathname);
    
    window.history.pushState({}, '', href);
    console.log('Current location after pushState:', window.location.pathname);
    
    window.dispatchEvent(new PopStateEvent('popstate'));
    console.log('PopState event dispatched');
  };

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}