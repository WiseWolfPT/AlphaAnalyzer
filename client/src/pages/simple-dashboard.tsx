export default function SimpleDashboard() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold mb-4">Simple Dashboard</h1>
      <p className="text-lg">This is working! The routing is functional.</p>
      <div className="mt-8 p-4 bg-gray-800 rounded">
        <p>If you see this, the /dashboard route is working correctly.</p>
      </div>
    </div>
  );
}