import React from 'react';
import { useThemeColors } from '../hooks/useThemeColors';
import { View, TouchableOpacity, StyleSheet, Modal, TouchableWithoutFeedback, ScrollView } from 'react-native';
import AppText from '../components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeContext } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { PRESET_COLORS } from '../constants/presets';

interface ColorPickerModalProps {
  visible: boolean;
  onClose: () => void;
  color: string;
  onSelect: (color: string) => void;
}

export default function ColorPickerModal({ visible, onClose, color, onSelect }: ColorPickerModalProps) {
  const colors = useThemeColors();
  const { isDarkTheme } = useThemeContext();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={[styles.modalContent, { backgroundColor: colors.background, paddingBottom: Math.max(24, insets.bottom + 16) }]}>
              <View style={styles.header}>
                <AppText style={[styles.title, { color: colors.text }]}>Choose Color</AppText>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              
              <View style={{ height: 400 }}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.gridContainer}>
                    {PRESET_COLORS.map(c => (
                      <View key={c} style={styles.gridItem}>
                        <TouchableOpacity
                          style={[
                            styles.colorSwatch, 
                            { 
                              backgroundColor: c, 
                              borderWidth: color === c ? 3 : (c === '#ffffff' ? 1 : 0), 
                              borderColor: color === c ? colors.text : '#ddd' 
                            }
                          ]}
                          onPress={() => {
                            onSelect(c);
                            onClose();
                          }}
                        />
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    paddingVertical: 8,
  },
  gridItem: {
    width: '16.66%',
    alignItems: 'center',
    marginBottom: 12,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
});

