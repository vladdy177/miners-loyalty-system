import React from "react";
import Register from "./components/Register";

function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-2">The Miners</h1>
        <p className="text-gray-500 text-center mb-8">
          Registrace do věrnostního programu
        </p>
        <Register />
      </div>
    </div>
  );
}

export default App;
