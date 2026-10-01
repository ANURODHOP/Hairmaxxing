import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

const AuthLoader = ({ message }) => {
  return (
    <View style={{ alignItems: 'center' }}>
      <ActivityIndicator color="#fff" />
      <Text style={{ color: '#fff', marginTop: 10, textAlign: 'center' }}>
        {message}
      </Text>
    </View>
  );
};

export default AuthLoader;