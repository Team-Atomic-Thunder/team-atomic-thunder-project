import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAzg2zFH-0XCO9SfA5Tgjq3rqnDbntQ71E",
  authDomain: "align-800e4.firebaseapp.com",
  projectId: "align-800e4",
  storageBucket: "align-800e4.firebasestorage.app",
  messagingSenderId: "20557168653",
  appId: "1:20557168653:web:f0dfdeb78cf8fbf5045544"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

export { app, db }