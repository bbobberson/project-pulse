export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">
          Project Pulse
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl">
          Real-time project status updates for consultancies and their clients
        </p>
        <div className="space-x-4">
          <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
            PM Login
          </button>
          <button className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors">
            Client Portal
          </button>
        </div>
        <div className="mt-12 text-sm text-gray-500">
          Built for consultancies to share real-time project updates with clients
        </div>
      </div>
    </div>
  );
}
