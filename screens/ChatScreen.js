import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, SafeAreaView, Platform, KeyboardAvoidingView, Image,
  Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import firebase from "../config/firebase";
import app from "firebase/compat";
import { Linking } from 'react-native';
import { decode } from 'base64-arraybuffer';
import { supabase } from "../config/supabase";
import { Audio } from 'expo-av';



const db = firebase.firestore();

const ChatInterface = ({ route }) => {
  const sender = route.params.user;
  const contact = route.params.recipient;

  const userId = sender.uid;
  const contactName = contact.fullName;
  const recipientId = contact.id;

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [userProfileImage, setUserProfileImage] = useState(null);
  const flatListRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false); 
  const [sound, setSound] = useState(); 
  const [recording, setRecording] = useState(); 
  const [audioUri, setAudioUri] = useState('');

  const [isTyping, setIsTyping] = useState(false);

  const makeCall = (phone) => {
    Linking.openURL(`tel:${phone}`);
  };

  useEffect(() => {
    const fetchUserProfileImage = async () => {
      try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
          setUserProfileImage(userDoc.data().profileImageUrl);
        }
      } catch (error) {
        console.error("Error fetching user profile image:", error);
      }
    };

    const fetchMessages = async () => {
      const chatId = [userId, recipientId].sort().join('_');

      const chatDoc = await db.collection('messages').doc(chatId).get();

      if (!chatDoc.exists) {
        await db.collection('messages')
          .doc(chatId)
          .set({ messages: [] });
      }

      const unsubscribe = db.collection('messages')
        .doc(chatId)
        .onSnapshot(snapshot => {
          const data = snapshot.data();
          if (data && data.messages) {
            setMessages(data.messages);
          } else {
            setMessages([]);
          }
        });

      return () => unsubscribe();
    };

    if (userId && recipientId) {
      fetchMessages();
    }

    const listenTyping = () => {
      const chatId = [userId, recipientId].sort().join('_');
      const unsubscribe = db.collection('typing')
        .doc(chatId)
        .onSnapshot(snapshot => {
          const typingData = snapshot.data();
          setIsTyping(typingData?.[recipientId] || false);
        });

      return unsubscribe;
    };
    listenTyping();
    fetchUserProfileImage();
  }, [userId, recipientId]);

  const updateTypingStatus = async (typing) => {
    const chatId = [userId, recipientId].sort().join('_');
    await db.collection('typing').doc(chatId).set(
      { [userId]: typing },
      { merge: true }
    );
  };


  const handleSend = async () => {
    if (inputText.trim()) {
      const chatId = [userId, recipientId].sort().join('_');

      await db.collection('messages')
        .doc(chatId)
        .update({
          messages: app.firestore.FieldValue.arrayUnion({
            recipientId: recipientId,
            senderId: userId,
            text: inputText,
            type: 'text',
            timestamp: new Date(),
          })
        });

      setInputText('');
      updateTypingStatus(false); 
      scrollToBottom();
    }
  };

  const sendLocation = async () => {
    const chatId = [userId, recipientId].sort().join('_');

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Denied", "Location permission is required to send your location.");
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const locationMessage = {
        recipientId: recipientId,
        senderId: userId,
        text: `https://www.google.com/maps?q=${location.coords.latitude},${location.coords.longitude}`,

        type: 'location',

        timestamp: new Date(),
      };

      await db.collection('messages')
        .doc(chatId)
        .update({
          messages: app.firestore.FieldValue.arrayUnion(locationMessage)
        });

      scrollToBottom();
    } catch (error) {
      console.error("Error sending location:", error);
      Alert.alert("Error", "Unable to fetch location.");
    }
  };

  const sendFile = async () => {
    console.log("test")
    const result = await DocumentPicker.getDocumentAsync({});
    console.log(result)
    
      const fileUri = result.assets[0].uri;
      const fileName = result.assets[0].name;
      const fileType = result.assets[0].mimeType;

      try {
     
        const response = await fetch(fileUri);

        const base64 = await response.blob()
        .then(blob => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        }));
        const base64String = base64.split(',')[1];

        const arrayBuffer = decode(base64String);
        const filename = `${fileType}-${userId}-${Date.now()}`;

        const { data, error } = await supabase.storage
          .from('chat_files') 
          .upload(filename, arrayBuffer, {
            contentType: fileType,
          });

        if (error) throw error;

        const { data: publicUrl } = supabase.storage
          .from('chat_files')
          .getPublicUrl(filename);

        const filePath = publicUrl.publicUrl

        const chatId = [userId, recipientId].sort().join('_');
        const fileMessage = {
          recipientId: recipientId,
          senderId: userId,
          text: filePath,
          type: 'file',
          fileName: fileName,
          timestamp: new Date(),
        };

        await db.collection('messages')
          .doc(chatId)
          .update({
            messages: app.firestore.FieldValue.arrayUnion(fileMessage)
          });

        scrollToBottom();



        return publicUrl.publicUrl;
      } catch (error) {
        console.error("Error sending file:", error);
        Alert.alert("Error", "Failed to send file.");
      }
    
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Denied", "Audio permission is required to record voice messages.");
        return;
      }

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const stopRecording = async () => {
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setAudioUri(uri);
      setIsRecording(false);
    } catch (error) {
      console.error("Error stopping recording:", error);
    }
  };

  const sendAudio = async () => {
    const chatId = [userId, recipientId].sort().join('_');
  
    if (!isRecording) {
      startRecording();
    } else {
      await stopRecording();
  
      if (audioUri) {
        const fileName = `audio_messages/${new Date().toISOString()}.m4a`; 
        const fileUri = audioUri; 
  
        const { data, error } = await supabase.storage
          .from('chat_files') 
          .upload(fileName, fileUri, {
            contentType: 'audio/m4a', 
            upsert: true, 
          });
  
        if (error) {
          console.error('Error uploading audio to Supabase:', error.message);
          return;
        }
  
        const { data: publicUrl } = supabase.storage
        .from('chat_files')
        .getPublicUrl(fileName);
        
        const filePath = publicUrl.publicUrl
        console.log(filePath)
  
       
  
        const voiceMessage = {
          recipientId: recipientId,
          senderId: userId,
          text: filePath, 
          type: 'audio',
          timestamp: new Date(),
        };
  
        await db.collection('messages')
          .doc(chatId)
          .update({
            messages: app.firestore.FieldValue.arrayUnion(voiceMessage)
          });
  
        setAudioUri(''); 
        scrollToBottom(); 
      }
    }
  };
  
  const handleInputChange = (text) => {
    setInputText(text);
    updateTypingStatus(text.length > 0);
  };

  const scrollToBottom = () => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  const renderMessage = ({ item }) => {
    const isSent = item.senderId === userId;
    const messageStyle = isSent ? styles.sentMessage : styles.receivedMessage;
    const profileImageUri = isSent ? userProfileImage : contact.profileImageUrl;
    const messageContainerStyle = isSent
      ? styles.sentMessageContainer
      : styles.receivedMessageContainer;
  
    const avatarStyle = {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: isSent ? 0 : 12,
      marginLeft: isSent ? 12 : 0,
      marginTop: 10,
    };
  
    const renderFile = (fileUrl, fileName) => {
      const fileExtension = fileName.split('.').pop().toLowerCase();
      console.log(fileExtension)
  
      if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
        return (
          <Image source={{ uri: fileUrl }} style={[styles.filePreview, { width: 150, height: 150, resizeMode: 'contain' }]} />
        );
      } else if (fileExtension === 'pdf') {
        return (
          <TouchableOpacity onPress={() => Linking.openURL(fileUrl)}>
            <Text style={styles.messageText}>PDF: {fileName}</Text>
          </TouchableOpacity>
        );
      } else {
        return (
          <TouchableOpacity onPress={() => Linking.openURL(fileUrl)}>
            <Text style={styles.messageText}>File: {fileName}</Text>
          </TouchableOpacity>
        );
      }
    };

    const renderAudioMessage = (audioUrl) => {
      return (
        <TouchableOpacity onPress={() => {
          const sound = new Audio(audioUrl); 
          sound.play();
        }}>
          <View style={styles.audioMessageContainer}>
            <Ionicons name="mic" size={24} color="#007AFF" />
            <Text style={styles.audioMessageText}>Audio Message</Text>
          </View>
        </TouchableOpacity>
      );
    };
  
  
    return (
      <View key={item.id} style={messageContainerStyle}>
        {!isSent && <Image source={{ uri: profileImageUri }} style={avatarStyle} />}
        <View style={[styles.messageBubble, messageStyle]}>
          {item.type === 'location' ? (
            <Text
              style={styles.messageText}
              onPress={() => Linking.openURL(item.text)}>
              Shared Location
            </Text>
          ): item.type=='audio' ? (
            renderAudioMessage(item.text)
          ): item.type === 'file' ? (
            renderFile(item.text, item.fileName) 
          ) : (
            <Text style={styles.messageText}>{item.text}</Text>
          )}
          <Text style={styles.timestamp}>
            {item.timestamp?.toDate().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        {isSent && <Image source={{ uri: profileImageUri }} style={avatarStyle} />}
      </View>
    );
  };
  

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{contactName}</Text>
        {isTyping && <Text style={styles.typingIndicator}>Typing...</Text>}
        <TouchableOpacity onPress={()=>{
          makeCall(contact.phone)
        }} style={styles.callButton}>
          <Ionicons name="call" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.messageList}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={styles.inputContainer}
      >
        <TouchableOpacity
          style={styles.attachButton}
          onPress={sendLocation}
        >
          <Ionicons name="location" size={24} color="#007AFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.attachButton}
          onPress={sendAudio}
        >
          <Ionicons name="mic" size={24} color="#007AFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.attachButton}
          onPress={sendFile}
        >
          <Ionicons name="attach" size={24} color="#007AFF" />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={handleInputChange}
          placeholder="Type a message..."
          multiline
        />

        <TouchableOpacity
          style={styles.sendButton}
          onPress={handleSend}
        >
          <Ionicons name="send" size={24} color="#007AFF" />
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F2F2F7',
    },
    header: {
        padding: 15,
        backgroundColor: '#744FC6', 
        paddingTop: Platform.OS === 'android' ? 40 : 15,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
   
    
    messageList: {
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    sentMessageContainer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginVertical: 4,
    },
    receivedMessageContainer: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      marginVertical: 4,
    },
    messageBubble: {
      maxWidth: '70%',
      padding: 12,
      borderRadius: 20,
      marginVertical: 4,
    },
    fileBubble: {
      flexDirection: 'row',
      alignItems: 'center',
      maxWidth: '70%',
      padding: 12,
      borderRadius: 20,
      marginVertical: 4,
    },
    sentMessage: {
      backgroundColor: '#007AFF',
    },
    receivedMessage: {
      backgroundColor: '#E5E5EA',
    },
    messageText: {
      color: '#FFFFFF',
      fontSize: 16,
    },
    fileName: {
      color: '#FFFFFF',
      fontSize: 14,
      marginLeft: 8,
      flex: 1,
    },
    timestamp: {
      color: '#FFFFFF80',
      fontSize: 12,
      alignSelf: 'flex-end',
      marginTop: 4,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
      backgroundColor: '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: '#E5E5EA',
    },
    input: {
      flex: 1,
      marginHorizontal: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: '#F2F2F7',
      borderRadius: 20,
      fontSize: 16,
      maxHeight: 100,
    },
    attachButton: {
      padding: 8,
    },
    sendButton: {
      padding: 8,
    },
    callButton: {
        position: 'absolute',
        right: 15,
        top: Platform.OS === 'android' ? 45 : 20,
    },
    typingIndicator: {
      color: '#000',
      fontStyle: 'italic',
      fontSize: 14,
      marginTop: 5,
    },
    audioMessageText: {
      marginLeft: 8,         
      fontSize: 14,          
      color: '#007AFF',      
      fontWeight: '500',     
      alignSelf: 'center',  
    },
});
export default ChatInterface;