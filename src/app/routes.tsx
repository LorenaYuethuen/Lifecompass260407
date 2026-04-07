import { createBrowserRouter } from "react-router";
import RootLayout from "./components/RootLayout";
import Dashboard from "./components/Dashboard";
import PlaceholderPage from "./components/PlaceholderPage";
import DoPage from "./components/pages/DoPage";
import CheckInPage from "./components/pages/CheckInPage";
import ReviewPage from "./components/pages/ReviewPage";
import HealthPage from "./components/pages/HealthPage";
import KnowledgePage from "./components/pages/KnowledgePage";
import SettingsPage from "./components/pages/SettingsPage";
import WishlistPage from "./components/pages/WishlistPage";
import SystemPage from "./components/pages/SystemPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: "do", Component: DoPage },
      { path: "checkin", Component: CheckInPage },
      { path: "wishlist", Component: WishlistPage },
      { path: "review", Component: ReviewPage },
      { path: "health", Component: HealthPage },
      { path: "knowledge", Component: KnowledgePage },
      { path: "settings", Component: SettingsPage },
      { path: "system", Component: SystemPage },
      { path: "*", Component: PlaceholderPage },
    ],
  },
]);
