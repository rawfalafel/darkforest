import React, { useState } from "react";

import { useFirestore } from "../integrations/firebase";
import Button from "../components/Button";

type LandingProps = { onInitialize: () => void };
const LandingPage = ({ onInitialize }: LandingProps) => {
  const firestore = useFirestore();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(true);

  async function handleSubmit() {
    await firestore.collection("emails").add({ email });
    setSubmitted(true);
  }

  return (
    <div className="h-full w-full flex flex-col items-center justify-center">
      <h1>DARK FOREST (v0.0 - WORKSHOP DEMO)</h1>
      <h2 className="mb-8">a game built on Ethereum with zkSNARKs</h2>
      {submitted ? (
        <Button
          className="border border-white p-2 rounded-sm"
          onClick={() => onInitialize()}
        >
          Initialize me!
        </Button>
      ) : (
        <React.Fragment>
          <div className="mb-4">
            Email:
            <input
              className="ml-2 p-2 bg-gray-300 rounded-sm text-black"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <Button
            className="border border-white p-2 rounded-sm"
            onClick={() => handleSubmit()}
          >
            Enter
          </Button>
        </React.Fragment>
      )}
    </div>
  );
};

export default LandingPage;
