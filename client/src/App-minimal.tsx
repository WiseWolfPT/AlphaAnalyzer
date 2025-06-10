import { Switch, Route } from "wouter";

function HomePage() {
  return (
    <div style={{ padding: '40px', background: '#111', color: 'white', minHeight: '100vh' }}>
      <h1>🏠 HOME PAGE</h1>
      <p>Current URL: {window.location.pathname}</p>
      <div style={{ margin: '20px 0' }}>
        <a href="/" style={{ margin: '10px', padding: '10px', background: '#333', color: 'white', textDecoration: 'none' }}>Home</a>
        <a href="/dashboard" style={{ margin: '10px', padding: '10px', background: '#333', color: 'white', textDecoration: 'none' }}>Dashboard</a>
        <a href="/test" style={{ margin: '10px', padding: '10px', background: '#333', color: 'white', textDecoration: 'none' }}>Test</a>
      </div>
    </div>
  );
}

function DashboardPage() {
  return (
    <div style={{ padding: '40px', background: '#111', color: 'white', minHeight: '100vh' }}>
      <h1>📊 DASHBOARD PAGE</h1>
      <p>Current URL: {window.location.pathname}</p>
      <div style={{ margin: '20px 0' }}>
        <a href="/" style={{ margin: '10px', padding: '10px', background: '#333', color: 'white', textDecoration: 'none' }}>Home</a>
        <a href="/dashboard" style={{ margin: '10px', padding: '10px', background: '#333', color: 'white', textDecoration: 'none' }}>Dashboard</a>
        <a href="/test" style={{ margin: '10px', padding: '10px', background: '#333', color: 'white', textDecoration: 'none' }}>Test</a>
      </div>
    </div>
  );
}

function TestPage() {
  return (
    <div style={{ padding: '40px', background: '#111', color: 'white', minHeight: '100vh' }}>
      <h1>🧪 TEST PAGE</h1>
      <p>Current URL: {window.location.pathname}</p>
      <div style={{ margin: '20px 0' }}>
        <a href="/" style={{ margin: '10px', padding: '10px', background: '#333', color: 'white', textDecoration: 'none' }}>Home</a>
        <a href="/dashboard" style={{ margin: '10px', padding: '10px', background: '#333', color: 'white', textDecoration: 'none' }}>Dashboard</a>
        <a href="/test" style={{ margin: '10px', padding: '10px', background: '#333', color: 'white', textDecoration: 'none' }}>Test</a>
      </div>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div style={{ padding: '40px', background: '#800', color: 'white', minHeight: '100vh' }}>
      <h1>❌ 404 NOT FOUND</h1>
      <p>Current URL: {window.location.pathname}</p>
      <p>This page doesn't exist!</p>
    </div>
  );
}

export default function App() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/test" component={TestPage} />
      <Route component={NotFoundPage} />
    </Switch>
  );
}