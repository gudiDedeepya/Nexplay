import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import Venues from "./pages/Venues";
import Games from "./pages/Games";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import Booking from "./pages/Booking";

function App() {
  return (
    <BrowserRouter>//BrowserRouter is a component that enables routing in a React application. It uses the HTML5 history API to keep the UI in sync with the URL. It allows you to define different routes and render different components based on the current URL.
      <Routes> //Routes is a component that is used to define a set of routes in a React application. It is used to group together multiple Route components and render the appropriate component based on the current URL.

        <Route path="/" element={<Login />} /> 

        <Route path="/signup" element={<Signup />} />

        <Route
          path="/home"
          element={
            <ProtectedRoute> //checks authenticated or not 
              <Home />
            </ProtectedRoute>
          }
        />

        <Route
          path="/venues"
          element={
            <ProtectedRoute>
              <Venues />
            </ProtectedRoute>
          }
        />

        <Route
          path="/games"
          element={
            <ProtectedRoute>
              <Games />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
    path="/book/:venueId"
    element={
        <ProtectedRoute>
            <Booking />
        </ProtectedRoute>
    }
/>

        <Route path="*" element={<NotFound />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;