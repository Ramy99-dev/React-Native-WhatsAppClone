import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import firebase from '../config/firebase'

const ContactItem = ({ contact, currentUser }) => {
  const [status, setStatus] = useState('disconnected');
  const navigation = useNavigation();

  useEffect(() => {
    const userStatusRef = firebase.database().ref(`/users/${contact.id}/status`);
    
    userStatusRef.on('value', (snapshot) => {
      if (snapshot.exists()) {
        setStatus(snapshot.val());
      }
    });

    return () => {
      userStatusRef.off(); 
    };
  }, [contact.id]);

  return (
    <TouchableOpacity 
      style={styles.contactContainer}
      onPress={() => navigation.navigate('Chat', {
        user: currentUser,
        recipient: contact
      })}
    >
      <Image 
        source={{ uri: contact.profileImageUrl }} 
        style={styles.avatar}
      />
      <View style={styles.contactInfo}>
        <View style={styles.nameContainer}>
          <Text style={styles.name}>{contact.fullName}</Text>
          <View 
            style={[
              styles.statusIndicator, 
              status === 'connected' ? styles.connected : styles.disconnected
            ]}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  contactContainer: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  contactInfo: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: 10,
  },
  connected: {
    backgroundColor: '#4caf50', 
  },
  disconnected: {
    backgroundColor: '#d32f2f',
  },
});

export default ContactItem;
