import { useState, useEffect } from 'react';

import * as firebase from 'firebase/app';
import 'firebase/analytics';
import 'firebase/auth';
import 'firebase/firestore';

const CONFIG = {
  apiKey: 'AIzaSyAUrYUN39t8-2fKwEmer2ys7ORQ1_7gu3U',
  authDomain: 'darkforest-7f0ab.firebaseapp.com',
  databaseURL: 'https://darkforest-7f0ab.firebaseio.com',
  projectId: 'darkforest-7f0ab',
  storageBucket: 'darkforest-7f0ab.appspot.com',
  messagingSenderId: '998658691897',
  appId: '1:998658691897:web:96cb33612d50382ab84ee8',
  measurementId: 'G-V98GLBPCC5',
};

export function FirebaseProvider({ children }) {
  const [app, setApp] = useState(null);
  useEffect(() => {
    setApp(firebase.initializeApp(CONFIG));
  }, []);
  return app === null ? null : children;
}

export function useFirestore() {
  return firebase.firestore();
}
