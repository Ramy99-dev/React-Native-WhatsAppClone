import app from "firebase/compat";
import "firebase/database";


const firebaseConfig = {
    apiKey: "AIzaSyDlcY1GhxkrmiTL81OJtdHRKdTDkqITc9Y",
    authDomain: "whatsappclone-2e34b.firebaseapp.com",
    databaseURL: "https://whatsappclone-2e34b-default-rtdb.firebaseio.com",
    projectId: "whatsappclone-2e34b",
    storageBucket: "whatsappclone-2e34b.firebasestorage.app",
    messagingSenderId: "491436996022",
    appId: "1:491436996022:web:87df0174783465ac607d17",
    measurementId: "G-KK40ZXKFNP"
  };
  

const firebase = app.initializeApp(firebaseConfig);

export default firebase;

