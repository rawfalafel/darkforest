import React from 'react';

import Button from '../components/Button';

type LandingProps = { onInitialize: () => void };
const LandingPage = ({ onInitialize }: LandingProps) => {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center">
      <h1>DARK FOREST (v0.0 - WORKSHOP DEMO)</h1>
      <h2 className="mb-8">a game built on Ethereum with zkSNARKs</h2>
      <Button
        className="border border-white p-2 rounded-sm"
        onClick={() => onInitialize()}
      >
        Initialize me!
      </Button>
    </div>
  );
};

export default LandingPage;
