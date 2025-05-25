import React from "react";
import { Button } from "@/components/ui/button"; // Assuming ShadCN Button component path
import { SignpostBigIcon, RouteIcon } from "lucide-react"; // Using Lucide for a simple icon
import { Link } from "@tanstack/react-router"; // Using TanStack Router for navigation

// Define the TopNav functional component
const TopNav = () => {
  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between p-4 bg-white shadow-sm border-b border-gray-200">
      <Link to="/">
        <div className="flex items-center space-x-2">
          <img
            src="/favicon.ico"
            alt="Routyr Favicon"
            className="w-6 h-6 rounded-full"
            onError={(e) => {
              e.currentTarget.src =
                "https://placehold.co/24x24/cccccc/333333?text=R"; // Placeholder with 'R'
              e.currentTarget.alt = "Routyr Logo Placeholder";
            }}
          />
          <span className="text-xl font-bold text-gray-900">Routyr</span>
        </div>
      </Link>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-4">
          <Link to="/stops">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center space-x-1"
            >
              <SignpostBigIcon className="h-4 w-4" />
              <span>Stops</span>
            </Button>
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          <Link to="/routes">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center space-x-1"
            >
              <RouteIcon className="h-4 w-4" />
              <span>Routes</span>
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default TopNav;
