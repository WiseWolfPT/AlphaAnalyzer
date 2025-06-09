import { useState, useEffect } from 'react';

interface RouteProps {
  path: string;
  component: React.ComponentType;
}

interface RouterProps {
  children: React.ReactElement<RouteProps>[];
}

function Route({ path, component: Component }: RouteProps) {
  return <Component />;
}

function SimpleRouter({ children }: RouterProps) {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Find matching route
  const matchedRoute = children.find(child => {
    const routePath = child.props.path;
    if (routePath === currentPath) return true;
    if (routePath === '*') return true; // fallback
    return false;
  });

  if (matchedRoute) {
    const Component = matchedRoute.props.component;
    return <Component />;
  }

  // Fallback to 404
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
      <p>Current path: {currentPath}</p>
      <p>Available routes:</p>
      <ul className="list-disc ml-6 mt-4">
        {children.map((child, i) => (
          <li key={i}>{child.props.path}</li>
        ))}
      </ul>
    </div>
  );
}

export { SimpleRouter, Route };