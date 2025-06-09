import { SimpleLink } from "@/simple-link";

export default function SimpleDashboard() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="flex">
        {/* Simple Sidebar */}
        <div className="w-64 bg-gray-800 p-4 mr-8">
          <h2 className="text-xl font-bold mb-4">Navigation</h2>
          <div className="space-y-2">
            <SimpleLink href="/" className="block p-2 hover:bg-gray-700 rounded">
              Home
            </SimpleLink>
            <SimpleLink href="/dashboard" className="block p-2 hover:bg-gray-700 rounded bg-blue-600">
              Dashboard
            </SimpleLink>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1">
          <h1 className="text-4xl font-bold mb-4">Simple Dashboard</h1>
          <p className="text-lg">This is working! The routing is functional.</p>
          <div className="mt-8 p-4 bg-gray-800 rounded">
            <p>If you see this, the /dashboard route is working correctly.</p>
            <p className="mt-2">Current URL: {window.location.pathname}</p>
          </div>
        </div>
      </div>
    </div>
  );
}