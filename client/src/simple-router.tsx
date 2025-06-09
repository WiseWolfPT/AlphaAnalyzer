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
      console.log('PopState event received, updating path to:', window.location.pathname);
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  console.log('SimpleRouter rendering, currentPath:', currentPath);
  console.log('Available routes:', children.map(c => c.props.path));

  // Find matching route
  const matchedRoute = children.find(child => {
    const routePath = child.props.path;
    if (routePath === currentPath) return true;
    if (routePath === '*') return true; // fallback
    return false;
  });

  console.log('Matched route:', matchedRoute?.props.path);

  if (matchedRoute) {
    const Component = matchedRoute.props.component;
    return <Component />;
  }

  // Fallback to 404
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
      <p>Current path: {currentPath}</p>
      <p>Window location: {window.location.pathname}</p>
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