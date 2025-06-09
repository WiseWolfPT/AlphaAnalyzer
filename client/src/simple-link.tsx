interface SimpleLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function SimpleLink({ href, children, className }: SimpleLinkProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.history.pushState({}, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}