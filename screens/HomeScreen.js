import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  FlatList, 
  SafeAreaView, 
  StatusBar,
  TextInput,
  Text,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import ContactItem from './ContactItem';
import firebase from "../config/firebase";
import { updateUserStatus } from '../utils/firebaseUtils';

const db = firebase.firestore();
const Auth = firebase.auth();

const HomeScreen = ({ navigation }) => {
  const [contacts, setContacts] = useState([]);
  const [currentUser, setCurrentUser] = useState();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const snapshot = await db.collection('users').get();
        const usersList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
  
        Auth.onAuthStateChanged((user) => {
          if (user) {
            setCurrentUser(user);
            const filteredUsers = usersList.filter((u) => u.id !== user.uid);
            setContacts(filteredUsers);
          } else {
            setCurrentUser(null); 
            setContacts([]);
          }
        });
      } catch (error) {
        console.error("Error fetching contacts: ", error);
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchContacts();
  }, []);
  

  const handleLogout = async () => {
    const userId = firebase.auth().currentUser.uid;
    
    updateUserStatus(userId, 'disconnected');
    
    Auth.signOut().then(() => {
      navigation.navigate('Login');
    }).catch((error) => {
      Alert.alert('Logout Error', error.message);
    });
  };
  

  const filteredContacts = contacts.filter(contact =>
    contact.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search contacts..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#666"
        />
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#007BFF" style={styles.loader} />
      ) : (
        <FlatList
          data={filteredContacts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ContactItem contact={item} currentUser={currentUser} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#744FC6',
    paddingTop: Platform.OS === 'android' ? 40 : 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#fff',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  logoutButtonText: {
    color: '#744FC6',
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchContainer: {
    padding: 10,
    backgroundColor: '#f2f2f2',
  },
  searchInput: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 25,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  loader: {
    marginTop: 20,
  },
});

export default HomeScreen;
