import { createFileRoute } from "@tanstack/react-router";
import { Button, Input } from "@/components/ui/shadCnLibrary";
import { SearchIcon } from "lucide-react";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans antialiased text-gray-800">
      {/* Hero Section */}
      <section
        className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20 md:py-32 lg:py-40 overflow-hidden shadow-lg flex items-center"
        style={{
          backgroundImage:
            "url('https://weoskbh2n0.ufs.sh/f/kxDpBx5RyAdYC025Nqh1zsNE4p5MK2CuZn6tJcFeVWivR3wg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-blue-900/60"></div>
        <div className="container mx-auto px-4 relative z-10 flex flex-col items-center md:items-start">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6 animate-fade-in-up drop-shadow-lg text-center md:text-left">
            Navigate Perth with <span className="text-blue-200">Routyr</span>
          </h1>
          <p className="text-lg md:text-2xl lg:text-3xl mb-10 opacity-90 animate-fade-in-up delay-200 max-w-2xl drop-shadow-md text-center md:text-left">
            Real-time bus tracking, route planning, and smart notifications –
            <br />
            all in one Site.
          </p>
          <Button
            size="lg"
            className="bg-white text-blue-700 hover:bg-gray-100 transition-transform transform hover:scale-105 shadow-lg animate-fade-in-up delay-400"
            // onClick={() => window.location.href = '/dashboard'}
          >
            Start Tracking Now
          </Button>
        </div>
        {/* Abstract background shapes for visual appeal */}
        <div className="absolute inset-0 bg-pattern-dots opacity-10"></div>
      </section>

      {/* Features Section - STOPS */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center gap-12">
          <div className="md:w-1/2 order-2 md:order-1 text-center md:text-left">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              <span className="text-blue-600">STOPS:</span> Track Your Bus, Live
            </h2>
            <p className="text-lg text-gray-700 mb-6">
              Never miss your bus again. Simply enter a stop number to see all
              upcoming buses, their live locations, and estimated arrival times.
              Get real-time updates directly to your device.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                type="text"
                placeholder="Enter Stop Number (e.g., 12345)"
                className="flex-grow p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              />
              {/* This button would typically link to the /stops page with the stop number pre-filled or searched */}
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                // onClick={() => window.location.href = '/stops'} // Example navigation
              >
                <SearchIcon className="h-5 w-5 mr-2" /> Track Stop
              </Button>
            </div>
          </div>
          <div className="md:w-1/2 order-1 md:order-2 flex justify-center">
            {/* Placeholder for a stop-related image: A bus stop sign with a phone showing the app's live tracking */}
            <img
              src="https://weoskbh2n0.ufs.sh/f/kxDpBx5RyAdYx8ssokmrPwNUVWapnC8L26cM3SbBgAQIZKtf"
              alt="Bus Stop Tracking"
              className="rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                e.currentTarget.src =
                  "https://placehold.co/500x350/a78bfa/ffffff?text=Stop+Image";
                e.currentTarget.alt = "Stop Image Placeholder";
              }}
            />
          </div>
        </div>
      </section>

      {/* Features Section - ROUTES */}
      <section className="py-16 md:py-20 bg-gray-100">
        <div className="container mx-auto px-4 flex flex-col md:flex-row-reverse items-center gap-12">
          <div className="md:w-1/2 text-center md:text-left">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              <span className="text-blue-600">ROUTES:</span> Visualize Your
              Journey
            </h2>
            <p className="text-lg text-gray-700 mb-6">
              Explore entire bus routes on an interactive map. See all active
              buses on a specific route, their real-time positions, and traffic
              conditions. Plan your trip with a clear overview.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                type="text"
                placeholder="Enter Route Number (e.g., 201)"
                className="flex-grow p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              />
              {/* This button would typically link to the /routes page with the route number pre-filled or searched */}
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                // onClick={() => window.location.href = '/routes'} // Example navigation
              >
                <SearchIcon className="h-5 w-5 mr-2" /> View Route
              </Button>
            </div>
          </div>
          <div className="md:w-1/2 flex justify-center">
            {/* Placeholder for a map-related image: A phone showing a detailed interactive map with bus icons */}
            <img
              src="https://weoskbh2n0.ufs.sh/f/kxDpBx5RyAdYyDuHx8XO7UjZnPqz2JRoTDikYhEWKCbtdVwe"
              alt="Interactive Map"
              className="rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                e.currentTarget.src =
                  "https://placehold.co/500x350/60a5fa/ffffff?text=Route+Image";
                e.currentTarget.alt = "Route Image Placeholder";
              }}
            />
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="bg-blue-700 text-white py-16 text-center shadow-inner">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Simplify Your Commute in Perth?
          </h2>
          <p className="text-lg mb-8 opacity-90">
            Visit routyr today and experience smarter, stress-free bus travel.
          </p>
          <Button
            size="lg"
            className="bg-white text-blue-700 hover:bg-gray-100 transition-transform transform hover:scale-105 shadow-lg"
            // onClick={() => window.location.href = '/download'} // Example navigation
          >
            Visit Routyr Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 text-center">
        <div className="container mx-auto px-4">
          <p className="text-sm">
            &copy; {new Date().getFullYear()} Routyr. All rights reserved.
          </p>
          <p className="text-xs mt-2 text-gray-500">
            <strong>Disclaimer:</strong> Routyr is an independent project and is
            not affiliated with or endorsed by Transperth. This site utilizes
            publicly available data.
          </p>
          <div className="flex justify-center space-x-4 mt-4">
            <a
              href="#"
              className="text-gray-400 hover:text-white transition-colors duration-200"
            >
              Privacy Policy
            </a>
            <a
              href="#"
              className="text-gray-400 hover:text-white transition-colors duration-200"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
