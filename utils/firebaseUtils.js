import firebase from "../config/firebase"; // Adjust the import as needed

// Function to update the user's connection status
export const updateUserStatus = (userId, status) => {
    console.log("test")
  firebase.database().ref(`users/${userId}`).update({
    status: status,  // 'connected' or 'disconnected'
    lastActive: new Date(),  // Track last active time
  });
};

// Function to set up the connection listener
export const setupConnectionListener = (userId) => {
   
  const userStatusRef = firebase.database().ref(`/users/${userId}`);
  const isOfflineForDatabase = {
    status: 'disconnected',
    lastActive: new Date(),
  };
  const isOnlineForDatabase = {
    status: 'connected',
    lastActive: new Date(),
  };
  // Firebase listener for checking if the user is online or offline
  firebase.database().ref('.info/connected').on('value', (snapshot) => {
    if (snapshot.val() === false) {
      return; // User is offline
    }

    userStatusRef.onDisconnect().update(isOfflineForDatabase); // Update status when user disconnects
    userStatusRef.update(isOnlineForDatabase); // Update status to 'connected'
  });
};
